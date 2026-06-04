/**
 * Runs staging validation scripts in sequence.
 * Usage: node scripts/staging-checklist.mjs
 */

import { spawnSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const steps = [
  { name: 'RLS validation', script: 'validate-rls.mjs' },
  { name: 'Staging E2E smoke', script: 'smoke-staging-e2e.mjs' },
];

let failed = 0;

console.log('\n=== CRENIT staging checklist (automated) ===\n');

for (const step of steps) {
  console.log(`--- ${step.name} ---`);
  const res = spawnSync('node', [join(__dirname, step.script)], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });
  if (res.status !== 0) {
    failed += 1;
    console.error(`\n✗ ${step.name} failed (exit ${res.status})\n`);
  } else {
    console.log(`\n✓ ${step.name} passed\n`);
  }
}

if (failed) {
  console.error(`${failed} step(s) failed. See docs/STAGING_RELEASE_CHECKLIST.md for manual UI steps.`);
  process.exit(1);
}

console.log('Automated staging checks passed.');
console.log('Next: manual UI path (invite → KYC → pay → confirm → score) in docs/STAGING_RELEASE_CHECKLIST.md');
process.exit(0);
