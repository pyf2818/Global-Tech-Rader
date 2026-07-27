import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

function formatScore(value) {
  const score = Number(value || 0);
  return Number.isFinite(score) ? Math.round(score) : 0;
}

function formatRelativeTime(value, t) {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return t('common.unknown');
  const diffMs = Date.now() - time;
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes < 60) return t('news.minutesAgo', { count: minutes || 1 });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('news.hoursAgo', { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return t('news.daysAgo', { count: days });
  return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' }).format(new Date(time));
}

/**
 * IntelligenceFeedPanel - 精准推荐顶部「最热门情报」Hero 卡片
 *
 * 设计原则：只显示一个最显眼的关键信息（综合评分最高的那条），不堆砌。
 * 详细资讯由下方的 RecommendationFeed 卡片流承载。
 *
 * Hero 卡片包含：
 * - 综合评分徽章 + 分类标签
 * - 大字号标题
 * - 摘要（2-3 行）
 * - 来源 + 时间 + 原文链接
 * - 右侧紧凑指标条：影响 / 热度 / 综合三个数字
 */
export default function IntelligenceFeedPanel({
  items = [],
  opportunities = [],
  weeklySectors = null,
  alerts = [],
  loading = false,
  error = '',
  updatedAt = '',
  onRefresh,
}) {
  const { t } = useTranslation();
  // 选出综合评分最高的作为 Hero（无评分时取第一条）
  const hero = useMemo(() => {
    if (!items.length) return null;
    return items.reduce((best, cur) => {
      const bestScore = Number(best.intelligenceScore || 0);
      const curScore = Number(cur.intelligenceScore || 0);
      return curScore > bestScore ? cur : best;
    }, items[0]);
  }, [items]);

  // 关键提醒条：仅展示优先级最高的 1 条（避免视觉噪声）
  const topAlert = useMemo(() => {
    if (!Array.isArray(alerts) || alerts.length === 0) return null;
    return alerts.reduce((top, cur) =>
      Number(cur.priority || 0) > Number(top.priority || 0) ? cur : top
    , alerts[0]);
  }, [alerts]);

  return (
    <section className="intelligence-feed-panel" aria-label={t('intelligence.title')}>
      <header className="intelligence-feed-head">
        <div>
          <span className="intelligence-feed-kicker">{t('intelligence.kicker')}</span>
          <h2>{t('intelligence.title')}</h2>
        </div>
        <div className="intelligence-feed-actions">
          {updatedAt && <span>{formatRelativeTime(updatedAt, t)}{t('intelligence.updatedAt')}</span>}
          <button type="button" onClick={onRefresh} disabled={loading} aria-label={t('intelligence.refresh')}>
            {loading ? t('common.refreshing') : t('intelligence.refresh')}
          </button>
        </div>
      </header>

      {error && (
        <div className="intelligence-feed-error">
          <strong>{t('errors.serverError')}</strong>
          <span>{error}</span>
        </div>
      )}

      {!error && loading && !hero && (
        <div className="intelligence-feed-skeleton">
          {Array.from({ length: 1 }).map((_, index) => <span key={index} />)}
        </div>
      )}

      {!error && !loading && !hero && (
        <div className="intelligence-feed-empty">{t('intelligence.noData')}</div>
      )}

      {/* 关键提醒条：仅 1 条最高优先级，避免多条堆砌 */}
      {topAlert && (
        <div className="intelligence-alert-strip" aria-label={t('intelligence.alertReminder')}>
          <div className={`intelligence-alert intelligence-alert-${topAlert.kind || 'priority'}`}>
            <span>{topAlert.kind === 'risk' ? t('intelligence.alertRisk') : topAlert.kind === 'opportunity' ? t('intelligence.alertOpportunity') : topAlert.kind === 'sector' ? t('intelligence.alertSector') : t('intelligence.alertReminder')}</span>
            <strong>{topAlert.title}</strong>
            <em>{formatScore(topAlert.priority)}</em>
          </div>
        </div>
      )}

      {/* Hero 卡片：最热门的那条情报，最显眼 */}
      {hero && (
        <article className="intelligence-hero-card">
          <div className="intelligence-hero-main">
            <div className="intelligence-hero-meta">
              <span className="intelligence-hero-category">{hero.categoryLabel || hero.category || 'Industry'}</span>
              <span className="intelligence-hero-score" title={t('intelligence.score')}>
                <strong>{formatScore(hero.intelligenceScore)}</strong>
                <em>{t('intelligence.comprehensive')}</em>
              </span>
            </div>
            <h3 className="intelligence-hero-title">{hero.title}</h3>
            <p className="intelligence-hero-summary">{hero.summary || t('common.empty')}</p>
            <footer className="intelligence-hero-footer">
              <span className="intelligence-hero-source">{hero.source || t('common.unknown')} · {formatRelativeTime(hero.publishedAt, t)}</span>
              {hero.url && (
                <a href={hero.url} target="_blank" rel="noreferrer" className="intelligence-hero-link">
                  {t('intelligence.viewOriginal')}
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
                </a>
              )}
            </footer>
          </div>
          {/* 右侧紧凑指标条：3 个核心数字 */}
          <div className="intelligence-hero-metrics">
            <div className="intelligence-hero-metric" title={t('intelligence.impact')}>
              <span className="intelligence-hero-metric-label">{t('intelligence.impact')}</span>
              <strong className="intelligence-hero-metric-value">{formatScore(hero.impactScore)}</strong>
            </div>
            <div className="intelligence-hero-metric" title={t('intelligence.heat')}>
              <span className="intelligence-hero-metric-label">{t('intelligence.heat')}</span>
              <strong className="intelligence-hero-metric-value">{formatScore(hero.heatScore)}</strong>
            </div>
            <div className="intelligence-hero-metric intelligence-hero-metric-primary" title={t('intelligence.score')}>
              <span className="intelligence-hero-metric-label">{t('intelligence.comprehensive')}</span>
              <strong className="intelligence-hero-metric-value">{formatScore(hero.intelligenceScore)}</strong>
            </div>
          </div>
        </article>
      )}
    </section>
  );
}
