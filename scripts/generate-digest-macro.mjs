/**
 * generate-digest-macro.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Fetches the latest row from the Supabase `market_summary_macro` table,
 * reads header.html + footer.html, and generates 7 static SEO pages:
 *   diem-tin-vi-mo/{langCode}/index.html
 *
 * Usage:
 *   node scripts/generate-digest-macro.mjs
 *   node scripts/generate-digest-macro.mjs --sample
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import { normalizeReferenceLinks } from './format-reference-links.js';
import { extractSlugFromUrl, slugifyTitle, isoToHuman, parseDateToDDMMYYYY } from './slug-utils.mjs';
import { COPY_LINK_SCRIPT } from './copy-link-snippet.mjs';
import { LANG_MENU_SCRIPT, LANG_MENU_CSS, buildLangMenuHtmlFromMeta } from './lang-menu-snippet.mjs';

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
const SITE_BASE = 'https://tintucchungkhoan24h.com';

const I18N = i18nData.translations;
const I18N_FLAGS = i18nData.flags;
const I18N_LANG_SHORT = i18nData.lang;
const I18N_LANG_NAMES = i18nData.langNames;

// ── Helpers ──────────────────────────────────────────────────────────────────
function fetchJson(url, headers) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
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

function isUsableArticleUrl(url) {
  return typeof url === 'string'
    && url.trim() !== ''
    && !['undefined', 'null'].includes(url.trim().toLowerCase());
}

function absoluteArticleUrl(articleUrl, fallbackUrl) {
  const trimmedUrl = isUsableArticleUrl(articleUrl) ? articleUrl.trim() : '';
  if (!trimmedUrl) return fallbackUrl;
  return trimmedUrl.startsWith('http')
    ? trimmedUrl
    : `${SITE_BASE}${trimmedUrl.startsWith('/') ? '' : '/'}${trimmedUrl}`;
}

// ── Fetch summaries ─────────────────────────────────────────────────────
async function fetchSummaries() {
  // Fetch 30 rows to fully populate the hub archive section
  let url = `${SUPABASE_URL}/rest/v1/market_summary_macro?order=summary_date.desc&limit=30`;

  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  };

  const rows = await fetchJson(url, headers);
  if (!rows || rows.length === 0) throw new Error('No rows found in market_summary_macro');
  return rows;
}

// ── Generate one HTML page (Hub) ─────────────────────────────────────────────────────
function generatePage({ articlesList, lang, headerHtml, footerHtml, langs, clientCss, clientJs, archiveItems, latestSpokeUrl }) {
  const canonical  = `${CANONICAL_BASE}/diem-tin-vi-mo/${lang}/`;
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
  const menuHtml = buildLangMenuHtmlFromMeta(langs, {
    flags: I18N_FLAGS,
    names: I18N_LANG_NAMES,
    shorts: I18N_LANG_SHORT,
    hrefForLang: (l) => `/diem-tin-vi-mo/${l}/`,
  });

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
${langs.map(l => `  <link rel="alternate" hreflang="${HREFLANG[l] || l}" href="${CANONICAL_BASE}/diem-tin-vi-mo/${l}/">`).join('\n')}
  <link rel="alternate" hreflang="x-default" href="${CANONICAL_BASE}/diem-tin-vi-mo/vi/">

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

    /* Article content styling */
    .digest-lead { 
      background: linear-gradient(135deg, rgba(255,215,0,0.12) 0%, rgba(17,34,64,0.8) 100%); 
      border-left: 4px solid #ffd700; 
      padding: 16px 20px; 
      border-radius: 0 14px 14px 0; 
      font-size: 15px; 
      line-height: 1.65; 
      color: #e2e8f0; 
      font-style: italic; 
      margin-bottom: 24px; 
      position: relative;
      box-shadow: 0 4px 20px rgba(255,215,0,0.08);
    }
    .digest-body h2 { 
      font-size: 1.25rem; 
      font-weight: 800; 
      color: #ffd700; 
      margin: 28px 0 12px; 
      padding-bottom: 10px; 
      border-bottom: 2px solid rgba(255,215,0,0.25);
      display: flex;
      align-items: center;
      gap: 8px;
      line-height: 1.35;
    }
    .digest-body h2:first-child { margin-top: 0; }
    .digest-body h2::before {
      content: '';
      width: 7px;
      height: 7px;
      background: #ffd700;
      border-radius: 50%;
      box-shadow: 0 0 10px rgba(255,215,0,0.5);
      flex-shrink: 0;
    }
    .digest-body h3 {
      font-size: 1.1rem;
      font-weight: 700;
      color: #ffd700;
      margin: 20px 0 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(255,215,0,0.2);
      line-height: 1.35;
    }
    .digest-body h3:first-child { margin-top: 0; }
    .digest-body p { 
      margin: 0 0 14px; 
      line-height: 1.7; 
      color: #d1d5db; 
      font-size: 15px;
      text-align: left;
    }
    .digest-body strong { 
      color: #fbbf24; 
      font-weight: 700;
      background: transparent;
      padding: 0 1px;
      border-radius: 0;
    }
    .digest-body a {
      color: #60a5fa;
      text-decoration: none;
      border-bottom: 1px solid rgba(96,165,250,0.3);
      transition: all 0.2s ease;
      display: inline;
      margin-bottom: 0;
      line-height: inherit;
    }
    .digest-body a:hover {
      color: #ffd700;
      border-bottom-color: #ffd700;
    }
    
    /* Enhanced article card styling */
    article {
      background: linear-gradient(180deg, rgba(17,34,64,0.5) 0%, rgba(10,25,47,0.3) 100%);
      border: 1px solid rgba(255,215,0,0.1);
      border-radius: 18px;
      padding: 28px;
      margin-bottom: 28px;
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
      font-size: 1.75rem;
      font-weight: 800;
      margin-bottom: 0.875rem;
      line-height: 1.3;
    }
    article h2 {
      background: linear-gradient(135deg, #ffd700 0%, #ffed4e 50%, #ffd700 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      text-shadow: 0 0 20px rgba(255,215,0,0.2);
      letter-spacing: -0.01em;
      font-size: 1.5rem;
      font-weight: 600;
      margin-top: 1.5rem;
      margin-bottom: 0.75rem;
      line-height: 1.3;
    }
    article h3 {
      color: #ffd700;
      font-size: 1.25rem;
      font-weight: 600;
      margin-top: 1.25rem;
      margin-bottom: 0.5rem;
      line-height: 1.4;
    }
    article h4 {
      color: #fbbf24;
      font-size: 1.1rem;
      font-weight: 600;
      margin-top: 1rem;
      margin-bottom: 0.5rem;
      line-height: 1.4;
    }
    article h5 {
      color: #f59e0b;
      font-size: 1rem;
      font-weight: 600;
      margin-top: 0.75rem;
      margin-bottom: 0.5rem;
      line-height: 1.4;
    }
    article h6 {
      color: #d97706;
      font-size: 0.9rem;
      font-weight: 600;
      margin-top: 0.5rem;
      margin-bottom: 0.5rem;
      line-height: 1.4;
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

${LANG_MENU_CSS}

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
            <a href="${CANONICAL_BASE}/diem-tin-chung-khoan/${lang}/" class="tab-button tab-btn-responsive font-bold transition-all flex-shrink-0" style="text-decoration:none;">
                <span style="font-size:0.9em;">📊</span>
                <span class="tab-text">${currentI18n.tabs?.digest || 'Điểm tin'}</span>
            </a>
            <a href="${canonical}" aria-current="page" class="tab-button active tab-btn-responsive font-bold transition-all flex-shrink-0 inline-flex items-center gap-1 no-underline" style="text-decoration:none;" title="${currentI18n.tabs?.macroFocus || 'Tập trung Vĩ Mô'}">
                <span style="font-size:0.9em;">🌎</span>
                <span class="tab-text">${currentI18n.tabs?.macroFocus || 'Tập trung Vĩ Mô'}</span>
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
        // Convert h3 to h2 to match stock digest format
        formattedContent = formattedContent.replace(/<h3>/g, '<h2>').replace(/<\/h3>/g, '</h2>');
        // First, fix all instances of double single quotes in rel attribute globally
        formattedContent = formattedContent.replace(/rel=''nofollow''/g, 'rel="nofollow"');
        // Fix <a> tags with broken href where URL is split into separate attributes
        // General pattern: href="" followed by multiple ="" attributes that form the URL
        // This handles cases like: href="" https:="" cafef.vn="" path.chn''=""
        formattedContent = formattedContent.replace(/<a\s+([^>]*?)href=""\s+((?:https?:=""\s+)?[^=]+=""\s+[^=]+=""\s+[^=]+=""(?:\s+[^=]+=""*)*)([^>]*?)>([^<]*?)<\/a>/gi, (match, beforeHref, urlParts, afterHref, text) => {
          // Extract all the URL parts from the ="" attributes
          const parts = urlParts.match(/([^=]+)=""/g) || [];
          const url = parts.map(p => p.replace(/=""$/, '').replace(/''$/, '').replace(/""$/, '').trim()).join('');
          const allAttrs = (beforeHref + ' ' + afterHref).trim();
          return `<a href="${url}"${allAttrs ? ' ' + allAttrs : ''}>${text}</a>`;
        });
        // Fix <a> tags with href="" and URL split into multiple ="" attributes (4 parts)
        formattedContent = formattedContent.replace(/<a\s+([^>]*?)href=""\s+https:=""\s+([^=]+)=""\s+([^=]+)=""\s+([^=]+)=""\s+([^=]+)=""\s+([^>]*?)>([^<]*?)<\/a>/gi, (match, beforeHref, domain, path1, path2, path3, afterHref, text) => {
          // Reconstruct the URL from multiple parts
          const url = `https://${domain}${path1}${path2}${path3}`.replace(/''$/g, '').replace(/""$/g, '').trim();
          const allAttrs = (beforeHref + ' ' + afterHref).trim();
          return `<a href="${url}"${allAttrs ? ' ' + allAttrs : ''}>${text}</a>`;
        });
        // Fix <a> tags with href="" and URL split into multiple ="" attributes (5 parts)
        formattedContent = formattedContent.replace(/<a\s+([^>]*?)href=""\s+https:=""\s+([^=]+)=""\s+([^=]+)=""\s+([^=]+)=""\s+([^=]+)=""\s+([^=]+)=""\s+([^>]*?)>([^<]*?)<\/a>/gi, (match, beforeHref, domain, path1, path2, path3, path4, afterHref, text) => {
          // Reconstruct the URL from multiple parts
          const url = `https://${domain}${path1}${path2}${path3}${path4}`.replace(/''$/g, '').replace(/""$/g, '').trim();
          const allAttrs = (beforeHref + ' ' + afterHref).trim();
          return `<a href="${url}"${allAttrs ? ' ' + allAttrs : ''}>${text}</a>`;
        });
        // Fix <a> tags with href wrapped in double single quotes (''url'')
        formattedContent = formattedContent.replace(/<a\s+([^>]*?)href=''([^'']+)''([^>]*?)>([^<]*?)<\/a>/gi, (match, beforeHref, hrefValue, afterHref, text) => {
          const allAttrs = (beforeHref + ' ' + afterHref).trim();
          return `<a href="${hrefValue}"${allAttrs ? ' ' + allAttrs : ''}>${text}</a>`;
        });
        // First, fix <a> tags with comma-separated URLs in href attribute
        // Handle both single quotes, double quotes, and double single quotes
        formattedContent = formattedContent.replace(/<a\s+([^>]*?)href=['"]([^'"]*?)['"]([^>]*?)>([^<]*?)<\/a>/gi, (match, beforeHref, hrefValue, afterHref, text) => {
          // Check if href contains multiple URLs separated by commas
          if (hrefValue.includes(',')) {
            const urls = hrefValue.split(',').map(u => u.trim()).filter(u => u);
            const allAttrs = (beforeHref + ' ' + afterHref).trim();
            return urls.map(url => `<a href="${url}"${allAttrs ? ' ' + allAttrs : ''}>${text}</a>`).join('<br>');
          }
          return match;
        });
        // Handle the specific case with double single quotes (''href='')
        formattedContent = formattedContent.replace(/<a\s+([^>]*?)href=''([^'']*?)''([^>]*?)>([^<]*?)<\/a>/gi, (match, beforeHref, hrefValue, afterHref, text) => {
          // Check if href contains multiple URLs separated by commas
          if (hrefValue.includes(',')) {
            const urls = hrefValue.split(',').map(u => u.trim()).filter(u => u);
            const allAttrs = (beforeHref + ' ' + afterHref).trim();
            return urls.map(url => `<a href="${url}"${allAttrs ? ' ' + allAttrs : ''}>${text}</a>`).join('<br>');
          }
          return match;
        });
        // Handle the case with double double quotes (""href="")
        formattedContent = formattedContent.replace(/<a\s+([^>]*?)href=""([^"]*?)""([^>]*?)>([^<]*?)<\/a>/gi, (match, beforeHref, hrefValue, afterHref, text) => {
          // Check if href contains multiple URLs separated by commas
          if (hrefValue.includes(',')) {
            const urls = hrefValue.split(',').map(u => u.trim()).filter(u => u);
            const allAttrs = (beforeHref + ' ' + afterHref).trim();
            return urls.map(url => `<a href="${url}"${allAttrs ? ' ' + allAttrs : ''}>${text}</a>`).join('<br>');
          }
          return match;
        });
        // Then handle reference links paragraphs to format them properly
        formattedContent = formattedContent.replace(/<p>([^<]*?(?:Nguồn dữ liệu tham khảo|Data references|데이터 참고|참고 자료|数据参考|參考資料|ข้อมูลอ้างอิง|แหล่งข้อมูลอ้างอิง|مصادر البيانات|المراجع|データ参照|データ出典|参考文献|Reference data sources|Reference data source)[^<]*[:：]\s*)([^<]*(?:<a[^>]*>.*?<\/a>[^<]*)*)<\/p>/gi, (match, label, links) => {
          // Extract all links and put each on a new line
          const linkMatches = links.match(/<a[^>]*>.*?<\/a>/g) || [];
          const formattedLinks = linkMatches.map(link => {
            // Add target="_blank" if not already present
            if (!link.includes('target=')) {
              return link.replace('<a', '<a target="_blank"');
            }
            return link;
          }).join('<br>');
          return `<p><strong>${label}</strong><br>${formattedLinks}</p>`;
        });
        // Handle inline reference links format (comma-separated)
        formattedContent = formattedContent.replace(/(?:Nguồn dữ liệu tham khảo|Data references|데이터 참고|참고 자료|참고 자료 출처|数据参考|參考資料|參考資料來源|ข้อมูลอ้างอิง|แหล่งข้อมูลอ้างอิง|مصادر البيانات|المراجع|مصدر البيانات المرجعية|データ参照|データ出典|参考文献|参考データソース|Reference data sources|Reference data source)[:：]\s*((?:<a[^>]*>.*?<\/a>(?:\s*,\s*)?)+)/gi, (match, links) => {
          // Extract the label from the match
          const labelMatch = match.match(/(?:Nguồn dữ liệu tham khảo|Data references|데이터 참고|참고 자료|참고 자료 출처|数据参考|參考資料|參考資料來源|ข้อมูลอ้างอิง|แหล่งข้อมูลอ้างอิง|مصادر البيانات|المراجع|مصدر البيانات المرجعية|データ参照|データ出典|参考文献|参考データソース|Reference data sources|Reference data source)[:：]/i);
          const label = labelMatch ? labelMatch[0] : 'Nguồn dữ liệu tham khảo:';
          // Extract all links and put each on a new line
          const linkMatches = links.match(/<a[^>]*>.*?<\/a>/g) || [];
          const formattedLinks = linkMatches.map(link => {
            // Add target="_blank" if not already present
            if (!link.includes('target=')) {
              return link.replace('<a', '<a target="_blank"');
            }
            return link;
          }).join('<br>');
          return `<p><strong>${label} </strong><br>${formattedLinks}</p>`;
        });
        formattedContent = normalizeReferenceLinks(formattedContent);
        
        
        const fallbackSpokeUrl = `${SITE_BASE}/diem-tin-vi-mo/${lang}/${parseDateToDDMMYYYY(item.date)}`;
        const absoluteSpokeUrl = absoluteArticleUrl(item.article.article_url, fallbackSpokeUrl);
        const isLatest = (item === articlesList[0]);
        
        return `
        <article${isRtl ? ' dir="rtl"' : ''} data-spoke-url="${absoluteSpokeUrl}">
          <h1 class="text-2xl md:text-3xl font-black leading-tight mb-4">
            ${item.article.title}
          </h1>
          <div class="article-meta">
            <span class="highlight">📅 ${isoToHuman(item.date)}</span>
            <span>•</span>
            <span>${item.article.langEmoji || ''} ${item.article.langName || lang.toUpperCase()}</span>
            <span>•</span>
            <span>${SITE_NAME}</span>
            ${isLatest ? '<span class="spoke-badge">★ Hôm nay</span>' : ''}
          </div>
          <div class="article-actions">
            <button class="copy-link-btn" data-spoke-url="${absoluteSpokeUrl}" onclick="copyArticleLink(this)" title="Sao chép đương dẫn bài viết">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 0 2 2v1"/>
              </svg>
              <span class="btn-label">Sao chép link</span>
            </button>
          </div>

          <div class="digest-lead" ${isRtl ? 'style="border-left: none; border-right: 4px solid #ffd700; border-radius: 12px 0 0 12px;"' : ''}>${item.article.lead}</div>
          <div class="digest-body">${formattedContent}</div>
        </article>
        <hr class="border-gray-800 my-8">
      `;
      }).join('')}

      ${archiveItems && archiveItems.length > 1 ? `
      <!-- ARCHIVE SECTION: Past Spoke Pages -->
      <section class="archive-section max-w-[1440px] mx-auto" aria-label="Bài viết cũ">
        <div class="archive-section-header">
          <h2 class="archive-section-title">Kho lưu trữ bài viết</h2>
          <span class="archive-count-badge">${archiveItems.length - 1} bài</span>
        </div>
        <div class="archive-grid">
          ${archiveItems.slice(1).map(item => `
          <a href="${item.spokeAbsoluteUrl}" class="archive-card" title="${item.title.replace(/"/g, '&quot;')}">
            <span class="archive-card-date">📅 ${isoToHuman(item.date)}</span>
            <span class="archive-card-title">${item.title}</span>
            <span class="archive-card-arrow">→ Xem bài viết</span>
          </a>`).join('')}
        </div>
      </section>` : ''}
    </main>

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

${LANG_MENU_SCRIPT}

    // Inject dynamic client JS
    ${clientJs}

${COPY_LINK_SCRIPT.replace('{{COPY_LINK}}', currentI18n.copyLink || 'Copy link').replace('{{COPY_LINK_SUCCESS}}', currentI18n.copyLinkSuccess || 'Link copied!')}
  </script>
</body>
</html>`;
}

// ── Generate one Spoke Page (permanent, never overwritten) ─────────────────────
function generateSpokePage({ article, date, lang, spokeSlug, headerHtml, footerHtml, langs, clientCss, clientJs, peerSlugs, peerKey = date }) {
  const canonical    = `${CANONICAL_BASE}/diem-tin-vi-mo/${lang}/${spokeSlug}/`;
  const absoluteUrl  = `${SITE_BASE}/diem-tin-vi-mo/${lang}/${spokeSlug}/`;
  const hubUrl       = `${CANONICAL_BASE}/diem-tin-vi-mo/${lang}/`;
  const dashboardUrl = `${CANONICAL_BASE}/`;
  const isRtl        = lang === 'ar';

  let procHeader = headerHtml.replace(/src="([^"]+)"/g, (match, src) => src.startsWith('http') || src.startsWith('/') ? match : `src="/${src}"`);
  let procFooter = footerHtml.replace(/src="([^"]+)"/g, (match, src) => src.startsWith('http') || src.startsWith('/') ? match : `src="/${src}"`);

  const flagMarkup = I18N_FLAGS[lang] || '';
  const langShort  = I18N_LANG_SHORT[lang] || lang.toUpperCase();
  const spokeLangUrls = {};
  for (const l of langs) {
    const peer = peerSlugs?.[peerKey]?.[l];
    spokeLangUrls[l] = peer
      ? `/diem-tin-vi-mo/${l}/${peer}/`
      : `/diem-tin-vi-mo/${l}/`;
  }
  const menuHtml = buildLangMenuHtmlFromMeta(langs, {
    flags: I18N_FLAGS,
    names: I18N_LANG_NAMES,
    shorts: I18N_LANG_SHORT,
    hrefForLang: (l) => spokeLangUrls[l],
  });

  procHeader = procHeader.replace('<span id="langFlag"></span>', `<span id="langFlag">${flagMarkup}</span>`);
  procHeader = procHeader.replace(/<span id="langText"([^>]*)><\/span>/, `<span id="langText"$1>${langShort}</span>`);
  procHeader = procHeader.replace('<div id="langMenu" class="lang-menu" aria-hidden="true"></div>', `<div id="langMenu" class="lang-menu" aria-hidden="true">${menuHtml}</div>`);

  const currentI18n = I18N[lang] || I18N['en'] || {};
  const descText    = (article.lead || '').replace(/"/g, '&quot;').slice(0, 155);

  // Format content (same pipeline as hub)
  let formattedContent = article.content || '';
  formattedContent = formattedContent.replace(/<h3>/g, '<h2>').replace(/<\/h3>/g, '</h2>');
  formattedContent = formattedContent.replace(/rel=''nofollow''/g, 'rel="nofollow"');
  formattedContent = formattedContent.replace(/<a\s+([^>]*?)href=""\s+((?:https?:=""\s+)?[^=]+=""\s+[^=]+=""\s+[^=]+=""(?:\s+[^=]+=""*)*)([^>]*?)>([^<]*?)<\/a>/gi, (match, beforeHref, urlParts, afterHref, text) => {
    const parts = urlParts.match(/([^=]+)=""/g) || [];
    const url = parts.map(p => p.replace(/=""$/, '').replace(/''$/, '').replace(/""$/, '').trim()).join('');
    const allAttrs = (beforeHref + ' ' + afterHref).trim();
    return `<a href="${url}"${allAttrs ? ' ' + allAttrs : ''}>${text}</a>`;
  });
  formattedContent = formattedContent.replace(/<a\s+([^>]*?)href=""\s+https:=""\s+([^=]+)=""\s+([^=]+)=""\s+([^=]+)=""\s+([^=]+)=""\s+([^>]*?)>([^<]*?)<\/a>/gi, (match, beforeHref, domain, path1, path2, path3, afterHref, text) => {
    const url = `https://${domain}${path1}${path2}${path3}`.replace(/''$/g, '').replace(/""$/g, '').trim();
    const allAttrs = (beforeHref + ' ' + afterHref).trim();
    return `<a href="${url}"${allAttrs ? ' ' + allAttrs : ''}>${text}</a>`;
  });
  formattedContent = formattedContent.replace(/<a\s+([^>]*?)href=""\s+https:=""\s+([^=]+)=""\s+([^=]+)=""\s+([^=]+)=""\s+([^=]+)=""\s+([^=]+)=""\s+([^>]*?)>([^<]*?)<\/a>/gi, (match, beforeHref, domain, path1, path2, path3, path4, afterHref, text) => {
    const url = `https://${domain}${path1}${path2}${path3}${path4}`.replace(/''$/g, '').replace(/""$/g, '').trim();
    const allAttrs = (beforeHref + ' ' + afterHref).trim();
    return `<a href="${url}"${allAttrs ? ' ' + allAttrs : ''}>${text}</a>`;
  });
  formattedContent = formattedContent.replace(/<a\s+([^>]*?)href=''([^'']+)''([^>]*?)>([^<]*?)<\/a>/gi, (match, beforeHref, hrefValue, afterHref, text) => {
    const allAttrs = (beforeHref + ' ' + afterHref).trim();
    return `<a href="${hrefValue}"${allAttrs ? ' ' + allAttrs : ''}>${text}</a>`;
  });
  formattedContent = formattedContent.replace(/<a\s+([^>]*?)href=['"]([^'"]*?)['"]([^>]*?)>([^<]*?)<\/a>/gi, (match, beforeHref, hrefValue, afterHref, text) => {
    if (hrefValue.includes(',')) {
      const urls = hrefValue.split(',').map(u => u.trim()).filter(u => u);
      const allAttrs = (beforeHref + ' ' + afterHref).trim();
      return urls.map(url => `<a href="${url}"${allAttrs ? ' ' + allAttrs : ''}>${text}</a>`).join('<br>');
    }
    return match;
  });
  formattedContent = formattedContent.replace(/<a\s+([^>]*?)href=''([^'']*?)''([^>]*?)>([^<]*?)<\/a>/gi, (match, beforeHref, hrefValue, afterHref, text) => {
    if (hrefValue.includes(',')) {
      const urls = hrefValue.split(',').map(u => u.trim()).filter(u => u);
      const allAttrs = (beforeHref + ' ' + afterHref).trim();
      return urls.map(url => `<a href="${url}"${allAttrs ? ' ' + allAttrs : ''}>${text}</a>`).join('<br>');
    }
    return match;
  });
  formattedContent = formattedContent.replace(/<a\s+([^>]*?)href=""([^"]*?)""([^>]*?)>([^<]*?)<\/a>/gi, (match, beforeHref, hrefValue, afterHref, text) => {
    if (hrefValue.includes(',')) {
      const urls = hrefValue.split(',').map(u => u.trim()).filter(u => u);
      const allAttrs = (beforeHref + ' ' + afterHref).trim();
      return urls.map(url => `<a href="${url}"${allAttrs ? ' ' + allAttrs : ''}>${text}</a>`).join('<br>');
    }
    return match;
  });
  formattedContent = formattedContent.replace(/<p>([^<]*?(?:Nguồn dữ liệu tham khảo|Data references|데이터 참고|참고 자료|数据参考|參考資料|ข้อมูลอ้างอิง|แหล่งข้อมูลอ้างอิง|مصادر البيانات|المراجع|データ参照|データ出典|参考文献|Reference data sources|Reference data source)[^<]*[:：]\s*)([^<]*(?:<a[^>]*>.*?<\/a>[^<]*)*)<\/p>/gi, (match, label, links) => {
    const linkMatches = links.match(/<a[^>]*>.*?<\/a>/g) || [];
    const formattedLinks = linkMatches.map(link => {
      if (!link.includes('target=')) {
        return link.replace('<a', '<a target="_blank"');
      }
      return link;
    }).join('<br>');
    return `<p><strong>${label}</strong><br>${formattedLinks}</p>`;
  });
  formattedContent = normalizeReferenceLinks(formattedContent);

  return `<!DOCTYPE html>
<html lang="${HREFLANG[lang] || lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${article.title} | ${SITE_NAME}</title>
  <meta name="description" content="${descText}">
  <link rel="canonical" href="${absoluteUrl}">
${langs.map(l => `  <link rel="alternate" hreflang="${HREFLANG[l] || l}" href="${SITE_BASE}/diem-tin-vi-mo/${l}/">`).join('\n')}
  <link rel="alternate" hreflang="x-default" href="${SITE_BASE}/diem-tin-vi-mo/vi/">

  <meta property="og:title" content="${article.title.replace(/"/g, '&quot;')}">
  <meta property="og:description" content="${descText}">
  <meta property="og:url" content="${absoluteUrl}">
  <meta property="og:type" content="article">
  <meta property="og:image" content="${SITE_BASE}/ava_icon.png">
  <meta property="article:published_time" content="${date}T00:00:00+07:00">

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
    .tab-bar-wrap { overflow-x: auto; scrollbar-width: none; }
    .tab-bar-wrap::-webkit-scrollbar { display: none; }
    .tab-button { color: #9ca3af; background: transparent; border: none; cursor: pointer; user-select: none; position: relative; border-radius: 10px; margin: 0 1px; }
    .tab-btn-responsive { padding: 6px 10px; font-size: 11px; white-space: nowrap; display: inline-flex; align-items: center; justify-content: center; gap: 4px; text-decoration: none; transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1); font-weight: 700; }
    @media (min-width: 480px) { .tab-btn-responsive { padding: 8px 14px; font-size: 12px; } }
    @media (min-width: 640px) { .tab-btn-responsive { padding: 10px 20px; font-size: 14px; } }
    .tab-button:hover { color: #fef9c3; background: rgba(255, 255, 255, 0.06); }
    .tab-button.active { color: #0a192f; background: #ffd700; box-shadow: 0 2px 8px rgba(255, 215, 0, 0.3); }
    .tab-button:active { transform: scale(0.98); }
    article { background: linear-gradient(180deg, rgba(17,34,64,0.5) 0%, rgba(10,25,47,0.3) 100%); border: 1px solid rgba(255,215,0,0.1); border-radius: 18px; padding: 28px; margin-bottom: 28px; box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
    article h1 { background: linear-gradient(135deg, #ffd700 0%, #ffed4e 50%, #ffd700 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; letter-spacing: -0.02em; font-size: 1.75rem; font-weight: 800; margin-bottom: 0.875rem; line-height: 1.3; }
    .back-link { display: inline-flex; align-items: center; gap: 6px; color: #60a5fa; font-size: 13px; font-weight: 600; text-decoration: none; padding: 8px 14px; background: rgba(96,165,250,0.08); border: 1px solid rgba(96,165,250,0.25); border-radius: 8px; margin-bottom: 24px; transition: all 0.2s; }
    .back-link:hover { color: #ffd700; border-color: rgba(255,215,0,0.3); }
${LANG_MENU_CSS}
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
            <a href="${CANONICAL_BASE}/diem-tin-chung-khoan/${lang}/" class="tab-button tab-btn-responsive font-bold transition-all flex-shrink-0" style="text-decoration:none;">
                <span style="font-size:0.9em;">📊</span>
                <span class="tab-text">${currentI18n.tabs?.digest || 'Điểm tin CK'}</span>
            </a>
            <a href="${hubUrl}" aria-current="page" class="tab-button active tab-btn-responsive font-bold transition-all flex-shrink-0 inline-flex items-center gap-1 no-underline" style="text-decoration:none;" title="${currentI18n.tabs?.macroFocus || 'Tiêu điểm Vĩ mô'}">
                <span style="font-size:0.9em;">🌎</span>
                <span class="tab-text">${currentI18n.tabs?.macroFocus || 'Tiêu điểm Vĩ mô'}</span>
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
                            <input type="text" id="seoFromDate" value="${isoToHuman(date)}" class="datepicker-input" data-placeholder-key="datepicker.inputPlaceholder" readonly placeholder="dd/mm/yyyy">
                            <div id="seoFromDatePopup" class="datepicker-popup"></div>
                        </div>
                    </div>
                    <div class="w-[1px] h-7 bg-gray-700 mx-3"></div>
                    <div class="flex flex-col flex-1">
                        <label id="lblTo" class="text-[9px] uppercase text-gray-500 font-bold mb-0.5" data-text-key="lblTo">${currentI18n.lblTo || 'Đến ngày'}</label>
                        <div class="datepicker-wrapper">
                            <input type="text" id="seoToDate" value="${isoToHuman(date)}" class="datepicker-input" data-placeholder-key="datepicker.inputPlaceholder" readonly placeholder="dd/mm/yyyy">
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

    <!-- SPOKE ARTICLE -->
    <main id="digest-feed" class="max-w-[1440px] mx-auto">
      <article${isRtl ? ' dir="rtl"' : ''} data-spoke-url="${absoluteUrl}">
        <h1 class="text-2xl md:text-3xl font-black leading-tight mb-4">${article.title}</h1>
        <div class="article-meta">
          <span class="highlight">📅 ${isoToHuman(date)}</span>
          <span>•</span>
          <span>${article.langEmoji || ''} ${article.langName || lang.toUpperCase()}</span>
          <span>•</span>
          <span>${SITE_NAME}</span>
        </div>
        <div class="article-actions">
          <button class="copy-link-btn" data-spoke-url="${absoluteUrl}" onclick="copyArticleLink(this)" title="Sao chép đường dẫn bài viết">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 0 2 2v1"/>
            </svg>
            <span class="btn-label">Sao chép link</span>
          </button>
        </div>
        <div class="digest-lead"${isRtl ? ' style="border-left: none; border-right: 4px solid #ffd700; border-radius: 12px 0 0 12px;"' : ''}>${article.lead}</div>
        <div class="digest-body">${formattedContent}</div>
      </article>
    </main>

  </div>

  <!-- FOOTER -->
  <div id="footer-container">
    ${procFooter}
  </div>

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
    }
    applyDict();

    window.SPOKE_LANG_URLS = ${JSON.stringify(spokeLangUrls)};

${LANG_MENU_SCRIPT}

${COPY_LINK_SCRIPT.replace('{{COPY_LINK}}', currentI18n.copyLink || 'Copy link').replace('{{COPY_LINK_SUCCESS}}', currentI18n.copyLinkSuccess || 'Link copied!')}
  </script>
  <script>window.IS_SPOKE_PAGE = true; window.SPOKE_ARTICLE_DATE = "${date}";</script>
  <script>${clientJs}</script>
</body>
</html>`;
}

// ── Update sitemap with new spoke URLs ────────────────────────────────────────
function updateSitemapWithSpokes(newSpokeEntries) {
  const sitemapPath = path.join(ROOT, 'sitemap.xml');
  let sitemap = fs.readFileSync(sitemapPath, 'utf8');
  const today = new Date().toISOString().split('T')[0];

  // Update lastmod on existing hub entries
  sitemap = sitemap.replace(/<lastmod>2026-\d{2}-\d{2}<\/lastmod>/g, `<lastmod>${today}</lastmod>`);

  if (!newSpokeEntries || newSpokeEntries.length === 0) {
    fs.writeFileSync(sitemapPath, sitemap, 'utf8');
    console.log('  📝 Updated: sitemap.xml (lastmod only)');
    return;
  }

  let addedCount = 0;
  for (const entry of newSpokeEntries) {
    // Only add if this URL is not already present
    if (sitemap.includes(entry.url)) continue;
    const urlBlock = `
  <!-- Spoke: ${entry.label} -->
  <url>
    <loc>${entry.url}</loc>
    <lastmod>${entry.date}</lastmod>
    <changefreq>never</changefreq>
    <priority>0.8</priority>
  </url>`;
    sitemap = sitemap.replace('</urlset>', urlBlock + '\n\n</urlset>');
    addedCount++;
  }

  fs.writeFileSync(sitemapPath, sitemap, 'utf8');
  console.log(`  📝 Updated sitemap.xml (${addedCount} new spoke URL(s) added)`);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const args     = process.argv.slice(2);
  const isSample = args.includes('--sample');
  let allRows = [];
  let articles;

  if (isSample) {
    console.log('📡 Using SAMPLE_ARTICLES for macro...');
    // Hardcoded sample data for macro
    articles = [
      {
        langCode: 'vi', langName: 'VIETNAMESE', langEmoji: '🇻🇳',
        title: 'Cập nhật kinh tế vĩ mô tuần 22/06/2026: Giá dầu hồi phục, lạm phát ổn định',
        lead: 'Tuần qua, thị trường kinh tế vĩ mô ghi nhận nhiều diễn biến tích cực với giá dầu thế giới phục hồi nhẹ sau chuỗi giảm sâu. Lạm phát tại các nền kinh tế lớn tiếp tục ổn định, tạo động lực cho các quyết định chính sách tiền tệ trong thời gian tới.',
        content: '<h2>Giá dầu thế giới</h2><p>Giá dầu Brent tăng 2.3% lên mức 78.5 USD/thùng trong tuần qua, phản ánh kỳ vọng về nhu cầu năng lượng phục hồi mùa hè.</p><h2>Lạm phát và Chính sách tiền tệ</h2><p>Chỉ số giá tiêu dùng (CPI) của Mỹ tăng 0.2% trong tháng 5, thấp hơn dự kiến 0.3%, cho thấy lạm phát đang được kiểm soát hiệu quả.</p>',
        article_url: '/diem-tin-vi-mo/vi/cap-nhat-kinh-te-vi-mo-tuan-22-06-2026-gia-dau-hoi-phuc-lam-phat-on-dinh-22-06-2026'
      },
      {
        langCode: 'en', langName: 'ENGLISH', langEmoji: '🇺🇸',
        title: 'Macro Economic Update Week 22/06/2026: Oil Recovery, Stable Inflation',
        lead: 'The past week saw positive macroeconomic developments with global oil prices recovering slightly after a deep decline.',
        content: '<h2>Global Oil Prices</h2><p>Brent crude rose 2.3% to $78.5 per barrel this week.</p><h2>Inflation and Monetary Policy</h2><p>The US CPI increased 0.2% in May, below the expected 0.3%.</p>',
        article_url: '/diem-tin-vi-mo/en/cap-nhat-kinh-te-vi-mo-tuan-22-06-2026-gia-dau-hoi-phuc-lam-phat-on-dinh-22-06-2026'
      },
      {
        langCode: 'ko', langName: 'KOREAN', langEmoji: '🇰🇷',
        title: '2026년 6월 22일 주 거시경제 업데이트: 유가 회복, 물가 안정',
        lead: '지난 주에는 유가가 급락 후 약간 회복되는 등 긍정적인 거시경제 지표가 관찰되었습니다.',
        content: '<h2>국제 유가</h2><p>브렌트 유가는 주간 2.3% 상승하여 배럴당 78.5달러를 기록했습니다.</p>',
        article_url: '/diem-tin-vi-mo/ko/cap-nhat-kinh-te-vi-mo-tuan-22-06-2026-gia-dau-hoi-phuc-lam-phat-on-dinh-22-06-2026'
      },
      {
        langCode: 'zh', langName: 'CHINESE', langEmoji: '🇹🇼',
        title: '2026年6月22日宏觀經濟更新：油價回升，通脹穩定',
        lead: '過去一周，宏觀經濟出現積極發展，全球油價在深度下跌後略有回升。',
        content: '<h2>全球油價</h2><p>布倫特原油本周上漲2.3%至每桶78.5美元。</p>',
        article_url: '/diem-tin-vi-mo/zh/cap-nhat-kinh-te-vi-mo-tuan-22-06-2026-gia-dau-hoi-phuc-lam-phat-on-dinh-22-06-2026'
      },
      {
        langCode: 'th', langName: 'THAI', langEmoji: '🇹🇭',
        title: 'อัปเดตเศรษฐกิจมหภาคสัปดาห์ 22/06/2569: ราคาน้ำมันฟื้นตัว เงินเฟ้อเสถียร',
        lead: 'สัปดาห์ที่แล้วมีการพัฒนาเศรษฐกิจมหภาคในเชิงบวก',
        content: '<h2>ราคาน้ำมันโลก</h2><p>น้ำมันดิบเบรนต์เพิ่มขึ้น 2.3% เป็น 78.5 ดอลลาร์ต่อบาร์เรล</p>',
        article_url: '/diem-tin-vi-mo/th/cap-nhat-kinh-te-vi-mo-tuan-22-06-2026-gia-dau-hoi-phuc-lam-phat-on-dinh-22-06-2026'
      },
      {
        langCode: 'ar', langName: 'ARABIC', langEmoji: '🇸🇦',
        title: 'تحديث الاقتصاد الكلي الأسبوع 22/06/2026: تعافي أسعار النفط، استقرار التضخم',
        lead: 'شهد الأسبوع الماضي تطورات اقتصادية كلية إيجابية مع تعافي أسعار النفط العالمية.',
        content: '<h2>أسعار النفط العالمية</h2><p>ارتفع خام برنت 2.3% إلى 78.5 دولار للبرميل.</p>',
        article_url: '/diem-tin-vi-mo/ar/cap-nhat-kinh-te-vi-mo-tuan-22-06-2026-gia-dau-hoi-phuc-lam-phat-on-dinh-22-06-2026'
      },
      {
        langCode: 'ja', langName: 'JAPANESE', langEmoji: '🇯🇵',
        title: '2026年6月22日マクロ経済更新：原油価格回復、インフレ安定',
        lead: '先週はマクロ経済の好展開が見られ、原油価格が急落後に小幅回復しました。',
        content: '<h2>世界の原油価格</h2><p>ブレント原油は今週2.3%上昇し、バレル当たり78.5ドルとなりました。</p>',
        article_url: '/diem-tin-vi-mo/ja/cap-nhat-kinh-te-vi-mo-tuan-22-06-2026-gia-dau-hoi-phuc-lam-phat-on-dinh-22-06-2026'
      }
    ];
  } else {
    console.log('📡 Fetching latest market_summary_macro…');
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
  const clientCss  = readFile('scripts/seo-client.css');
  const formatRefJs = readFile('scripts/format-reference-links.js').replace(/export /g, '');
  const clientJs   = formatRefJs + '\n' + readFile('scripts/seo-client-macro.js');

  let dataByLang = {};
  let langsSet   = new Set();

  for (const [rowIndex, row] of allRows.entries()) {
    const rDate    = row.summary_date;
    const rowKey   = `${rDate}#${rowIndex}`;
    const rArticles = typeof row.articles === 'string' ? JSON.parse(row.articles) : row.articles;
    for (const a of rArticles) {
      if (isSample) {
        a.langName  = I18N_LANG_NAMES[a.langCode];
        a.langEmoji = '';
      }
      const langCode = a.langCode === 'zh-TW' ? 'zh' : a.langCode;
      langsSet.add(langCode);
      if (!dataByLang[langCode]) dataByLang[langCode] = [];
      dataByLang[langCode].push({ date: rDate, key: rowKey, article: a });
    }
  }

  const langs = Array.from(langsSet);
  const newSpokeEntries = []; // Collect newly-written spoke URLs for sitemap + ping

  // ── FIRST PASS: Compute all slugs for all langs so we can cross-link ────────
  const allArchiveItems = {}; // { lang: [...items] }
  for (const lang of langs) {
    const articlesList = dataByLang[lang];
    const usedSlugs = new Map();
    allArchiveItems[lang] = articlesList.map(item => {
      const artUrl  = item.article.article_url || null;
      const hasArticleUrl = isUsableArticleUrl(artUrl);
      const dateSlug = parseDateToDDMMYYYY(item.date);
      if (!hasArticleUrl) {
        const absUrl = `${SITE_BASE}/diem-tin-vi-mo/${lang}/${dateSlug}`;
        return {
          date:             item.date,
          key:              item.key,
          title:            item.article.title,
          spokeSlug:        dateSlug,
          spokeAbsoluteUrl: absUrl,
        };
      }
      const baseSlug = extractSlugFromUrl(artUrl) || dateSlug;
      const baseCount = usedSlugs.get(baseSlug) || 0;
      const fallbackSlug = slugifyTitle(item.article.title, item.date);
      let slug = baseCount === 0 ? baseSlug : fallbackSlug;
      if (usedSlugs.has(slug)) {
        slug = `${slug}-${(usedSlugs.get(slug) || 0) + 1}`;
      }
      if (slug === baseSlug) {
        usedSlugs.set(baseSlug, baseCount + 1);
      } else {
        usedSlugs.set(baseSlug, baseCount + 1);
        usedSlugs.set(slug, (usedSlugs.get(slug) || 0) + 1);
      }
      const absUrl  = `${SITE_BASE}/diem-tin-vi-mo/${lang}/${slug}/`;
      return {
        date:             item.date,
        key:              item.key,
        title:            item.article.title,
        spokeSlug:        slug,
        spokeAbsoluteUrl: absUrl,
      };
    });
  }

  // Build peerSlugs: { rowKey: { lang: slug } } for spoke-to-spoke cross-language links
  const peerSlugs = {};
  for (const [lang, items] of Object.entries(allArchiveItems)) {
    for (const item of items) {
      if (!peerSlugs[item.key]) peerSlugs[item.key] = {};
      peerSlugs[item.key][lang] = item.spokeSlug;
    }
  }

  // ── SECOND PASS: Write all pages ─────────────────────────────────────────────
  for (const lang of langs) {
    const articlesList = dataByLang[lang];
    const archiveItems = allArchiveItems[lang];
    const hubDir  = path.join(ROOT, 'diem-tin-vi-mo', lang);
    fs.mkdirSync(hubDir, { recursive: true });

    // ── Write Spoke Pages (refresh from article_url data each run) ───────────
    for (const item of archiveItems) {
      const spokeDir  = path.join(ROOT, 'diem-tin-vi-mo', lang, item.spokeSlug);
      const spokeFile = path.join(spokeDir, 'index.html');
      fs.mkdirSync(spokeDir, { recursive: true });
      const spokeHtml = generateSpokePage({
        article:    articlesList.find(i => i.key === item.key)?.article,
        date:       item.date,
        lang,
        spokeSlug:  item.spokeSlug,
        headerHtml, footerHtml, langs, clientCss, clientJs,
        peerSlugs,
        peerKey:    item.key,
      });
      fs.writeFileSync(spokeFile, spokeHtml, 'utf8');
      console.log(`  📝 Written spoke: diem-tin-vi-mo/${lang}/${item.spokeSlug}/index.html`);
      // Add all language spoke URLs to sitemap
      newSpokeEntries.push({
        url:   item.spokeAbsoluteUrl,
        date:  item.date,
        label: item.title.slice(0, 60),
      });
    }

    // ── Write Hub Page (always updated) ─────────────────────────────────────
    const hubFile = path.join(hubDir, 'index.html');
    const hubHtml = generatePage({ articlesList, lang, headerHtml, footerHtml, langs, clientCss, clientJs, archiveItems });
    fs.writeFileSync(hubFile, hubHtml, 'utf8');
    console.log(`  📝 Written hub: diem-tin-vi-mo/${lang}/index.html`);
  }

  // ── Root redirect page ─────────────────────────────────────────────────────
  const rootRedirect = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta http-equiv="refresh" content="0;url=/diem-tin-vi-mo/vi/"><title>Redirecting…</title></head><body><p>Redirecting to <a href="/diem-tin-vi-mo/vi/">Vietnamese</a>…</p></body></html>`;
  const rootDir = path.join(ROOT, 'diem-tin-vi-mo');
  fs.mkdirSync(rootDir, { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'index.html'), rootRedirect, 'utf8');

  // ── Update sitemap with new spoke URLs ────────────────────────────────────
  updateSitemapWithSpokes(newSpokeEntries);

  // ── Write new spoke URLs to shared file for Google ping ───────────────────
  if (newSpokeEntries.length > 0) {
    const pingFilePath = path.join(ROOT, 'spoke_urls_macro.json');
    const existingPing = fs.existsSync(pingFilePath)
      ? JSON.parse(fs.readFileSync(pingFilePath, 'utf8'))
      : [];
    const merged = [...new Set([...existingPing, ...newSpokeEntries.map(e => e.url)])];
    fs.writeFileSync(pingFilePath, JSON.stringify(merged, null, 2), 'utf8');
    console.log(`  📝 Wrote ${newSpokeEntries.length} new spoke URL(s) to spoke_urls_macro.json`);
  }

  console.log('\n✨ Done! All macro SEO pages (hub + spokes) generated.');
}

main().catch(err => { console.error('❌ Error:', err.message); process.exit(1); });
