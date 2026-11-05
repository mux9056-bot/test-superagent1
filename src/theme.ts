export const THEME_STORAGE_KEY = 'todo-app.theme.v1';

export const THEMES = [
  {
    id: 'light',
    label: '浅色',
    description: '明亮清爽的默认外观',
    themeColor: '#f5f6f8',
  },
  {
    id: 'dark',
    label: '深色',
    description: '低亮度深色外观，适合夜间使用',
    themeColor: '#12161f',
  },
  {
    id: 'warm',
    label: '暖光',
    description: '柔和暖色外观，降低屏幕刺眼感',
    themeColor: '#f3ead9',
  },
  {
    id: 'contrast',
    label: '高对比',
    description: '黑白高对比外观，突出文字与控件边界',
    themeColor: '#000000',
  },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];

export const DEFAULT_THEME: ThemeId = 'light';

const THEME_IDS = new Set<string>(THEMES.map((theme) => theme.id));

export function isThemeId(value: string | null | undefined): value is ThemeId {
  return typeof value === 'string' && THEME_IDS.has(value);
}

export function getTheme(themeId: ThemeId) {
  return THEMES.find((theme) => theme.id === themeId) ?? THEMES[0];
}

export function readTheme(storage?: Pick<Storage, 'getItem'>): ThemeId {
  try {
    const target =
      storage ?? (typeof window === 'undefined' ? undefined : window.localStorage);
    if (!target) return DEFAULT_THEME;
    const stored = target.getItem(THEME_STORAGE_KEY);
    return isThemeId(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function writeTheme(
  themeId: ThemeId,
  storage?: Pick<Storage, 'setItem'>,
): void {
  try {
    const target =
      storage ?? (typeof window === 'undefined' ? undefined : window.localStorage);
    target?.setItem(THEME_STORAGE_KEY, themeId);
  } catch {
    // A blocked localStorage must not stop the theme from applying.
  }
}

export function applyTheme(themeId: ThemeId, root?: HTMLElement): void {
  if (typeof document === 'undefined') return;
  const target = root ?? document.documentElement;
  target.dataset.theme = themeId;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', getTheme(themeId).themeColor);
}
