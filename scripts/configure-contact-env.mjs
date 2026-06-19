#!/usr/bin/env node
/**
 * Ensure EMAIL_CONTACT (API) and NEXT_PUBLIC_CONTACT_EMAIL (web) are set locally.
 * Usage: node scripts/configure-contact-env.mjs
 * Optional: CONTACT_EMAIL=you@domain.com node scripts/configure-contact-env.mjs
 */

import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const contactEmail = (process.env.CONTACT_EMAIL || 'robertofeijon@gmail.com').trim();

function upsertKey(filePath, key, value) {
  let content = existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  content = pattern.test(content) ? content.replace(pattern, line) : `${content.replace(/\s*$/, '')}\n${line}\n`;
  writeFileSync(filePath, content, 'utf8');
}

const rootEnv = join(root, '.env');
const webEnv = join(root, 'apps/web/.env.local');

if (!existsSync(rootEnv)) {
  copyFileSync(join(root, '.env.example'), rootEnv);
  console.log('Created .env from .env.example');
}
if (!existsSync(webEnv)) {
  copyFileSync(join(root, 'apps/web/.env.local.example'), webEnv);
  console.log('Created apps/web/.env.local from .env.local.example');
}

upsertKey(rootEnv, 'EMAIL_CONTACT', contactEmail);
upsertKey(rootEnv, 'EMAIL_REPLY_TO', contactEmail);
upsertKey(webEnv, 'NEXT_PUBLIC_CONTACT_EMAIL', contactEmail);

console.log(`Contact email configured as ${contactEmail}`);
console.log(`  API:  ${rootEnv} (EMAIL_CONTACT, EMAIL_REPLY_TO)`);
console.log(`  Web:  ${webEnv} (NEXT_PUBLIC_CONTACT_EMAIL)`);
console.log('');
console.log('Production: set the same values in Render (API) and Vercel (web) dashboards.');
