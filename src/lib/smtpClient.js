// SMTP 客户端（协议层）：只依赖一个极小的 IO 抽象，因此既能跑在 Workers（cloudflare:sockets），
// 也能在 Node 测试里用 net.Socket 驱动真实 SMTP 服务器验证。
//
// IO 契约（全部为异步）：
//   write(text)      → 写入原始字节
//   readReply()      → 读取一条完整 SMTP 响应，返回 { code, lines, text }
//   startTls()       → 升级为 TLS，返回新的 IO（STARTTLS 用）
//   close()          → 关闭连接
//
// 支持：EHLO、STARTTLS（可选）、AUTH PLAIN / AUTH LOGIN、多收件人、点填充（dot-stuffing）、
//       HTML+纯文本 multipart/alternative、非 ASCII 主题的 RFC2047 编码。

const CRLF = '\r\n';

export class SmtpError extends Error {
  constructor(message, { code = 0, stage = '' } = {}) {
    super(message);
    this.name = 'SmtpError';
    this.code = code;
    this.stage = stage;
  }
}

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** 纯 JS base64 编码（Workers 环境没有 Buffer，且需支持 UTF-8 多字节）。 */
function bytesToBase64(bytes) {
  let result = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    result += BASE64_CHARS[b0 >> 2];
    result += BASE64_CHARS[((b0 & 3) << 4) | ((b1 ?? 0) >> 4)];
    result += b1 === undefined ? '=' : BASE64_CHARS[((b1 & 15) << 2) | ((b2 ?? 0) >> 6)];
    result += b2 === undefined ? '=' : BASE64_CHARS[b2 & 63];
  }
  return result;
}

function encodeBase64(value) {
  return bytesToBase64(new TextEncoder().encode(String(value)));
}

function encodeBase64Bytes(text) {
  return bytesToBase64(new TextEncoder().encode(String(text)));
}

/** RFC 2047 编码：非 ASCII 主题必须编码，否则会被拒收或乱码。 */
export function encodeHeaderValue(value) {
  const text = String(value ?? '');
  // eslint-disable-next-line no-control-regex
  if (!/[^\x20-\x7E]/.test(text)) return text;
  const words = [];
  for (const chunk of chunkByBytes(text, 42)) {
    words.push(`=?UTF-8?B?${encodeBase64(chunk)}?=`);
  }
  return words.join(' ');
}

function chunkByBytes(text, maxBytes) {
  const chunks = [];
  let current = '';
  let size = 0;
  for (const char of text) {
    const charSize = new TextEncoder().encode(char).length;
    if (size + charSize > maxBytes && current) {
      chunks.push(current);
      current = '';
      size = 0;
    }
    current += char;
    size += charSize;
  }
  if (current) chunks.push(current);
  return chunks.length ? chunks : [''];
}

function wrapBase64(base64, width = 76) {
  const lines = [];
  for (let i = 0; i < base64.length; i += width) lines.push(base64.slice(i, i + width));
  return lines.join(CRLF);
}

/** 点填充：正文中以 `.` 开头的行必须写成 `..`，否则会被当成结束标记。 */
export function dotStuff(text) {
  return String(text).replace(/\r?\n/g, CRLF).replace(/^\./gm, '..');
}

/**
 * 构造 MIME 邮件源文本（纯函数，便于单测）。
 *
 * @param {{from:{name?:string,address:string}, to:Array<string>, subject:string, html?:string, text?:string, headers?:Record<string,string>, date?:Date}} options
 * @returns {string}
 */
export function buildMimeMessage({ from, to, subject, html = '', text = '', headers = {}, date = new Date() }) {
  const fromAddress = String(from?.address || '').trim();
  const toList = (Array.isArray(to) ? to : [to]).map((item) => String(item || '').trim()).filter(Boolean);
  const boundary = `starnav-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  const lines = [];

  lines.push(`From: ${from?.name ? `${encodeHeaderValue(from.name)} <${fromAddress}>` : fromAddress}`);
  lines.push(`To: ${toList.join(', ')}`);
  lines.push(`Subject: ${encodeHeaderValue(subject)}`);
  lines.push(`Date: ${date.toUTCString()}`);
  lines.push('MIME-Version: 1.0');
  for (const [key, value] of Object.entries(headers || {})) {
    if (!key || value === undefined || value === null) continue;
    lines.push(`${key}: ${String(value).replace(/[\r\n]+/g, ' ')}`);
  }

  const plain = text || (html ? html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '');

  if (html && plain) {
    lines.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    lines.push('');
    lines.push(`--${boundary}`);
    lines.push('Content-Type: text/plain; charset=UTF-8');
    lines.push('Content-Transfer-Encoding: base64');
    lines.push('');
    lines.push(wrapBase64(encodeBase64Bytes(plain)));
    lines.push(`--${boundary}`);
    lines.push('Content-Type: text/html; charset=UTF-8');
    lines.push('Content-Transfer-Encoding: base64');
    lines.push('');
    lines.push(wrapBase64(encodeBase64Bytes(html)));
    lines.push(`--${boundary}--`);
  } else if (html) {
    lines.push('Content-Type: text/html; charset=UTF-8');
    lines.push('Content-Transfer-Encoding: base64');
    lines.push('');
    lines.push(wrapBase64(encodeBase64Bytes(html)));
  } else {
    lines.push('Content-Type: text/plain; charset=UTF-8');
    lines.push('Content-Transfer-Encoding: base64');
    lines.push('');
    lines.push(wrapBase64(encodeBase64Bytes(plain)));
  }

  return lines.join(CRLF);
}

function parseReplyText(text) {
  const lines = String(text || '').split(/\r?\n/).filter((line) => line.length > 0);
  const last = lines[lines.length - 1] || '';
  const code = Number(last.slice(0, 3)) || 0;
  return { code, lines, text: lines.join('\n') };
}

function expect(reply, codes, stage) {
  if (!codes.includes(reply.code)) {
    throw new SmtpError(`SMTP ${stage} 失败：${reply.code} ${reply.lines.join(' | ').slice(0, 200)}`, {
      code: reply.code,
      stage,
    });
  }
}

/**
 * 在当前 IO 上执行一次完整的发信会话。
 *
 * @param {object} io createSmptIo 风格的 IO 实现。
 * @param {{from:{name?:string,address:string}, to:Array<string>, subject:string, html?:string, text?:string, auth?:{user:string,pass:string}, startTls?:boolean, clientName?:string, timeoutMs?:number}} options
 * @returns {Promise<{accepted:string[], response:string}>}
 */
export async function sendMailSession(io, options) {
  const {
    from,
    to,
    subject,
    html = '',
    text = '',
    auth = null,
    startTls = false,
    clientName = 'starnav.local',
    timeoutMs = 15000,
  } = options;

  const toList = (Array.isArray(to) ? to : [to]).map((item) => String(item || '').trim()).filter(Boolean);
  if (!from?.address) throw new SmtpError('缺少发件人地址', { stage: 'config' });
  if (!toList.length) throw new SmtpError('缺少收件人地址', { stage: 'config' });

  let socketIo = io;
  const withTimeout = async (promise, stage) => {
    let timer = null;
    try {
      return await Promise.race([
        promise,
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new SmtpError(`SMTP ${stage} 超时`, { stage })), timeoutMs);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  try {
    expect(await withTimeout(socketIo.readReply(), 'greeting'), [220], 'greeting');
    await socketIo.write(`EHLO ${clientName}${CRLF}`);

    let ehlo = await withTimeout(socketIo.readReply(), 'ehlo');
    let capabilities = ehlo.lines.join('\n').toUpperCase();
    expect(ehlo, [250], 'ehlo');

    if (startTls) {
      await socketIo.write(`STARTTLS${CRLF}`);
      expect(await withTimeout(socketIo.readReply(), 'starttls'), [220], 'starttls');
      socketIo = await socketIo.startTls();
      // 升级后需重新 EHLO（RFC 3207）
      await socketIo.write(`EHLO ${clientName}${CRLF}`);
      ehlo = await withTimeout(socketIo.readReply(), 'ehlo-after-tls');
      expect(ehlo, [250], 'ehlo-after-tls');
      capabilities = ehlo.lines.join('\n').toUpperCase();
    }

    if (auth?.user && auth?.pass) {
      if (capabilities.includes('AUTH PLAIN') || capabilities.includes('AUTH=PLAIN')) {
        await socketIo.write(`AUTH PLAIN ${encodeBase64(`\u0000${auth.user}\u0000${auth.pass}`)}${CRLF}`);
        expect(await withTimeout(socketIo.readReply(), 'auth'), [235, 503], 'auth');
      } else {
        await socketIo.write(`AUTH LOGIN${CRLF}`);
        expect(await withTimeout(socketIo.readReply(), 'auth-login'), [334], 'auth-login');
        await socketIo.write(`${encodeBase64(auth.user)}${CRLF}`);
        expect(await withTimeout(socketIo.readReply(), 'auth-user'), [334], 'auth-user');
        await socketIo.write(`${encodeBase64(auth.pass)}${CRLF}`);
        expect(await withTimeout(socketIo.readReply(), 'auth-pass'), [235, 503], 'auth-pass');
      }
    }

    await socketIo.write(`MAIL FROM:<${from.address}>${CRLF}`);
    expect(await withTimeout(socketIo.readReply(), 'mail-from'), [250], 'mail-from');

    for (const recipient of toList) {
      await socketIo.write(`RCPT TO:<${recipient}>${CRLF}`);
      const reply = await withTimeout(socketIo.readReply(), 'rcpt-to');
      expect(reply, [250, 251], 'rcpt-to');
    }

    await socketIo.write(`DATA${CRLF}`);
    expect(await withTimeout(socketIo.readReply(), 'data'), [354], 'data');

    const message = buildMimeMessage({ from, to: toList, subject, html, text });
    await socketIo.write(`${dotStuff(message)}${CRLF}.${CRLF}`);
    const result = await withTimeout(socketIo.readReply(), 'data-end');
    expect(result, [250], 'data-end');

    try {
      await socketIo.write(`QUIT${CRLF}`);
      await withTimeout(socketIo.readReply(), 'quit');
    } catch {
      // QUIT 失败不影响投递结果
    }

    return { accepted: toList, response: result.text.slice(0, 200) };
  } finally {
    try {
      await socketIo.close();
    } catch {
      // 忽略关闭异常
    }
  }
}

/**
 * 基于 cloudflare:sockets 的生产环境 IO 实现（浏览器/Node 之外的 Workers 环境）。
 * 动态 import，避免 Node 测试环境加载不存在的模块。
 *
 * @param {{host:string, port:number, secureTransport?:'off'|'on'|'starttls'}} options
 */
export async function createSocketIo({ host, port, secureTransport = 'on' }) {
  const { connect } = await import('cloudflare:sockets');
  const socket = connect(`${host}:${port}`, { secureTransport });
  if (socket.opened) await socket.opened;

  const buildIo = (target) => {
    const reader = target.readable.getReader();
    const writer = target.writable.getWriter();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let buffer = '';

    // 读到一行（无 CRLF），EOF 或套接字被关闭时返回 null
    const readLine = async () => {
      for (;;) {
        const index = buffer.indexOf('\n');
        if (index !== -1) {
          const line = buffer.slice(0, index);
          buffer = buffer.slice(index + 1);
          return line.replace(/\r$/, '');
        }
        let chunk;
        try {
          chunk = await reader.read();
        } catch {
          return null; // 套接字已关闭
        }
        if (chunk.done) return null;
        buffer += decoder.decode(chunk.value, { stream: true });
      }
    };

    // 读一条完整 SMTP 响应：多行响应（250-xxx）持续读到 "ddd " 结尾行
    const readReply = async () => {
      const first = await readLine();
      if (first === null) throw new SmtpError('SMTP 连接已断开', { stage: 'read' });
      const lines = [first];
      if (/^\d{3}-/.test(first)) {
        for (;;) {
          const next = await readLine();
          if (next === null) break;
          lines.push(next);
          if (/^\d{3} /.test(next)) break;
        }
      }
      return parseReplyText(lines.join('\n'));
    };

    return {
      write: (text) => writer.write(encoder.encode(text)),
      readReply,
      async startTls() {
        if (typeof target.startTls !== 'function') throw new SmtpError('当前套接字不支持 STARTTLS', { stage: 'starttls' });
        const upgraded = target.startTls();
        if (upgraded.opened) await upgraded.opened;
        return buildIo(upgraded);
      },
      close: () => target.close(),
    };
  };

  return buildIo(socket);
}

/**
 * 一步发信（生产环境入口）。
 *
 * @param {{host:string, port:number, secure:'tls'|'starttls'|'none', auth?:{user:string,pass:string}, from:object, to:string[], subject:string, html?:string, text?:string, clientName?:string}} options
 */
export async function sendSmtpMail(options) {
  const secure = options.secure === 'starttls' ? 'starttls' : options.secure === 'none' ? 'off' : 'on';
  const io = await createSocketIo({ host: options.host, port: options.port, secureTransport: secure });
  return sendMailSession(io, {
    ...options,
    startTls: options.secure === 'starttls',
  });
}
