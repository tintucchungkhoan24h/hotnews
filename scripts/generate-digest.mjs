/**
 * generate-digest.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Fetches the latest row from the Supabase `market_summary_stock` table,
 * reads header.html + footer.html, and generates 7 static SEO pages:
 *   diem-tin-chung-khoan/{langCode}/index.html
 *
 * Usage:
 *   node scripts/generate-digest.mjs
 *   node scripts/generate-digest.mjs --sample
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');

// ── Supabase config ──────────────────────────────────────────────────────────
const SUPABASE_URL      = 'https://ifjxishcrzndbszmvpef.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlmanhpc2hjcnpuZGJzem12cGVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczNjEwOTcsImV4cCI6MjA5MjkzNzA5N30.0rHs4AWTmRmN34WWdxBM2RsTMu1VQwfKDjve0W2yHEg';

// Read i18n data
const i18nRaw = fs.readFileSync(path.join(ROOT, 'i18n.json'), 'utf8');
const i18nData = JSON.parse(i18nRaw);

// ── hreflang map ─────────────────────────────────────────────────────────────
const HREFLANG = i18nData.hreflang;
const DIGEST_LABEL = i18nData.digestLabel;
const BACK_LABEL = i18nData.backLabel;

const SITE_NAME = 'Tin Tức Chứng Khoán 24h';
const CANONICAL_BASE = '';

const I18N = i18nData.translations;
const I18N_FLAGS = i18nData.flags;
const I18N_LANG_SHORT = i18nData.lang;
const I18N_LANG_NAMES = i18nData.langNames;

// ── Helpers ──────────────────────────────────────────────────────────────────
function fetchJson(url, headers) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(new Error('JSON parse error: ' + body.slice(0, 200))); }
      });
    });
    req.on('error', reject);
  });
}

function readFile(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

// ── Fetch summaries ─────────────────────────────────────────────────────
async function fetchSummaries() {
  let url = `${SUPABASE_URL}/rest/v1/market_summary_stock?order=summary_date.desc&limit=7`;

  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  };

  const rows = await fetchJson(url, headers);
  if (!rows || rows.length === 0) throw new Error('No rows found in market_summary_stock');
  return rows;
}

// ── Generate one HTML page ───────────────────────────────────────────────────
function generatePage({ articlesList, lang, headerHtml, footerHtml, langs, clientCss, clientJs }) {
  const canonical  = `${CANONICAL_BASE}/diem-tin-chung-khoan/${lang}/`;
  const dashboardUrl = `${CANONICAL_BASE}/`;
  const isRtl      = lang === 'ar';
  
  // Use the first article for meta tags (the most recent one)
  const firstArticle = articlesList[0].article;
  
  // Fix relative image paths in header and footer
  let procHeader = headerHtml.replace(/src="([^"]+)"/g, (match, src) => src.startsWith('http') || src.startsWith('/') ? match : `src="/${src}"`);
  let procFooter = footerHtml.replace(/src="([^"]+)"/g, (match, src) => src.startsWith('http') || src.startsWith('/') ? match : `src="/${src}"`);

  // Build Language Menu HTML
  const flagMarkup = I18N_FLAGS[lang] || '';
  const langShort = I18N_LANG_SHORT[lang] || lang.toUpperCase();
  const menuHtml = langs.map(l => {
      const baseLang = l.startsWith('zh') ? 'zh' : l;
      const f = I18N_FLAGS[baseLang] || '';
      const n = I18N_LANG_NAMES[baseLang] || l.toUpperCase();
      const s = I18N_LANG_SHORT[baseLang] || l.toUpperCase();
      return `<button type="button" class="lang-option" data-lang="${l}" onclick="window.location.href='/diem-tin-chung-khoan/${l}/'">
          <span style="display: inline-block; width: 22px; height: 15px; overflow: hidden; border-radius: 2px;">${f}</span>
          <span>${n} (${s})</span>
      </button>`;
  }).join('');

  // Inject into header
  procHeader = procHeader.replace('<span id="langFlag"></span>', `<span id="langFlag">${flagMarkup}</span>`);
  procHeader = procHeader.replace(/<span id="langText"([^>]*)><\/span>/, `<span id="langText"$1>${langShort}</span>`);
  procHeader = procHeader.replace('<div id="langMenu" class="lang-menu" aria-hidden="true"></div>', `<div id="langMenu" class="lang-menu" aria-hidden="true">${menuHtml}</div>`);

  // Get current language translation dictionary
  const currentI18n = I18N[lang] || I18N['en'] || {};

  return `<!DOCTYPE html>
<html lang="${HREFLANG[lang] || lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${firstArticle.title} | ${SITE_NAME}</title>
  <meta name="description" content="${firstArticle.lead.replace(/"/g, '&quot;').slice(0, 160)}">
  <link rel="canonical" href="${canonical}">
${langs.map(l => `  <link rel="alternate" hreflang="${HREFLANG[l] || l}" href="${CANONICAL_BASE}/diem-tin-chung-khoan/${l}/">`).join('\n')}
  <link rel="alternate" hreflang="x-default" href="${CANONICAL_BASE}/diem-tin-chung-khoan/vi/">

  <meta property="og:title" content="${firstArticle.title}">
  <meta property="og:description" content="${firstArticle.lead.slice(0, 200)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:type" content="article">
  <meta property="og:image" content="${CANONICAL_BASE}/ava_icon.png">

  <link rel="icon" type="image/png" sizes="48x48" href="/ava_icon.png">
  <link rel="stylesheet" href="/index.css">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: { extend: { colors: { 'fin-blue': '#0a192f', 'fin-blue-light': '#112240', 'fin-gold': '#ffd700' } } }
    }
  </script>

  <style>
    * { box-sizing: border-box; }
    html { overflow-y: scroll; }
    body { margin: 0; padding: 0; background: #0a192f; color: #f3f4f6; font-family: 'Inter', system-ui, sans-serif; }
    .avatar-glow { box-shadow: 0 0 15px rgba(255,215,0,0.3); border: 2px solid rgba(255,215,0,0.5); }
    
    /* Tab bar (mirrors main app) */
    .tab-bar-wrap { overflow-x: auto; scrollbar-width: none; }
    .tab-bar-wrap::-webkit-scrollbar { display: none; }
    .tab-button { color: #9ca3af; background: transparent; border: none; cursor: pointer; user-select: none; position: relative; border-radius: 10px; margin: 0 1px; }
    .tab-btn-responsive { padding: 6px 10px; font-size: 11px; white-space: nowrap; display: inline-flex; align-items: center; justify-content: center; gap: 4px; text-decoration: none; transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1); font-weight: 700; }
    @media (min-width: 480px) { .tab-btn-responsive { padding: 8px 14px; font-size: 12px; } }
    @media (min-width: 640px) { .tab-btn-responsive { padding: 10px 20px; font-size: 14px; } }
    .tab-button:hover { color: #fef9c3; background: rgba(255, 255, 255, 0.06); }
    .tab-button.active { color: #0a192f; background: #ffd700; box-shadow: 0 2px 8px rgba(255, 215, 0, 0.3); }
    .tab-button:active { transform: scale(0.98); }

    /* Article content styling - Professional Design */
    .digest-lead { 
      background: linear-gradient(135deg, rgba(255,215,0,0.12) 0%, rgba(17,34,64,0.8) 100%); 
      border-left: 4px solid #ffd700; 
      padding: 20px 24px; 
      border-radius: 0 16px 16px 0; 
      font-size: 16px; 
      line-height: 1.8; 
      color: #e2e8f0; 
      font-style: italic; 
      margin-bottom: 32px; 
      position: relative;
      box-shadow: 0 4px 20px rgba(255,215,0,0.08);
    }
    .digest-body h2 { 
      font-size: 1.35rem; 
      font-weight: 800; 
      color: #ffd700; 
      margin: 36px 0 16px; 
      padding-bottom: 12px; 
      border-bottom: 2px solid rgba(255,215,0,0.25);
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .digest-body h2::before {
      content: '';
      width: 8px;
      height: 8px;
      background: #ffd700;
      border-radius: 50%;
      box-shadow: 0 0 10px rgba(255,215,0,0.5);
    }
    .digest-body p { 
      margin: 0 0 18px; 
      line-height: 1.85; 
      color: #d1d5db; 
      font-size: 15px;
      text-align: justify;
    }
    .digest-body strong { 
      color: #fbbf24; 
      font-weight: 700;
      background: rgba(251,191,36,0.1);
      padding: 2px 6px;
      border-radius: 4px;
    }
    .digest-body a {
      color: #60a5fa;
      text-decoration: none;
      border-bottom: 1px solid rgba(96,165,250,0.3);
      transition: all 0.2s ease;
      display: inline-block;
      margin-bottom: 4px;
    }
    .digest-body a:hover {
      color: #ffd700;
      border-bottom-color: #ffd700;
    }
    
    /* Enhanced article card styling */
    article {
      background: linear-gradient(180deg, rgba(17,34,64,0.5) 0%, rgba(10,25,47,0.3) 100%);
      border: 1px solid rgba(255,215,0,0.1);
      border-radius: 20px;
      padding: 32px;
      margin-bottom: 32px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      transition: all 0.3s ease;
    }
    article:hover {
      border-color: rgba(255,215,0,0.2);
      box-shadow: 0 12px 40px rgba(255,215,0,0.1);
      transform: translateY(-2px);
    }
    
    /* Enhanced title styling */
    article h1 {
      background: linear-gradient(135deg, #ffd700 0%, #ffed4e 50%, #ffd700 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      text-shadow: 0 0 30px rgba(255,215,0,0.3);
      letter-spacing: -0.02em;
    }
    
    /* Enhanced metadata styling */
    .article-meta {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      background: rgba(255,215,0,0.05);
      border: 1px solid rgba(255,215,0,0.15);
      padding: 10px 16px;
      border-radius: 12px;
      margin-bottom: 24px;
    }
    .article-meta span {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .article-meta span.highlight {
      color: #ffd700;
    }
    
    .back-link { display: inline-flex; align-items: center; gap: 6px; color: #60a5fa; font-size: 13px; font-weight: 600; text-decoration: none; padding: 8px 14px; background: rgba(96,165,250,0.08); border: 1px solid rgba(96,165,250,0.25); border-radius: 8px; margin-bottom: 24px; }
    .back-link:hover { color: #ffd700; border-color: rgba(255,215,0,0.3); }

    /* Lang Menu CSS (copied from index.css for standalone functionality) */
    .lang-menu {
        position: absolute;
        top: calc(100% + 8px);
        right: 0;
        min-width: 220px;
        max-width: min(320px, calc(100vw - 24px));
        max-height: min(70vh, 360px);
        overflow-x: hidden;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        background: rgba(10, 18, 47, 0.98);
        border: 1px solid #334155;
        border-radius: 18px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.55);
        backdrop-filter: blur(16px);
        padding: 8px 0;
        z-index: 10050;
        display: none;
    }
    .lang-menu.open {
        display: block;
    }
    .lang-option {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 10px;
        background: transparent;
        border: none;
        color: #f8fafc;
        padding: 10px 14px;
        cursor: pointer;
        font-size: 12px;
        text-align: left;
        transition: background 0.15s ease;
    }
    .lang-option:hover {
        background: rgba(255,255,255,0.06);
    }
    .lang-option svg {
        width: 22px;
        height: 15px;
        border-radius: 2px;
        flex-shrink: 0;
    }
    .lang-option span {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    #langToggle {
        display: flex;
        align-items: center;
        gap: 6px;
        background: rgba(17,34,64,0.95);
        border: 1px solid #4b5563;
        color: white;
        padding: 8px 12px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        backdrop-filter: blur(10px);
        transition: all 0.2s ease;
        white-space: nowrap;
    }
    @media (min-width: 640px) {
        #langToggle {
            padding: 10px 18px;
            font-size: 13px;
            gap: 8px;
        }
    }
    #langToggle:hover {
        border-color: #ffd700;
        box-shadow: 0 10px 40px rgba(255, 215, 0, 0.2);
    }
    #langToggle:active {
        transform: scale(0.96);
    }
    #langToggle svg {
        width: 22px;
        height: 15px;
        display: block;
        border-radius: 2px;
    }

    /* Inject dynamic client CSS */
    ${clientCss}
  </style>
</head>
<body class="bg-fin-blue min-h-screen">
  <div class="p-4 md:p-6" style="padding-top: 12px;">

    <!-- HEADER -->
    ${procHeader}

    <!-- TAB BAR -->
    <div class="tab-bar-wrap max-w-[1440px] mx-auto mb-6 overflow-x-auto mt-4" style="scrollbar-width:none;-ms-overflow-style:none;">
        <div class="flex items-center gap-0 bg-fin-blue-light/30 p-1 rounded-xl border border-gray-800/50 w-fit min-w-full sm:min-w-0">
            <a href="${dashboardUrl}#stock/${lang}" class="tab-button tab-btn-responsive font-bold transition-all flex-shrink-0" style="text-decoration:none;">
                <span class="tab-text">${currentI18n.tabs?.stock || 'Mã CK'}</span>
            </a>
            <a href="${dashboardUrl}#macro/${lang}" class="tab-button tab-btn-responsive font-bold transition-all flex-shrink-0" style="text-decoration:none;">
                <span class="tab-text">${currentI18n.tabs?.macro || 'Vĩ Mô'}</span>
            </a>
            <a href="${dashboardUrl}#stable/${lang}" class="tab-button tab-btn-responsive font-bold transition-all flex-shrink-0" style="text-decoration:none;">
                <span class="tab-text">${currentI18n.tabs?.stable || 'Biến động ổn định'}</span>
            </a>
            <a href="${dashboardUrl}#high/${lang}" class="tab-button tab-btn-responsive font-bold transition-all flex-shrink-0" style="text-decoration:none;">
                <span class="tab-text">${currentI18n.tabs?.high || 'Biến động mạnh'}</span>
            </a>
            <a href="${dashboardUrl}#watchlist/${lang}" class="tab-button tab-btn-responsive font-bold transition-all flex-shrink-0" style="text-decoration:none;">
                <span class="tab-text">${currentI18n.tabs?.watchlist || '⭐ Danh sách theo dõi'}</span>
            </a>
            <a href="${dashboardUrl}#spotlight/${lang}" class="tab-button tab-btn-responsive font-bold transition-all flex-shrink-0" style="text-decoration:none;">
                <span class="tab-text">${currentI18n.tabs?.spotlight || '🚀 Mã Nổi Bật'}</span>
            </a>
            <a href="${canonical}" aria-current="page" class="tab-button active tab-btn-responsive font-bold transition-all flex-shrink-0 inline-flex items-center gap-1 no-underline" style="text-decoration:none;" title="${currentI18n.tabs?.digest || 'Điểm tin'}">
                <span style="font-size:0.9em;">📰</span>
                <span class="tab-text">${currentI18n.tabs?.digest || 'Điểm tin'}</span>
            </a>
        </div>
    </div>

    <!-- FILTER CONTROLS BAR -->
    <div class="bg-fin-blue-light/30 p-3 sm:p-4 md:p-5 rounded-2xl border border-gray-800/50 max-w-[1440px] mx-auto mb-6">
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div class="flex items-center gap-2 w-full sm:w-auto">
                <!-- Date Range Filter -->
                <div class="flex items-center bg-fin-blue border border-gray-700/50 rounded-xl px-3 py-2 shadow-inner flex-1 sm:flex-none">
                    <div class="flex flex-col flex-1">
                        <label id="lblFrom" class="text-[9px] uppercase text-gray-500 font-bold mb-0.5" data-text-key="lblFrom">${currentI18n.lblFrom || 'Từ ngày'}</label>
                        <div class="datepicker-wrapper">
                            <input type="text" id="seoFromDate" class="datepicker-input" data-placeholder-key="datepicker.inputPlaceholder" readonly placeholder="dd/mm/yyyy">
                            <div id="seoFromDatePopup" class="datepicker-popup"></div>
                        </div>
                    </div>
                    <div class="w-[1px] h-7 bg-gray-700 mx-3"></div>
                    <div class="flex flex-col flex-1">
                        <label id="lblTo" class="text-[9px] uppercase text-gray-500 font-bold mb-0.5" data-text-key="lblTo">${currentI18n.lblTo || 'Đến ngày'}</label>
                        <div class="datepicker-wrapper">
                            <input type="text" id="seoToDate" class="datepicker-input" data-placeholder-key="datepicker.inputPlaceholder" readonly placeholder="dd/mm/yyyy">
                            <div id="seoToDatePopup" class="datepicker-popup"></div>
                        </div>
                    </div>
                </div>

                <button id="fetchFeedBtn" class="flex-shrink-0 w-9 h-9 flex items-center justify-center bg-fin-blue border border-gray-700/50 rounded-xl text-gray-400 hover:text-fin-gold hover:border-fin-gold transition-all hover:scale-110 active:scale-95" title="${currentI18n.refreshBtn || 'Làm mới dữ liệu'}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="23 4 23 10 17 10"></polyline>
                        <polyline points="1 20 1 14 7 14"></polyline>
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                    </svg>
                </button>
            </div>
        </div>
    </div>

    <!-- MAIN ARTICLE FEED -->
    <main id="digest-feed" class="max-w-[1440px] mx-auto">
      ${articlesList.map(item => {
        // Format reference links to appear on separate lines with label
        let formattedContent = item.article.content || '';
        formattedContent = formattedContent.replace(/<p>([^<]*?(?:Nguồn dữ liệu tham khảo|Data references|데이터 참고|数据参考|ข้อมูลอ้างอิง|مصادر البيانات|データ参照|データ出典)[^<]*):\s*([^<]*(?:<a[^>]*>.*?<\/a>[^<]*)*)<\/p>/gi, (match, label, links) => {
          // Extract all links and put each on a new line
          const linkMatches = links.match(/<a[^>]*>.*?<\/a>/g) || [];
          const formattedLinks = linkMatches.join('<br>');
          return `<p><strong>${label}:</strong><br>${formattedLinks}</p>`;
        });
        
        return `
        <article${isRtl ? ' dir="rtl"' : ''}>
          <h1 class="text-2xl md:text-3xl font-black leading-tight mb-4">
            ${item.article.title}
          </h1>
          <div class="article-meta">
            <span class="highlight">📅 ${item.date}</span>
            <span>•</span>
            <span>${item.article.langEmoji || ''} ${item.article.langName || lang.toUpperCase()}</span>
            <span>•</span>
            <span>${SITE_NAME}</span>
          </div>

          <div class="digest-lead" ${isRtl ? 'style="border-left: none; border-right: 4px solid #ffd700; border-radius: 12px 0 0 12px;"' : ''}>${item.article.lead}</div>
          <div class="digest-body">${formattedContent}</div>
        </article>
        <hr class="border-gray-800 my-8">
      `;
      }).join('')}
    </main>

    <div class="mt-8 mb-4 max-w-[1440px] mx-auto">
      <a href="${dashboardUrl}" class="back-link">${BACK_LABEL[lang] || '← Back'}</a>
    </div>

  </div>

  <!-- FOOTER -->
  <div id="footer-container">
    ${procFooter}
  </div>

  <!-- Translation injection & Lang Menu JS -->
  <script>
    window.SUPABASE_URL = '${SUPABASE_URL}';
    window.SUPABASE_ANON_KEY = '${SUPABASE_ANON_KEY}';
    window.SITE_NAME = '${SITE_NAME}';
    const langDict = ${JSON.stringify(currentI18n)};

    function applyDict() {
        document.querySelectorAll('[data-text-key]').forEach(el => {
            const keys = el.getAttribute('data-text-key').split('.');
            let val = langDict;
            for (const k of keys) val = val?.[k];
            if (val) el.textContent = val;
        });
        document.querySelectorAll('[data-title-key]').forEach(el => {
            const keys = el.getAttribute('data-title-key').split('.');
            let val = langDict;
            for (const k of keys) val = val?.[k];
            if (val) el.setAttribute('title', val);
        });
        document.querySelectorAll('[data-alt-key]').forEach(el => {
            const keys = el.getAttribute('data-alt-key').split('.');
            let val = langDict;
            for (const k of keys) val = val?.[k];
            if (val) el.setAttribute('alt', val);
        });
    }
    applyDict();

    // Language dropdown toggle
    const langToggle = document.getElementById('langToggle');
    const langMenu = document.getElementById('langMenu');
    if (langToggle && langMenu) {
        langToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            langMenu.classList.toggle('open');
            langMenu.setAttribute('aria-hidden', langMenu.classList.contains('open') ? 'false' : 'true');
        });
        document.addEventListener('click', (e) => {
            if (!langToggle.contains(e.target) && !langMenu.contains(e.target)) {
                langMenu.classList.remove('open');
                langMenu.setAttribute('aria-hidden', 'true');
            }
        });
    }

    // Inject dynamic client JS
    ${clientJs}
  </script>
</body>
</html>`;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const args     = process.argv.slice(2);
  const isSample = args.includes('--sample');
  let allRows = [];
  let articles;

  if (isSample) {
    console.log('📡 Using SAMPLE_ARTICLES...');
    // Hardcoded sample data
    articles = [
      {
        langCode: 'vi', langName: 'VIETNAMESE', langEmoji: '🇻🇳',
        title: 'VN-Index ngày 22/06/2026: Nhóm Vingroup bứt phá, thanh khoản thận trọng',
        lead: 'Thị trường chứng khoán ngày 22/06/2026 ghi nhận phiên giao dịch đầy hưng phấn khi VN-Index xác lập mức tăng ấn tượng nhất trong 2 tháng qua. Sự bứt phá của nhóm Vingroup đã đóng vai trò trụ cột, dù thanh khoản thị trường vẫn duy trì trạng thái quan sát thận trọng.',
        content: '<h2>Tâm lý thị trường: \'Xanh vỏ đỏ lòng\'</h2><p>Phiên giao dịch ngày 22/06/2026 diễn ra trong bối cảnh nhà đầu tư đón nhận thông tin tích cực về việc khởi công 5 dự án hạ tầng lớn tại Hà Nội. Tuy nhiên, đà tăng của VN-Index chủ yếu đến từ sự dẫn dắt của nhóm Vingroup với <strong>VIC</strong> tăng trần, <strong>VHM</strong> và <strong>VRE</strong> bứt phá mạnh. Thực tế, trạng thái thị trường vẫn mang tính \'xanh vỏ đỏ lòng\' khi số lượng mã giảm điểm chiếm ưu thế, phản ánh dòng tiền còn rất thận trọng.</p><h2>Sự phân hóa của dòng tiền</h2><p>Dữ liệu cho thấy dòng tiền có sự phân hóa rõ rệt. Nhóm dầu khí như <strong>PVD</strong>, <strong>BSR</strong>, <strong>POW</strong> ghi nhận mức tăng đồng thuận theo đà phục hồi của giá dầu thế giới. Ngược lại, nhóm công nghệ và bán lẻ như <strong>FPT</strong>, <strong>MWG</strong> chịu áp lực bán ròng mạnh từ khối ngoại. Việc khối ngoại nối dài chuỗi bán ròng 5 phiên liên tiếp, đặc biệt tập trung vào các mã trụ cột, đặt ra thách thức lớn cho xu hướng tăng bền vững.</p><h2>Nhận định và Khuyến nghị</h2><p>MBS đánh giá nhịp tăng vừa qua nhiều khả năng vẫn là hồi kỹ thuật. VN-Index đang đối mặt với vùng kháng cự dày 1.830-1.845 điểm. Trong kịch bản cơ sở, thị trường sẽ tiếp tục xu hướng đi ngang. Nhà đầu tư nên giữ tỷ trọng tiền mặt cao, ưu tiên các ngành có nền tảng cơ bản tốt như chứng khoán, logistics và sản xuất khi có nhịp điều chỉnh về vùng giá hấp dẫn.</p><p>Nguồn dữ liệu tham khảo: <a rel="nofollow" href="https://cafef.vn/mbs-loat-nhom-co-phieu-dang-am-tham-hut-tien-giua-luc-vn-index-giang-co-188260622112634886.chn">MBS: Loạt nhóm cổ phiếu đang âm thầm "hút tiền" giữa lúc VN-Index giằng co</a>, <a rel="nofollow" href="https://vneconomy.vn/phia-truoc-vn-index-la-vung-can-kha-day-thi-truong-se-dieu-chinh.htm">Phía trước VN-Index là vùng cản khá dày, thị trường sẽ điều chỉnh?</a></p>'
      },
      {
        langCode: 'en', langName: 'ENGLISH', langEmoji: '🇺🇸',
        title: 'VN-Index June 22, 2026: Vingroup Stocks Surge, Cautious Liquidity',
        lead: 'Vietnam\'s stock market on June 22, 2026 recorded its most impressive session in two months as VN-Index surged, led by the Vingroup cluster, even as overall liquidity remained cautiously subdued.',
        content: '<h2>Market Sentiment: Green on the Surface</h2><p>The session on June 22, 2026 unfolded amid positive news of five major infrastructure project groundbreakings in Hanoi. However, VN-Index gains were driven primarily by Vingroup stocks — <strong>VIC</strong> hit the ceiling price, while <strong>VHM</strong> and <strong>VRE</strong> surged strongly. In reality, more stocks declined than advanced, reflecting cautious money flows beneath the green index figure.</p><h2>Money Flow Divergence</h2><p>Data shows clear divergence in money flow. Energy stocks like <strong>PVD</strong>, <strong>BSR</strong>, and <strong>POW</strong> gained in tandem with recovering global oil prices. In contrast, tech and retail names like <strong>FPT</strong> and <strong>MWG</strong> faced heavy foreign selling. Foreign investors extended their net selling streak to 5 consecutive sessions, concentrated on large-cap stocks — a significant challenge to a sustainable uptrend.</p><h2>Assessment & Recommendations</h2><p>MBS Research believes the recent uptick is likely still a technical bounce. VN-Index faces a dense resistance zone at 1,830–1,845 points. In the base scenario, the market will continue sideways consolidation. Investors should maintain high cash positions and prioritize fundamentally sound sectors such as securities, logistics, and manufacturing when prices pull back to attractive levels.</p>'
      },
      {
        langCode: 'ko', langName: 'KOREAN', langEmoji: '🇰🇷',
        title: 'VN-지수 2026년 6월 22일: 빈그룹 급등, 신중한 유동성',
        lead: '2026년 6월 22일 베트남 증시는 빈그룹 주도로 VN-지수가 2개월 만에 최고의 상승세를 기록했으나 전반적인 유동성은 여전히 조심스러운 분위기를 보였습니다.',
        content: '<h2>시장 심리: 겉은 초록, 속은 빨강</h2><p>2026년 6월 22일 장은 하노이의 5대 인프라 프로젝트 착공 소식 속에 전개되었습니다. 그러나 VN-지수 상승은 주로 빈그룹 주식들이 견인했습니다 — <strong>VIC</strong>는 상한가, <strong>VHM</strong>과 <strong>VRE</strong>도 강세를 보였습니다. 실제로는 하락 종목 수가 상승 종목 수를 앞서며 투자 심리의 신중함을 반영했습니다.</p><h2>자금 흐름 분화</h2><p>데이터에 따르면 자금 흐름이 뚜렷하게 분화되고 있습니다. <strong>PVD</strong>, <strong>BSR</strong>, <strong>POW</strong> 등 에너지 종목들은 국제 유가 회복에 힘입어 동반 상승했습니다. 반면 <strong>FPT</strong>, <strong>MWG</strong> 등 기술·유통주는 외국인 순매도 압박을 받았습니다. 외국인 투자자들의 5일 연속 순매도는 지속 상승에 대한 큰 도전 과제입니다.</p><h2>평가 및 추천</h2><p>MBS 리서치는 최근 반등이 기술적 회복 가능성이 높다고 분석합니다. VN-지수는 1,830~1,845포인트의 강한 저항대에 직면해 있습니다. 기본 시나리오에서 시장은 박스권 흐름을 이어갈 것입니다. 투자자들은 높은 현금 비중을 유지하고 증권, 물류, 제조업 등 기초 체력이 좋은 업종을 매력적인 가격대에서 매수하는 전략이 권장됩니다.</p>'
      },
      {
        langCode: 'zh', langName: 'CHINESE', langEmoji: '🇹🇼',
        title: 'VN指數2026年6月22日：Vingroup板塊爆發，流動性謹慎',
        lead: '2026年6月22日越南股市創下兩個月來最佳表現，VN指數在Vingroup概念股帶動下強勢上漲，但整體流動性仍保持謹慎觀望態勢。',
        content: '<h2>市場情緒：表面繁榮</h2><p>2026年6月22日的交易在河內五大基礎設施項目奠基的利好消息背景下展開。然而，VN指數的漲勢主要由Vingroup股票主導——<strong>VIC</strong>觸及漲停板，<strong>VHM</strong>和<strong>VRE</strong>強勢突破。實際上，下跌股票數量多於上漲股票，反映資金流入依然謹慎。</p><h2>資金流向分化</h2><p>數據顯示資金流向出現明顯分化。<strong>PVD</strong>、<strong>BSR</strong>、<strong>POW</strong>等能源股跟隨國際油價回升而集體上漲。相反，<strong>FPT</strong>、<strong>MWG</strong>等科技和零售股承受外資強力賣壓。外資連續5日凈賣出，尤其集中在藍籌股，對持續上漲構成重大挑戰。</p><h2>評估與建議</h2><p>MBS研究認為近期反彈很可能仍是技術性回升。VN指數面臨1830-1845點的強阻力區。基準情景下，市場將繼續橫盤整理。建議投資者保持較高現金比例，在回調至吸引人價位時優先佈局基本面良好的證券、物流和製造業等板塊。</p>'
      },
      {
        langCode: 'th', langName: 'THAI', langEmoji: '🇹🇭',
        title: 'VN-Index วันที่ 22 มิ.ย. 2569: Vingroup พุ่งแรง สภาพคล่องยังระมัดระวัง',
        lead: 'ตลาดหุ้นเวียดนามวันที่ 22 มิถุนายน 2569 บันทึกการซื้อขายที่คึกคักที่สุดในรอบ 2 เดือน โดย VN-Index พุ่งสูงขึ้นนำโดยกลุ่ม Vingroup แม้สภาพคล่องโดยรวมยังคงระมัดระวัง',
        content: '<h2>บรรยากาศตลาด: เขียวข้างนอก แดงข้างใน</h2><p>การซื้อขายวันที่ 22 มิถุนายน 2569 เกิดขึ้นท่ามกลางข่าวดีเรื่องการเริ่มต้นก่อสร้างโครงสร้างพื้นฐาน 5 โครงการใหญ่ในกรุงฮานอย อย่างไรก็ตาม การขึ้นของ VN-Index ส่วนใหญ่มาจากการนำโดยกลุ่ม Vingroup — <strong>VIC</strong> ขึ้น ceiling price, <strong>VHM</strong> และ <strong>VRE</strong> พุ่งแรง ความจริงแล้วจำนวนหุ้นที่ลดลงมากกว่าที่ขึ้น สะท้อนว่าเงินทุนยังระมัดระวัง</p><h2>การแยกตัวของกระแสเงิน</h2><p>ข้อมูลแสดงให้เห็นการแยกตัวของกระแสเงินอย่างชัดเจน กลุ่มพลังงานอย่าง <strong>PVD</strong>, <strong>BSR</strong>, <strong>POW</strong> ขึ้นพร้อมกันตามราคาน้ำมันโลกที่ฟื้นตัว ในทางตรงข้าม หุ้นเทคโนโลยีและค้าปลีกอย่าง <strong>FPT</strong>, <strong>MWG</strong> เผชิญแรงขายจากต่างชาติอย่างหนัก การขายสุทธิของต่างชาติที่ต่อเนื่อง 5 วันติดต่อกันเป็นความท้าทายสำคัญ</p><h2>การประเมินและคำแนะนำ</h2><p>MBS Research ประเมินว่าการขึ้นล่าสุดน่าจะยังเป็นการฟื้นตัวทางเทคนิค VN-Index เผชิญแนวต้านหนาแน่นที่ 1,830-1,845 จุด ในสถานการณ์พื้นฐาน ตลาดจะยังคงแกว่งตัวในกรอบ ควรรักษาสัดส่วนเงินสดสูงและให้ความสำคัญกับอุตสาหกรรมที่มีพื้นฐานดี</p>'
      },
      {
        langCode: 'ar', langName: 'ARABIC', langEmoji: '🇸🇦',
        title: 'مؤشر VN في 22 يونيو 2026: صعود مجموعة Vingroup، سيولة حذرة',
        lead: 'سجّل سوق الأسهم الفيتنامي في 22 يونيو 2026 جلسة استثنائية، إذ حقق مؤشر VN أقوى ارتفاع له في شهرين بقيادة مجموعة Vingroup، في حين بقيت السيولة الإجمالية في وضع الترقب الحذر.',
        content: '<h2>مزاج السوق: أخضر من الخارج، أحمر من الداخل</h2><p>جاءت جلسة 22 يونيو 2026 في ظل أنباء إيجابية عن انطلاق أعمال بناء 5 مشاريع بنية تحتية كبرى في هانوي. غير أن صعود المؤشر جاء مدفوعاً بشكل رئيسي بأسهم Vingroup — <strong>VIC</strong> وصل إلى الحد الأقصى، فيما ارتفع <strong>VHM</strong> و<strong>VRE</strong> بقوة. في الواقع، عدد الأسهم المتراجعة فاق المرتفعة، عاكساً حذر السيولة.</p><h2>تباين تدفقات الأموال</h2><p>تُظهر البيانات تبايناً واضحاً في تدفقات الأموال. ارتفعت أسهم الطاقة مثل <strong>PVD</strong> و<strong>BSR</strong> و<strong>POW</strong> بالتزامن مع انتعاش أسعار النفط العالمية. في المقابل، تعرّضت أسهم التكنولوجيا والتجزئة مثل <strong>FPT</strong> و<strong>MWG</strong> لضغط بيع أجنبي قوي. تمديد المستثمرين الأجانب سلسلة بيعهم الصافي إلى 5 جلسات متتالية يُشكّل تحدياً كبيراً.</p><h2>التقييم والتوصيات</h2><p>يقدّر MBS Research أن الارتفاع الأخير يبقى على الأرجح ارتداداً فنياً. يواجه مؤشر VN منطقة مقاومة كثيفة بين 1,830 و1,845 نقطة. في السيناريو الأساسي، سيستمر السوق في التداول الأفقي. يُنصح المستثمرون بالحفاظ على نسبة نقدية مرتفعة.</p>'
      },
      {
        langCode: 'ja', langName: 'JAPANESE', langEmoji: '🇯🇵',
        title: 'VNインデックス2026年6月22日：Vingroupが急騰、流動性は慎重',
        lead: '2026年6月22日のベトナム株式市場は、Vingroupグループを中心に2ヶ月ぶりの最大上昇を記録しましたが、全体的な流動性は依然として慎重な観察状態を維持しています。',
        content: '<h2>市場心理：外は緑、中は赤</h2><p>2026年6月22日のセッションは、ハノイでの5大インフラプロジェクト起工式の好材料の中で展開されました。ただし、VNインデックスの上昇は主にVingroupグループが牽引 — <strong>VIC</strong>がストップ高、<strong>VHM</strong>と<strong>VRE</strong>も大幅高。実際には下落銘柄数が上昇銘柄数を上回り、資金の慎重さを反映しています。</p><h2>資金フローの分化</h2><p>データは資金フローの明確な分化を示しています。<strong>PVD</strong>、<strong>BSR</strong>、<strong>POW</strong>などのエネルギー株は国際原油価格の回復に連動して一斉に上昇しました。一方、<strong>FPT</strong>、<strong>MWG</strong>などのテック・小売株は外国人の強い売り圧力にさらされました。外国人投資家の5日連続の純売り越しは持続的な上昇への大きな課題です。</p><h2>評価と推奨事項</h2><p>MBS Researchは、最近の上昇は依然として技術的な反発の可能性が高いと評価しています。VNインデックスは1,830〜1,845ポイントの厚い抵抗帯に直面しています。ベースシナリオでは、市場はレンジ相場を継続するでしょう。投資家は高い現金比率を維持し、証券・物流・製造業など基礎体力の良い業種を調整時に優先することを推奨します。</p>'
      }
    ];
  } else {
    console.log('📡 Fetching latest market_summary_stock…');
    allRows = await fetchSummaries();
  }

  // Handle sample data format
  if (isSample) {
    const todayStr = new Date().toISOString().slice(0, 10);
    allRows = [ { summary_date: todayStr, articles: articles } ];
  }

  console.log(`✅ Got ${allRows.length} days of summaries`);

  const headerHtml = readFile('header.html');
  const footerHtml = readFile('footer.html');
  const clientCss = readFile('scripts/seo-client.css');
  const clientJs = readFile('scripts/seo-client.js');

  let dataByLang = {};
  let langsSet = new Set();

  for (const row of allRows) {
    const rDate = row.summary_date;
    const rArticles = typeof row.articles === 'string' ? JSON.parse(row.articles) : row.articles;
    for (const a of rArticles) {
      if (isSample) {
        a.langName = I18N_LANG_NAMES[a.langCode];
        a.langEmoji = ''; 
      }
      langsSet.add(a.langCode);
      if (!dataByLang[a.langCode]) dataByLang[a.langCode] = [];
      dataByLang[a.langCode].push({ date: rDate, article: a });
    }
  }

  const langs = Array.from(langsSet);

  for (const lang of langs) {
    const articlesList = dataByLang[lang];
    const outDir  = path.join(ROOT, 'diem-tin-chung-khoan', lang);
    const outFile = path.join(outDir, 'index.html');
    fs.mkdirSync(outDir, { recursive: true });

    const html = generatePage({ articlesList, lang, headerHtml, footerHtml, langs, clientCss, clientJs });
    fs.writeFileSync(outFile, html, 'utf8');
    console.log(`  📝 Written: diem-tin-chung-khoan/${lang}/index.html`);
  }

  // Write root redirect page
  const rootRedirect = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta http-equiv="refresh" content="0;url=/diem-tin-chung-khoan/vi/"><title>Redirecting…</title></head><body><p>Redirecting to <a href="/diem-tin-chung-khoan/vi/">Vietnamese</a>…</p></body></html>`;
  const rootDir = path.join(ROOT, 'diem-tin-chung-khoan');
  fs.mkdirSync(rootDir, { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'index.html'), rootRedirect, 'utf8');
  
  console.log('\n✨ Done! All SEO pages generated.');
}

main().catch(err => { console.error('❌ Error:', err.message); process.exit(1); });
