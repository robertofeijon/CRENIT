/**
 * Adds Sentry env placeholders to gitignored .env files.
 * Usage: node scripts/configure-sentry-env.mjs
 * Then paste real DSN values from https://sentry.io
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const SNIPPET_ROOT = `
# --- Sentry (optional) ---
# SENTRY_DSN=https://...@....ingest.sentry.io/...
# SENTRY_ENVIRONMENT=staging
`;

const SNIPPET_WEB = `
# --- Sentry (optional) ---
# NEXT_PUBLIC_SENTRY_DSN=https://...@....ingest.sentry.io/...
# NEXT_PUBLIC_SENTRY_ENVIRONMENT=staging
# NEXT_PUBLIC_SENTRY_PROJECT_URL=https://sentry.io/organizations/your-org/projects/crenit-web/
`;

function appendIfMissing(path, snippet, marker) {
  if (!existsSync(path)) {
    writeFileSync(path, snippet.trimStart(), 'utf8');
    console.log(`Created ${path}`);
    return;
  }
  const content = readFileSync(path, 'utf8');
  if (content.includes(marker)) {
    console.log(`Skip ${path} (already has ${marker})`);
    return;
  }
  writeFileSync(path, `${content.trimEnd()}\n${snippet}`, 'utf8');
  console.log(`Updated ${path}`);
}

appendIfMissing(join(root, '.env'), SNIPPET_ROOT, 'SENTRY_DSN');
appendIfMissing(join(root, 'apps/web/.env.local'), SNIPPET_WEB, 'NEXT_PUBLIC_SENTRY_DSN');

console.log('\nPaste DSN values from Sentry, then redeploy Render + Vercel. See docs/OBSERVABILITY.md.\n');
