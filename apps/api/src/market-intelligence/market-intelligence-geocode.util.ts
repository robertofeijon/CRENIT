/** Normalize suburb labels for comparison (Windhoek listings). */
export function normalizeSuburbLabel(value: string | null | undefined): string {
  if (!value?.trim()) return '';
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,]/g, '');
}

export function suburbsMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizeSuburbLabel(a);
  const nb = normalizeSuburbLabel(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

/** Great-circle distance in metres between two WGS84 points. */
export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
