/**
 * Pre/post deploy gate checklist (local verification).
 * Usage: node scripts/verify-deploy-gates.mjs
 *
 * Confirms repo artifacts for release 6edfdf8+; remote deploy/CI must be checked in dashboards.
 */

import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const REQUIRED_MIGRATIONS = ['0034_payment_eft_proofs.sql', '0035_notifications_realtime.sql'];
const MIN_COMMIT = '6edfdf8';

function git(cmd) {
  return execSync(cmd, { cwd: root, encoding: 'utf8' }).trim();
}

const checks = [];

function pass(name, detail) {
  checks.push({ name, ok: true, detail });
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail) {
  checks.push({ name, ok: false, detail });
  console.error(`✗ ${name}${detail ? ` — ${detail}` : ''}`);
}

console.log('\n=== CRENIT deploy gates (local) ===\n');

try {
  const head = git('git rev-parse --short HEAD');
  const branch = git('git rev-parse --abbrev-ref HEAD');
  pass('Git HEAD', `${head} on ${branch}`);
  if (head.length >= 7) {
    const headNum = parseInt(head.slice(0, 7), 16);
    const minNum = parseInt(MIN_COMMIT, 16);
    if (headNum < minNum) {
      fail('Release baseline', `HEAD ${head} is before expected ${MIN_COMMIT}+`);
    } else {
      pass('Release baseline', `>= ${MIN_COMMIT}`);
    }
  }
} catch (e) {
  fail('Git HEAD', e.message);
}

for (const file of REQUIRED_MIGRATIONS) {
  const path = join(root, 'supabase', 'migrations', file);
  if (existsSync(path)) {
    pass(`Migration ${file}`, 'present in repo');
  } else {
    fail(`Migration ${file}`, 'missing — apply on Supabase before deploy');
  }
}

const authScope = join(root, 'apps/web/src/providers/AuthScopeLayout.tsx');
if (existsSync(authScope)) {
  pass('AuthScopeLayout', 'marketing routes can skip AuthProvider');
} else {
  fail('AuthScopeLayout', 'missing');
}

const bell = join(root, 'apps/web/app/components/ui/NotificationBell.tsx');
if (existsSync(bell)) {
  pass('Notification bell', 'component present');
} else {
  fail('Notification bell', 'missing');
}

const legacyDashboard = join(root, 'apps/web/app/dashboard');
if (!existsSync(legacyDashboard)) {
  pass('Legacy /dashboard pages', 'removed (redirects in next.config.mjs)');
} else {
  fail('Legacy /dashboard pages', 'app/dashboard still exists — remove or redirect only');
}

for (const wf of ['cron.yml', 'cron-webhook-retry.yml']) {
  const path = join(root, '.github', 'workflows', wf);
  if (existsSync(path)) {
    pass(`Cron workflow ${wf}`, 'external scheduler wired');
  } else {
    fail(`Cron workflow ${wf}`, 'missing — schedulers only run in-process');
  }
}

if (existsSync(join(root, 'docs/OBSERVABILITY.md'))) {
  pass('Observability docs', 'docs/OBSERVABILITY.md');
} else {
  fail('Observability docs', 'missing docs/OBSERVABILITY.md');
}

console.log('\n--- Remote gates (manual) ---\n');
console.log('1. Vercel — redeploy apps/web from main HEAD; confirm build SHA matches git HEAD');
console.log('2. Render — redeploy API; EMAIL_CONTACT + CORS_ORIGIN include web URL');
console.log('3. Supabase — SQL Editor: run 0034 + 0035 if not applied; verify notifications on supabase_realtime');
console.log('4. GitHub Actions — web-e2e job: 9+ passed (or 5+ public if E2E secrets unset)');
console.log('   https://github.com/robertofeijon/CRENIT/actions/workflows/ci.yml');
console.log('5. Smoke — docs/STAGING_RELEASE_CHECKLIST.md §10 (bell + renewals)');
console.log('6. GitHub secrets — CRON_SECRET + API_URL for cron workflows; optional SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN');
console.log('7. Observability — docs/OBSERVABILITY.md; admin /admin/system-health\n');

const failed = checks.filter((c) => !c.ok).length;
if (failed) {
  console.error(`${failed} local check(s) failed.\n`);
  process.exit(1);
}

console.log('Local deploy gate checks passed. Complete remote steps above before sign-off.\n');
process.exit(0);
