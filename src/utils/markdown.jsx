// Markdown rendering utilities extracted from App.jsx
import React from 'react';

// Markdown rendering for AI-generated content (returns HTML string)
// Supports: headers, bold, italic, strikethrough, code blocks, inline code,
// images, links, horizontal rules, tables, blockquotes, lists
export function renderMarkdown(text) {
  if (!text) return '';
  // Ensure text is a string
  let str = text;
  if (typeof str === 'object') {
    str = str.content || str.text || JSON.stringify(str);
  }
  let html = typeof str === 'string' ? str : String(str);

  // Protect existing <img> tags from HTML escaping
  const imgMap = new Map();
  let imgCounter = 0;
  html = html.replace(/<img[^>]*\/>/g, (match) => {
    const key = `__IMG_${imgCounter++}__`;
    imgMap.set(key, match);
    return key;
  });

  // Escape HTML (but preserve existing markdown syntax)
  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // Fenced code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre class="code-block${lang ? ` language-${lang}` : ''}"><code>${code.trim()}</code></pre>`;
  });
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Strikethrough
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy" />');
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr />');
  // Tables
  html = html.replace(/^(\|.+\|)\n(\|[-| :]+\|)\n((?:\|.+\|\n?)*)/gm, (_, headerRow, sepRow, bodyRows) => {
    const headers = headerRow.split('|').filter(c => c.trim()).map(c => `<th>${c.trim()}</th>`).join('');
    const rows = bodyRows.trim().split('\n').map(row => {
      const cells = row.split('|').filter(c => c.trim()).map(c => `<td>${c.trim()}</td>`).join('');
      return `<tr>${cells}</tr>`;
    }).join('');
    return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
  });
  // Blockquotes (handle multi-line)
  html = html.replace(/^(?:&gt; (.+)\n?)+/gm, match => {
    const lines = match.split('\n').map(l => l.replace(/^&gt; /, '')).filter(Boolean);
    return `<blockquote>${lines.join('<br>')}</blockquote>`;
  });
  // Unordered lists
  html = html.replace(/((?:^[-*] .+\n?)+)/gm, list => {
    const items = list.trim().split('\n').map(line => `<li>${line.replace(/^[-*] /, '')}</li>`).join('');
    return `<ul>${items}</ul>`;
  });
  // Ordered lists
  html = html.replace(/((?:^\d+\. .+\n?)+)/gm, list => {
    const items = list.trim().split('\n').map(line => `<li>${line.replace(/^\d+\. /, '')}</li>`).join('');
    return `<ol>${items}</ol>`;
  });
  // Line breaks and paragraphs
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');

  // Restore <img> tags
  imgMap.forEach((imgTag, key) => {
    html = html.replace(key, imgTag);
  });

  return `<p>${html}</p>`;
}

// Markdown rendering with embedded Base64 image support
// Replaces image placeholders like ![alt](#img-id|w=300|h=200) with actual images
export function renderMarkdownWithImages(text, images = []) {
  if (!text) return '';

  // Replace image placeholders with actual Base64 data, supporting size parameters
  // Format: ![alt](#img-id|w=300|h=200) or ![alt](#img-id|w=300)
  let processedText = text;
  if (images && images.length > 0) {
    images.forEach(img => {
      // Support multiple placeholder formats:
      // 1. ![alt](#img-id) - default size
      // 2. ![alt](#img-id|w=300) - specified width, auto height
      // 3. ![alt](#img-id|w=300|h=200) - specified width and height
      const placeholderPattern = new RegExp(`!\\[([^\\]]*)\\]\\(\\#${img.id}(?:\\|[^)]+)?\\)`, 'g');

      processedText = processedText.replace(placeholderPattern, (match, alt) => {
        // Parse size parameters
        const sizeMatch = match.match(/\|w=(\d+)(?:\|h=(\d+))?/);
        let sizeAttrs = '';
        if (sizeMatch) {
          const width = sizeMatch[1];
          const height = sizeMatch[2];
          sizeAttrs = ` width="${width}"`;
          if (height) {
            sizeAttrs += ` height="${height}"`;
          }
        } else {
          // If no size specified, use original dimensions but cap max width
          sizeAttrs = ` style="max-width:100%;height:auto;"`;
        }
        return `<img src="${img.base64}" alt="${alt || img.alt}"${sizeAttrs} />`;
      });
    });
  }

  return renderMarkdown(processedText);
}

// Simplified markdown renderer for AI briefings (returns JSX elements)
export function renderBriefMarkdown(text) {
  const lines = text.split('\n');
  const elements = [];
  let inList = false;
  let listItems = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(<ul key={`list-${elements.length}`} className="brief-list">{listItems.map((item, i) => <li key={i}>{item}</li>)}</ul>);
      listItems = [];
      inList = false;
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      return;
    }
    // Headers
    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(<h4 key={idx} className="brief-h2">{renderInline(trimmed.slice(3))}</h4>);
    } else if (trimmed.startsWith('# ')) {
      flushList();
      elements.push(<h3 key={idx} className="brief-h1">{renderInline(trimmed.slice(2))}</h3>);
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('1. ') || /^\d+\.\s/.test(trimmed)) {
      inList = true;
      const content = trimmed.replace(/^[-\d]+\.\s|^- /, '');
      listItems.push(renderInline(content));
    } else {
      flushList();
      elements.push(<p key={idx} className="brief-p">{renderInline(trimmed)}</p>);
    }
  });
  flushList();
  return elements;
}

// Inline formatting: bold **text** wrapping (returns string or JSX array)
export function renderInline(text) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) => i % 2 === 1 ? <strong key={i}>{part}</strong> : part);
}
