#!/usr/bin/env node
/**
 * Push CI E2E secrets to GitHub Actions from .env.staging
 * Requires: GitHub CLI (`gh`) installed and authenticated (`gh auth login`)
 * Usage: npm run setup:github-e2e-secrets
 */

import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const stagingFile = join(root, '.env.staging');

const SECRET_KEYS = [
  'E2E_TENANT_EMAIL',
  'E2E_TENANT_PASSWORD',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_API_URL',
];

function loadEnv(path) {
  const env = {};
  if (!existsSync(path)) return env;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

function gh(args) {
  const result = spawnSync('gh', args, { encoding: 'utf8', shell: process.platform === 'win32' });
  if (result.error?.code === 'ENOENT') {
    console.error('GitHub CLI (gh) not found. Install: https://cli.github.com/');
    console.error('Then run: gh auth login');
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    process.exit(result.status || 1);
  }
  return result.stdout;
}

if (!existsSync(stagingFile)) {
  console.error(`Missing ${stagingFile}`);
  console.error('Copy .env.staging.example → .env.staging and fill Supabase + API URLs.');
  process.exit(1);
}

const env = loadEnv(stagingFile);
const missing = SECRET_KEYS.filter((key) => !env[key] || env[key].includes('your-'));
if (missing.length) {
  console.error(`Fill these in .env.staging before continuing:\n  ${missing.join('\n  ')}`);
  process.exit(1);
}

gh(['auth', 'status']);

for (const key of SECRET_KEYS) {
  gh(['secret', 'set', key, '--body', env[key]]);
  console.log(`Set secret ${key}`);
}

console.log('\nDone. Re-run the web-e2e job on main to verify login.spec.ts passes.');
