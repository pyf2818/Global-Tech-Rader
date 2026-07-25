import { describe, expect, it } from 'vitest';
import { exportDocument } from '../exportEngine.js';

const document = {
  id: 'd1',
  title: 'AI Report',
  content: '# Body\n\nClaim [1]',
  updatedAt: '2026-07-14T02:00:00Z',
  citations: [{ id: 'n1', title: 'Source', source: 'Lab', url: 'https://example.com' }],
};

describe('creative export engine', () => {
  it('exports every supported format with citations', () => {
    for (const format of ['md', 'json', 'html']) {
      const result = exportDocument(document, format);
      expect(result.filename).toMatch(/^AI-Report/);
      expect(result.content).toContain('Source');
      expect(result.content).toContain('Lab');
    }
  });

  it('escapes hostile HTML content', () => {
    const result = exportDocument({ ...document, content: '<script>alert(1)</script>' }, 'html');
    expect(result.content).not.toContain('<script>');
    expect(result.content).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('rejects unsupported export formats', () => {
    expect(() => exportDocument(document, 'pdf')).toThrow('UNSUPPORTED_EXPORT_FORMAT');
  });
});
