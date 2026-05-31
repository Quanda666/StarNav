import test from 'node:test';
import assert from 'node:assert/strict';

import { assertFetchableUrl, isPrivateOrReservedHost } from '../src/lib/ssrf.js';
import { sanitizeCategorySvgIcon } from '../src/pages/home/categories.js';

test('isPrivateOrReservedHost blocks loopback, private, link-local and reserved hosts', () => {
  const blocked = [
    'localhost', 'foo.localhost', 'service.local',
    '127.0.0.1', '127.1.2.3', '0.0.0.0',
    '10.0.0.1', '172.16.0.1', '172.31.255.255', '192.168.1.1',
    '169.254.169.254', '100.64.0.1', '198.18.0.1',
    '224.0.0.1', '240.0.0.1',
    '::1', '::', '[::1]', 'fc00::1', 'fd12::1', 'fe80::1',
    '2130706433', // 127.0.0.1 的整数写法
    '0x7f000001', // 127.0.0.1 的十六进制写法
    '::ffff:127.0.0.1', // IPv4-mapped 回环
    '256.256.256.256', // 非法 IPv4 → 视为不可信
  ];
  for (const host of blocked) {
    assert.equal(isPrivateOrReservedHost(host), true, `${host} 应被拦截`);
  }
});

test('isPrivateOrReservedHost allows normal public hosts', () => {
  const allowed = [
    'example.com', 'www.google.com', 'sub.domain.co.uk',
    '8.8.8.8', '1.1.1.1', '93.184.216.34',
    '172.15.0.1', '172.32.0.1', // 刚好在 172.16/12 之外
    '192.167.0.1', '192.169.0.1', // 刚好在 192.168/16 之外
    '11.0.0.1', '126.0.0.1', '128.0.0.1',
  ];
  for (const host of allowed) {
    assert.equal(isPrivateOrReservedHost(host), false, `${host} 应被放行`);
  }
});

test('assertFetchableUrl rejects non-http(s) protocols and private hosts', () => {
  assert.throws(() => assertFetchableUrl('ftp://example.com'), /http\/https/);
  assert.throws(() => assertFetchableUrl('file:///etc/passwd'), /http\/https/);
  assert.throws(() => assertFetchableUrl('http://127.0.0.1/admin'), /not allowed/);
  assert.throws(() => assertFetchableUrl('http://169.254.169.254/latest/meta-data'), /not allowed/);
  assert.throws(() => assertFetchableUrl('not a url'), /Invalid URL/);

  const ok = assertFetchableUrl('https://example.com/path');
  assert.equal(ok.hostname, 'example.com');
});

test('sanitizeCategorySvgIcon accepts a clean icon and rejects dangerous SVG', () => {
  const clean = '<svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z" fill="currentColor"/></svg>';
  assert.equal(sanitizeCategorySvgIcon(clean), clean);

  // 越界标签 / 危险属性 / 危险协议一律整体拒绝（返回 ''）
  assert.equal(sanitizeCategorySvgIcon('<svg><script>alert(1)</script></svg>'), '');
  assert.equal(sanitizeCategorySvgIcon('<svg onload="alert(1)"></svg>'), '');
  assert.equal(sanitizeCategorySvgIcon('<svg><foreignObject><body/></foreignObject></svg>'), '');
  assert.equal(sanitizeCategorySvgIcon('<svg><a xlink:href="javascript:alert(1)">x</a></svg>'), '');
  assert.equal(sanitizeCategorySvgIcon('<svg><animate onbegin="alert(1)"/></svg>'), '');
  assert.equal(sanitizeCategorySvgIcon('<svg><image href="x.png"/></svg>'), '');
  assert.equal(sanitizeCategorySvgIcon('<svg style="background:url(x)"></svg>'), '');
  assert.equal(sanitizeCategorySvgIcon('not an svg'), '');
});
