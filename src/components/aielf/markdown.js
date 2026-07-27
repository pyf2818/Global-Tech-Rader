// AiElf 专用 Markdown 渲染器
// 从 src/AiElf.jsx 抽离，纯函数无依赖

export function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function processInlineStyles(text) {
  return String(text || '')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="ai-elf-inline-code">$1</code>');
}

/**
 * 将 Markdown 文本渲染为 HTML 字符串
 * 支持：代码块、标题（H1/H2/H3）、表格、列表、段落、加粗/斜体/行内代码
 */
export function renderMarkdown(text) {
  if (!text) return '';

  let processed = text.replace(/```([\w]*)\n([\s\S]*?)```/g, (_match, _lang, code) => {
    return `<pre class="ai-elf-code-block"><code>${escapeHtml(code)}</code></pre>`;
  });

  processed = processed.split('\n').map(line => {
    if (line.match(/^#{3}\s/)) return `<h4 class="ai-elf-heading">${escapeHtml(line.replace(/^#{3}\s/, ''))}</h4>`;
    if (line.match(/^#{2}\s/)) return `<h3 class="ai-elf-heading">${escapeHtml(line.replace(/^#{2}\s/, ''))}</h3>`;
    if (line.match(/^#{1}\s/)) return `<h2 class="ai-elf-heading">${escapeHtml(line.replace(/^#{1}\s/, ''))}</h2>`;
    return line;
  }).join('\n');

  const lines = processed.split('\n');
  const result = [];
  let inList = false;
  let inTable = false;
  let tableRows = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const tableMatch = line.match(/^\|(.+)\|$/);
    if (tableMatch) {
      const cells = tableMatch[1].split('|').map(cell => cell.trim());
      const isSeparator = cells.every(cell => cell.match(/^[-:]+$/));

      if (!inTable) {
        inTable = true;
        tableRows = [];
      }

      if (isSeparator) {
        if (tableRows.length === 1) {
          result.push('<table class="ai-elf-table"><thead><tr>');
          tableRows[0].forEach(cell => {
            result.push(`<th>${escapeHtml(cell)}</th>`);
          });
          result.push('</tr></thead><tbody>');
        }
        tableRows = [];
      } else {
        tableRows.push(cells);
      }
    } else {
      if (inTable) {
        if (tableRows.length > 0) {
          tableRows.forEach(row => {
            result.push('<tr>');
            row.forEach(cell => {
              result.push(`<td>${processInlineStyles(escapeHtml(cell))}</td>`);
            });
            result.push('</tr>');
          });
        }
        result.push('</tbody></table>');
        inTable = false;
        tableRows = [];
      }

      const listMatch = line.match(/^-\s(.+)$/);
      if (listMatch) {
        if (!inList) {
          result.push('<ul class="ai-elf-list">');
          inList = true;
        }
        result.push(`<li>${processInlineStyles(escapeHtml(listMatch[1]))}</li>`);
      } else if (line.trim() === '' && inList) {
        result.push('</ul>');
        inList = false;
        result.push('');
      } else {
        if (inList) {
          result.push('</ul>');
          inList = false;
        }
        result.push(line);
      }
    }
  }

  if (inTable) {
    if (tableRows.length > 0) {
      tableRows.forEach(row => {
        result.push('<tr>');
        row.forEach(cell => {
          result.push(`<td>${processInlineStyles(escapeHtml(cell))}</td>`);
        });
        result.push('</tr>');
      });
    }
    result.push('</tbody></table>');
  }

  if (inList) result.push('</ul>');
  processed = result.join('\n');

  processed = processInlineStyles(processed);

  const paragraphs = processed.split(/\n{2,}/);
  processed = paragraphs.map(p => {
    const trimmed = p.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('<h') || trimmed.startsWith('<pre') || trimmed.startsWith('<ul') || trimmed.startsWith('<table')) {
      return trimmed;
    }
    if (trimmed.startsWith('<') && trimmed.endsWith('>')) return trimmed;
    return `<p class="ai-elf-para">${trimmed.replace(/\n/g, ' ')}</p>`;
  }).join('');

  return processed;
}
