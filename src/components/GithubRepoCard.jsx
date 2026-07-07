import { useState, useMemo } from 'react';
import { ICONS } from '../constants/index.jsx';
import { formatStars } from '../utils/format.js';
import { deriveRepoInsight } from '../utils/repoInsight.js';

function GithubRepoCard({ repo, index, since = 'weekly', isBookmarked = false, isInMaterials = false, onBookmark, onAddMaterial, showTranslation, onToggleTranslation, translation, onOpenLightbox }) {
  const [tutorialExpanded, setTutorialExpanded] = useState(false);
  const [insightExpanded, setInsightExpanded] = useState(false);
  const tutorialLines = repo.tutorial ? repo.tutorial.split('\n') : [];
  const isEnglish = /^[a-zA-Z0-9\s\-.,!?':\(\)\[\]{}]+$/.test(repo.fullName) || /^[a-zA-Z0-9\s\-.,!?':\(\)\[\]{}]+$/.test(repo.description);

  const insight = useMemo(() => deriveRepoInsight(repo, since), [repo, since]);

  // 拖拽开始 - 生成兼容 AI Elf 的数据格式
  const handleDragStart = (e) => {
    const dragItem = {
      id: repo.id || repo.url,
      title: repo.fullName,
      url: repo.url,
      summary: repo.description,
      source: 'GitHub',
      tags: [repo.language].filter(Boolean),
      region: 'global',
      mode: 'deep',
      publishedAt: new Date().toISOString(),
      category: 'open-source'
    };
    e.dataTransfer.setData('application/json', JSON.stringify(dragItem));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <article className="github-card" style={{ animationDelay: `${index * 60}ms` }} draggable onDragStart={handleDragStart}>
      <div className="gh-card-header">
        <span className="gh-rank">#{index + 1}</span>
        <div className="gh-card-title-row">
          <a href={repo.url} target="_blank" rel="noreferrer" className="gh-full-name">{repo.fullName}</a>
          {repo.language && <span className="gh-lang"><span className="gh-lang-dot" />{repo.language}</span>}
        </div>
        <span className="gh-drag-hint" title="拖拽到 AI 精灵分析">{ICONS.drag || '⠿'}</span>
      </div>
      {repo.imageUrl && (
        <div className="gh-card-image" onClick={() => onOpenLightbox?.(repo.imageUrl, repo.fullName)}>
          <img src={repo.imageUrl} alt={repo.name} loading="lazy" decoding="async" onError={e => { e.target.style.display = 'none'; }} />
        </div>
      )}
      <p className="gh-desc">{repo.description}</p>
      {showTranslation && translation && <p className="gh-translation">{translation.title}{translation.summary ? ` - ${translation.summary}` : ''}</p>}

      <div className="gh-insight">
        <button className="gh-insight-toggle" onClick={() => setInsightExpanded(v => !v)}>
          <span className="gh-insight-label">{ICONS.sparkle || '✦'} AI 情报</span>
          <span className={`gh-insight-chevron ${insightExpanded ? 'open' : ''}`}>{ICONS.chevronDown}</span>
        </button>
        {insightExpanded && (
          <div className="gh-insight-body">
            <div className="gh-insight-row">
              <span className="gh-insight-key">应用场景</span>
              <div className="gh-insight-tags">{insight.scenarios.map(s => <span key={s} className="gh-insight-tag">{s}</span>)}</div>
            </div>
            <div className="gh-insight-row">
              <span className="gh-insight-key">适用人群</span>
              <div className="gh-insight-tags">{insight.audience.map(a => <span key={a} className="gh-insight-tag audience">{a}</span>)}</div>
            </div>
            <p className="gh-insight-value">{insight.techValue}</p>
          </div>
        )}
      </div>

      {repo.tutorial && (
        <div className="gh-tutorial">
          <button className="gh-tutorial-toggle" onClick={() => setTutorialExpanded(v => !v)}>
            <span className="gh-tutorial-label">使用教程</span>
            <span className={`gh-tutorial-chevron ${tutorialExpanded ? 'open' : ''}`}>{ICONS.chevronDown}</span>
          </button>
          {tutorialExpanded && <pre className="gh-tutorial-text expanded">{repo.tutorial}</pre>}
        </div>
      )}
      {repo.topics?.length > 0 && <div className="gh-topics">{repo.topics.slice(0, 4).map(t => <span key={t} className="gh-topic">{t}</span>)}</div>}
      <div className="gh-card-stats">
        <span className="gh-stat">{ICONS.star}<span className="gh-stat-val">{formatStars(repo.totalStars)}</span><span className="gh-stat-label">stars</span></span>
        <span className="gh-stat">{ICONS.fork}<span className="gh-stat-val">{formatStars(repo.forks)}</span><span className="gh-stat-label">forks</span></span>
      </div>
      <div className="gh-card-actions">
        <button className={`gh-bookmark-btn ${isBookmarked ? 'active' : ''}`} onClick={onBookmark} title={isBookmarked ? '取消收藏' : '收藏'}>{isBookmarked ? ICONS.bookmarkFill : ICONS.bookmark}</button>
        {onAddMaterial && <button className={`gh-add-material-btn ${isInMaterials ? 'active' : ''}`} onClick={onAddMaterial} title={isInMaterials ? '已在素材库' : '收藏为素材'}>{ICONS.layers}</button>}
        {isEnglish && onToggleTranslation && <button className={`gh-translate-btn ${showTranslation ? 'active' : ''}`} onClick={onToggleTranslation} title="翻译">{ICONS.globe}</button>}
      </div>
    </article>
  );
}

export default GithubRepoCard;

