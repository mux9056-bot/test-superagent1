const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Format a Date as a local calendar date key (YYYY-MM-DD). */
export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayKey(now: Date = new Date()): string {
  return toDateKey(now);
}

/** Parse a YYYY-MM-DD key as a local midnight Date. */
export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function isValidDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_KEY_RE.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/** Add whole days to a calendar date key, keeping the local date text. */
export function addDays(key: string, days: number): string {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function nextMidnight(now: Date = new Date()): Date {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return next;
}

const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

/** Human label for a date key, relative to today: 今天/明天/11月7日 周五. */
export function formatDateLabel(key: string, today: string): string {
  if (key === today) return '今天';
  if (key === addDays(today, 1)) return '明天';
  if (key === addDays(today, -1)) return '昨天';
  const date = parseDateKey(key);
  const label = `${date.getMonth() + 1}月${date.getDate()}日`;
  return `${label} ${WEEKDAY_LABELS[date.getDay()]}`;
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${toDateKey(date)} ${date.getHours()}:${minutes}`;
}

export function isPastDate(key: string, today: string): boolean {
  return key < today;
}
