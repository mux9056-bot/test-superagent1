import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyTheme,
  DEFAULT_THEME,
  getTheme,
  isThemeId,
  readTheme,
  THEME_STORAGE_KEY,
  THEMES,
  writeTheme,
} from './theme';

beforeEach(() => {
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
  document.querySelector('meta[name="theme-color"]')?.remove();
});

describe('theme definitions', () => {
  it('provides four distinct theme modes', () => {
    expect(THEMES.map((theme) => theme.id)).toEqual(['light', 'dark', 'warm', 'contrast']);
    expect(new Set(THEMES.map((theme) => theme.label)).size).toBe(4);
    expect(DEFAULT_THEME).toBe('light');
  });

  it('validates theme ids', () => {
    expect(isThemeId('dark')).toBe(true);
    expect(isThemeId('warm')).toBe(true);
    expect(isThemeId('contrast')).toBe(true);
    expect(isThemeId('light')).toBe(true);
    expect(isThemeId('auto')).toBe(false);
    expect(isThemeId(null)).toBe(false);
    expect(isThemeId('')).toBe(false);
  });

  it('returns the matching theme definition', () => {
    expect(getTheme('dark').label).toBe('深色');
  });
});

describe('theme persistence', () => {
  it('defaults to light when nothing is stored', () => {
    expect(readTheme()).toBe('light');
  });

  it('reads a stored valid theme', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'warm');
    expect(readTheme()).toBe('warm');
  });

  it('ignores invalid stored values', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'neon');
    expect(readTheme()).toBe('light');
  });

  it('writes the selected theme', () => {
    writeTheme('contrast');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('contrast');
  });

  it('survives a blocked localStorage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });

    expect(readTheme()).toBe('light');
    expect(() => writeTheme('dark')).not.toThrow();
  });
});

describe('applyTheme', () => {
  it('sets the data-theme attribute and the browser theme color', () => {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.append(meta);

    applyTheme('dark');

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(meta.getAttribute('content')).toBe('#12161f');
  });
});
