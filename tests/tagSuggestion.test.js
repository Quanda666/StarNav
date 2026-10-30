import test from 'node:test';
import assert from 'node:assert/strict';

import {
  suggestTagsLocally,
  normalizeAiTagSuggestions,
  mergeTagCandidates,
  isTagVocabularySparse,
} from '../src/services/aiService.js';
import { loadTagProfile } from '../src/services/tagService.js';

function profile(tagList = []) {
  const tags = new Map();
  const categories = new Map();
  for (const [name, total, catelog, cooc] of tagList) {
    tags.set(name.toLowerCase(), { name, total, categories: new Map(catelog ? [[catelog, cooc || total]] : []) });
    if (catelog) {
      if (!categories.has(catelog)) categories.set(catelog, new Map());
      categories.get(catelog).set(name, cooc || total);
    }
  }
  return { tags, categories };
}

test('优先复用站内已有标签（名称命中权重最高）', () => {
  const p = profile([
    ['AI', 30, 'AI 工具', 20],
    ['对话工具', 6, 'AI 工具', 5],
    ['图床', 12, '素材', 12],
  ]);
  const result = suggestTagsLocally({ name: 'ChatGPT', url: 'https://chat.openai.com/', catelog: 'AI 工具' }, p, { limit: 3 });
  assert.equal(result[0].name, 'AI');
  assert.equal(result[0].source, 'vocabulary');
  assert.ok(result.some((item) => item.name === '对话工具'));
});

test('标签与分类名相同时不重复推荐，书签名也不会变成标签', () => {
  const p = profile([['网盘', 20, '网盘', 20]]);
  const result = suggestTagsLocally({ name: '网盘', url: 'https://pan.example.com/', catelog: '网盘' }, p, { limit: 5 });
  assert.equal(result.find((item) => item.name === '网盘'), undefined);
});

test('词汇表为空时用语义词典与域名规则兜底', () => {
  const p = profile([]);
  assert.equal(isTagVocabularySparse(p), true);
  const byName = suggestTagsLocally({ name: '临时邮箱', url: 'https://mail.tm/', catelog: '工具' }, p, { limit: 3 });
  assert.ok(byName.some((item) => item.name === '邮箱短信'));
  const byDomain = suggestTagsLocally({ name: '示例', url: 'https://github.com/foo/bar', catelog: '开发' }, p, { limit: 3 });
  assert.ok(byDomain.some((item) => item.name === '代码托管'));
  assert.ok(byDomain.every((item) => item.reason.length > 0), '每个推荐都应带可解释理由');
});

test('已有标签被保留，避免二次推荐弄丢人工标签', () => {
  const p = profile([['AI', 30, 'AI 工具', 30]]);
  const result = suggestTagsLocally({ name: '某站', url: 'https://x.example/', catelog: '其他', tags: ['手工标签'] }, p, { limit: 5 });
  assert.ok(result.some((item) => item.name === '手工标签' && item.source === 'existing'));
});

test('AI 结果会归一化到站内大小写并过滤非法项', () => {
  const p = profile([['AI', 30, 'AI 工具', 30]]);
  const normalized = normalizeAiTagSuggestions(['ai', '图床', '这是一条特别特别特别特别长的标签', 'A'], p, { limit: 5 });
  const names = normalized.map((item) => item.name);
  assert.deepEqual(names, ['AI', '图床']);
  assert.equal(normalized[0].source, 'ai+vocabulary');
});

test('合并候选时同一标签只保留一条且取更高分', () => {
  const { tags, details } = mergeTagCandidates(
    [{ name: 'AI', score: 60, source: 'semantic', reason: 'a' }],
    [{ name: 'ai', score: 90, source: 'ai', reason: 'b' }],
    { limit: 5 },
  );
  assert.deepEqual(tags, ['AI']);
  assert.equal(details.length, 1);
  assert.equal(details[0].score, 90);
});

test('loadTagProfile 在数据库不可用时退化为空画像而不是抛错', async () => {
  const env = { NAV_DB: { prepare() { throw new Error('boom'); } } };
  const p = await loadTagProfile(env);
  assert.ok(p.tags instanceof Map);
  assert.equal(p.tags.size, 0);
});
