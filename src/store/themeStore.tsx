import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useDatabase } from '@/lib/backend';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  setTheme: () => {},
});

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
    const stored = localStorage.getItem('mlm360-theme');
    return (stored as Theme) || 'dark';
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

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('mlm360-theme', newTheme);
    applyTheme(newTheme);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * ThemeSync — rendered inside ConfigProvider.
 * Reads `global_theme` from system_config and applies it globally.
 * When any user (typically admin) changes the theme via setTheme, it persists
 * to system_config so all users get the same theme.
 */
export function ThemeSync({ globalTheme }: { globalTheme: string | undefined }) {
  const { theme, setTheme } = useThemeStore();
  const database = useDatabase();

  // Apply global theme from config when it changes
  useEffect(() => {
    if (!globalTheme) return;
    const valid: Theme[] = ['light', 'dark', 'system'];
    if (valid.includes(globalTheme as Theme) && globalTheme !== theme) {
      setTheme(globalTheme as Theme);
    }
  }, [globalTheme, theme, setTheme]);

  // Persist theme changes to system_config
  useEffect(() => {
    const t = setTimeout(() => {
      if (theme) {
        database.upsert('system_config', {
          key: 'global_theme',
          value: theme,
          category: 'general',
          updated_at: new Date().toISOString(),
        }, 'key').catch(() => {});
      }
    }, 300);
    return () => clearTimeout(t);
  }, [theme, database]);

  return null;
}

export function useThemeStore() {
  return useContext(ThemeContext);
}
