import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';

import {
  sendMailSession,
  buildMimeMessage,
  dotStuff,
  encodeHeaderValue,
} from '../src/lib/smtpClient.js';
import { renderEmail, EMAIL_TEMPLATES } from '../src/services/emailTemplates.js';
import { parseRecipients, checkEmailReadiness } from '../src/services/emailService.js';

// ─── 最小 SMTP 服务器（用于端到端验证协议实现）──────────────

function createFakeSmtpServer({ rcptReject = false, authAdvertise = 'AUTH PLAIN LOGIN' } = {}) {
  const session = { commands: [], data: '', auth: null, mailFrom: '', rcptTo: [] };
  const server = net.createServer((socket) => {
    let buffer = '';
    let inData = false;
    const send = (line) => socket.write(`${line}\r\n`);

    send('220 fake.smtp ESMTP ready');

    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      let index;
      while ((index = buffer.indexOf('\r\n')) !== -1) {
        const line = buffer.slice(0, index);
        buffer = buffer.slice(index + 2);

        if (inData) {
          if (line === '.') {
            inData = false;
            send('250 2.0.0 Ok: queued as FAKE123');
          } else {
            session.data += `${line}\n`;
          }
          continue;
        }

        session.commands.push(line);
        const upper = line.toUpperCase();

        if (upper.startsWith('EHLO') || upper.startsWith('HELO')) {
          socket.write('250-fake.smtp\r\n');
          socket.write('250-SIZE 10485760\r\n');
          socket.write(`250-${authAdvertise}\r\n`);
          socket.write('250 STARTTLS\r\n');
        } else if (upper.startsWith('AUTH PLAIN')) {
          session.auth = { method: 'PLAIN', payload: line.split(' ')[2] || '' };
          send('235 2.7.0 Authentication successful');
        } else if (upper.startsWith('AUTH LOGIN')) {
          session.auth = { method: 'LOGIN', stage: 'user' };
          send('334 VXNlcm5hbWU6');
        } else if (session.auth?.method === 'LOGIN' && session.auth.stage === 'user') {
          session.auth.user = Buffer.from(line, 'base64').toString('utf8');
          session.auth.stage = 'pass';
          send('334 UGFzc3dvcmQ6');
        } else if (session.auth?.method === 'LOGIN' && session.auth.stage === 'pass') {
          session.auth.pass = Buffer.from(line, 'base64').toString('utf8');
          session.auth.stage = 'done';
          send('235 2.7.0 Authentication successful');
        } else if (upper.startsWith('MAIL FROM')) {
          session.mailFrom = line;
          send('250 2.1.0 Ok');
        } else if (upper.startsWith('RCPT TO')) {
          session.rcptTo.push(line);
          send(rcptReject ? '550 5.1.1 No such user' : '250 2.1.5 Ok');
        } else if (upper === 'DATA') {
          inData = true;
          send('354 End data with <CR><LF>.<CR><LF>');
        } else if (upper === 'QUIT') {
          send('221 2.0.0 Bye');
          socket.end();
        } else if (upper === 'STARTTLS') {
          send('454 4.7.0 TLS not available');
        } else {
          send('250 2.0.0 Ok');
        }
      }
    });

    socket.on('error', () => {});
  });
  return { server, session };
}

function createNodeIo(socket) {
  let buffer = '';
  const pending = [];
  let ended = false;

  const takeReply = () => {
    const lines = buffer.split('\r\n');
    if (lines.length < 2) return null;
    for (let i = 0; i < lines.length - 1; i += 1) {
      const line = lines[i];
      // 单行响应（首行就是 "ddd 文本"）或续行中的最后一行（"ddd 文本"）
      if (/^\d{3} /.test(line)) {
        const collected = lines.slice(0, i + 1).map((item) => `${item}\r\n`).join('');
        buffer = lines.slice(i + 1).join('\r\n');
        return collected;
      }
    }
    return null;
  };

  const flush = () => {
    while (pending.length) {
      const text = takeReply();
      if (text === null) return;
      const replyLines = text.split('\r\n').filter(Boolean);
      const last = replyLines[replyLines.length - 1] || '';
      pending.shift().resolve({ code: Number(last.slice(0, 3)) || 0, lines: replyLines, text: replyLines.join('\n') });
    }
  };

  socket.on('data', (chunk) => {
    buffer += chunk.toString('utf8');
    flush();
  });
  socket.on('end', () => {
    ended = true;
    while (pending.length) pending.shift().resolve({ code: 0, lines: [], text: '' });
  });
  socket.on('error', () => { ended = true; });

  return {
    write: (text) => new Promise((resolve) => socket.write(text, resolve)),
    readReply: () => new Promise((resolve, reject) => {
      if (ended) {
        reject(new Error('connection ended'));
        return;
      }
      pending.push({ resolve });
      flush();
    }),
    startTls: async () => { throw new Error('tests do not use STARTTLS'); },
    close: () => new Promise((resolve) => socket.end(resolve)),
  };
}

function listen(server) {
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
}

// ─── 测试 ──────────────────────────────────────────────

test('SMTP 会话：EHLO → AUTH LOGIN → MAIL/RCPT → DATA 全流程与报文内容', async () => {
  const { server, session } = createFakeSmtpServer();
  const port = await listen(server);
  const socket = net.connect(port, '127.0.0.1');
  await new Promise((resolve) => socket.once('connect', resolve));

  const result = await sendMailSession(createNodeIo(socket), {
    from: { name: '星漫旅站', address: 'noreply@starnav.test' },
    to: ['admin@starnav.test'],
    subject: '【新书签提交】Cloudflare 文档',
    html: '<h1>有新的书签提交</h1><p>开发工具</p>',
    text: '有新的书签提交',
    auth: { user: 'smtp-user', pass: 'smtp-pass' },
  });

  assert.deepEqual(result.accepted, ['admin@starnav.test']);
  // 服务器同时提供 PLAIN/LOGIN，客户端应优先用 AUTH PLAIN
  assert.equal(session.auth.method, 'PLAIN');
  const decodedAuth = Buffer.from(session.auth.payload, 'base64').toString('utf8').split('\u0000');
  assert.deepEqual(decodedAuth, ['', 'smtp-user', 'smtp-pass']);
  assert.match(session.mailFrom, /MAIL FROM:<noreply@starnav\.test>/);
  assert.equal(session.rcptTo.length, 1);

  // 报文头与正文编码
  assert.match(session.data, /From: =\?UTF-8\?B\?/);
  assert.match(session.data, /Subject: =\?UTF-8\?B\?/);
  assert.match(session.data, /Content-Type: multipart\/alternative; boundary=/);
  assert.match(session.data, /Content-Transfer-Encoding: base64/);

  // 主题 base64 解回来应是原文
  const subjectLine = session.data.split('\n').find((line) => line.startsWith('Subject: '));
  const encoded = subjectLine.replace('Subject: ', '').trim();
  assert.equal(Buffer.from(encoded.replace(/=\?UTF-8\?B\?|\?=/g, ''), 'base64').toString('utf8'), '【新书签提交】Cloudflare 文档');

  // 最后一个命令应是 QUIT
  assert.equal(session.commands[session.commands.length - 1], 'QUIT');
  server.close();
});

test('SMTP 会话：仅提供 AUTH LOGIN 时走 LOGIN 分支', async () => {
  const { server, session } = createFakeSmtpServer({ authAdvertise: 'AUTH LOGIN' });
  const port = await listen(server);
  const socket = net.connect(port, '127.0.0.1');
  await new Promise((resolve) => socket.once('connect', resolve));

  await sendMailSession(createNodeIo(socket), {
    from: { address: 'noreply@starnav.test' },
    to: ['admin@starnav.test'],
    subject: 'login branch',
    text: 'hi',
    auth: { user: 'user@starnav.test', pass: 'secret-code' },
  });

  assert.equal(session.auth.method, 'LOGIN');
  assert.equal(session.auth.user, 'user@starnav.test');
  assert.equal(session.auth.pass, 'secret-code');
  server.close();
});

test('SMTP 会话：收件人被拒时抛出带阶段的错误', async () => {
  const { server } = createFakeSmtpServer({ rcptReject: true });
  const port = await listen(server);
  const socket = net.connect(port, '127.0.0.1');
  await new Promise((resolve) => socket.once('connect', resolve));

  await assert.rejects(
    () => sendMailSession(createNodeIo(socket), {
      from: { address: 'noreply@starnav.test' },
      to: ['nobody@starnav.test'],
      subject: '测试',
      text: 'hi',
    }),
    (error) => {
      assert.equal(error.stage, 'rcpt-to');
      assert.match(error.message, /550/);
      return true;
    },
  );
  server.close();
});

test('SMTP 会话：多个收件人逐个 RCPT', async () => {
  const { server, session } = createFakeSmtpServer();
  const port = await listen(server);
  const socket = net.connect(port, '127.0.0.1');
  await new Promise((resolve) => socket.once('connect', resolve));

  const result = await sendMailSession(createNodeIo(socket), {
    from: { address: 'noreply@starnav.test' },
    to: ['a@starnav.test', 'b@starnav.test'],
    subject: 'hello',
    text: 'body',
  });

  assert.equal(session.rcptTo.length, 2);
  assert.deepEqual(result.accepted, ['a@starnav.test', 'b@starnav.test']);
  server.close();
});

test('MIME 构造：纯 ASCII 主题不编码，中文主题按 RFC2047 编码', () => {
  assert.equal(encodeHeaderValue('Weekly digest'), 'Weekly digest');
  assert.match(encodeHeaderValue('站点周报'), /^=\?UTF-8\?B\?/);

  const message = buildMimeMessage({
    from: { name: '星漫旅站', address: 'noreply@starnav.test' },
    to: ['admin@starnav.test'],
    subject: 'Plain subject',
    text: 'plain body',
  });
  assert.match(message, /^From: =\?UTF-8\?B\?/m);
  assert.match(message, /Subject: Plain subject/);
  assert.match(message, /Content-Type: text\/plain; charset=UTF-8/);
  // 正文为 base64，不应出现原始明文（避免 8bit 兼容问题）
  assert.doesNotMatch(message, /plain body/);
});

test('dotStuff 对以点开头的行做转义', () => {
  assert.equal(dotStuff('.hidden\nnormal'), '..hidden\r\nnormal');
  assert.equal(dotStuff('a\n.\nb'), 'a\r\n..\r\nb');
});

test('六种邮件模板都能渲染出主题与 HTML', () => {
  for (const template of EMAIL_TEMPLATES) {
    const rendered = renderEmail({ template, data: {}, settings: { siteName: '星漫旅站' } });
    assert.ok(rendered.subject && rendered.subject.length > 0, `${template} 应有主题`);
    assert.match(rendered.html, /星漫旅站/, `${template} 应包含站点名`);
    assert.ok(rendered.text.length > 0, `${template} 应有纯文本兜底`);
    assert.doesNotMatch(rendered.html, /undefined|\[object Object\]/, `${template} 不应出现未填充占位`);
  }
});

test('邮件模板对 HTML 注入做转义，且拒绝非 http(s) 链接', () => {
  const rendered = renderEmail({
    template: 'submission',
    data: { site: { name: '<script>alert(1)</script>', url: 'javascript:alert(1)', desc: '" onmouseover="x' } },
    settings: {},
  });
  assert.doesNotMatch(rendered.html, /<script>alert\(1\)<\/script>/);
  assert.match(rendered.html, /&lt;script&gt;/);
  assert.doesNotMatch(rendered.html, /href="javascript:/);
});

test('收件人解析与就绪校验', () => {
  assert.deepEqual(parseRecipients('a@x.com, b@y.com; a@x.com  c@z.com'), ['a@x.com', 'b@y.com', 'c@z.com']);
  assert.deepEqual(parseRecipients('不是邮箱, a@x.com, bad@'), ['a@x.com']);

  assert.equal(checkEmailReadiness({ enabled: 'false' }).ready, false);
  assert.equal(checkEmailReadiness({ enabled: 'true', provider: 'resend', fromAddress: 'a@x.com', recipients: 'b@y.com' }).reason, 'Resend 需要 API Key');
  assert.equal(checkEmailReadiness({
    enabled: 'true', provider: 'resend', fromAddress: 'a@x.com', recipients: 'b@y.com', apiKey: 're_x',
  }).ready, true);
  assert.equal(checkEmailReadiness({
    enabled: 'true', provider: 'smtp', fromAddress: 'a@x.com', recipients: 'b@y.com', smtpHost: 'smtp.qq.com', smtpUser: 'u', smtpPass: '',
  }).reason, 'SMTP 已填用户名但缺少密码/授权码');
});
