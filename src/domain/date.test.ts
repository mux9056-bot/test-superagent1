import { describe, expect, it } from 'vitest';
import {
  addDays,
  formatDateLabel,
  isValidDateKey,
  nextMidnight,
  parseDateKey,
  toDateKey,
} from './date';
import { countVisibleChars, matchesKeyword, normalizeTitle } from './text';

describe('date helpers', () => {
  it('formats local calendar dates, not UTC dates', () => {
    expect(toDateKey(new Date(2026, 10, 5, 23, 59))).toBe('2026-11-05');
    expect(toDateKey(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01');
  });

  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-11-05', 1)).toBe('2026-11-06');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('validates real calendar dates only', () => {
    expect(isValidDateKey('2026-11-05')).toBe(true);
    expect(isValidDateKey('2026-02-30')).toBe(false);
    expect(isValidDateKey('2026-1-5')).toBe(false);
    expect(isValidDateKey('not-a-date')).toBe(false);
  });

  it('labels relative dates and other dates', () => {
    expect(formatDateLabel('2026-11-05', '2026-11-05')).toBe('今天');
    expect(formatDateLabel('2026-11-06', '2026-11-05')).toBe('明天');
    expect(formatDateLabel('2026-11-04', '2026-11-05')).toBe('昨天');
    expect(formatDateLabel('2026-11-12', '2026-11-05')).toBe('11月12日 周四');
  });

  it('computes the next local midnight', () => {
    const next = nextMidnight(new Date(2026, 10, 5, 23, 59, 30));
    expect(next.getFullYear()).toBe(2026);
    expect(next.getMonth()).toBe(10);
    expect(next.getDate()).toBe(6);
    expect(next.getHours()).toBe(0);
    expect(parseDateKey('2026-11-05').getHours()).toBe(0);
  });
});

describe('text helpers', () => {
  it('counts user-visible characters including emoji', () => {
    expect(countVisibleChars('中文abc')).toBe(5);
    expect(countVisibleChars('😀')).toBe(1);
    expect(countVisibleChars('👍🏽')).toBe(1);
    expect(countVisibleChars('👨‍👩‍👧‍👦')).toBe(1);
    expect(countVisibleChars('e\u0301')).toBe(1);
  });

  it('normalizes line breaks in titles', () => {
    expect(normalizeTitle('a\nb\r\nc')).toBe('a b c');
  });

  it('matches keywords case-insensitively as substrings', () => {
    expect(matchesKeyword('Hello World', 'hello')).toBe(true);
    expect(matchesKeyword('Hello World', 'WORLD')).toBe(true);
    expect(matchesKeyword('Hello World', 'lo wo')).toBe(true);
    expect(matchesKeyword('Hello World', 'xyz')).toBe(false);
  });
});
