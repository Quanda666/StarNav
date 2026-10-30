import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getBeijingParts,
  formatBeijingDateTime,
  formatBeijingRelative,
  beijingDayRangeUtc,
  formatStoredUtcToBeijing,
} from '../src/lib/datetime.js';

// 2026-10-30 是星期五；UTC 07:30 = 北京时间 15:30
const FIXED_UTC = Date.UTC(2026, 9, 30, 7, 30, 0);

test('北京时间换算：UTC+8 且星期正确', () => {
  const p = getBeijingParts(FIXED_UTC);
  assert.equal(p.date, '2026-10-30');
  assert.equal(p.time, '15:30');
  assert.equal(p.weekdayName, '星期五');
  assert.equal(p.yearMonthDay, '2026年10月30日');
  assert.equal(p.full, '2026年10月30日 星期五 15:30');
});

test('跨日边界：UTC 前一天 16:00 已是北京次日 00:00', () => {
  const p = getBeijingParts(Date.UTC(2026, 9, 30, 16, 0, 0));
  assert.equal(p.date, '2026-10-31');
  assert.equal(p.time, '00:00');
  assert.equal(p.weekdayName, '星期六');
});

test('格式化为常见展示形式', () => {
  assert.equal(formatBeijingDateTime(FIXED_UTC), '2026-10-30 15:30');
  assert.equal(formatBeijingDateTime(FIXED_UTC, { withWeekday: true }), '2026-10-30 15:30 星期五');
  assert.equal(formatBeijingDateTime(FIXED_UTC, { chinese: true }), '2026年10月30日 15:30');
  assert.equal(formatBeijingDateTime(FIXED_UTC, { withSeconds: true }), '2026-10-30 15:30:00');
});

test('相对时间文案覆盖刚过去的时间段', () => {
  const now = FIXED_UTC;
  assert.equal(formatBeijingRelative(now - 20 * 1000, now), '刚刚');
  assert.equal(formatBeijingRelative(now - 5 * 60 * 1000, now), '5 分钟前');
  assert.equal(formatBeijingRelative(now - 3 * 3600 * 1000, now), '3 小时前');
  assert.equal(formatBeijingRelative(now - 24 * 3600 * 1000, now), '昨天 15:30');
  assert.equal(formatBeijingRelative(now - 3 * 24 * 3600 * 1000, now), '3 天前');
});

test('北京「今天」的 UTC 边界正好是 16:00', () => {
  const range = beijingDayRangeUtc(FIXED_UTC);
  assert.equal(range.start, '2026-10-29 16:00:00');
  assert.equal(range.end, '2026-10-30 16:00:00');
  assert.equal(range.date, '2026-10-30');
  const yesterday = beijingDayRangeUtc(FIXED_UTC, -1);
  assert.equal(yesterday.start, '2026-10-28 16:00:00');
});

test('D1 存储的 UTC 文本被正确转成北京时间', () => {
  assert.equal(formatStoredUtcToBeijing('2026-10-30 07:30:00'), '2026-10-30 15:30');
  assert.equal(formatStoredUtcToBeijing('2026-10-30T07:30:00Z'), '2026-10-30 15:30');
  assert.equal(formatStoredUtcToBeijing(''), '');
  assert.equal(formatStoredUtcToBeijing('不是时间'), '不是时间');
});
