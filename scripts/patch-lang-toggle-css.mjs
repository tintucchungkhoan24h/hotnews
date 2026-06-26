/**
 * Patch spoke article pages: replace condensed lang-menu CSS (missing #langToggle svg)
 * with full LANG_MENU_CSS so flag icons render in the language toggle button.
 *
 * Usage: node scripts/patch-lang-toggle-css.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { LANG_MENU_CSS, LANG_MENU_CSS_SPOKE_OLD } from './lang-menu-snippet.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const SECTIONS = ['diem-tin-chung-khoan', 'diem-tin-vi-mo'];

function walkHtml(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walkHtml(full, out);
    else if (name === 'index.html') out.push(full);
  }
  return out;
}

let patched = 0;
let skipped = 0;

for (const section of SECTIONS) {
  const base = path.join(ROOT, section);
  if (!fs.existsSync(base)) continue;

  for (const file of walkHtml(base)) {
    const rel = path.relative(ROOT, file);
    // Hub pages already have full CSS; only patch article spokes (nested paths).
    const parts = rel.split(path.sep);
    if (parts.length <= 3) continue;

    let html = fs.readFileSync(file, 'utf8');
    if (html.includes('#langToggle svg')) {
      skipped++;
      continue;
    }
    if (!html.includes(LANG_MENU_CSS_SPOKE_OLD.trim().split('\n')[0])) {
      skipped++;
      continue;
    }

    html = html.replace(LANG_MENU_CSS_SPOKE_OLD, LANG_MENU_CSS);
    fs.writeFileSync(file, html, 'utf8');
    patched++;
    console.log('patched:', rel);
  }
}

console.log(`Done. Patched ${patched} file(s), skipped ${skipped}.`);
