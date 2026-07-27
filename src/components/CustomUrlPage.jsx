import { useCustomUrl } from '../hooks/useCustomUrl.js';
import { ICONS } from '../constants/index.jsx';

/**
 * 自定义 URL 抓取页 — 从 App.jsx 抽离（原 nav === 'custom-url' 分支）
 *
 * Props:
 *   onSaveToArticle: (article) => void   保存抓取结果到创作中心
 *   onSaveToMaterial: (material) => void 保存抓取结果到素材库
 */
export default function CustomUrlPage({ onSaveToArticle, onSaveToMaterial }) {
  const {
    customUrlInput, setCustomUrlInput,
    customUrlResult,
    customUrlLoading,
    customUrlError,
    customUrlMode, setCustomUrlMode,
    fetchCustomUrl,
  } = useCustomUrl();

  return (
    <div className="trends-dashboard">
      <div className="trends-header">
        <h2>{ICONS.link}<span>自定义抓取</span></h2>
        <p className="trends-desc">输入任意网页 URL，使用 AI 驱动的抓取技术获取内容</p>
      </div>

      <section className="trends-section">
        <div className="custom-url-input-section">
          <div className="custom-url-input-wrapper">
            <input
              type="url"
              className="custom-url-input"
              placeholder="输入网页 URL (例如: https://example.com/article)"
              value={customUrlInput}
              onChange={(e) => setCustomUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchCustomUrl(customUrlInput, customUrlMode)}
            />
            <div className="custom-url-actions">
              <select
                className="custom-url-mode-select"
                value={customUrlMode}
                onChange={(e) => setCustomUrlMode(e.target.value)}
              >
                <option value="basic">基础模式</option>
                <option value="dynamic">动态页面</option>
                <option value="stealth">隐身模式</option>
              </select>
              <button
                className="custom-url-fetch-btn"
                onClick={() => fetchCustomUrl(customUrlInput, customUrlMode)}
                disabled={customUrlLoading || !customUrlInput.trim()}
              >
                {customUrlLoading ? '抓取中...' : '抓取'}
              </button>
            </div>
          </div>

          {customUrlError && (
            <div className="custom-url-error">{customUrlError}</div>
          )}
        </div>

        {customUrlLoading && (
          <div className="custom-url-loading">
            <div className="loading-spinner"></div>
            <p>正在抓取网页内容...</p>
          </div>
        )}

        {customUrlResult && !customUrlLoading && (
          <div className="custom-url-result">
            <div className="custom-url-result-header">
              <h3>{customUrlResult.title}</h3>
              <a
                href={customUrlResult.url}
                target="_blank"
                rel="noopener noreferrer"
                className="custom-url-result-link"
              >
                {ICONS.externalLink}
                <span>打开原文</span>
              </a>
            </div>

            <div className="custom-url-result-meta">
              {customUrlResult.author && (
                <span className="custom-url-meta-item">
                  <strong>作者:</strong> {customUrlResult.author}
                </span>
              )}
              {customUrlResult.published_date && (
                <span className="custom-url-meta-item">
                  <strong>发布时间:</strong> {customUrlResult.published_date}
                </span>
              )}
              <span className="custom-url-meta-item">
                <strong>段落数:</strong> {customUrlResult.paragraphs_count}
              </span>
              <span className="custom-url-meta-item">
                <strong>内容长度:</strong> {customUrlResult.content_length} 字符
              </span>
            </div>

            {customUrlResult.description && (
              <div className="custom-url-result-description">
                <h4>描述</h4>
                <p>{customUrlResult.description}</p>
              </div>
            )}

            {customUrlResult.summary && (
              <div className="custom-url-result-summary">
                <h4>摘要</h4>
                <p>{customUrlResult.summary}</p>
              </div>
            )}

            {customUrlResult.images.length > 0 && (
              <div className="custom-url-result-images">
                <h4>图片 ({customUrlResult.images.length})</h4>
                <div className="custom-url-images-grid">
                  {customUrlResult.images.map((img, idx) => (
                    <div key={idx} className="custom-url-image-item">
                      <img src={img.src} alt={img.alt} />
                      {img.alt && <p>{img.alt}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {customUrlResult.links.length > 0 && (
              <div className="custom-url-result-links">
                <h4>相关链接 ({customUrlResult.links.length})</h4>
                <ul className="custom-url-links-list">
                  {customUrlResult.links.map((link, idx) => (
                    <li key={idx}>
                      <a href={link.url} target="_blank" rel="noopener noreferrer">
                        {link.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="custom-url-result-actions">
              <button
                className="btn-new-article-pro"
                onClick={() => {
                  const newArticle = {
                    id: Date.now(),
                    title: customUrlResult.title,
                    content: customUrlResult.summary,
                    url: customUrlResult.url,
                    images: [],
                    createdAt: new Date().toISOString(),
                    publishedAt: customUrlResult.published_date || new Date().toISOString()
                  };
                  onSaveToArticle(newArticle);
                }}
              >
                {ICONS.edit}
                <span>保存到创作中心</span>
              </button>
              <button
                className="btn-new-article-pro"
                onClick={() => {
                  const newMaterial = {
                    id: Date.now(),
                    title: customUrlResult.title,
                    content: customUrlResult.summary,
                    source: new URL(customUrlResult.url).hostname,
                    url: customUrlResult.url,
                    createdAt: new Date().toISOString(),
                    category: 'all',
                    tags: customUrlResult.keywords ? customUrlResult.keywords.split(',').map(k => k.trim()) : []
                  };
                  onSaveToMaterial(newMaterial);
                }}
              >
                {ICONS.layers}
                <span>保存到素材库</span>
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
