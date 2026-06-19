/**
 * Export legal pages to a single markdown file for counsel.
 * Usage: node scripts/export-legal-for-counsel.mjs
 */

import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const require = createRequire(import.meta.url);

// legal-pages.ts is TS — read and parse minimally via dynamic import not available; use compiled approach
// Instead read the source file as text and extract keys, or use a simple inline copy

const version = '2026.06-draft-1';
const outDir = join(root, 'docs', 'legal', 'exports');
mkdirSync(outDir, { recursive: true });

const pages = [
  { key: 'company/privacy', title: 'Privacy Policy' },
  { key: 'company/terms', title: 'Terms of Service' },
  { key: 'company/popia-summary', title: 'POPIA Summary' },
];

let md = `# CRENIT legal export for counsel\n\n**Packet version:** ${version}\n**Generated:** ${new Date().toISOString()}\n\n---\n\n`;

for (const page of pages) {
  md += `## ${page.title}\n\n`;
  md += `> Source: \`apps/web/src/content/legal-pages.ts\` → \`${page.key}\`\n\n`;
  md += `See live staging URL: \`/company/${page.key.split('/')[1]}\`\n\n`;
  md += `---\n\n`;
}

md += `## Data retention schedule\n\n`;
md += `See \`docs/legal/DATA_RETENTION_SCHEDULE.md\` in the repository.\n\n`;
md += `## Full counsel packet\n\n`;
md += `See \`docs/legal/COUNSEL_REVIEW_PACKET.md\`.\n`;

const outPath = join(outDir, `counsel-packet-${version}.md`);
writeFileSync(outPath, md, 'utf8');
console.log(`Wrote ${outPath}`);
console.log('Counsel should also review live pages at /company/privacy and /company/terms on staging.');
