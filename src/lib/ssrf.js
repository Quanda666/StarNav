// SSRF 防护：拒绝对内网 / 回环 / 保留地址的出站请求，并在重定向时逐跳校验。
//
// 说明：标准 Cloudflare Workers 运行时通常本就无法访问回环 / 内网，
// 这里做的是纵深防御——同时覆盖自托管 workerd、配置了 Tunnel/私有网络的部署，
// 并避免把内网地址当作出站目标或被当成端口扫描跳板。

function ipv4PartsArePrivate(parts) {
  const [a, b] = parts;
  if (a === 0) return true; // 0.0.0.0/8 当前网络
  if (a === 10) return true; // 10.0.0.0/8 私有
  if (a === 127) return true; // 127.0.0.0/8 回环
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 链路本地（含云元数据 169.254.169.254）
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 私有
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 私有
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15 基准测试
  if (a >= 224) return true; // 224.0.0.0/4 组播 + 240.0.0.0/4 保留
  return false;
}

function isPrivateIpv6(host) {
  const h = host.toLowerCase();
  if (h === '::1' || h === '::') return true; // 回环 / 未指定
  if (h.startsWith('fc') || h.startsWith('fd')) return true; // fc00::/7 唯一本地地址
  if (h.startsWith('fe8') || h.startsWith('fe9') || h.startsWith('fea') || h.startsWith('feb')) return true; // fe80::/10 链路本地
  const mapped = h.match(/::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/); // IPv4-mapped ::ffff:a.b.c.d
  if (mapped) {
    const parts = mapped[1].split('.').map(Number);
    return parts.some((n) => n > 255) || ipv4PartsArePrivate(parts);
  }
  return false;
}

/**
 * 判断主机名是否属于内网 / 回环 / 保留地址（应禁止出站）。
 *
 * @param {string} hostname URL 的 hostname 部分。
 * @returns {boolean}
 */
export function isPrivateOrReservedHost(hostname) {
  let host = String(hostname || '').trim().toLowerCase();
  if (!host) return true;
  if (host.startsWith('[') && host.endsWith(']')) host = host.slice(1, -1); // 去掉 IPv6 字面量方括号

  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return true;

  // 非常规 IPv4 表示（整数 / 十六进制 / 八进制主机），一律拒绝以防绕过
  if (/^\d{8,10}$/.test(host) || /^0x[0-9a-f]+$/i.test(host) || /^0[0-7]+$/.test(host)) return true;

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const parts = ipv4.slice(1).map(Number);
    if (parts.some((n) => n > 255)) return true; // 非法 IPv4 视为不可信
    return ipv4PartsArePrivate(parts);
  }

  if (host.includes(':')) return isPrivateIpv6(host);

  return false;
}

/**
 * 校验 URL 协议与主机，返回解析后的 URL；不合法或指向内网时抛错。
 *
 * @param {string} rawUrl 待校验 URL。
 * @returns {URL}
 * @throws {Error} 协议非 http/https，或主机为内网/保留地址。
 */
export function assertFetchableUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('Invalid URL');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http/https URLs are allowed');
  }
  if (isPrivateOrReservedHost(parsed.hostname)) {
    throw new Error('Target host is not allowed');
  }
  return parsed;
}

const MAX_REDIRECTS = 5;

/**
 * 带 SSRF 防护的 fetch：禁用自动重定向，逐跳校验目标地址，拒绝内网/保留地址。
 *
 * 调用方式与 fetch 一致，但内部强制 `redirect: 'manual'`，自行跟随并校验每一跳。
 *
 * @param {string} rawUrl 初始请求 URL。
 * @param {RequestInit} [options] fetch 选项（method/headers/signal/cf 等会被透传）。
 * @returns {Promise<Response>}
 * @throws {Error} 任一跳目标不合法 / 指向内网，或重定向次数超限。
 */
export async function safeFetch(rawUrl, options = {}) {
  let currentUrl = rawUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const parsed = assertFetchableUrl(currentUrl);
    const response = await fetch(parsed.href, { ...options, redirect: 'manual' });
    const { status } = response;
    if (status >= 300 && status < 400) {
      const location = response.headers.get('location');
      if (!location) return response;
      currentUrl = new URL(location, parsed).href;
      continue;
    }
    return response;
  }
  throw new Error('Too many redirects');
}

/**
 * 流式读取响应体文本，累计字节超过上限即停止，防止超大响应撑爆 Worker 内存。
 *
 * @param {Response} response fetch 响应。
 * @param {number} [maxBytes=524288] 最大读取字节数（默认 512KB）。
 * @returns {Promise<string>}
 */
export async function readTextWithLimit(response, maxBytes = 512 * 1024) {
  const reader = response.body?.getReader?.();
  if (!reader) {
    const text = await response.text();
    return text.length > maxBytes ? text.slice(0, maxBytes) : text;
  }
  const decoder = new TextDecoder();
  let received = 0;
  let result = '';
  while (received < maxBytes) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    result += decoder.decode(value, { stream: true });
  }
  result += decoder.decode();
  try {
    await reader.cancel();
  } catch {
    // 已读完或已取消，忽略
  }
  return result;
}
