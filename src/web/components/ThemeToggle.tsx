const STORAGE_KEY = 'mozare-theme';
type Theme = 'dark' | 'light';

/** DARK-01: dark is the default theme; light is a persisted opt-in. */
function initialTheme(): Theme {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return 'dark';
}

export function ThemeToggle() {
  const theme = initialTheme();
  const apply = (next: Theme) => {
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(STORAGE_KEY, next);
  };
  return (
    <button
      type="button"
      className="command-button"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      onClick={() => apply(theme === 'dark' ? 'light' : 'dark')}
    >
      {theme === 'dark' ? 'Light mode' : 'Dark mode'}
    </button>
  );
}

// Applied on module load so the first paint already matches the stored/default theme.
document.documentElement.setAttribute('data-theme', initialTheme());
