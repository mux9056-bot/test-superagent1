import { useCallback, useEffect, useState } from 'react';
import { applyTheme, readTheme, writeTheme, type ThemeId } from '../theme';

export function useTheme(): [ThemeId, (themeId: ThemeId) => void] {
  const [theme, setTheme] = useState<ThemeId>(() => readTheme());

  useEffect(() => {
    applyTheme(theme);
    writeTheme(theme);
  }, [theme]);

  const changeTheme = useCallback((themeId: ThemeId) => setTheme(themeId), []);

  return [theme, changeTheme];
}
