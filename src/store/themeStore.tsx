import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  /** Apply a theme as the system default without pinning it as the user's override. */
  applyGlobalDefault: (theme: Theme) => void;
  /** Reset the user's local override and fall back to the global default. */
  resetToGlobal: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  setTheme: () => {},
  applyGlobalDefault: () => {},
  resetToGlobal: () => {},
});

const STORAGE_KEY = 'mlm360-theme';
const OVERRIDE_KEY = 'mlm360-theme-override';

/**
 * Apply theme to document with proper color-scheme sync
 * Updates meta theme-color for mobile browser chrome
 */
function applyTheme(theme: Theme) {
  const root = document.documentElement;

  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Instant theme switch: disable ALL transitions during the swap
  const css = document.createElement('style');
  css.textContent = '*,*::before,*::after{transition:none!important;animation:none!important}';
  document.head.appendChild(css);

  if (isDark) {
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  }

  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', isDark ? '#0a0a0a' : '#ffffff');
  }

  // Remove the freeze on next frame so transitions resume for normal interactions
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      css.remove();
    });
  });
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    // Default to 'system' so new visitors follow their OS color-scheme
    // preference instead of being forced into dark mode.
    return (stored as Theme) || 'system';
  });

  // Apply theme on mount and when changed
  useEffect(() => {
    applyTheme(theme);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // User-initiated theme change: persist locally and mark as a personal override
  // so the global default from system_config no longer overwrites it.
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
    localStorage.setItem(OVERRIDE_KEY, '1');
    applyTheme(newTheme);
  }, []);

  // Apply a theme as the system default (used by ThemeSync when reading global_theme).
  // Does NOT mark a personal override — any user without an override follows this default.
  const applyGlobalDefault = useCallback((next: Theme) => {
    localStorage.setItem(STORAGE_KEY, next);
    setThemeState(next);
    applyTheme(next);
  }, []);

  const resetToGlobal = useCallback(() => {
    localStorage.removeItem(OVERRIDE_KEY);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, applyGlobalDefault, resetToGlobal }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * ThemeSync — rendered inside ConfigProvider.
 *
 * Behavior:
 * - The admin sets a global default theme via system_config (`global_theme`) from
 *   the Settings page. That default is applied to every visitor on first load.
 * - Once a user picks their own theme via the navbar/dashboard toggle, we record
 *   a local override (`mlm360-theme-override`) and stop re-applying the global
 *   default to them. Their personal choice persists across reloads.
 * - Only the admin's Settings page writes `global_theme` to system_config.
 *   Regular user toggles NEVER mutate the global default.
 */
export function ThemeSync({ globalTheme }: { globalTheme: string | undefined }) {
  const { theme, applyGlobalDefault } = useThemeStore();

  useEffect(() => {
    if (!globalTheme) return;
    const valid: Theme[] = ['light', 'dark', 'system'];
    if (!valid.includes(globalTheme as Theme)) return;
    const hasOverride = localStorage.getItem(OVERRIDE_KEY) === '1';
    if (hasOverride) return; // respect user's personal choice
    if (globalTheme !== theme) {
      applyGlobalDefault(globalTheme as Theme);
    }
  }, [globalTheme, theme, applyGlobalDefault]);

  return null;
}

export function useThemeStore() {
  return useContext(ThemeContext);
}

/**
 * Returns the resolved dark/light state, taking 'system' theme into account.
 * Use this in navbars/headers so the toggle icon matches what the user actually sees.
 */
export function useIsDark() {
  const { theme } = useThemeStore();
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return theme === 'dark';
    return theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (theme === 'dark') { setIsDark(true); return; }
    if (theme === 'light') { setIsDark(false); return; }
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setIsDark(mq.matches);
    setIsDark(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  return isDark;
}
