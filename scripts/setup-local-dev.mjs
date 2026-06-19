/**
 * Prepare local development: copy env templates if missing.
 * Usage: npm run setup:local
 *
 * After running, edit .env and apps/web/.env.local with your Supabase credentials, then:
 *   npm run seed:demo
 *   npm run dev
 */

import { existsSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const pairs = [
  [join(root, '.env.example'), join(root, '.env')],
  [join(root, 'apps/web/.env.local.example'), join(root, 'apps/web/.env.local')],
];

for (const [src, dest] of pairs) {
  if (existsSync(dest)) {
    console.log(`✓ ${dest.replace(root, '.')} (already exists)`);
    continue;
  }
  if (!existsSync(src)) {
    console.warn(`⚠ Missing template: ${src}`);
    continue;
  }
  copyFileSync(src, dest);
  console.log(`✓ Created ${dest.replace(root, '.')} from template`);
}

console.log('\nNext steps:');
console.log('  1. Set SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET in .env');
console.log('  2. Mirror NEXT_PUBLIC_SUPABASE_* and NEXT_PUBLIC_API_URL in apps/web/.env.local');
console.log('  3. npm run seed:demo');
console.log('  4. npm run dev  → API :3001, web :3002');
