import { useState } from 'react';
import { ICONS } from '../constants/index.jsx';
import { formatStars } from '../utils/format.js';

function GithubRepoCard({ repo, index, since = 'weekly', isBookmarked = false, isInMaterials = false, onBookmark, onAddMaterial, showTranslation, onToggleTranslation, translation, onOpenLightbox }) {
  const [tutorialExpanded, setTutorialExpanded] = useState(false);
  const tutorialLines = repo.tutorial ? repo.tutorial.split('\n') : [];
  const hasLongTutorial = tutorialLines.length > 4;
  const isEnglish = /^[a-zA-Z0-9\s\-.,!?':\(\)\[\]{}]+$/.test(repo.fullName) || /^[a-zA-Z0-9\s\-.,!?':\(\)\[\]{}]+$/.test(repo.description);

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
      </div>
      {repo.imageUrl && (
        <div className="gh-card-image" onClick={() => onOpenLightbox?.(repo.imageUrl, repo.fullName)}>
          <img src={repo.imageUrl} alt={repo.name} loading="lazy" onError={e => { e.target.style.display = 'none'; }} />
        </div>
      )}
      <p className="gh-desc">{repo.description}</p>
      {showTranslation && translation && <p className="gh-translation">{translation.title}{translation.summary ? ` - ${translation.summary}` : ''}</p>}
      {repo.tutorial && <div className="gh-tutorial">
        <span className="gh-tutorial-label">使用教程</span>
        <pre className={`gh-tutorial-text ${tutorialExpanded ? 'expanded' : ''}`}>{tutorialExpanded ? repo.tutorial : tutorialLines.slice(0, 4).join('\n')}</pre>
        {hasLongTutorial && <button className="gh-tutorial-toggle" onClick={() => setTutorialExpanded(v => !v)}>{tutorialExpanded ? '收起' : '展开全文'}</button>}
      </div>}
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
