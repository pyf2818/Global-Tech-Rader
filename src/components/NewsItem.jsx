import React from 'react';
import { ICONS } from '../constants/index.jsx';
import { REGION_MAP, MODE_MAP } from '../constants/index.jsx';
import { formatRelative, getGradeColors } from '../utils/format.js';

function NewsItem({ item, index, viewMode = 'standard', isFocused = false, isBookmarked = false, isInMaterials = false, onBookmark, onSummary, isSummaryOpen, summaryText, isFollowed = false, onRead, showTranslation, onToggleTranslation, onRequestTranslation, isTranslating, translation, onOpenLightbox, onAddMaterial, onAskAi, showRecommendation = false }) {
  const isCompact = viewMode === 'compact';
  const isCard = viewMode === 'card';
  const hasMedia = item.imageUrl || item.videoUrl;

  const isEnglish = /^[a-zA-Z0-9\s\-.,!?"'():;&%$#@*+\[\]{}|\\\/<>`~+=]+$/.test(item.title) && !/^[\u4e00-\u9fff]/.test(item.title);

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
      style={{ animationDelay: `${index * 40}ms` }}
      data-index={index}
      draggable
      onDragStart={handleDragStart}
    >
      {isFollowed && <div className="follow-badge">关注</div>}
      {item.mustReadScore > 0 && (
        <div className={`card-score-badge ${item.mustReadScore >= 50 ? 'score-high' : item.mustReadScore >= 20 ? 'score-mid' : 'score-low'}`}>
          {item.mustReadScore}
        </div>
      )}
      <div className="item-left">
        {!isCompact && <div className="item-tags">
          <span className={`item-mode mode-${item.mode}`}>{MODE_MAP[item.mode]}</span>
          <span className={`item-region region-${item.region}`}>{REGION_MAP[item.region]}</span>
        </div>}
        <div className="item-time">{formatRelative(item.publishedAt)}</div>
        <div className="item-actions-left">
          {onBookmark && <button className={`bookmark-btn ${isBookmarked ? 'active' : ''}`} onClick={onBookmark} title={isBookmarked ? '取消收藏' : '收藏'}>{isBookmarked ? ICONS.bookmarkFill : ICONS.bookmark}</button>}
          {onAddMaterial && <button className={`add-material-btn ${isInMaterials ? 'active' : ''}`} onClick={() => onAddMaterial(item)} title={isInMaterials ? '已在素材库' : '收藏为素材'}>{ICONS.layers}</button>}
          {onSummary && <button className="summary-btn" onClick={onSummary} title="AI 摘要">{ICONS.sparkle}</button>}
          {onAskAi && <button className="ask-ai-btn" onClick={() => onAskAi(item)} title="让 AI 分析这条资讯">ASK AI</button>}
          {isEnglish && onToggleTranslation && <button className={`translate-btn ${showTranslation ? 'active' : ''} ${isTranslating ? 'translating' : ''}`} onClick={() => { console.log('[NewsItem] Translate button clicked:', { isTranslating, translation, onRequestTranslation: !!onRequestTranslation }); if (isTranslating) return; if (!translation && onRequestTranslation) { onRequestTranslation().then(result => { console.log('[NewsItem] Translation result:', result); if (result) onToggleTranslation(); }); } else { onToggleTranslation(); } }} title="翻译" disabled={isTranslating}>{isTranslating ? ICONS.spinner : ICONS.globe}</button>}
        </div>
      </div>
      <div className="item-main">
        <div className="item-content-row">
          <div className="item-text">
            <h2 className="item-title"><span className="item-rank">{index + 1}.</span> {showTranslation && translation ? translation.title : item.title}</h2>
            {!isCompact && <p className="item-summary">{showTranslation && translation && translation.summary ? translation.summary : item.summary}</p>}
            {!isCompact && item.bodyIntro && <p className="item-intro">导读：{item.bodyIntro}</p>}
          </div>
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
        {isSummaryOpen && summaryText && (
          <div className="ai-summary">
            <div className="ai-summary-header">{ICONS.sparkle}<span>AI 摘要</span></div>
            <div className="ai-summary-content">{summaryText.split(' | ').map((p, i) => <p key={i}>{p}</p>)}</div>
          </div>
        )}
        {!isCompact && item.recommendation && (
          <div className="recommendation-reason">
            <span className="recommendation-label">推荐理由：</span>
            <span className="recommendation-text">{item.recommendation}</span>
          </div>
        )}
        {!isCompact && <div className="item-meta">
          <div className="item-tags-row">{item.tags?.slice(0, 4).map(t => <span key={t} className="item-tag">{t}</span>)}</div>
          <div className="item-footer">
            <div className="item-source-container">
              <span className="item-source">{item.source}{item.platform ? ` · ${item.platform}` : ''}</span>
              {renderSourceGrade()}
              {renderChinaFocused()}
            </div>
            <a href={item.url} target="_blank" rel="noreferrer" className="item-link" onClick={() => onRead?.(item)}>阅读原文 {ICONS.arrowRight}</a>
          </div>
        </div>}
        {isCompact && <div className="item-footer compact-footer">
          <div className="item-source-container">
            <span className="item-source">{item.source}</span>
            {renderSourceGrade()}
            {renderChinaFocused()}
          </div>
          <a href={item.url} target="_blank" rel="noreferrer" className="item-link" onClick={() => onRead?.(item)}>{ICONS.arrowRight}</a>
        </div>}
      </div>
    </article>
  );
}

export default NewsItem;
