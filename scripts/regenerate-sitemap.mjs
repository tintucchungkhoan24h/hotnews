/**
 * regenerate-sitemap.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Regenerates the entire sitemap.xml using spoke_urls JSON files.
 * This ensures all URLs have trailing slashes and include hreflang tags.
 * 
 * Usage:
 *   node scripts/regenerate-sitemap.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const SITE_BASE = 'https://tintucchungkhoan24h.com';

// Read i18n data for hreflang mapping
const i18nRaw = fs.readFileSync(path.join(ROOT, 'i18n.json'), 'utf8');
const i18nData = JSON.parse(i18nRaw);
const HREFLANG = i18nData.hreflang;

function parseSpokeUrl(url) {
  // Parse URL: https://tintucchungkhoan24h.com/diem-tin-chung-khoan/vi/24-06-2026/
  const match = url.match(new RegExp(`${SITE_BASE}/(diem-tin-[^/]+)/([^/]+)/(.+)/`));
  if (!match) return null;
  
  return {
    type: match[1], // diem-tin-chung-khoan or diem-tin-vi-mo
    lang: match[2], // vi, en, ko, etc.
    slug: match[3], // 24-06-2026 or descriptive slug
    url: url,
  };
}

function groupSpokesByContent(spokeUrls) {
  // Group spokes by their content key (same content across languages)
  // We use the full slug pattern to match - descriptive slugs should match by date,
  // while date-only slugs should match by date
  const grouped = {};
  
  for (const url of spokeUrls) {
    const parsed = parseSpokeUrl(url);
    if (!parsed) continue;
    
    // Extract date from slug (e.g., "24-06-2026" from "24-06-2026" or "macro-news-25-06-2026")
    const dateMatch = parsed.slug.match(/(\d{2}-\d{2}-\d{4})/);
    if (!dateMatch) continue;
    
    const dateKey = dateMatch[1];
    
    // Check if this is a descriptive slug (contains text before date) or just date
    const isDescriptive = !parsed.slug.match(/^\d{2}-\d{2}-\d{4}$/);
    
    // For descriptive slugs, use the date as the key (they should match across langs)
    // For date-only slugs, also use the date as the key
    const contentKey = `${parsed.type}:${dateKey}`;
    
    if (!grouped[contentKey]) grouped[contentKey] = [];
    grouped[contentKey].push(parsed);
  }
  
  return grouped;
}

function generateSitemap() {
  const today = new Date().toISOString().split('T')[0];
  
  // Read spoke URLs from JSON files
  const stockUrlsPath = path.join(ROOT, 'spoke_urls_stock.json');
  const macroUrlsPath = path.join(ROOT, 'spoke_urls_macro.json');
  
  const stockUrls = fs.existsSync(stockUrlsPath) 
    ? JSON.parse(fs.readFileSync(stockUrlsPath, 'utf8'))
    : [];
  const macroUrls = fs.existsSync(macroUrlsPath)
    ? JSON.parse(fs.readFileSync(macroUrlsPath, 'utf8'))
    : [];
  
  // Read peer URL mapping files
  const stockPeerPath = path.join(ROOT, 'spoke_peer_urls_stock.json');
  const macroPeerPath = path.join(ROOT, 'spoke_peer_urls_macro.json');
  
  const stockPeerMapping = fs.existsSync(stockPeerPath)
    ? JSON.parse(fs.readFileSync(stockPeerPath, 'utf8'))
    : {};
  const macroPeerMapping = fs.existsSync(macroPeerPath)
    ? JSON.parse(fs.readFileSync(macroPeerPath, 'utf8'))
    : {};
  
  // Filter URLs to only include those with trailing slashes (new format)
  const stockUrlsClean = stockUrls.filter(url => url.endsWith('/'));
  const macroUrlsClean = macroUrls.filter(url => url.endsWith('/'));
  
  // Extract unique languages from URLs
  const stockLangs = [...new Set(stockUrlsClean.map(url => parseSpokeUrl(url)?.lang).filter(Boolean))];
  const macroLangs = [...new Set(macroUrlsClean.map(url => parseSpokeUrl(url)?.lang).filter(Boolean))];
  
  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">

  <!-- Homepage / Dashboard -->
  <url>
    <loc>${SITE_BASE}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>

`;
  
  // Add hub pages for stock digest
  for (const lang of stockLangs) {
    const isPrimary = lang === 'vi';
    sitemap += `  <!-- Điểm tin – ${lang.toUpperCase()}${isPrimary ? ' (primary)' : ''} -->
  <url>
    <loc>${SITE_BASE}/diem-tin-chung-khoan/${lang}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>${isPrimary ? '0.9' : '0.8'}</priority>`;
    
    if (isPrimary) {
      for (const l of stockLangs) {
        const hreflangValue = HREFLANG[l] || l;
        sitemap += `\n    <xhtml:link rel="alternate" hreflang="${hreflangValue}" href="${SITE_BASE}/diem-tin-chung-khoan/${l}/"/>`;
      }
      sitemap += `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_BASE}/diem-tin-chung-khoan/vi/"/>`;
    }
    
    sitemap += `\n  </url>\n\n`;
  }
  
  // Add hub pages for macro digest
  for (const lang of macroLangs) {
    const isPrimary = lang === 'vi';
    sitemap += `  <!-- Điểm tin vĩ mô – ${lang.toUpperCase()}${isPrimary ? ' (primary)' : ''} -->
  <url>
    <loc>${SITE_BASE}/diem-tin-vi-mo/${lang}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>${isPrimary ? '0.9' : '0.8'}</priority>`;
    
    if (isPrimary) {
      for (const l of macroLangs) {
        const hreflangValue = HREFLANG[l] || l;
        sitemap += `\n    <xhtml:link rel="alternate" hreflang="${hreflangValue}" href="${SITE_BASE}/diem-tin-vi-mo/${l}/"/>`;
      }
      sitemap += `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_BASE}/diem-tin-vi-mo/vi/"/>`;
    }
    
    sitemap += `\n  </url>\n\n`;
  }
  
  // Add spoke pages with hreflang tags using peer mapping
  for (const url of stockUrlsClean) {
    const parsed = parseSpokeUrl(url);
    if (!parsed) continue;
    
    const title = parsed.slug;
    sitemap += `  <!-- Spoke: ${title} -->
  <url>
    <loc>${url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>never</changefreq>
    <priority>0.8</priority>`;
    
    // Find peer URLs by matching the slug in the peer mapping
    let foundPeers = false;
    for (const [rowKey, peerUrls] of Object.entries(stockPeerMapping)) {
      if (peerUrls[parsed.lang] === url) {
        // This is the correct peer group
        for (const [lang, peerUrl] of Object.entries(peerUrls)) {
          const hreflangValue = HREFLANG[lang] || lang;
          sitemap += `\n    <xhtml:link rel="alternate" hreflang="${hreflangValue}" href="${peerUrl}"/>`;
        }
        foundPeers = true;
        break;
      }
    }
    
    // If not found in peer mapping, try to match by date
    if (!foundPeers) {
      const dateMatch = parsed.slug.match(/(\d{2}-\d{2}-\d{4})/);
      if (dateMatch) {
        const dateKey = dateMatch[1];
        // Find all URLs with the same date, but only one per language
        const datePeers = stockUrlsClean.filter(u => {
          const p = parseSpokeUrl(u);
          return p && p.slug.includes(dateKey);
        });
        // Deduplicate by language
        const langMap = {};
        for (const peerUrl of datePeers) {
          const peerParsed = parseSpokeUrl(peerUrl);
          if (peerParsed && !langMap[peerParsed.lang]) {
            langMap[peerParsed.lang] = peerUrl;
          }
        }
        for (const [lang, peerUrl] of Object.entries(langMap)) {
          const hreflangValue = HREFLANG[lang] || lang;
          sitemap += `\n    <xhtml:link rel="alternate" hreflang="${hreflangValue}" href="${peerUrl}"/>`;
        }
      }
    }
    
    sitemap += `\n  </url>\n\n`;
  }
  
  for (const url of macroUrlsClean) {
    const parsed = parseSpokeUrl(url);
    if (!parsed) continue;
    
    const title = parsed.slug;
    sitemap += `  <!-- Spoke: ${title} -->
  <url>
    <loc>${url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>never</changefreq>
    <priority>0.8</priority>`;
    
    // Find peer URLs by matching the slug in the peer mapping
    let foundPeers = false;
    for (const [rowKey, peerUrls] of Object.entries(macroPeerMapping)) {
      if (peerUrls[parsed.lang] === url) {
        // This is the correct peer group
        for (const [lang, peerUrl] of Object.entries(peerUrls)) {
          const hreflangValue = HREFLANG[lang] || lang;
          sitemap += `\n    <xhtml:link rel="alternate" hreflang="${hreflangValue}" href="${peerUrl}"/>`;
        }
        foundPeers = true;
        break;
      }
    }
    
    // If not found in peer mapping, try to match by date
    if (!foundPeers) {
      const dateMatch = parsed.slug.match(/(\d{2}-\d{2}-\d{4})/);
      if (dateMatch) {
        const dateKey = dateMatch[1];
        // Find all URLs with the same date, but only one per language
        const datePeers = macroUrlsClean.filter(u => {
          const p = parseSpokeUrl(u);
          return p && p.slug.includes(dateKey);
        });
        // Deduplicate by language
        const langMap = {};
        for (const peerUrl of datePeers) {
          const peerParsed = parseSpokeUrl(peerUrl);
          if (peerParsed && !langMap[peerParsed.lang]) {
            langMap[peerParsed.lang] = peerUrl;
          }
        }
        for (const [lang, peerUrl] of Object.entries(langMap)) {
          const hreflangValue = HREFLANG[lang] || lang;
          sitemap += `\n    <xhtml:link rel="alternate" hreflang="${hreflangValue}" href="${peerUrl}"/>`;
        }
      }
    }
    
    sitemap += `\n  </url>\n\n`;
  }
  
  sitemap += '</urlset>\n';
  
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap, 'utf8');
  console.log('✅ Sitemap regenerated successfully');
  console.log(`   - ${stockUrlsClean.length} stock spoke pages`);
  console.log(`   - ${macroUrlsClean.length} macro spoke pages`);
  console.log(`   - ${stockLangs.length} stock hub pages`);
  console.log(`   - ${macroLangs.length} macro hub pages`);
}

generateSitemap();
