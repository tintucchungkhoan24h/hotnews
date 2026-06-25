/**
 * slug-utils.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared utilities for extracting and generating URL slugs used by both
 * generate-digest-macro.mjs and generate-digest.mjs.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Extracts the spoke slug from a full article_url stored in Supabase.
 * 
 * Example:
 *   input:  "https://tintucchungkhoan24h.com/diem-tin-vi-mo/vi/nang-hang-msci-2026-that-bai-25-06-2026"
 *   output: "nang-hang-msci-2026-that-bai-25-06-2026"
 *
 * Returns null if the URL cannot be parsed.
 */
export function extractSlugFromUrl(articleUrl) {
  if (!articleUrl || typeof articleUrl !== 'string') return null;
  try {
    // Remove trailing slash, then take last path segment
    const clean = articleUrl.replace(/\/+$/, '');
    const parts = clean.split('/');
    const slug = parts[parts.length - 1];
    // Validate: must look like a slug (non-empty, only URL-safe chars)
    if (slug && /^[a-z0-9\-]+$/.test(slug)) return slug;
    return null;
  } catch {
    return null;
  }
}

/**
 * Converts Vietnamese characters and common special characters to ASCII slugs.
 * Appends the date in DD-MM-YYYY format.
 *
 * Example:
 *   slugifyTitle("Nâng hạng MSCI 2026 thất bại: Dòng tiền 80.000 tỷ sẽ đi về đâu?", "2026-06-25")
 *   → "nang-hang-msci-2026-that-bai-dong-tien-80000-ty-se-di-ve-dau-25-06-2026"
 *
 * Used as a fallback when article_url is not present.
 */
export function slugifyTitle(title, isoDate) {
  if (!title) return `bai-viet-${parseDateToDDMMYYYY(isoDate)}`;

  const map = {
    'à':'a','á':'a','ả':'a','ã':'a','ạ':'a',
    'ă':'a','ắ':'a','ặ':'a','ằ':'a','ẳ':'a','ẵ':'a',
    'â':'a','ấ':'a','ầ':'a','ẩ':'a','ẫ':'a','ậ':'a',
    'è':'e','é':'e','ẻ':'e','ẽ':'e','ẹ':'e',
    'ê':'e','ế':'e','ề':'e','ể':'e','ễ':'e','ệ':'e',
    'ì':'i','í':'i','ỉ':'i','ĩ':'i','ị':'i',
    'ò':'o','ó':'o','ỏ':'o','õ':'o','ọ':'o',
    'ô':'o','ố':'o','ồ':'o','ổ':'o','ỗ':'o','ộ':'o',
    'ơ':'o','ớ':'o','ờ':'o','ở':'o','ỡ':'o','ợ':'o',
    'ù':'u','ú':'u','ủ':'u','ũ':'u','ụ':'u',
    'ư':'u','ứ':'u','ừ':'u','ử':'u','ữ':'u','ự':'u',
    'ỳ':'y','ý':'y','ỷ':'y','ỹ':'y','ỵ':'y',
    'đ':'d',
    'À':'a','Á':'a','Ả':'a','Ã':'a','Ạ':'a',
    'Ă':'a','Ắ':'a','Ặ':'a','Ằ':'a','Ẳ':'a','Ẵ':'a',
    'Â':'a','Ấ':'a','Ầ':'a','Ẩ':'a','Ẫ':'a','Ậ':'a',
    'È':'e','É':'e','Ẻ':'e','Ẽ':'e','Ẹ':'e',
    'Ê':'e','Ế':'e','Ề':'e','Ể':'e','Ễ':'e','Ệ':'e',
    'Ì':'i','Í':'i','Ỉ':'i','Ĩ':'i','Ị':'i',
    'Ò':'o','Ó':'o','Ỏ':'o','Õ':'o','Ọ':'o',
    'Ô':'o','Ố':'o','Ồ':'o','Ổ':'o','Ỗ':'o','Ộ':'o',
    'Ơ':'o','Ớ':'o','Ờ':'o','Ở':'o','Ỡ':'o','Ợ':'o',
    'Ù':'u','Ú':'u','Ủ':'u','Ũ':'u','Ụ':'u',
    'Ư':'u','Ứ':'u','Ừ':'u','Ử':'u','Ữ':'u','Ự':'u',
    'Ỳ':'y','Ý':'y','Ỷ':'y','Ỹ':'y','Ỵ':'y',
    'Đ':'d',
  };

  const dateSuffix = parseDateToDDMMYYYY(isoDate);

  const slug = title
    .split('').map(c => map[c] || c).join('')  // replace Vietnamese chars
    .toLowerCase()
    .replace(/[^a-z0-9\s\-]/g, '')             // remove non-slug chars
    .trim()
    .replace(/\s+/g, '-')                       // spaces → hyphens
    .replace(/-{2,}/g, '-')                     // collapse multiple hyphens
    .replace(/^-+|-+$/g, '')                    // strip leading/trailing hyphens
    .slice(0, 80);                              // cap length

  return `${slug}-${dateSuffix}`;
}

/**
 * Converts an ISO date string (YYYY-MM-DD) to DD-MM-YYYY display format.
 */
export function parseDateToDDMMYYYY(isoDate) {
  if (!isoDate) return '00-00-0000';
  const [y, m, d] = isoDate.split('-');
  return `${d}-${m}-${y}`;
}

/**
 * Converts an ISO date string (YYYY-MM-DD) to a human-readable DD/MM/YYYY string.
 */
export function isoToHuman(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}
