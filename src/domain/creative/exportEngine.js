const SUPPORTED_FORMATS = new Set(['md', 'json', 'html']);

function safeName(name) {
  return String(name || 'untitled')
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 96) || 'untitled';
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeCitations(citations = []) {
  return citations
    .filter(Boolean)
    .map(citation => ({
      id: String(citation.id || ''),
      title: String(citation.title || ''),
      source: String(citation.source || ''),
      url: String(citation.url || ''),
      publishedAt: citation.publishedAt || null,
    }))
    .filter(citation => citation.id || citation.title || citation.url);
}

function citationLine(citation, index) {
  const date = citation.publishedAt ? ` (${String(citation.publishedAt).slice(0, 10)})` : '';
  const url = citation.url ? ` ${citation.url}` : '';
  return `[${index}] ${citation.title || citation.id || 'Untitled'} - ${citation.source || '未知来源'}${date}${url}`;
}

function markdownWithSources(document, citations) {
  const lines = [
    document.content || '',
    '',
    '## 来源',
    '',
  ];
  if (citations.length) {
    citations.forEach((citation, index) => lines.push(citationLine(citation, index + 1)));
  } else {
    lines.push('暂无引用来源');
  }
  return lines.join('\n');
}

function inlineMarkdown(value = '') {
  return escapeHtml(value)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, (_, label, url) => {
      const safeUrl = escapeHtml(url);
      return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    });
}

function markdownToHtml(markdown = '') {
  const blocks = String(markdown).split(/\n{2,}/);
  return blocks.map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('# ')) return `<h1>${inlineMarkdown(trimmed.slice(2))}</h1>`;
    if (trimmed.startsWith('## ')) return `<h2>${inlineMarkdown(trimmed.slice(3))}</h2>`;
    if (trimmed.startsWith('### ')) return `<h3>${inlineMarkdown(trimmed.slice(4))}</h3>`;
    if (/^[-*]\s+/m.test(trimmed)) {
      const items = trimmed.split('\n')
        .filter(line => /^[-*]\s+/.test(line.trim()))
        .map(line => `<li>${inlineMarkdown(line.trim().replace(/^[-*]\s+/, ''))}</li>`)
        .join('');
      return `<ul>${items}</ul>`;
    }
    return `<p>${inlineMarkdown(trimmed).replace(/\n/g, '<br>')}</p>`;
  }).filter(Boolean).join('\n');
}

function htmlWithSources(document, citations) {
  const sourceItems = citations.length
    ? citations.map((citation, index) => {
      const url = citation.url
        ? ` <a href="${escapeHtml(citation.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(citation.url)}</a>`
        : '';
      const date = citation.publishedAt ? ` (${escapeHtml(String(citation.publishedAt).slice(0, 10))})` : '';
      return `<li id="source-${index + 1}">[${index + 1}] ${escapeHtml(citation.title || citation.id || 'Untitled')} - ${escapeHtml(citation.source || '未知来源')}${date}${url}</li>`;
    }).join('\n')
    : '<li>暂无引用来源</li>';
  const body = markdownToHtml(document.content || '');
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(document.title || 'Untitled')}</title>
  <style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;max-width:860px;margin:0 auto;padding:32px;line-height:1.75;color:#222}pre,code{background:#f5f5f5}a{color:#2563eb}.meta{color:#777;font-size:13px}.sources{margin-top:32px;border-top:1px solid #e5e7eb;padding-top:18px}</style>
</head>
<body>
  <header>
    <h1>${escapeHtml(document.title || 'Untitled')}</h1>
    <div class="meta">Updated: ${escapeHtml(document.updatedAt || '')}</div>
  </header>
  <main>${body}</main>
  <section class="sources">
    <h2>来源</h2>
    <ol>${sourceItems}</ol>
  </section>
</body>
</html>`;
}

export function exportDocument(document = {}, format = 'md') {
  const normalizedFormat = String(format || 'md').toLowerCase();
  if (!SUPPORTED_FORMATS.has(normalizedFormat)) throw new Error('UNSUPPORTED_EXPORT_FORMAT');
  const citations = normalizeCitations(document.citations || []);
  const baseName = safeName(document.title || 'untitled');

  if (normalizedFormat === 'json') {
    return {
      filename: `${baseName}.json`,
      mime: 'application/json;charset=utf-8',
      content: JSON.stringify({
        schemaVersion: 1,
        document: {
          id: document.id || '',
          title: document.title || '',
          updatedAt: document.updatedAt || null,
          status: document.status || 'draft',
        },
        content: document.content || '',
        citations,
      }, null, 2),
    };
  }

  if (normalizedFormat === 'html') {
    return {
      filename: `${baseName}.html`,
      mime: 'text/html;charset=utf-8',
      content: htmlWithSources(document, citations),
    };
  }

  return {
    filename: `${baseName}.md`,
    mime: 'text/markdown;charset=utf-8',
    content: markdownWithSources(document, citations),
  };
}
