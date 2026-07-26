import { ICONS, GITHUB_PERIODS } from '../constants/index.jsx';
import GithubRepoCard from './GithubRepoCard.jsx';
import { buildGithubMaterial } from '../utils/githubMaterial.js';

function GithubPage({
  githubSince,
  githubLoading,
  githubRepos,
  isBookmarked,
  isInMaterials,
  toggleBookmark,
  toggleMaterial,
  translationOpen,
  toggleGithubTranslation,
  getTranslation,
  githubInsights,
  requestGithubInsight,
  githubInsightLoading,
  setLightbox,
}) {
  return (
    <>
      <div className="section-header"><h2 className="section-title">{ICONS.github} GitHub {GITHUB_PERIODS.find(p => p.id === githubSince)?.label || '周榜'}热门项目</h2><p className="section-desc">{githubSince === 'daily' ? '今日增星最多的开源项目' : githubSince === 'monthly' ? '本月增星最多的开源项目' : '本周增星最多的开源项目'}（实时同步）</p></div>
       {githubLoading && <div className="github-grid">{Array.from({ length: 6 }).map((_, i) => <article key={i} className="github-card skeleton"><div className="skeleton-gh-header" /><div className="skeleton-gh-desc" /><div className="skeleton-gh-stats" /></article>)}</div>}
       <div className="github-grid">{githubRepos.map((repo, i) => <GithubRepoCard key={repo.id} repo={repo} index={i} since={githubSince} isBookmarked={isBookmarked(repo.url)} isInMaterials={isInMaterials(repo.id)} onBookmark={() => toggleBookmark({ id: repo.url, title: repo.fullName, url: repo.url, source: 'GitHub', summary: repo.description, tags: [repo.language].filter(Boolean), region: 'global', mode: 'deep', publishedAt: new Date().toISOString(), category: 'open-source' })} onAddMaterial={() => toggleMaterial(buildGithubMaterial(repo, githubSince), 'project', `GitHub ${GITHUB_PERIODS.find(p => p.id === githubSince)?.label || '周榜'}项目观察`)} showTranslation={translationOpen[repo.id]} onToggleTranslation={toggleGithubTranslation} translation={getTranslation({ id: repo.id, title: repo.fullName, summary: repo.description })} insight={githubInsights[repo.id]} onRequestInsight={requestGithubInsight} insightLoading={githubInsightLoading[repo.id]} onOpenLightbox={(src, title, images, index) => setLightbox({ open: true, src, title, images: images || [], index: index || 0 })} />)}</div>
    </>
  );
}

export default GithubPage;
