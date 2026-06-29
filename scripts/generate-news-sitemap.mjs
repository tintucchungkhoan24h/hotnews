import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SITE_BASE = 'https://tintucchungkhoan24h.com';
const PUBLICATION_NAME = 'Tin Tức Chứng Khoán 24h';

// Language code mapping for Google News
const LANG_MAP = {
  'vi': 'vi',
  'en': 'en',
  'ko': 'ko',
  'zh': 'zh-Hant',
  'th': 'th',
  'ar': 'ar',
  'ja': 'ja'
};

function parseSpokeUrl(url) {
  // Parse URL: https://tintucchungkhoan24h.com/diem-tin-chung-khoan/vi/24-06-2026/ or /world-news/vi/.../
  const match = url.match(new RegExp(`${SITE_BASE}/(diem-tin-[^/]+|world-news)/([^/]+)/(.+)/`));
  if (!match) return null;
  
  // Extract publication date from slug (DD-MM-YYYY format)
  const dateMatch = match[3].match(/(\d{2})-(\d{2})-(\d{4})/);
  let pubDate = null;
  if (dateMatch) {
    const [day, month, year] = [dateMatch[1], dateMatch[2], dateMatch[3]];
    // Create Date object in local timezone (UTC+7)
    pubDate = new Date(`${year}-${month}-${day}T00:00:00+07:00`);
  }
  
  return {
    type: match[1], // diem-tin-chung-khoan or diem-tin-vi-mo
    lang: match[2], // vi, en, ko, etc.
    slug: match[3], // 24-06-2026 or descriptive slug
    url: url,
    pubDate: pubDate,
  };
}

function extractTitleFromHtml(htmlPath) {
  try {
    const html = fs.readFileSync(htmlPath, 'utf8');
    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    if (titleMatch) {
      // Remove publication name suffix if present
      let title = titleMatch[1].trim();
      title = title.replace(/\s*\|\s*Tin Tức Chứng Khoán 24h$/, '');
      title = title.replace(/\s*\|\s*Tin Tức Chứng Khoán 24h$/, '');
      return title;
    }
  } catch (err) {
    console.warn(`  ⚠️  Could not read HTML file: ${htmlPath}`);
  }
  return null;
}

function generateNewsSitemap() {
  const now = new Date();
  const fortyEightHoursAgo = new Date(now.getTime() - (48 * 60 * 60 * 1000));
  
  console.log('📰 Generating Google News Sitemap...');
  console.log(`  Time window: ${fortyEightHoursAgo.toISOString()} to ${now.toISOString()}`);
  
  // Read all year-split spoke URL files
  const allUrls = [];
  
  // Stock URLs
  const stockUrlFiles = fs.readdirSync(ROOT).filter(f => f.match(/^spoke_urls_stock_\d{4}\.json$/));
  for (const file of stockUrlFiles) {
    const filePath = path.join(ROOT, file);
    const urls = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    allUrls.push(...urls);
  }
  
  // Macro URLs
  const macroUrlFiles = fs.readdirSync(ROOT).filter(f => f.match(/^spoke_urls_macro_\d{4}\.json$/));
  for (const file of macroUrlFiles) {
    const filePath = path.join(ROOT, file);
    const urls = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    allUrls.push(...urls);
  }

  // World News URLs
  const worldNewsUrlFiles = fs.readdirSync(ROOT).filter(f => f.match(/^spoke_urls_world_news_\d{4}\.json$/));
  for (const file of worldNewsUrlFiles) {
    const filePath = path.join(ROOT, file);
    const urls = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    allUrls.push(...urls);
  }
  
  console.log(`  📂 Found ${allUrls.length} total spoke URLs`);
  
  // Filter and process URLs within 48 hours
  const recentArticles = [];
  
  for (const url of allUrls) {
    const parsed = parseSpokeUrl(url);
    if (!parsed || !parsed.pubDate) continue;
    
    // Check if within 48 hours
    if (parsed.pubDate >= fortyEightHoursAgo) {
      // Extract HTML file path
      const htmlPath = path.join(ROOT, parsed.type, parsed.lang, parsed.slug, 'index.html');
      
      // Extract title from HTML
      const title = extractTitleFromHtml(htmlPath);
      
      if (title) {
        recentArticles.push({
          url: url,
          lang: LANG_MAP[parsed.lang] || parsed.lang,
          pubDate: parsed.pubDate,
          title: title
        });
      }
    }
  }
  
  console.log(`  ✨ Found ${recentArticles.length} articles published within 48 hours`);
  
  // Sort by publication date (newest first)
  recentArticles.sort((a, b) => b.pubDate - a.pubDate);
  
  // Limit to 1000 URLs (Google News requirement)
  const limitedArticles = recentArticles.slice(0, 1000);
  if (recentArticles.length > 1000) {
    console.log(`  ⚠️  Limited to 1000 URLs (Google News requirement)`);
  }
  
  // Generate XML
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
`;
  
  for (const article of limitedArticles) {
    // Format publication date in W3C format
    const pubDateStr = article.pubDate.toISOString();
    
    xml += `  <url>
    <loc>${article.url}</loc>
    <news:news>
      <news:publication>
        <news:name>${PUBLICATION_NAME}</news:name>
        <news:language>${article.lang}</news:language>
      </news:publication>
      <news:publication_date>${pubDateStr}</news:publication_date>
      <news:title>${escapeXml(article.title)}</news:title>
    </news:news>
  </url>
`;
  }
  
  xml += `</urlset>`;
  
  // Write to file
  const outputPath = path.join(ROOT, 'news-sitemap.xml');
  fs.writeFileSync(outputPath, xml, 'utf8');
  
  console.log(`  ✅ News sitemap written to: ${outputPath}`);
  console.log(`  📊 Total entries: ${limitedArticles.length}`);
}

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

generateNewsSitemap();
