export type DarkPalette = {
  id: string;
  label: string;
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

/** Curated dark themes — brand-anchored navy & wine, not random hues. */
export const DARK_PALETTE_PRESETS: DarkPalette[] = [
  {
    id: 'midnight',
    label: 'Midnight',
    bg: '#0b0d12',
    card: '#12151c',
    cardAlt: '#161a22',
    elevated: '#1a1f28',
    border: '#252b36',
    text: '#f1f3f6',
    textSecondary: '#a8b0bd',
    textMuted: '#6b7280',
    accentSurface: '#2a1818',
    hover: '#1e232d',
  },
  {
    id: 'navy',
    label: 'Navy',
    bg: '#0c1018',
    card: '#131926',
    cardAlt: '#171e2e',
    elevated: '#1c2436',
    border: '#283044',
    text: '#eef2f8',
    textSecondary: '#9aa8be',
    textMuted: '#64748b',
    accentSurface: '#1f1520',
    hover: '#222a3c',
  },
  {
    id: 'wine',
    label: 'Wine',
    bg: '#100c0e',
    card: '#181214',
    cardAlt: '#1e1719',
    elevated: '#241c1f',
    border: '#32282c',
    text: '#f5f0f1',
    textSecondary: '#b8a8ad',
    textMuted: '#7a6b70',
    accentSurface: '#2d1518',
    hover: '#2a2024',
  },
];

export const DEFAULT_DARK_PALETTE = DARK_PALETTE_PRESETS[0];

export const DARK_PALETTE_STORAGE_KEY = 'crenit-dark-palette';

export function generateDarkPalette(): DarkPalette {
  const idx = Math.floor(Math.random() * DARK_PALETTE_PRESETS.length);
  return DARK_PALETTE_PRESETS[idx];
}

export function getNextDarkPalette(current: DarkPalette | null): DarkPalette {
  if (!current) return DARK_PALETTE_PRESETS[1];
  const idx = DARK_PALETTE_PRESETS.findIndex((p) => p.id === current.id);
  const next = idx < 0 ? 0 : (idx + 1) % DARK_PALETTE_PRESETS.length;
  return DARK_PALETTE_PRESETS[next];
}

export function loadStoredDarkPalette(): DarkPalette | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DARK_PALETTE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DarkPalette;
    return DARK_PALETTE_PRESETS.find((p) => p.id === parsed.id) ?? parsed;
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
