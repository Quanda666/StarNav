import test from 'node:test';
import assert from 'node:assert/strict';

import {
  stripHtml,
  parseDuckDuckGoHtml,
  parseDuckDuckGoLite,
  normalizeSearchResults,
  normalizeProvider,
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
  assert.equal(normalizeProvider('不存在'), 'duckduckgo');
  assert.equal(normalizeProvider(''), 'duckduckgo');
});
