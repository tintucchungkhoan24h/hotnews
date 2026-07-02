import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// 1. Hub URLs — always ping (they change daily with new content)
const HUB_URLS = [
  "https://tintucchungkhoan24h.com/diem-tin-chung-khoan/vi/",
  "https://tintucchungkhoan24h.com/diem-tin-chung-khoan/en/",
  "https://tintucchungkhoan24h.com/diem-tin-chung-khoan/ko/",
  "https://tintucchungkhoan24h.com/diem-tin-chung-khoan/zh/",
  "https://tintucchungkhoan24h.com/diem-tin-chung-khoan/th/",
  "https://tintucchungkhoan24h.com/diem-tin-chung-khoan/ar/",
  "https://tintucchungkhoan24h.com/diem-tin-chung-khoan/ja/",
  "https://tintucchungkhoan24h.com/diem-tin-vi-mo/vi/",
  "https://tintucchungkhoan24h.com/diem-tin-vi-mo/en/",
  "https://tintucchungkhoan24h.com/diem-tin-vi-mo/ko/",
  "https://tintucchungkhoan24h.com/diem-tin-vi-mo/zh/",
  "https://tintucchungkhoan24h.com/diem-tin-vi-mo/th/",
  "https://tintucchungkhoan24h.com/diem-tin-vi-mo/ar/",
  "https://tintucchungkhoan24h.com/diem-tin-vi-mo/ja/",
  "https://tintucchungkhoan24h.com/world-news/vi/",
  "https://tintucchungkhoan24h.com/world-news/en/",
  "https://tintucchungkhoan24h.com/world-news/ko/",
  "https://tintucchungkhoan24h.com/world-news/zh/",
  "https://tintucchungkhoan24h.com/world-news/th/",
  "https://tintucchungkhoan24h.com/world-news/ar/",
  "https://tintucchungkhoan24h.com/world-news/ja/"
];

// 2. Build today's date string in DD-MM-YYYY format (Vietnam UTC+7)
function getTodaySlugDate() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  return `${dd}-${mm}-${yyyy}`; // e.g. "02-07-2026"
}

// 3. Load spoke URLs from a JSON file (read-only, no deletion)
function loadSpokeUrls(filename) {
  const filepath = path.join(ROOT, filename);
  if (!fs.existsSync(filepath)) return [];
  try {
    const urls = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    return Array.isArray(urls) ? urls : [];
  } catch (e) {
    console.warn(`  ⚠️ Could not parse ${filename}:`, e.message);
    return [];
  }
}

// 4. Authenticate with Google Indexing API
const KEY_FILE = './service_account.json';

if (!fs.existsSync(KEY_FILE)) {
  console.error(`❌ Service account key not found at: ${KEY_FILE}`);
  process.exit(1);
}

const auth = new google.auth.GoogleAuth({
  keyFile: KEY_FILE,
  scopes: ['https://www.googleapis.com/auth/indexing'],
});

const indexing = google.indexing({
  version: 'v3',
  auth: auth,
});

// 5. Ping a single URL
async function pingUrl(url) {
  try {
    const response = await indexing.urlNotifications.publish({
      requestBody: {
        url: url,
        type: 'URL_UPDATED',
      },
    });
    console.log(`✅ Pinged: ${url} (${response.statusText || 'OK'})`);
  } catch (error) {
    console.error(`❌ Failed [${url}]:`, error.message);
  }
}

// 6. Main — only ping today's new spoke URLs + all hub URLs
async function main() {
  const today = getTodaySlugDate();
  console.log(`📅 Today (Vietnam time): ${today}`);

  // Load all year-split spoke URL files for current year
  const currentYear = new Date().getFullYear();
  const spokeFiles = fs.readdirSync(ROOT).filter(f =>
    f.match(new RegExp(`^spoke_urls_(stock|macro|world_news)_${currentYear}\\.json$`))
  );

  let todaysSpokeUrls = [];
  for (const file of spokeFiles) {
    const urls = loadSpokeUrls(file);
    // Only keep URLs whose slug contains today's date
    const todaysUrls = urls.filter(url => url.includes(today));
    if (todaysUrls.length > 0) {
      console.log(`  📂 ${file}: ${todaysUrls.length} new URL(s) for today`);
      todaysSpokeUrls = [...todaysSpokeUrls, ...todaysUrls];
    }
  }

  // Combine hub URLs + today's spoke URLs, deduplicated
  const allUrls = [...new Set([...HUB_URLS, ...todaysSpokeUrls])];

  console.log(`\n🚀 Pinging ${allUrls.length} URLs (${HUB_URLS.length} hub + ${todaysSpokeUrls.length} new spokes)...`);

  for (const url of allUrls) {
    await pingUrl(url);
    // 200ms delay between requests to avoid quota bursts
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log('🏁 Google Indexing API ping complete.');
}

main();
