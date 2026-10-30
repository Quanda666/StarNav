// 北京时间（UTC+8）工具。
//
// 背景：Cloudflare Workers 运行时无法保证 `Intl`/`toLocaleString` 的时区数据可用，
// 且容器 / 边缘节点的本地时区都是 UTC。因此这里全部用「UTC 毫秒 + 固定 +8h 偏移」
// 手算，不依赖 Intl，结果确定、可单测（中国无夏令时，偏移恒定）。
//
// 注意：D1 里 `CURRENT_TIMESTAMP` 存的是 UTC，格式 `YYYY-MM-DD HH:MM:SS`。
// 需要「北京时间某天」的范围查询时，用 beijingDayRangeUtc() 拿到对应的 UTC 文本边界。

export const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;
export const BEIJING_TIMEZONE_LABEL = '北京时间（UTC+8）';

const WEEKDAY_NAMES = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
const WEEKDAY_SHORT = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function toMillis(input) {
  if (input instanceof Date) return input.getTime();
  const value = Number(input);
  return Number.isFinite(value) ? value : Date.now();
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

/**
 * 把任意时刻转换为「北京时间的 UTC 视图」Date。
 * 例如北京时间 2026-10-30 08:00 → 该 Date 的 getUTCHours() 为 8。
 *
 * @param {Date|number} [input] 时间点，缺省为当前时刻。
 * @returns {Date}
 */
export function toBeijingDate(input) {
  return new Date(toMillis(input) + BEIJING_OFFSET_MS);
}

/**
 * 拆解北京时间的年月日时分秒与星期。
 *
 * @param {Date|number} [input]
 * @returns {{year:number,month:number,day:number,hour:number,minute:number,second:number,
 *   weekday:number,weekdayName:string,weekdayShort:string,date:string,time:string,
 *   dateTime:string,yearMonthDay:string,full:string}}
 */
export function getBeijingParts(input) {
  const d = toBeijingDate(input);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const hour = d.getUTCHours();
  const minute = d.getUTCMinutes();
  const second = d.getUTCSeconds();
  const weekday = d.getUTCDay();
  const date = `${year}-${pad2(month)}-${pad2(day)}`;
  const time = `${pad2(hour)}:${pad2(minute)}`;

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    weekday,
    weekdayName: WEEKDAY_NAMES[weekday],
    weekdayShort: WEEKDAY_SHORT[weekday],
    date,
    time,
    dateTime: `${date} ${time}`,
    yearMonthDay: `${year}年${month}月${day}日`,
    full: `${year}年${month}月${day}日 ${WEEKDAY_NAMES[weekday]} ${time}`,
  };
}

/**
 * 格式化为 `2026-10-30 15:30`，可选带上星期。
 *
 * @param {Date|number} [input]
 * @param {{withWeekday?: boolean, withSeconds?: boolean, chinese?: boolean}} [options]
 * @returns {string}
 */
export function formatBeijingDateTime(input, { withWeekday = false, withSeconds = false, chinese = false } = {}) {
  const p = getBeijingParts(input);
  const clock = withSeconds ? `${p.time}:${pad2(p.second)}` : p.time;
  const base = chinese ? `${p.yearMonthDay} ${clock}` : `${p.date} ${clock}`;
  return withWeekday ? `${base} ${p.weekdayName}` : base;
}

/**
 * 格式化为 `2026-10-30`（或中文 `2026年10月30日`）。
 *
 * @param {Date|number} [input]
 * @param {{chinese?: boolean}} [options]
 * @returns {string}
 */
export function formatBeijingDate(input, { chinese = false } = {}) {
  const p = getBeijingParts(input);
  return chinese ? p.yearMonthDay : p.date;
}

/**
 * 相对时间文案（用于「3 分钟前」「昨天 15:20」这类展示）。
 *
 * @param {Date|number} input 目标时刻。
 * @param {Date|number} [now] 参考时刻，缺省为当前。
 * @returns {string}
 */
export function formatBeijingRelative(input, now) {
  const target = toMillis(input);
  const base = toMillis(now);
  const diffMs = base - target;
  if (!Number.isFinite(target)) return '';
  if (diffMs < 0) return formatBeijingDateTime(target, { withWeekday: true });
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return '刚刚';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days === 1) return `昨天 ${getBeijingParts(target).time}`;
  if (days === 2) return `前天 ${getBeijingParts(target).time}`;
  if (days < 30) return `${days} 天前`;
  return formatBeijingDateTime(target);
}

/**
 * 北京时间「今天」对应的 UTC 文本边界，用于查询 D1 中的 UTC 时间戳。
 * 返回 `YYYY-MM-DD HH:MM:SS` 格式，可直接与 `datetime(col)` 做字符串比较。
 *
 * @param {Date|number} [input] 以哪个时刻的「北京日期」为基准。
 * @param {number} [dayOffset] 偏移天数（-1 表示昨天）。
 * @returns {{start:string,end:string,date:string}}
 */
export function beijingDayRangeUtc(input, dayOffset = 0) {
  const p = getBeijingParts(input);
  const startUtcMs = Date.UTC(p.year, p.month - 1, p.day + dayOffset) - BEIJING_OFFSET_MS;
  const endUtcMs = startUtcMs + 24 * 60 * 60 * 1000;
  const fmt = (ms) => {
    const d = new Date(ms);
    return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())} `
      + `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`;
  };
  const dateUtc = new Date(startUtcMs + BEIJING_OFFSET_MS);
  return {
    start: fmt(startUtcMs),
    end: fmt(endUtcMs),
    date: `${dateUtc.getUTCFullYear()}-${pad2(dateUtc.getUTCMonth() + 1)}-${pad2(dateUtc.getUTCDate())}`,
  };
}

/**
 * 把 UTC 文本时间戳（`YYYY-MM-DD HH:MM:SS`，含 D1 常见变体）转成北京时间展示字符串。
 *
 * @param {string|Date|number} value 存储值。
 * @param {{withWeekday?: boolean, chinese?: boolean}} [options]
 * @returns {string}
 */
export function formatStoredUtcToBeijing(value, options = {}) {
  if (value instanceof Date) return formatBeijingDateTime(value, options);
  const text = String(value ?? '').trim();
  if (!text) return '';
  // D1/SQLite 常见：`2026-10-30 07:00:00`、`2026-10-30T07:00:00Z`、`2026-10-30T07:00:00.000Z`
  const normalized = text.includes('T') ? text : text.replace(' ', 'T');
  const withZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(normalized) ? normalized : `${normalized}Z`;
  const ms = Date.parse(withZone);
  if (!Number.isFinite(ms)) return text;
  return formatBeijingDateTime(ms, options);
}
