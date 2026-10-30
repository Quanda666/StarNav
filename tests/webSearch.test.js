import test from 'node:test';
import assert from 'node:assert/strict';

import {
  stripHtml,
  parseDuckDuckGoHtml,
  parseDuckDuckGoLite,
  normalizeSearchResults,
  normalizeProvider,
  extractMetasoResults,
  WEB_SEARCH_PROVIDERS,
} from '../src/services/webSearchService.js';

test('stripHtml 去标签、解码实体、压空白', () => {
  assert.equal(stripHtml('<b>Hello</b> &amp; <i>world</i>'), 'Hello & world');
  assert.equal(stripHtml('<script>var a=1;</script>正文'), '正文');
  assert.equal(stripHtml('  a\n\n  b  '), 'a b');
});

test('解析 DuckDuckGo HTML 结果（含 uddg 跳转还原）', () => {
  const html = `
    <div class="result">
      <a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fpage&amp;rut=abc">Example <b>Site</b></a>
      <a class="result__snippet" href="x">示例站点，提供 API 服务</a>
    </div>
    <div class="result">
      <a class="result__a" href="https://direct.example.org/">Direct</a>
      <div class="result__snippet">直链结果</div>
    </div>`;
  const results = parseDuckDuckGoHtml(html, 5);
  assert.equal(results.length, 2);
  assert.equal(results[0].url, 'https://example.com/page');
  assert.equal(results[0].title, 'Example Site');
  assert.match(results[0].snippet, /示例站点/);
  assert.equal(results[1].url, 'https://direct.example.org/');
});

test('解析 DuckDuckGo Lite 结果（链接与摘要按序配对）', () => {
  const html = `
    <table>
      <tr><td><a class="result-link" href="https://a.example/">A 站</a></td></tr>
      <tr><td class="result-snippet">A 的摘要</td></tr>
      <tr><td><a class="result-link" href="https://b.example/">B 站</a></td></tr>
      <tr><td class="result-snippet">B 的摘要</td></tr>
    </table>`;
  const results = parseDuckDuckGoLite(html, 5);
  assert.equal(results.length, 2);
  assert.deepEqual(results.map((item) => item.title), ['A 站', 'B 站']);
  assert.deepEqual(results.map((item) => item.snippet), ['A 的摘要', 'B 的摘要']);
});

test('normalizeSearchResults 只保留 http(s) 结果并去重', () => {
  const results = normalizeSearchResults([
    { title: 'A', link: 'https://a.example/', snippet: 'x' },
    { title: 'A 重复', link: 'https://a.example/', snippet: 'y' },
    { title: '非法', link: 'javascript:alert(1)' },
    { name: 'B', url: 'http://b.example/', content: '内容' },
  ], 5);
  assert.equal(results.length, 2);
  assert.equal(results[0].snippet, 'x');
  assert.equal(results[1].url, 'http://b.example/');
});

test('normalizeProvider 回退到已知后端', () => {
  assert.equal(normalizeProvider('tavily'), 'tavily');
  assert.equal(normalizeProvider('TAVILY'), 'tavily');
  assert.equal(normalizeProvider('metaso'), 'metaso');
  assert.equal(normalizeProvider('不存在'), 'duckduckgo');
  assert.equal(normalizeProvider(''), 'duckduckgo');
});

test('秘塔搜索后端已注册且需要 Key', () => {
  const metaso = WEB_SEARCH_PROVIDERS.find((item) => item.id === 'metaso');
  assert.ok(metaso, '应包含 metaso 后端');
  assert.equal(metaso.needsKey, true);
});

test('秘塔响应解析：兼容 data.webpages / results / items 三种结构', () => {
  const pages = extractMetasoResults({
    data: {
      webpages: [
        { position: 1, title: 'Workers 文档', link: 'https://developers.cloudflare.com/workers/', summary: '运行时文档' },
        { position: 2, title: '重复项', link: 'https://developers.cloudflare.com/workers/', summary: '同链接' },
      ],
      credits: 99,
    },
  }, 5);
  assert.equal(pages.results.length, 1, '同链接应去重');
  assert.equal(pages.results[0].title, 'Workers 文档');
  assert.equal(pages.results[0].snippet, '运行时文档');

  const flat = extractMetasoResults({ results: [{ name: 'A', url: 'https://a.example/', content: '内容' }] }, 5);
  assert.deepEqual(flat.results.map((item) => item.url), ['https://a.example/']);

  const empty = extractMetasoResults({ data: { answer: '只有 AI 回答' } }, 5);
  assert.equal(empty.results.length, 0);
  assert.match(empty.keys, /answer/, '未识别时应回携顶层字段名便于排查');
});
