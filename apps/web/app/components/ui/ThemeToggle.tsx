'use client';

import { Moon, Sun, Sparkles } from 'lucide-react';
import { useTheme } from '../../../src/contexts/ThemeContext';

type Props = {
  compact?: boolean;
  className?: string;
};

export default function ThemeToggle({ compact = false, className = '' }: Props) {
  const { theme, setTheme, toggleTheme, regenerateDarkPalette } = useTheme();
  const isDark = theme === 'dark';

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`inline-flex items-center justify-center rounded-full border border-[var(--rc-border,#e5e7eb)] bg-[var(--rc-card,#fff)] p-2 text-[var(--rc-text-secondary,#64748b)] transition hover:bg-[var(--rc-hover,#f8fafc)] ${className}`}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        title={isDark ? 'Light mode' : 'Dark mode'}
      >
        {isDark ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
      </button>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1 rounded-full border border-[var(--rc-border,#e5e7eb)] bg-[var(--rc-card,#fff)] p-1 ${className}`}>
      <button
        type="button"
        onClick={() => setTheme('light')}
        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
          !isDark ? 'bg-[#C0392B] text-white' : 'text-[var(--rc-text-secondary,#64748b)] hover:text-[var(--rc-text,#111)]'
        }`}
        aria-pressed={!isDark}
      >
        <span className="inline-flex items-center gap-1.5">
          <Sun className="h-3.5 w-3.5" aria-hidden />
          Light
        </span>
      </button>
      <button
        type="button"
        onClick={() => setTheme('dark')}
        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
          isDark ? 'bg-[var(--rc-accent-surface,#1e293b)] text-[var(--rc-text,#f1f5f9)]' : 'text-[var(--rc-text-secondary,#64748b)] hover:text-[var(--rc-text,#111)]'
        }`}
        aria-pressed={isDark}
      >
        <span className="inline-flex items-center gap-1.5">
          <Moon className="h-3.5 w-3.5" aria-hidden />
          Dark
        </span>
      </button>
      {isDark ? (
        <button
          type="button"
          onClick={regenerateDarkPalette}
          className="rounded-full p-1.5 text-[var(--rc-text-muted,#94a3b8)] transition hover:bg-[var(--rc-hover,#334155)] hover:text-[var(--rc-text,#f1f5f9)]"
          aria-label="Shuffle dark colors"
          title="New random dark palette"
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
