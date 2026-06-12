/** Windhoek suburbs for local trust signals in UI copy */
export const WINDHOEK_SUBURBS = [
  'Kleine Kuppe',
  'Eros',
  'Ludwigsdorf',
  'Khomasdal',
  'Olympia',
  'Pionierspark',
  'Windhoek North',
  'Windhoek West',
  'Auasblick',
  'Rocky Crest',
] as const;

export const NAMIBIAN_BANK_REF_HINTS: Record<string, string> = {
  FNB: 'FNB Namibia — reference often starts with your tenant code or invoice number',
  BANK_WINDHOEK: 'Bank Windhoek — use the payment reference exactly as shown',
  STANDARD_BANK: 'Standard Bank Namibia — include branch reference if provided',
};
