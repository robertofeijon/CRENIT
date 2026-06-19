export type DarkPalette = {
  bg: string;
  card: string;
  cardAlt: string;
  elevated: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accentSurface: string;
  hover: string;
};

function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const light = l / 100;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = light - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** Picks varied deep hues — each dark mode session gets its own moody palette. */
export function generateDarkPalette(): DarkPalette {
  const pick = (lMin: number, lMax: number, sMin = 12, sMax = 38) => {
    const h = Math.floor(Math.random() * 360);
    const s = sMin + Math.floor(Math.random() * (sMax - sMin));
    const l = lMin + Math.floor(Math.random() * (lMax - lMin));
    return hslToHex(h, s, l);
  };

  return {
    bg: pick(6, 11),
    card: pick(10, 16),
    cardAlt: pick(12, 18),
    elevated: pick(14, 20),
    border: pick(18, 26, 8, 22),
    text: pick(88, 94, 6, 14),
    textSecondary: pick(68, 78, 8, 18),
    textMuted: pick(48, 58, 6, 16),
    accentSurface: pick(16, 24, 20, 45),
    hover: pick(20, 28, 14, 32),
  };
}

export const DARK_PALETTE_STORAGE_KEY = 'crenit-dark-palette';

export function loadStoredDarkPalette(): DarkPalette | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DARK_PALETTE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DarkPalette;
  } catch {
    return null;
  }
}

export function storeDarkPalette(palette: DarkPalette) {
  try {
    localStorage.setItem(DARK_PALETTE_STORAGE_KEY, JSON.stringify(palette));
  } catch {
    /* ignore */
  }
}

export function applyDarkPalette(palette: DarkPalette) {
  const root = document.documentElement;
  root.style.setProperty('--rc-bg', palette.bg);
  root.style.setProperty('--rc-card', palette.card);
  root.style.setProperty('--rc-card-alt', palette.cardAlt);
  root.style.setProperty('--rc-elevated', palette.elevated);
  root.style.setProperty('--rc-border', palette.border);
  root.style.setProperty('--rc-text', palette.text);
  root.style.setProperty('--rc-text-secondary', palette.textSecondary);
  root.style.setProperty('--rc-text-muted', palette.textMuted);
  root.style.setProperty('--rc-accent-surface', palette.accentSurface);
  root.style.setProperty('--rc-hover', palette.hover);
}

export function clearDarkPaletteVars() {
  const root = document.documentElement;
  const keys = [
    '--rc-bg',
    '--rc-card',
    '--rc-card-alt',
    '--rc-elevated',
    '--rc-border',
    '--rc-text',
    '--rc-text-secondary',
    '--rc-text-muted',
    '--rc-accent-surface',
    '--rc-hover',
  ];
  for (const key of keys) root.style.removeProperty(key);
}
