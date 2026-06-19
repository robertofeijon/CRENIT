/**
 * Capture flywheel baseline from admin system-health API.
 * Usage:
 *   ADMIN_TOKEN=<jwt> API_URL=https://your-api node scripts/capture-flywheel-baseline.mjs
 */

const apiUrl = (process.env.API_URL || 'http://localhost:3001').replace(/\/$/, '');
const token = process.env.ADMIN_TOKEN || process.env.ADMIN_JWT;

if (!token) {
  console.error('Set ADMIN_TOKEN (admin Bearer JWT from staging login).');
  process.exit(1);
}

const res = await fetch(`${apiUrl}/admin/system-health/overview`, {
  headers: { Authorization: `Bearer ${token}` },
});

if (!res.ok) {
  console.error(`API ${res.status}: ${await res.text()}`);
  process.exit(1);
}

const body = await res.json();
const flywheel = body?.data?.flywheel_metrics || body?.data?.flywheel || body?.data;
const out = {
  captured_at: new Date().toISOString(),
  api_url: apiUrl,
  flywheel,
};

console.log(JSON.stringify(out, null, 2));
console.error('\nSave this output as your staging flywheel baseline (e.g. docs/staging-flywheel-baseline.json).');
