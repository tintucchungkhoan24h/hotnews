const REF_LABELS = [
  'Nguồn dữ liệu tham khảo',
  'Nguồn tham khảo',
  'Tài liệu tham khảo',
  'Data references',
  'Data reference',
  'Reference data sources',
  'Reference data source',
  'References',
  'Sources',
  '데이터 참고',
  '참고 자료 출처',
  '참고 자료',
  '数据参考来源',
  '数据参考',
  '参考资料来源',
  '参考资料',
  '參考資料來源',
  '參考資料',
  'ข้อมูลอ้างอิง',
  'แหล่งข้อมูลอ้างอิง',
  'مصادر البيانات المرجعية',
  'مصدر البيانات المرجعية',
  'مصادر البيانات',
  'مصدر البيانات',
  'المراجع',
  'データ参照',
  'データ出典',
  '参考データソース',
  '参考文献',
].join('|');

function sanitizeReferenceLink(link) {
  return link
    .replace(/rel=''nofollow''/g, 'rel="nofollow"')
    .replace(/href=''([^'']+)''/g, 'href="$1"');
}

function formatReferenceBlock(label, linksHtml) {
  const linkMatches = linksHtml.match(/<a[^>]*>.*?<\/a>/g) || [];
  const formattedLinks = linkMatches.map(link => {
    let fixed = sanitizeReferenceLink(link);
    if (!fixed.includes('target=')) fixed = fixed.replace('<a', '<a target="_blank"');
    return fixed;
  }).join('<br>');
  return `<p><strong>${label}</strong><br>${formattedLinks}</p>`;
}

export function extractReferenceSection(html) {
  if (!html) return null;

  // NEW: Pattern-based detection - find <p> tags with multiple <a> tags (reference links)
  // This works regardless of the label text/language
  const structuralMatch = html.match(/<p>([^<]*[:：]\s*)((?:<a[^>]*>.*?<\/a>(?:\s*,\s*)?){2,})\s*<\/p>/i);
  if (structuralMatch) {
    // Extract label (everything before the colon)
    const label = structuralMatch[1].trim();
    const links = structuralMatch[2];
    return { label, links };
  }

  // NEW: Pattern with <strong> tag and <br> separators
  const structuralStrongMatch = html.match(/<p><strong>([^<]*[:：]\s*)<\/strong><br>((?:<a[^>]*>.*?<\/a>(?:<br>)?){2,})<\/p>/i);
  if (structuralStrongMatch) {
    const label = structuralStrongMatch[1].trim();
    const links = structuralStrongMatch[2];
    return { label, links };
  }

  // FALLBACK: Keyword-based detection (for backward compatibility)
  const formattedMatch = html.match(
    new RegExp(`<p><strong>((?:${REF_LABELS})[^<]*[:：]\\s*)</strong><br>((?:<a[^>]*>.*?</a>(?:<br>)?)+)</p>`, 'i')
  );
  if (formattedMatch) return { label: formattedMatch[1], links: formattedMatch[2] };

  const pMatch = html.match(
    new RegExp(`<p>((?:[^<]*(?:${REF_LABELS})[^<]*[:：]\\s*))((?:<a[^>]*>.*?</a>(?:\\s*,\\s*)?)+)\\s*</p>`, 'i')
  );
  if (pMatch) return { label: pMatch[1], links: pMatch[2] };

  const inlineMatch = html.match(
    new RegExp(`((?:${REF_LABELS})[:：]\\s*)((?:<a[^>]*>.*?</a>(?:\\s*,\\s*)?)+)`, 'i')
  );
  if (inlineMatch) return { label: inlineMatch[1], links: inlineMatch[2] };

  return null;
}

export function stripReferenceSection(html) {
  // NEW: Strip structural patterns (p tags with multiple a tags and colon)
  let result = html
    .replace(/<p><strong>[^<]*[:：]\s*<\/strong><br>(?:<a[^>]*>.*?<\/a>(?:<br>)?){2,}<\/p>/gi, '')
    .replace(/<p>[^<]*[:：]\s*(?:<a[^>]*>.*?<\/a>(?:\s*,\s*)?){2,}\s*<\/p>/gi, '');

  // FALLBACK: Strip keyword-based patterns (for backward compatibility)
  return result
    .replace(new RegExp(`<p><strong>[^<]*(?:${REF_LABELS})[^<]*</strong><br>(?:<a[^>]*>.*?</a>(?:<br>)?)*</p>`, 'gi'), '')
    .replace(new RegExp(`<p>[^<]*(?:${REF_LABELS})[^<]*[:：][^<]*(?:<a[^>]*>.*?</a>[^<]*)*</p>`, 'gi'), '')
    .replace(new RegExp(`(?:${REF_LABELS})[:：]\\s*(?:<a[^>]*>.*?</a>(?:\\s*,\\s*)?)+`, 'gi'), '');
}

export function normalizeReferenceLinks(content) {
  const refSection = extractReferenceSection(content);
  let result = stripReferenceSection(content);
  if (refSection) {
    result = result.trimEnd() + formatReferenceBlock(refSection.label, refSection.links);
  }
  return result;
}
