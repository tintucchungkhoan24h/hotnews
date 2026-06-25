const REF_LABELS = 'Nguồn dữ liệu tham khảo|Data references|데이터 참고|참고 자료|참고 자료 출처|数据参考|參考資料|參考資料來源|ข้อมูลอ้างอิง|แหล่งข้อมูลอ้างอิง|مصادر البيانات|المراجع|مصدر البيانات المرجعية|データ参照|データ出典|参考文献|参考データソース|Reference data sources|Reference data source';

function extractReferenceSection(html) {
  if (!html) return null;

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

function stripReferenceSection(html) {
  return html
    .replace(new RegExp(`<p><strong>[^<]*(?:${REF_LABELS})[^<]*</strong><br>(?:<a[^>]*>.*?</a>(?:<br>)?)*</p>`, 'gi'), '')
    .replace(new RegExp(`<p>[^<]*(?:${REF_LABELS})[^<]*[:：][^<]*(?:<a[^>]*>.*?</a>[^<]*)*</p>`, 'gi'), '');
}

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

export function normalizeReferenceLinks(content) {
  const refSection = extractReferenceSection(content);
  let result = stripReferenceSection(content);
  if (refSection) {
    result = result.trimEnd() + formatReferenceBlock(refSection.label, refSection.links);
  }
  return result;
}
