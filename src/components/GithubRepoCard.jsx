import { useState } from 'react';
import { ICONS, GITHUB_PERIODS } from '../constants/index.jsx';
import { isEnglishText, formatStars } from '../utils/format.js';
import { buildGithubMaterial } from '../utils/githubMaterial.js';

function GithubRepoCard({ repo, index, since = 'weekly', isBookmarked = false, isInMaterials = false, onBookmark, onAddMaterial, showTranslation, onToggleTranslation, translation, onOpenLightbox, insight, onRequestInsight, insightLoading }) {
  const [tutorialExpanded, setTutorialExpanded] = useState(false);
  const [insightExpanded, setInsightExpanded] = useState(false);
  const isEnglish = isEnglishText(repo.fullName) || isEnglishText(repo.description);
  const periodValue = repo.starsToday || repo.starsThisWeek || repo.starsThisMonth || 0;
  const periodLabel = GITHUB_PERIODS.find(p => p.id === since)?.label || '周榜';

  // 拖拽开始 - 生成兼容 AI Elf 的数据格式
  const handleDragStart = (e) => {
    const dragItem = buildGithubMaterial(repo, since);
    e.dataTransfer.setData('application/json', JSON.stringify(dragItem));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleInsightToggle = () => {
    const next = !insightExpanded;
    setInsightExpanded(next);
    if (next && !insight && onRequestInsight) onRequestInsight(repo);
  };

  return (
    <article className="github-card" style={{ animationDelay: `${index * 60}ms` }} draggable onDragStart={handleDragStart}>
      <div className="gh-card-header">
        <span className="gh-rank">#{index + 1}</span>
        <div className="gh-card-title-row">
          <a href={repo.url} target="_blank" rel="noreferrer" className="gh-full-name">{repo.fullName}</a>
          {repo.language && <span className="gh-lang"><span className="gh-lang-dot" />{repo.language}</span>}
        </div>
        {periodValue > 0 && (
          <span className="gh-growth-badge" title={`本期${periodLabel}新增`}>
            {ICONS.star}<span>+{formatStars(periodValue)}</span><em>{periodLabel}</em>
          </span>
        )}
      </div>
      {repo.imageUrl && (
        <div className="gh-card-image" onClick={() => onOpenLightbox?.(repo.imageUrl, repo.fullName)}>
          <img src={repo.imageUrl} alt={repo.name} loading="lazy" onError={e => { e.target.style.display = 'none'; }} />
        </div>
      )}
      <p className="gh-desc">{repo.description}</p>
      {showTranslation && translation && <p className="gh-translation">{translation.title}{translation.summary ? ` - ${translation.summary}` : ''}</p>}
      {repo.topics?.length > 0 && <div className="gh-topics">{repo.topics.slice(0, 3).map(t => <span key={t} className="gh-topic">{t}</span>)}</div>}

      <div className="gh-card-stats">
        <span className="gh-stat">{ICONS.star}<span className="gh-stat-val">{formatStars(repo.totalStars)}</span><span className="gh-stat-label">stars</span></span>
        <span className="gh-stat">{ICONS.fork}<span className="gh-stat-val">{formatStars(repo.forks)}</span><span className="gh-stat-label">forks</span></span>
      </div>

      {/* AI 情报 —— 默认折叠，含场景/人群/难度/价值/教程 */}
      <div className="gh-insight">
        <button className="gh-insight-toggle" onClick={handleInsightToggle}>
          <span className="gh-insight-label">{ICONS.sparkle} AI 情报</span>
          <span className={`gh-insight-chevron ${insightExpanded ? 'open' : ''}`}>{ICONS.chevronDown}</span>
        </button>
        {insightExpanded && (
          <div className="gh-insight-body">
            {insightLoading && <div className="gh-insight-loading"><div className="spinner" /><span>正在实时分析项目…</span></div>}
            {!insightLoading && insight && (
              <>
                <div className="gh-insight-row"><span className="gh-insight-key">应用场景</span><p>{insight.scenario}</p></div>
                <div className="gh-insight-row"><span className="gh-insight-key">适合谁</span><p>{insight.audience}</p></div>
                <div className="gh-insight-row"><span className="gh-insight-key">落地难度</span><p>{insight.difficulty}</p></div>
                <div className="gh-insight-row"><span className="gh-insight-key">价值判断</span><p>{insight.value}</p></div>
              </>
            )}
            {!insightLoading && !insight && <p className="gh-insight-empty">分析失败，请重试</p>}
            {repo.tutorial && (
              <div className="gh-insight-tutorial">
                <button className="gh-tutorial-toggle" onClick={() => setTutorialExpanded(v => !v)}>
                  <span>使用教程</span><span className={`gh-tutorial-chevron ${tutorialExpanded ? 'open' : ''}`}>{ICONS.chevronDown}</span>
                </button>
                {tutorialExpanded && <pre className="gh-tutorial-text expanded">{repo.tutorial}</pre>}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="gh-card-actions">
        <button className={`gh-bookmark-btn ${isBookmarked ? 'active' : ''}`} onClick={onBookmark} title={isBookmarked ? '取消收藏' : '收藏'}>{isBookmarked ? ICONS.bookmarkFill : ICONS.bookmark}<span>收藏</span></button>
        {onAddMaterial && <button className={`gh-add-material-btn ${isInMaterials ? 'active' : ''}`} onClick={onAddMaterial} title={isInMaterials ? '已在素材库' : '收藏为素材'}>{ICONS.layers}<span>素材</span></button>}
        {isEnglish && onToggleTranslation && <button className={`gh-translate-btn ${showTranslation ? 'active' : ''}`} onClick={() => onToggleTranslation(repo)} title="翻译">{ICONS.globe}<span>译</span></button>}
      </div>
    </article>
  );
}

export default GithubRepoCard;
