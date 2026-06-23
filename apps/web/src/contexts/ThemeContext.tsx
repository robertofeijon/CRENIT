'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  applyDarkPalette,
  clearDarkPaletteVars,
  DEFAULT_DARK_PALETTE,
  getNextDarkPalette,
  loadStoredDarkPalette,
  storeDarkPalette,
  type DarkPalette,
} from '../lib/dark-palette';

export type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'crenit-theme';

type ThemeContextValue = {
  theme: ThemeMode;
  darkPalette: DarkPalette | null;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  regenerateDarkPalette: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function applyThemeToDocument(mode: ThemeMode, palette?: DarkPalette | null) {
  const root = document.documentElement;
  if (mode === 'dark') {
    root.classList.add('dark');
    const p = palette || loadStoredDarkPalette() || DEFAULT_DARK_PALETTE;
    applyDarkPalette(p);
    storeDarkPalette(p);
    return p;
  }
  root.classList.remove('dark');
  clearDarkPaletteVars();
  return null;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Start light on server; beforeInteractive script + useEffect sync saved preference.
  const [theme, setThemeState] = useState<ThemeMode>('light');
  const [darkPalette, setDarkPalette] = useState<DarkPalette | null>(null);

  useEffect(() => {
    const stored = readStoredTheme();
    const palette = applyThemeToDocument(stored);
    setThemeState(stored);
    setDarkPalette(palette);
  }, []);

  const setTheme = useCallback((mode: ThemeMode) => {
    let palette: DarkPalette | null = null;
    if (mode === 'dark') {
      palette = loadStoredDarkPalette() || DEFAULT_DARK_PALETTE;
    }
    applyThemeToDocument(mode, palette);
    setThemeState(mode);
    setDarkPalette(palette);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [setTheme, theme]);

  const regenerateDarkPalette = useCallback(() => {
    const palette = getNextDarkPalette(darkPalette);
    applyDarkPalette(palette);
    storeDarkPalette(palette);
    setDarkPalette(palette);
  }, [darkPalette]);

  const value = useMemo(
    () => ({ theme, darkPalette, setTheme, toggleTheme, regenerateDarkPalette }),
    [theme, darkPalette, setTheme, toggleTheme, regenerateDarkPalette],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
