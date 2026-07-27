import { ICONS } from '../constants/index.jsx';

const ARTICLE_STATUS = { draft: '草稿', published: '已发布', archived: '已归档' };

/**
 * 知识导出页 — 从 App.jsx 抽离（原 nav === 'knowledge-export' 分支）
 *
 * Props:
 *   articles: Article[]                      已过滤的待导出文章列表
 *   bookmarks: Bookmark[]                    已过滤的待导出收藏列表
 *   articleExportFilter, setArticleExportFilter: 文章状态过滤
 *   exportCategory, setExportCategory:         收藏赛道过滤
 *   exportRange, setExportRange:               收藏时间范围
 *   categories: Array<{id, label}>             赛道列表
 *   exportArticle: (article, format) => void  文章导出 handler
 */
export default function KnowledgeExportPage({
  articles,
  bookmarks,
  articleExportFilter, setArticleExportFilter,
  exportCategory, setExportCategory,
  exportRange, setExportRange,
  categories,
  exportArticle,
}) {
  // ===== 收藏导出 handlers（内联在组件内，使用传入的 bookmarks）=====
  const exportBookmarksMarkdown = () => {
    const md = bookmarks.map((b, idx) => `## ${idx + 1}. ${b.title}\n- 来源: ${b.source}\n- 时间: ${b.publishedAt || b.savedAt}\n- 链接: ${b.url}\n- 摘要: ${b.summary || ''}\n`).join('\n');
    const blob = new Blob([`# Tech Radar 阅读导出\n\n${md}`], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `siliconstream-bookmarks-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportBookmarksJson = () => {
    const data = JSON.stringify(bookmarks, null, 2);
    const blob = new Blob([data], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `siliconstream-bookmarks-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportWeeklyReportMarkdown = () => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const weekly = bookmarks.filter(b => new Date(b.savedAt || 0).getTime() >= weekAgo);
    const lines = [
      '# Tech Radar 周阅读报告',
      '',
      `- 生成时间: ${new Date().toLocaleString('zh-CN')}`,
      `- 本周新增收藏: ${weekly.length}`,
      `- 本周完成阅读: ${weekly.filter(b => b.isRead).length}`,
      '',
      '## 本周收藏清单',
      ...weekly.map((b, i) => `${i + 1}. [${b.title}](${b.url}) - ${b.source}`)
    ].join('\n');
    const blob = new Blob([lines], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `siliconstream-weekly-report-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportWeeklyReportPdf = () => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const weekly = bookmarks.filter(b => new Date(b.savedAt || 0).getTime() >= weekAgo);
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>周阅读报告</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#222}h1{margin:0 0 12px}ul{line-height:1.6}</style></head><body><h1>Tech Radar 周阅读报告</h1><p>生成时间: ${new Date().toLocaleString('zh-CN')}</p><p>本周新增收藏: ${weekly.length}，本周完成阅读: ${weekly.filter(b => b.isRead).length}</p><h2>本周收藏清单</h2><ul>${weekly.map(b => `<li><a href="${b.url}">${b.title}</a> - ${b.source}</li>`).join('')}</ul></body></html>`;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div className="trends-dashboard">
      <div className="trends-header"><h2>{ICONS.link}<span>导出发布</span></h2><p className="trends-desc">将阅读清单和文章导出为知识资产</p></div>

      <section className="trends-section">
        <h3 className="trends-section-title">我的文章导出</h3>
        <div className="export-filters">
          <select value={articleExportFilter} onChange={e => setArticleExportFilter(e.target.value)}>
            <option value="all">全部文章</option>
            <option value="draft">草稿</option>
            <option value="published">已发布</option>
          </select>
          <span className="export-count">共 {articles.length} 篇</span>
        </div>
        {articles.length > 0 ? (
          <div className="article-export-list">
            {articles.map(a => (
              <div key={a.id} className="article-export-item">
                <div className="article-export-info">
                  <span className={`article-status-badge status-${a.status}`}>{ARTICLE_STATUS[a.status]}</span>
                  <span className="article-export-title">{a.title}</span>
                </div>
                <div className="article-export-actions">
                  <button className="btn-export-md" onClick={() => exportArticle(a, 'md')}>Markdown</button>
                  <button className="btn-export-html" onClick={() => exportArticle(a, 'html')}>HTML</button>
                  <button className="btn-export-pdf" onClick={() => exportArticle(a, 'pdf')}>PDF</button>
                  <button className="btn-export-wechat" onClick={() => exportArticle(a, 'wechat')}>公众号</button>
                  <button className="btn-export-zhihu" onClick={() => exportArticle(a, 'zhihu')}>知乎</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-hint">暂无文章可导出</p>
        )}
      </section>

      <section className="trends-section">
        <h3 className="trends-section-title">阅读收藏导出</h3>
        <div className="export-filters">
          <select value={exportCategory} onChange={(e) => setExportCategory(e.target.value)}>
            <option value="all">全部赛道</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <select value={exportRange} onChange={(e) => setExportRange(e.target.value)}>
            <option value="all">全部时间</option>
            <option value="7d">近7天</option>
            <option value="30d">近30天</option>
          </select>
          <span className="export-count">待导出: {bookmarks.length} 篇</span>
        </div>
        <div className="category-heat-grid">
          <button className="btn-refresh" onClick={exportBookmarksMarkdown}>导出 Markdown</button>
          <button className="btn-refresh" onClick={exportBookmarksJson}>导出 JSON</button>
          <button className="btn-refresh" onClick={exportWeeklyReportMarkdown}>导出周报 Markdown</button>
          <button className="btn-refresh" onClick={exportWeeklyReportPdf}>打印/导出 PDF</button>
        </div>
      </section>
    </div>
  );
}
