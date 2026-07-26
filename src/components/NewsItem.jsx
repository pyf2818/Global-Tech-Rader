import { memo } from 'react';
import { ICONS, MODE_MAP, REGION_MAP } from '../constants/index.jsx';
import { getGradeColors, isEnglishText, formatRelative } from '../utils/format.js';

function NewsItem({ item, index, viewMode = 'standard', isFocused = false, isBookmarked = false, isInMaterials = false, onBookmark, onSummary, isSummaryOpen, summaryText, summaryLoading = false, summaryMode = '', isFollowed = false, onRead, showTranslation, onToggleTranslation, onRequestTranslation, isTranslating, translation, onOpenLightbox, onAddMaterial }) {
  const isCompact = viewMode === 'compact';
  const isCard = viewMode === 'card';
  const hasMedia = item.imageUrl || item.videoUrl;
  const trimBrief = (text = '', max = 132) => {
    const normalized = String(text || '')
      .replace(/arXiv:\S+\s+Announce Type:\s*\w+\s+Abstract:\s*/i, '')
      .replace(/Nature [^,]+,\s*Published online:[^;]+;\s*doi:\S+\s*/i, '')
      .replace(/\bdoi:\s*10\.\S+/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!normalized) return '';
    return normalized.length > max ? `${normalized.slice(0, max)}...` : normalized;
  };
  const displayTitle = showTranslation && translation ? translation.title : item.title;
  const displaySummary = showTranslation && translation && translation.summary ? translation.summary : item.summary;
  const summaryModeLabel = summaryMode === 'llm-scraped'
    ? 'AI 短摘要 · 已尝试抓取网页'
    : summaryMode === 'llm-card'
      ? 'AI 短摘要 · 基于卡片内容'
      : summaryMode === 'local'
        ? '短摘要 · 未配置模型'
        : summaryMode === 'fallback'
          ? '短摘要 · 模型暂不可用'
          : summaryMode === 'legacy'
            ? '短摘要'
            : 'AI 短摘要';

  const isEnglish = isEnglishText(item.title);

  // 拖拽开始
  const handleDragStart = (e) => {
    e.dataTransfer.setData('application/json', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'copy';
  };

  // 源等级标识
  const renderSourceGrade = () => {
    if (!item.sourceGradeLabel) return null;

    const grade = item.sourceGradeLabel?.charAt(0) || 'N/A';
    const validGrades = ['S', 'A', 'B', 'C', 'D'];

    if (!validGrades.includes(grade)) return null;

    // 配色单一来源：服务端 SOURCE_GRADES 注入的 item.sourceGradeColor
    const colors = getGradeColors(item.sourceGradeColor);

    return (
      <div
        className="news-item-source-grade"
        data-grade={grade}
        style={{
          marginLeft: '8px',
          display: 'inline-flex',
          alignItems: 'center',
          '--grade-primary': colors.primary,
          '--grade-glow': colors.glow
        }}
        title={item.sourceGradeLabel}
      >
        {grade}
      </div>
    );
  };

  // 涉华标记
  const renderChinaFocused = () => {
    if (!item.isChinaFocused) return null;

    return (
      <div
        className="news-item-china-focused"
        title="涉华资讯"
        style={{
          marginLeft: '6px',
          display: 'inline-flex',
          alignItems: 'center',
          padding: '2px 6px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '4px',
          color: '#ef4444',
          fontSize: '10px',
          fontWeight: '700',
          letterSpacing: '0.5px'
        }}
      >
        涉华
      </div>
    );
  };

  return (
    <article
      className={`news-item view-${viewMode} ${isFocused ? 'focused' : ''} ${isFollowed ? 'followed' : ''}`}
      style={{ animationDelay: `${Math.min(index * 40, 600)}ms` }}
      data-index={index}
      data-testid="news-item"
      data-item-id={item.id || ''}
      data-source={item.source || ''}
      data-category={item.category || ''}
      draggable
      onDragStart={handleDragStart}
    >
      {isFollowed && <div className="follow-badge">关注</div>}
      <div className="item-left">
        {!isCompact && <div className="item-tags">
          <span className={`item-mode mode-${item.mode}`}>{MODE_MAP[item.mode]}</span>
          <span className={`item-region region-${item.region}`}>{REGION_MAP[item.region]}</span>
        </div>}
        <div className="item-time">{formatRelative(item.publishedAt)}</div>
      </div>
      <div className="item-main">
        <div className="item-top-tags">
          <span className={`item-mode mode-${item.mode}`}>{MODE_MAP[item.mode]}</span>
          <span className={`item-region region-${item.region}`}>{REGION_MAP[item.region]}</span>
          {item.tags?.slice(0, 3).map(t => <span key={t} className="item-tag">{t}</span>)}
        </div>
        <div className="item-content-row">
          <div className="item-text">
            <h2 className="item-title"><span className="item-rank">{index + 1}.</span> {displayTitle}</h2>
            {!isCompact && <p className="item-summary">{displaySummary}</p>}
          </div>
          {hasMedia && isCompact && (
            <span
              className={`compact-media-indicator ${item.videoUrl ? 'has-video' : 'has-image'}`}
              title={item.videoUrl ? '包含视频' : '包含图片'}
            >
              {item.videoUrl ? ICONS.play : ICONS.image}
            </span>
          )}
          {hasMedia && !isCompact && (
            <div className="item-media">
              {item.videoUrl ? (
                // 优先显示视频
                <a href={item.videoUrl} target="_blank" rel="noreferrer" className="item-media-video-link">
                  {item.imageUrl ? (
                    // 如果有封面图，显示封面图+播放图标
                    <div className="item-media-thumb">
                      <img src={item.imageUrl} alt="" loading="lazy" onError={e => { e.target.style.display = 'none'; }} />
                      <span className="item-media-play video-play">{ICONS.play}</span>
                    </div>
                  ) : (
                    // 只有视频链接，显示视频链接按钮
                    <div className="item-media-video-only">
                      <span className="item-media-play video-play">{ICONS.play}</span>
                      <span>观看视频</span>
                    </div>
                  )}
                </a>
              ) : item.imageUrl && (
                // 没有视频，显示图片
                <div className="item-media-thumb" onClick={() => onOpenLightbox?.(item.imageUrl, item.title)}>
                  <img src={item.imageUrl} alt="" loading="lazy" onError={e => { e.target.style.display = 'none'; }} />
                </div>
              )}
            </div>
          )}
        </div>
        {isSummaryOpen && (summaryLoading || summaryText) && (
          <div className="ai-summary">
            <div className="ai-summary-header">{ICONS.sparkle}<span>{summaryLoading ? '正在生成短摘要' : summaryModeLabel}</span></div>
            <div className="ai-summary-content">
              <p>{summaryLoading ? '正在读取已抓取内容并压缩成一句话...' : summaryText}</p>
            </div>
          </div>
        )}
        {!isCompact && <div className="item-meta">
          <div className="item-tags-row card-grid-hide">{item.tags?.slice(0, 4).map(t => <span key={t} className="item-tag">{t}</span>)}</div>
          <div className="item-footer">
            <div className="item-source-container">
              <span className="item-source">{item.source}{item.platform ? ` · ${item.platform}` : ''}</span>
              {renderSourceGrade()}
              {renderChinaFocused()}
            </div>
            <div className="item-actions">
              {onBookmark && <button className={`item-action-btn bookmark-btn ${isBookmarked ? 'active' : ''}`} onClick={onBookmark} title={isBookmarked ? '取消收藏' : '收藏'}>{isBookmarked ? ICONS.bookmarkFill : ICONS.bookmark}</button>}
              {onAddMaterial && <button className={`item-action-btn add-material-btn ${isInMaterials ? 'active' : ''}`} onClick={() => onAddMaterial(item)} title={isInMaterials ? '已在素材库' : '收藏为素材'}>{ICONS.layers}</button>}
              {onSummary && <button className={`item-action-btn summary-btn ${summaryLoading ? 'loading' : ''}`} onClick={onSummary} title="生成短摘要" disabled={summaryLoading}>{summaryLoading ? ICONS.spinner : ICONS.sparkle}</button>}
              {isEnglish && onToggleTranslation && <button className={`item-action-btn translate-btn ${showTranslation ? 'active' : ''} ${isTranslating ? 'translating' : ''}`} onClick={() => { if (isTranslating) return; if (!translation && onRequestTranslation) { onRequestTranslation().then(result => { if (result) onToggleTranslation(); }); } else { onToggleTranslation(); } }} title="翻译" disabled={isTranslating}>{isTranslating ? ICONS.spinner : ICONS.globe}</button>}
              <a href={item.url} target="_blank" rel="noreferrer" className="item-link" onClick={() => onRead?.(item)}>阅读原文 {ICONS.arrowRight}</a>
            </div>
          </div>
        </div>}
        {isCompact && <div className="item-footer compact-footer">
          <div className="item-source-container">
            <span className="item-source">{item.source}</span>
            {renderSourceGrade()}
            {renderChinaFocused()}
          </div>
          <div className="item-actions">
            {onBookmark && <button className={`item-action-btn bookmark-btn ${isBookmarked ? 'active' : ''}`} onClick={onBookmark} title={isBookmarked ? '取消收藏' : '收藏'}>{isBookmarked ? ICONS.bookmarkFill : ICONS.bookmark}</button>}
            {onAddMaterial && <button className={`item-action-btn add-material-btn ${isInMaterials ? 'active' : ''}`} onClick={() => onAddMaterial(item)} title={isInMaterials ? '已在素材库' : '收藏为素材'}>{ICONS.layers}</button>}
            {onSummary && <button className={`item-action-btn summary-btn ${summaryLoading ? 'loading' : ''}`} onClick={onSummary} title="生成短摘要" disabled={summaryLoading}>{summaryLoading ? ICONS.spinner : ICONS.sparkle}</button>}
            {isEnglish && onToggleTranslation && <button className={`item-action-btn translate-btn ${showTranslation ? 'active' : ''} ${isTranslating ? 'translating' : ''}`} onClick={() => { if (isTranslating) return; if (!translation && onRequestTranslation) { onRequestTranslation().then(result => { if (result) onToggleTranslation(); }); } else { onToggleTranslation(); } }} title="翻译" disabled={isTranslating}>{isTranslating ? ICONS.spinner : ICONS.globe}</button>}
            <a href={item.url} target="_blank" rel="noreferrer" className="item-link" onClick={() => onRead?.(item)}>{ICONS.arrowRight}</a>
          </div>
        </div>}
      </div>
    </article>
  );
}

export default memo(NewsItem);
