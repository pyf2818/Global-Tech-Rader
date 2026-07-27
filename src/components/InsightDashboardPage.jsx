import { ICONS } from '../constants/index.jsx';
import { renderBriefMarkdown } from '../utils/markdown.jsx';

const InsightDashboardPage = ({
  nav,
  setNav,
  insightData,
  trackerData,
  readingProfile,
  items,
  aiBrief,
  saveBriefToMaterials,
  exportBriefToFile,
  exportBriefToEditor,
  generateAiBrief,
  followKeywords,
  followKeywordUpdates,
  todayMustRead,
  setCategory,
  categories,
  executeSearch,
  newTrackTarget,
  setNewTrackTarget,
  addTrackTarget,
  trackTargets,
  setTrackTargets,
}) => {
  const insightTab = nav === 'trends' ? 'trends' : nav === 'tracker' ? 'tracker' : nav === 'reading-stats' ? 'profile' : 'overview';
  const setInsightTab = (t) => {
    const map = { overview: 'briefing', trends: 'trends', tracker: 'tracker', profile: 'reading-stats' };
    setNav(map[t]);
  };

  // 态势等级
  const severityLevel = insightData.anomalies.length >= 3 ? { label: '爆发', color: '#ef4444' }
    : insightData.anomalies.length >= 1 || insightData.todayCount > insightData.yesterdayCount * 1.5 ? { label: '活跃', color: '#f59e0b' }
    : { label: '正常', color: '#10b981' };

  // 追踪目标信号
  const getTrackerStatus = (target) => {
    const data = trackerData[target.id] || { weekly: 0 };
    const day7 = Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (6 - idx));
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    const counts = day7.map(d => items.filter(i => {
      const text = `${i.title} ${i.summary}`.toLowerCase();
      return (text.includes(target.keyword.toLowerCase()) || target.aliases?.some(a => text.includes(a.toLowerCase()))) && i.publishedAt?.slice(0, 10) === d;
    }).length);
    const recent3 = counts.slice(4).reduce((a, b) => a + b, 0);
    const prev4 = counts.slice(0, 4).reduce((a, b) => a + b, 0);
    const growth = prev4 === 0 ? (recent3 > 0 ? 100 : 0) : Math.round(((recent3 - prev4) / prev4) * 100);
    const isSurge = growth > 50 && recent3 > 0;
    const isDrop = growth < -50;
    const isStreak = recent3 > 0 && counts[5] > 0 && counts[6] > 0;
    return { counts, growth, isSurge, isDrop, isStreak, weekly: data.weekly };
  };

  return (
    <div className="insight-dashboard">
      {/* 洞察子导航 */}
      <div className="insight-tabs">
        {[
          { id: 'overview', label: '今日态势' },
          { id: 'trends', label: '赛道矩阵' },
          { id: 'tracker', label: '我的追踪' },
          { id: 'profile', label: '阅读画像' }
        ].map(tab => (
          <button key={tab.id} className={`insight-tab ${insightTab === tab.id ? 'active' : ''}`} onClick={() => setInsightTab(tab.id)}>
            <span className="insight-tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ====== 概览页 ====== */}
      {insightTab === 'overview' && (
        <>
          <div className="overview-top-row">
            {/* 态势总览条 */}
            <div className="insight-status-bar" style={{ borderLeft: `4px solid ${severityLevel.color}` }}>
              <div className="insight-status-main">
                <span className="insight-status-text">科技资讯态势<strong style={{ color: severityLevel.color }}> {severityLevel.label} </strong>今日收录 <strong>{insightData.todayCount}</strong> 条
                  {insightData.dailyChange !== 0 && <span className={insightData.dailyChange > 0 ? 'text-up' : 'text-down'}> {insightData.dailyChange > 0 ? '↑' : '↓'}{Math.abs(insightData.dailyChange)}% vs 昨日</span>}
                </span>
              </div>
              <div className="insight-status-meta">
                {insightData.categoryRanking[0] && <span className="status-tag hot">热 {insightData.categoryRanking[0].label} ({insightData.categoryRanking[0].recent}条)</span>}
                {insightData.anomalies.length > 0 && <span className="status-tag signal">信号 {insightData.anomalies.length} 个</span>}
                {readingProfile.streak > 0 && <span className="status-tag streak">连续 {readingProfile.streak} 天</span>}
              </div>
            </div>
          </div>

          {/* AI 每日简报 */}
          <section className="insight-section">
            <div className="ai-brief-card">
              <div className="ai-brief-header">
                <h3 className="ai-brief-title">AI 每日简报</h3>
                <div className="ai-brief-actions">
                  {aiBrief.content && (
                    <>
                      <button className="ai-brief-action-btn" onClick={saveBriefToMaterials} title="保存到素材库">存素材</button>
                      <button className="ai-brief-action-btn" onClick={exportBriefToFile} title="导出为文件">下载</button>
                      <button className="ai-brief-action-btn primary" onClick={exportBriefToEditor} title="导出到创作中心">导出</button>
                    </>
                  )}
                  <button className="ai-brief-generate" onClick={generateAiBrief} disabled={aiBrief.loading}>
                    {aiBrief.loading ? '生成中...' : aiBrief.content ? '重新生成' : '生成简报'}
                  </button>
                </div>
              </div>
              {aiBrief.error && <div className="ai-brief-error">{aiBrief.error}</div>}
              {aiBrief.content && (
                <div className="ai-brief-content">
                  {renderBriefMarkdown(aiBrief.content)}
                  <div className="ai-brief-time">生成于 {new Date(aiBrief.generatedAt).toLocaleTimeString('zh-CN')}</div>
                </div>
              )}
              {!aiBrief.content && !aiBrief.loading && !aiBrief.error && (
                <div className="ai-brief-placeholder">
                  <p>基于今日 {insightData.todayCount} 条资讯自动生成摘要简报</p>
                  <p className="ai-brief-hint">需要先在设置中配置大模型 API</p>
                </div>
              )}
              {aiBrief.loading && (
                <div className="ai-brief-loading">
                  <div className="ai-brief-spinner" />
                  <span>正在分析资讯数据，生成简报中...</span>
                </div>
              )}
            </div>
          </section>

          {/* 我的今日关注 */}
          {followKeywords.length > 0 && (
            <section className="insight-section">
              <h3 className="insight-section-title">我的今日关注</h3>
              <div className="insight-follow-updates">
                {followKeywordUpdates.length === 0 ? (
                  <div className="insight-empty">暂无匹配资讯</div>
                ) : (
                  followKeywordUpdates.slice(0, 3).map(group => (
                    <div key={group.keyword} className="insight-follow-group">
                      <div className="insight-follow-header">
                        <span className="insight-follow-keyword">{group.keyword}</span>
                        <span className="insight-follow-count">+{group.count} 条</span>
                      </div>
                      <div className="insight-follow-items">
                        {group.items.map((item, idx) => (
                          <a key={idx} href={item.url} target="_blank" rel="noreferrer" className="insight-follow-item" title={item.title}>
                            <span className="insight-follow-item-title">{item.title}</span>
                            <span className="insight-follow-item-source">{item.source}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}

          {/* 必读榜单 */}
          {todayMustRead.length > 0 && (
            <section className="insight-section">
              <h3 className="insight-section-title">必读榜单</h3>
              <div className="insight-must-read">
                {todayMustRead.map((item, idx) => (
                  <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="insight-must-read-item" title={item.title}>
                    <div className="insight-must-read-rank">{idx + 1}</div>
                    <div className="insight-must-read-info">
                      <span className="insight-must-read-title">{item.title}</span>
                      <div className="insight-must-read-meta">
                        <span>{item.source}</span>
                        <span className="insight-must-read-score">{item.mustReadScore.toFixed(0)}</span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* 机会雷达 */}
          {insightData.opportunityRadar.length > 0 && (
            <section className="insight-section">
              <h3 className="insight-section-title">机会雷达</h3>
              <div className="insight-opportunities">
                {insightData.opportunityRadar.slice(0, 5).map((item, idx) => (
                  <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="insight-opportunity-item" title={item.title}>
                    <div className="insight-opportunity-rank">{idx + 1}</div>
                    <div className="insight-opportunity-info">
                      <span className="insight-opportunity-title">{item.title}</span>
                      <div className="insight-opportunity-meta">
                        <span>{item.source}</span>
                        <span className="insight-opportunity-score">{item.opportunityScore.toFixed(0)}</span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          )}
        </>
      )}

        {/* ====== 趋势页 ====== */}
      {insightTab === 'trends' && (
        <>
          {/* 赛道热度排行 */}
          <section className="insight-section">
            <h3 className="insight-section-title">赛道热度排行</h3>
            <div className="category-ranking-list">
              {insightData.categoryRanking.slice(0, 8).map((cat, idx) => (
                <div key={cat.id} className="category-rank-row" onClick={() => { setCategory(cat.id); setNav('all'); }}>
                  <span className="category-rank-num">{idx + 1}</span>
                  <span className="category-rank-name">{cat.label}</span>
                  <div className="category-rank-bar-wrap">
                    <div className="category-rank-bar" style={{ width: `${insightData.categoryRanking[0]?.heatScore > 0 ? (cat.heatScore / insightData.categoryRanking[0].heatScore * 100) : 0}%` }} />
                  </div>
                  <span className={`category-rank-growth ${cat.growth > 0 ? 'up' : cat.growth < 0 ? 'down' : ''}`}>
                    {cat.growth > 0 ? '+' : ''}{cat.growth}%
                  </span>
                  <span className="category-rank-count">{cat.recent}条</span>
                </div>
              ))}
            </div>
          </section>

          {/* 赛道趋势对比（近30日） */}
          {insightData.categoryTrend30.length > 0 && (
            <section className="insight-section">
              <h3 className="insight-section-title">赛道趋势对比（近30日）</h3>
              <div className="trend-comparison-chart">
                <div className="trend-comparison-bars">
                  {insightData.day30.map((d, dayIdx) => (
                    <div key={d} className="trend-comparison-col" title={d}>
                      {insightData.categoryTrend30.slice(0, 5).map((cat, catIdx) => {
                        const count = cat.daily30[dayIdx];
                        const maxVal = Math.max(...cat.daily30);
                        const height = maxVal > 0 ? Math.max((count / maxVal) * 100, 4) : 4;
                        const colors = ['#22d3ee', '#a78bfa', '#34d399', '#fbbf24', '#f87171'];
                        return (
                          <div
                            key={cat.id}
                            className="trend-comparison-bar"
                            style={{ height: `${height}%`, background: colors[catIdx % colors.length] }}
                            title={`${cat.label} ${d}: ${count}条`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
                <div className="trend-comparison-legend">
                  {insightData.categoryTrend30.slice(0, 5).map((cat, idx) => {
                    const colors = ['#22d3ee', '#a78bfa', '#34d399', '#fbbf24', '#f87171'];
                    return (
                      <span key={cat.id} className="trend-legend-item">
                        <span className="trend-legend-dot" style={{ background: colors[idx % colors.length] }} />
                        {cat.label}
                      </span>
                    );
                  })}
                </div>
                <div className="trend-comparison-labels">
                  <span>{insightData.day30[0]?.slice(5)}</span>
                  <span>{insightData.day30[14]?.slice(5)}</span>
                  <span>{insightData.day30[29]?.slice(5)}</span>
                </div>
              </div>
            </section>
          )}

          {/* 赛道关联分析 */}
          {insightData.categoryCorrelations.length > 0 && (
            <section className="insight-section">
              <h3 className="insight-section-title">赛道关联分析</h3>
              <div className="correlation-list">
                {insightData.categoryCorrelations.slice(0, 8).map((corr, idx) => (
                  <div key={`${corr.cat1}-${corr.cat2}`} className="correlation-row">
                    <span className="correlation-rank">{idx + 1}</span>
                    <div className="correlation-pair">
                      <span className="correlation-cat">{corr.label1}</span>
                      <span className="correlation-arrow">↔</span>
                      <span className="correlation-cat">{corr.label2}</span>
                    </div>
                    <div className="correlation-bar-wrap">
                      <div className="correlation-bar" style={{ width: `${Math.min(corr.count / (insightData.categoryCorrelations[0]?.count || 1) * 100, 100)}%` }} />
                    </div>
                    <span className="correlation-count">{corr.count}次</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="insight-section">
            <h3 className="insight-section-title">赛道热力矩阵（7日）</h3>
            <div className="insight-heatmap">
              <div className="heatmap-header">
                <span className="heatmap-label" />
                {insightData.day7.map(d => <span key={d} className="heatmap-day">{d.slice(5)}</span>)}
              </div>
              {categories.map(cat => {
                const maxVal = Math.max(...insightData.day7.map(d => items.filter(i => i.category === cat.id && i.publishedAt?.slice(0, 10) === d).length), 1);
                return (
                  <div key={cat.id} className="heatmap-row">
                    <span className="heatmap-label">{cat.label}</span>
                    {insightData.day7.map(d => {
                      const count = items.filter(i => i.category === cat.id && i.publishedAt?.slice(0, 10) === d).length;
                      const intensity = count / maxVal;
                      return <span key={d} className="heatmap-cell" style={{ background: intensity > 0.7 ? 'rgba(34, 211, 238, 0.6)' : intensity > 0.4 ? 'rgba(34, 211, 238, 0.35)' : intensity > 0.1 ? 'rgba(34, 211, 238, 0.15)' : 'rgba(34, 211, 238, 0.04)' }} title={`${cat.label} ${d}: ${count}条`}>{count}</span>;
                    })}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="insight-section">
            <h3 className="insight-section-title">区域分布</h3>
            <div className="insight-region-bars">
              {[
                { key: 'domestic', label: '国内', pct: insightData.regionPct.domestic, count: insightData.regionDistribution.domestic, color: '#ef4444' },
                { key: 'overseas', label: '海外', pct: insightData.regionPct.overseas, count: insightData.regionDistribution.overseas, color: '#3b82f6' },
                { key: 'global', label: '全球', pct: insightData.regionPct.global, count: insightData.regionDistribution.global, color: '#10b981' }
              ].map(r => (
                <div key={r.key} className="insight-region-row">
                  <span className="insight-region-label" style={{ color: r.color }}>{r.label}</span>
                  <div className="insight-region-bar-wrap">
                    <div className="insight-region-bar" style={{ width: `${r.pct}%`, background: r.color }} />
                  </div>
                  <span className="insight-region-pct">{r.pct}%</span>
                </div>
              ))}
            </div>
          </section>

          {/* 技术雷达四象限 */}
          <section className="insight-section">
            <h3 className="insight-section-title">技术雷达（Gartner 四象限）</h3>
            <div className="tech-radar-grid">
              <div className="tech-radar-quadrant adopt">
                <h4 className="radar-quadrant-title">采用 Adopt</h4>
                <span className="radar-quadrant-desc">成熟稳定，高频率，广泛覆盖</span>
                <div className="radar-items">
                  {insightData.techRadar.filter(c => c.quadrant === 'adopt').map(c => (
                    <span key={c.id} className="radar-item" onClick={() => { setCategory(c.id); setNav('all'); }}>{c.label}</span>
                  ))}
                  {insightData.techRadar.filter(c => c.quadrant === 'adopt').length === 0 && <span className="radar-item radar-item-empty">暂无</span>}
                </div>
              </div>
              <div className="tech-radar-quadrant trial">
                <h4 className="radar-quadrant-title">试验 Trial</h4>
                <span className="radar-quadrant-desc">中高频，增长快速</span>
                <div className="radar-items">
                  {insightData.techRadar.filter(c => c.quadrant === 'trial').map(c => (
                    <span key={c.id} className="radar-item" onClick={() => { setCategory(c.id); setNav('all'); }}>{c.label}</span>
                  ))}
                  {insightData.techRadar.filter(c => c.quadrant === 'trial').length === 0 && <span className="radar-item radar-item-empty">暂无</span>}
                </div>
              </div>
              <div className="tech-radar-quadrant assess">
                <h4 className="radar-quadrant-title">评估 Assess</h4>
                <span className="radar-quadrant-desc">低频但极速增长（新兴）</span>
                <div className="radar-items">
                  {insightData.techRadar.filter(c => c.quadrant === 'assess').map(c => (
                    <span key={c.id} className="radar-item" onClick={() => { setCategory(c.id); setNav('all'); }}>{c.label}</span>
                  ))}
                  {insightData.techRadar.filter(c => c.quadrant === 'assess').length === 0 && <span className="radar-item radar-item-empty">暂无</span>}
                </div>
              </div>
              <div className="tech-radar-quadrant hold">
                <h4 className="radar-quadrant-title">暂缓 Hold</h4>
                <span className="radar-quadrant-desc">低频，增长放缓或持平</span>
                <div className="radar-items">
                  {insightData.techRadar.filter(c => c.quadrant === 'hold').map(c => (
                    <span key={c.id} className="radar-item" onClick={() => { setCategory(c.id); setNav('all'); }}>{c.label}</span>
                  ))}
                  {insightData.techRadar.filter(c => c.quadrant === 'hold').length === 0 && <span className="radar-item radar-item-empty">暂无</span>}
                </div>
              </div>
            </div>
          </section>

          {/* 源质量排行 */}
          <section className="insight-section">
            <h3 className="insight-section-title">源质量排行</h3>
            <div className="source-quality-list">
              {insightData.sourceQuality.slice(0, 10).map((s, i) => (
                <div key={s.name} className="source-quality-row">
                  <span className="source-quality-rank">{i + 1}</span>
                  <span className="source-quality-name">{s.name}</span>
                  <span className="source-quality-meta">{s.count}条 · {s.categories}赛道</span>
                  <div className="source-quality-bar-wrap">
                    <div className="source-quality-bar" style={{ width: `${s.qualityScore}%`, background: s.qualityScore > 70 ? '#10b981' : s.qualityScore > 40 ? '#f59e0b' : '#ef4444' }} />
                  </div>
                  <span className="source-quality-score">{s.qualityScore}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 技术关键词 TF-IDF */}
          {insightData.techKeywords.length > 0 && (
            <section className="insight-section">
              <h3 className="insight-section-title">技术关键词（TF-IDF）</h3>
              <div className="insight-tech-keywords">
                {insightData.techKeywords.slice(0, 20).map(k => (
                  <button key={k.word} className="insight-tech-kw" onClick={() => executeSearch(k.word)}>
                    <span className="tech-kw-word">{k.word}</span>
                    <span className="tech-kw-meta">{k.freq}次 · {k.sourceCount}源</span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* ====== 追踪页 ====== */}
      {insightTab === 'tracker' && (
        <>
          <div className="tracker-form">
            <input type="text" placeholder="输入公司名或技术关键词" value={newTrackTarget} onChange={e => setNewTrackTarget(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTrackTarget()} />
            <button className="tracker-form-btn" onClick={addTrackTarget}>{ICONS.plus} 添加</button>
          </div>
          <div className="tracker-presets">
            {['OpenAI', 'Google', '字节跳动', '华为', 'React', 'LLM', 'RISC-V'].map(name => (
              <button key={name} className="tracker-preset" onClick={() => { setNewTrackTarget(name); }}>{name}</button>
            ))}
          </div>

          {trackTargets.length === 0 && <div className="empty-state"><p>暂无追踪目标，添加你想关注的公司或技术</p></div>}

          <div className="insight-watchlist">
            {trackTargets.map(target => {
              const st = getTrackerStatus(target);
              let statusLabel = '—', statusColor = '#6b7280', statusIcon = '';
              if (st.isSurge) { statusLabel = '今日突增'; statusColor = '#f59e0b'; statusIcon = '!'; }
              else if (st.isStreak) { statusLabel = '连续增长'; statusColor = '#10b981'; statusIcon = '+'; }
              else if (st.isDrop) { statusLabel = '显著降温'; statusColor = '#ef4444'; statusIcon = '-'; }
              else if (st.growth > 0) { statusLabel = '小幅增长'; statusColor = '#22d3ee'; statusIcon = '↑'; }
              else if (st.growth < 0) { statusLabel = '小幅下降'; statusColor = '#f87171'; statusIcon = '↓'; }

              // 获取相关新闻
              const relatedNews = items.filter(i => {
                const text = `${i.title} ${i.summary}`.toLowerCase();
                return text.includes(target.keyword.toLowerCase()) || target.aliases?.some(a => text.includes(a.toLowerCase()));
              }).slice(0, 5);

              // 获取来源分布
              const sourceDist = {};
              items.filter(i => {
                const text = `${i.title} ${i.summary}`.toLowerCase();
                return text.includes(target.keyword.toLowerCase()) || target.aliases?.some(a => text.includes(a.toLowerCase()));
              }).forEach(i => {
                sourceDist[i.source] = (sourceDist[i.source] || 0) + 1;
              });
              const topSources = Object.entries(sourceDist).sort((a, b) => b[1] - a[1]).slice(0, 3);

              // 获取关联关键词
              const keywordDist = {};
              items.filter(i => {
                const text = `${i.title} ${i.summary}`.toLowerCase();
                return text.includes(target.keyword.toLowerCase()) || target.aliases?.some(a => text.includes(a.toLowerCase()));
              }).forEach(i => {
                (i.tags || []).forEach(tag => {
                  if (!target.keyword.toLowerCase().includes(tag.toLowerCase()) && !target.aliases?.some(a => a.toLowerCase().includes(tag.toLowerCase()))) {
                    keywordDist[tag] = (keywordDist[tag] || 0) + 1;
                  }
                });
              });
              const relatedKeywords = Object.entries(keywordDist).sort((a, b) => b[1] - a[1]).slice(0, 5);

              const maxC = Math.max(...st.counts, 1);
              return (
                <div key={target.id} className="insight-watch-card">
                  <div className="insight-watch-header">
                    <span className="insight-watch-name">{target.keyword}</span>
                    <button className="insight-watch-remove" onClick={() => setTrackTargets(prev => prev.filter(t => t.id !== target.id))}>{ICONS.x}</button>
                  </div>
                  <div className="insight-watch-stats">
                    <span className="insight-watch-val">{st.weekly}<sub>周</sub></span>
                    <span className={`insight-watch-change ${st.growth > 0 ? 'up' : st.growth < 0 ? 'down' : ''}`}>{st.growth > 0 ? '+' : ''}{st.growth}%</span>
                    <span className="insight-watch-status" style={{ color: statusColor }}>{statusIcon} {statusLabel}</span>
                  </div>
                  <div className="insight-watch-sparkline">
                    {st.counts.map((c, idx) => (
                      <div key={idx} className="spark-bar" style={{ height: `${Math.max((c / maxC) * 32, 3)}px`, opacity: c > 0 ? 0.3 + (c / maxC) * 0.7 : 0.15 }} />
                    ))}
                  </div>
                  <div className="insight-watch-spark-labels">
                    {Array.from({ length: 7 }).map((_, idx) => {
                      const d = new Date(); d.setDate(d.getDate() - (6 - idx));
                      return <span key={idx}>{d.getMonth() + 1}/{d.getDate()}</span>;
                    })}
                  </div>

                  {/* 来源分布 */}
                  {topSources.length > 0 && (
                    <div className="tracker-source-distribution">
                      <span className="tracker-section-label">来源分布</span>
                      <div className="tracker-source-bars">
                        {topSources.map(([name, count]) => (
                          <div key={name} className="tracker-source-bar-item">
                            <span className="tracker-source-name">{name}</span>
                            <div className="tracker-source-bar-wrap">
                              <div className="tracker-source-bar" style={{ width: `${count / topSources[0][1] * 100}%` }} />
                            </div>
                            <span className="tracker-source-count">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 关联关键词 */}
                  {relatedKeywords.length > 0 && (
                    <div className="tracker-related-keywords">
                      <span className="tracker-section-label">关联关键词</span>
                      <div className="tracker-keyword-tags">
                        {relatedKeywords.map(([kw, count]) => (
                          <span key={kw} className="tracker-keyword-tag" onClick={() => executeSearch(kw)}>{kw} ({count})</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 相关新闻 */}
                  {relatedNews.length > 0 && (
                    <div className="tracker-related-news">
                      <span className="tracker-section-label">相关新闻</span>
                      <div className="tracker-news-list">
                        {relatedNews.map(news => (
                          <div key={news.id} className="tracker-news-item" onClick={() => window.open(news.link, '_blank')}>
                            <span className="tracker-news-title">{news.title}</span>
                            <span className="tracker-news-source">{news.source}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ====== 阅读画像页 ====== */}
      {insightTab === 'profile' && (
        <>
          {/* 核心指标 */}
          <div className="reading-metrics">
            <div className="reading-metric">
              <span className="reading-metric-value">{readingProfile.streak}</span>
              <span className="reading-metric-label">连续天数</span>
            </div>
            <div className="reading-metric">
              <span className="reading-metric-value">{readingProfile.avgDailyRead}</span>
              <span className="reading-metric-label">日均阅读</span>
            </div>
            <div className="reading-metric">
              <span className="reading-metric-value">{readingProfile.readRate}%</span>
              <span className="reading-metric-label">读完率</span>
            </div>
            <div className="reading-metric">
              <span className="reading-metric-value">{String(readingProfile.peakHour).padStart(2, '0')}:00</span>
              <span className="reading-metric-label">阅读高峰</span>
            </div>
          </div>

          {/* 近30天阅读趋势 */}
          <section className="insight-section">
            <h3 className="insight-section-title">近30天阅读趋势</h3>
            <div className="profile-trend-chart">
              <div className="trend-chart-bars">
                {readingProfile.trendData.map((count, idx) => {
                  const height = readingProfile.maxTrend > 0 ? Math.max((count / readingProfile.maxTrend) * 100, 4) : 4;
                  return (
                    <div key={idx} className="trend-chart-bar-wrapper" title={`${readingProfile.day30[idx]}: ${count}篇`}>
                      <div className="trend-chart-bar" style={{ height: `${height}%` }} />
                    </div>
                  );
                })}
              </div>
              <div className="trend-chart-labels">
                <span>{readingProfile.day30[0]?.slice(5)}</span>
                <span>{readingProfile.day30[14]?.slice(5)}</span>
                <span>{readingProfile.day30[29]?.slice(5)}</span>
              </div>
            </div>
          </section>

          {/* 24小时阅读时段分布 */}
          <section className="insight-section">
            <h3 className="insight-section-title">24小时阅读时段分布</h3>
            <div className="profile-hour-chart">
              <div className="hour-chart-bars">
                {readingProfile.hourDist.map((count, idx) => {
                  const maxCount = Math.max(...readingProfile.hourDist, 1);
                  const height = Math.max((count / maxCount) * 100, 4);
                  return (
                    <div key={idx} className="hour-chart-bar-wrapper" title={`${String(idx).padStart(2, '0')}:00 - ${count}篇`}>
                      <div className="hour-chart-bar" style={{ height: `${height}%` }} />
                      {idx % 4 === 0 && <span className="hour-chart-label">{idx}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <div className="profile-two-col">
            {/* 来源偏好 */}
            <section className="insight-section">
              <h3 className="insight-section-title">来源偏好 TOP5</h3>
              <div className="profile-sources">
                {readingProfile.topSources.length > 0 ? readingProfile.topSources.map((source, idx) => (
                  <div key={source.name} className="profile-source-row">
                    <span className="profile-source-rank">{idx + 1}</span>
                    <span className="profile-source-name">{source.name}</span>
                    <div className="profile-source-bar-wrap">
                      <div className="profile-source-bar" style={{ width: `${readingProfile.topSources[0]?.count > 0 ? (source.count / readingProfile.topSources[0].count * 100) : 0}%` }} />
                    </div>
                    <span className="profile-source-count">{source.count}篇</span>
                  </div>
                )) : <div className="empty-state">暂无阅读数据</div>}
              </div>
            </section>

            {/* 标签偏好 */}
            <section className="insight-section">
              <h3 className="insight-section-title">标签偏好 TOP8</h3>
              <div className="profile-tags-cloud">
                {readingProfile.topTags.length > 0 ? readingProfile.topTags.map(tag => (
                  <span key={tag.name} className="profile-tag-item" style={{ fontSize: `${11 + tag.pct / 5}px` }}>
                    {tag.name} <small>({tag.count})</small>
                  </span>
                )) : <div className="empty-state">暂无标签数据</div>}
              </div>
            </section>
          </div>

          {/* 阅读深度分析 */}
          <section className="insight-section">
            <h3 className="insight-section-title">阅读深度分析</h3>
            <div className="profile-depth-metrics">
              <div className="profile-depth-card">
                <span className="profile-depth-value">{readingProfile.avgSummaryLength}</span>
                <span className="profile-depth-label">平均摘要长度（字符）</span>
              </div>
              <div className="profile-depth-card">
                <span className="profile-depth-value">{readingProfile.deepReads}</span>
                <span className="profile-depth-label">深度阅读（长文）</span>
              </div>
              <div className="profile-depth-card">
                <span className="profile-depth-value">{readingProfile.shallowReads}</span>
                <span className="profile-depth-label">快速浏览（短文）</span>
              </div>
              <div className="profile-depth-card">
                <span className="profile-depth-value">{readingProfile.totalBookmarks}</span>
                <span className="profile-depth-label">总收藏数</span>
              </div>
            </div>
          </section>

          {/* 兴趣分布 */}
          <section className="insight-section">
            <h3 className="insight-section-title">兴趣分布</h3>
            <div className="reading-interests">
              {readingProfile.topInterests.map((interest, idx) => (
                <div key={interest.id} className="reading-interest-row">
                  <span className="reading-interest-rank">{idx + 1}</span>
                  <span className="reading-interest-name">{interest.label}</span>
                  <div className="reading-interest-bar-wrap">
                    <div className="reading-interest-bar" style={{ width: `${readingProfile.topInterests[0]?.count > 0 ? (interest.count / readingProfile.topInterests[0].count * 100) : 0}%` }} />
                  </div>
                  <span className="reading-interest-pct">{interest.pct}%</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default InsightDashboardPage;
