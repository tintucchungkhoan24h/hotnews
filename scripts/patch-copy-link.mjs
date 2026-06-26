/**
 * One-off patch: replace old copy-link logic in all generated HTML with the LAN-safe version.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { COPY_LINK_SCRIPT, COPY_LINK_BLOCK_RE, COPY_LINK_ORPHAN_RE } from './copy-link-snippet.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name === 'index.html') files.push(full);
  }
  return files;
}

let patched = 0;
let cleaned = 0;
let skipped = 0;

for (const file of walk(ROOT)) {
  if (!file.includes('diem-tin-')) continue;
  const html = fs.readFileSync(file, 'utf8');
  if (!html.includes('copyArticleLink')) {
    skipped++;
    continue;
  }

  let updated = html.replace(COPY_LINK_ORPHAN_RE, '\n');
  if (updated !== html) cleaned++;

  if (updated.includes('function copyText(text, btn)')) {
    if (updated !== html) {
      fs.writeFileSync(file, updated);
      console.log('Cleaned orphan:', path.relative(ROOT, file));
    }
    continue;
  }

  COPY_LINK_BLOCK_RE.lastIndex = 0;
  if (!COPY_LINK_BLOCK_RE.test(updated)) {
    console.warn('No match:', path.relative(ROOT, file));
    skipped++;
    continue;
  }
  COPY_LINK_BLOCK_RE.lastIndex = 0;
  updated = updated.replace(COPY_LINK_BLOCK_RE, COPY_LINK_SCRIPT);
  fs.writeFileSync(file, updated);
  patched++;
  console.log('Patched:', path.relative(ROOT, file));
}

console.log(`Done: ${patched} patched, ${cleaned} orphans cleaned, ${skipped} skipped.`);
