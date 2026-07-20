import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
function applyTheme(theme: Theme, _animate = false) {
  const root = document.documentElement;

  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const apply = () => {
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
  };

  // Instant theme switch: disable ALL transitions during the swap
  const css = document.createElement('style');
  css.textContent = '*,*::before,*::after{transition:none!important;animation:none!important}';
  document.head.appendChild(css);

  apply();

  // Remove the freeze on next frame so transitions resume for normal interactions
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      css.remove();
    });
  });
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Check localStorage first, default to dark for premium feel
    const stored = localStorage.getItem('mlm360-theme');
    return (stored as Theme) || 'dark';
  });

  // Apply theme on mount and when changed
  useEffect(() => {
    applyTheme(theme, false);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme('system', true);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('mlm360-theme', newTheme);
    applyTheme(newTheme, true);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeStore() {
  return useContext(ThemeContext);
}
