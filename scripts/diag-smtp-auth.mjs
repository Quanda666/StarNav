// 用真实本地 SMTP 服务器验证 AUTH LOGIN / AUTH PLAIN 报文是否逐字节正确，
// 并模拟 QQ 返回 535 的场景，确认错误被正确归因到 auth-pass 阶段。
import { createServer, connect } from 'node:net';
import { sendMailSession, SmtpError } from '../src/lib/smtpClient.js';

/** 客户端侧 IO：把 socket 包装成 sendMailSession 需要的 readReply/write/close。 */
function createClientIo(socket) {
  let buffer = '';
  const listeners = [];
  socket.on('data', (chunk) => {
    buffer += chunk.toString('utf8');
    listeners.splice(0).forEach((fn) => fn());
  });
  const readReply = () => new Promise((resolve) => {
    const tryParse = () => {
      const lines = [];
      let rest = buffer;
      for (;;) {
        const i = rest.indexOf('\r\n');
        if (i === -1) return false;
        const line = rest.slice(0, i);
        lines.push(line);
        rest = rest.slice(i + 2);
        if (/^\d{3} /.test(line)) break;
      }
      buffer = rest;
      resolve({ code: Number(lines[0].slice(0, 3)), lines, text: lines.join('\n') });
      return true;
    };
    if (tryParse()) return;
    listeners.push(tryParse);
  });
  return {
    write: (text) => new Promise((resolve) => socket.write(text, resolve)),
    readReply,
    close: () => socket.destroy(),
  };
}

/** 服务端侧：只按行读命令（命令不是 nnn 格式，不能用响应解析器）。 */
function createServerIo(socket) {
  let buffer = '';
  const listeners = [];
  socket.on('data', (chunk) => {
    buffer += chunk.toString('utf8');
    listeners.splice(0).forEach((fn) => fn());
  });
  const readLine = () => new Promise((resolve) => {
    const tryLine = () => {
      const i = buffer.indexOf('\r\n');
      if (i === -1) return false;
      const line = buffer.slice(0, i);
      buffer = buffer.slice(i + 2);
      resolve({ text: line, base64: Buffer.from(line, 'base64').toString('utf8') });
      return true;
    };
    if (tryLine()) return;
    listeners.push(tryLine);
  });
  return { readLine, write: (text) => new Promise((resolve) => socket.write(text, resolve)) };
}

async function runScenario(scenario) {
  const received = { user: null, pass: null, rawPass: null };
  const server = await new Promise((resolve) => {
    const srv = createServer((socket) => {
      socket.write('220 test.local ESMTP\r\n');
      const io = createServerIo(socket);
      (async () => {
        await io.readLine(); // EHLO 命令
        await io.write(`250-test.local\r\n${scenario.advertise}\r\n`);

        if (scenario.advertise.includes('PLAIN') && !scenario.advertise.includes('LOGIN')) {
          const authLine = await io.readLine();
          const payload = authLine.text.replace(/^AUTH PLAIN\s*/i, '');
          const decoded = Buffer.from(payload, 'base64').toString('utf8');
          const parts = decoded.split('\u0000');
          received.user = parts[1];
          received.pass = parts[2];
        } else {
          await io.readLine(); // AUTH LOGIN
          await io.write('334 VXNlcm5hbWU6\r\n');
          received.user = (await io.readLine()).base64;
          await io.write('334 UGFzc3dvcmQ6\r\n');
          const passLine = await io.readLine();
          received.pass = passLine.base64;
          received.rawPass = passLine.text;
        }

        if (scenario.reject) {
          await io.write(`${scenario.rejectReply || '535 535 Login fail. Account is abnormal'}\r\n`);
          return;
        }
        await io.write('235 Authentication successful\r\n');
        await io.readLine(); await io.write('250 OK\r\n'); // MAIL FROM
        await io.readLine(); await io.write('250 OK\r\n'); // RCPT TO
        await io.readLine(); await io.write('354 End data\r\n'); // DATA
        await io.readLine(); await io.write('250 OK queued\r\n');
      })().catch(() => socket.destroy());
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });

  const socket = connect(server.address().port, '127.0.0.1');
  await new Promise((resolve) => socket.once('connect', resolve));
  const io = createClientIo(socket);

  let outcome;
  try {
    await sendMailSession(io, {
      from: { name: '测试', address: 'user@qq.com' },
      to: ['admin@example.com'],
      subject: '测试邮件',
      html: '<p>hello</p>',
      text: 'hello',
      auth: { user: scenario.user, pass: scenario.pass },
    });
    outcome = { ok: true };
  } catch (error) {
    outcome = {
      ok: false,
      stage: error instanceof SmtpError ? error.stage : null,
      code: error.code,
      message: error.message,
    };
  }
  socket.destroy();
  server.close();

  const passMatches = received.pass === scenario.pass;
  const verdict = scenario.reject
    ? outcome.stage === 'auth-pass' && outcome.code === 535
    : outcome.ok === true && passMatches;
  console.log(
    `${verdict ? '✓' : '✗'} ${scenario.name}\n` +
    `    期望: ${scenario.reject ? 'auth-pass/535' : '成功'} | 实际: ${outcome.ok ? '成功' : `${outcome.stage}/${outcome.code}`}\n` +
    `    服务端解出的用户名=${received.user} | 密码${passMatches ? '与输入逐字节一致' : '不一致！'}`,
  );
}

await runScenario({
  name: 'AUTH LOGIN 凭据正确 → 成功',
  advertise: '250-AUTH LOGIN\r\n250 OK',
  user: 'user@qq.com',
  pass: 'abcdefghijklmnop',
  reject: false,
});

await runScenario({
  name: 'AUTH LOGIN 凭据错误 → 归因 auth-pass/535（QQ 场景）',
  advertise: '250-AUTH LOGIN\r\n250 OK',
  user: 'user@qq.com',
  pass: 'wrongpass',
  reject: true,
});

await runScenario({
  name: 'AUTH PLAIN 凭据正确 → 成功',
  advertise: '250-AUTH PLAIN\r\n250 OK',
  user: 'user@163.com',
  pass: 'secret',
  reject: false,
});

await runScenario({
  name: '含非 ASCII 的密码在 LOGIN 下应逐字节一致',
  advertise: '250-AUTH LOGIN\r\n250 OK',
  user: 'user@qq.com',
  pass: '授权码·测试',
  reject: false,
});
