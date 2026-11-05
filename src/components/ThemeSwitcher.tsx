import { THEMES, type ThemeId } from '../theme';

interface ThemeSwitcherProps {
  theme: ThemeId;
  onChange: (theme: ThemeId) => void;
}

export function ThemeSwitcher({ theme, onChange }: ThemeSwitcherProps) {
  return (
    <fieldset className="theme-switcher">
      <legend className="theme-switcher-label">主题模式</legend>
      <div className="theme-options">
        {THEMES.map((option) => (
          <label
            key={option.id}
            className={`theme-option${theme === option.id ? ' is-active' : ''}`}
            title={option.description}
          >
            <input
              type="radio"
              name="theme"
              value={option.id}
              checked={theme === option.id}
              onChange={() => onChange(option.id)}
            />
            <span className={`theme-swatch theme-swatch-${option.id}`} aria-hidden="true" />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
