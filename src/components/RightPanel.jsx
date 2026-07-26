import { ICONS } from '../constants/index.jsx';
import RecommendationDateRail from './RecommendationDateRail.jsx';

export default function RightPanel({ showRightPanel, panelCollapsed, nav, recommendationSnapshots, selectedNewsDate, setSelectedNewsDate, loading, loadNews, followKeywords, sortedFollowKeywords, matchCountPerKeyword, pinnedKeywords, pinFollowKeyword, unpinFollowKeyword, removeFollowKeyword, newKeyword, setNewKeyword, addFollowKeyword, hotTags, executeSearch, items, setGlobeFullscreenOpen, followKeywordUpdates, todayMustRead, selectedInterests, aiInsights, fetchAiInsights, llmConfig, setShowLlmQuickConfig, llmTesting }) {
  if (!showRightPanel) return null;
  return (
    <aside className={`panel ${panelCollapsed ? 'collapsed' : ''} ${nav === 'recommendations' ? 'panel-recommendations' : ''}`}>
        {!panelCollapsed && (
          <>
          {nav === 'recommendations' ? (
            <RecommendationDateRail
              snapshots={recommendationSnapshots}
              selectedDate={selectedNewsDate}
              onSelectDate={date => setSelectedNewsDate(date)}
              loading={loading}
              onRefresh={() => loadNews()}
            />
          ) : (
            <>
            <section className="panel-section follow-panel-section">
              <div className="follow-panel-header">
                <h3 className="panel-title">{ICONS.sparkle}<span>我的关注</span></h3>
                {followKeywords.length > 0 && <span className="follow-total-badge">{followKeywords.length} 个关键词</span>}
              </div>
              <div className="follow-keywords-panel">
                {followKeywords.length === 0 && (
                  <div className="follow-panel-empty">
                    <div className="follow-empty-visual">
                      <svg viewBox="0 0 40 40" width="40" height="40" fill="none" stroke="var(--accent-cyan)" strokeWidth="1.2" opacity="0.3"><circle cx="20" cy="20" r="18"/><path d="M20 12v8"/><path d="M16 20h8"/></svg>
                    </div>
                    <p className="follow-empty-title">追踪你感兴趣的话题</p>
                    <p className="follow-empty-desc">添加关键词，优先展示匹配资讯</p>
                  </div>
                )}
                {followKeywords.length > 0 && (
                  <div className="follow-panel-list">
                    {sortedFollowKeywords.map(kw => {
                      const count = matchCountPerKeyword[kw] || 0;
                      const isPinned = pinnedKeywords.includes(kw);
                      return (
                        <div key={kw} className={`follow-panel-item ${isPinned ? 'follow-panel-item-pinned' : ''}`}>
                          <div className="follow-panel-item-left">
                            <button className="follow-panel-kw" onClick={() => executeSearch(kw)}>{kw}</button>
                          </div>
                          <div className="follow-panel-item-right">
                            <button className={`follow-panel-pin ${isPinned ? 'is-pinned' : ''}`} onClick={() => isPinned ? unpinFollowKeyword(kw) : pinFollowKeyword(kw)} title={isPinned ? '取消置顶' : '置顶'}>
                              <svg viewBox="0 0 16 16" width="14" height="14" fill={isPinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5"><path d="M3 13l5-5 5 5M8 1v7"/></svg>
                            </button>
                            <button className="follow-panel-del" onClick={() => removeFollowKeyword(kw)} title="删除">
                              <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/></svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="follow-add-bar follow-add-bar-panel">
                  <input value={newKeyword} onChange={e => setNewKeyword(e.target.value)} placeholder="添加关键词..." onKeyDown={e => e.key === 'Enter' && addFollowKeyword()} />
                  <button className="follow-add-btn" onClick={() => addFollowKeyword()}><svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/></svg></button>
                </div>
                {hotTags.length > 0 && (() => {
                  const suggestions = hotTags.filter(t => !followKeywords.includes(t.tag)).slice(0, 4);
                  return suggestions.length > 0 && followKeywords.length > 0 ? (
                    <div className="follow-suggest">
                      <span className="follow-suggest-label">热门推荐</span>
                      <div className="follow-suggest-tags">
                        {suggestions.map(s => (
                          <button key={s.tag} className="follow-suggest-tag" onClick={() => addFollowKeyword(s.tag)}>{s.tag}</button>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            </section>
            <section className="panel-section"><h3 className="panel-title">{ICONS.fire}<span>热门标签</span></h3><div className="hot-tags">{hotTags.map((item, i) => <button key={item.tag} className="hot-tag" onClick={() => executeSearch(item.tag)}><span className="tag-rank">{i + 1}</span><span className="tag-name">{item.tag}</span><span className="tag-trend">24h +{item.trend}</span><span className="tag-count">{item.count}</span></button>)}</div></section>
            {/* 全球科技大屏预览 */}
            <section className="panel-section panel-globe-preview">
              <h3 className="panel-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                <span>全球科技大屏</span>
              </h3>
              <div className="globe-preview-card" onClick={() => setGlobeFullscreenOpen(true)}>
                <div className="globe-preview-visual">
                  <div className="globe-preview-globe">
                    <div className="globe-preview-ring" />
                    <div className="glob-preview-dot" style={{ top: '30%', left: '25%' }} />
                    <div className="glob-preview-dot" style={{ top: '35%', left: '70%' }} />
                    <div className="glob-preview-dot" style={{ top: '55%', left: '50%' }} />
                    <div className="glob-preview-dot" style={{ top: '45%', left: '35%' }} />
                  </div>
                </div>
                <div className="globe-preview-info">
                  <span className="globe-preview-label">全球热点分布</span>
                  <span className="globe-preview-count">{items.length} 条资讯</span>
                </div>
                <button className="globe-preview-expand" title="点击放大">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                  点击放大
                </button>
              </div>
            </section>
            {/* 我的关注动态 */}
            {followKeywords.length > 0 && (
              <section className="panel-section follow-updates-section">
                <h3 className="panel-title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                  <span>关注动态</span>
                </h3>
                <div className="follow-updates-list">
                  {followKeywordUpdates.length === 0 ? (
                    <div className="follow-updates-empty">暂无匹配资讯</div>
                  ) : (
                    followKeywordUpdates.slice(0, 3).map(group => (
                      <div key={group.keyword} className="follow-update-group">
                        <div className="follow-update-header">
                          <span className="follow-update-keyword">{group.keyword}</span>
                          <span className="follow-update-count">+{group.count}</span>
                        </div>
                        <div className="follow-update-items">
                          {group.items.map((item, idx) => (
                            <a
                              key={idx}
                              href={item.url}
                              target="_blank"
                              rel="noreferrer"
                              className="follow-update-item"
                              title={item.title}
                              onClick={(e) => { e.stopPropagation(); }}
                            >
                              <span className="follow-update-title">{item.title}</span>
                              <span className="follow-update-source">{item.source}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            )}
            {/* 今日必读 */}
            {todayMustRead.length > 0 && (
              <section className="panel-section must-read-section">
                <h3 className="panel-title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/><circle cx="12" cy="12" r="3"/></svg>
                  <span>今日必读</span>
                </h3>
                <div className="must-read-list">
                  {todayMustRead.map((item, idx) => {
                    const isTopTier = item.mustReadScore >= 50;
                    const scoreColor = isTopTier ? '#22d3ee' : (item.mustReadScore >= 30 ? '#f59e0b' : '#64748b');
                    return (
                      <a
                        key={item.id}
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className={`must-read-item ${isTopTier ? 'must-read-item-top' : ''}`}
                        title={item.title}
                        onClick={(e) => { e.stopPropagation(); }}
                      >
                        <div className="must-read-rank" style={{ background: isTopTier ? '#22d3ee' : '#64748b' }}>{idx + 1}</div>
                        <div className="must-read-info">
                          <span className="must-read-title">{item.title}</span>
                          <div className="must-read-meta">
                            <span className="must-read-source">{item.source}</span>
                            <span className="must-read-score" style={{ color: scoreColor }}>
                              {item.mustReadScore.toFixed(0)}分
                            </span>
                          </div>
                          <div className="must-read-tags">
                            {selectedInterests.includes(item.category) && (
                              <span className="must-read-tag must-read-tag-match">关注领域</span>
                            )}
                            {item.imageUrl && (
                              <span className="must-read-tag must-read-tag-media">图文</span>
                            )}
                            {((Date.now() - new Date(item.publishedAt).getTime()) / (1000 * 60 * 60)) < 3 && (
                              <span className="must-read-tag must-read-tag-fresh">新发布</span>
                            )}
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </section>
            )}
            <section className="panel-section">
              <div className="ai-insights-header">
                <h3 className="panel-title">{ICONS.sparkles}<span>AI 洞察</span></h3>
                {aiInsights.data && (
                  <button className="btn-refresh-insights" onClick={fetchAiInsights} disabled={aiInsights.loading} title="重新分析">
                    {ICONS.refresh}
                  </button>
                )}
              </div>
              {aiInsights.loading && <div className="ai-insights-loading"><div className="ai-loading-spinner" />正在分析...</div>}
              {aiInsights.error && <div className="ai-insights-error">{ICONS.x} {aiInsights.error}</div>}
              {aiInsights.data && (
                <div className="ai-insights-content">
                  {aiInsights.data.trends && (
                    <div className="ai-insight-block">
                      <span className="ai-insight-label">{ICONS.chart} 技术趋势</span>
                      <ul className="ai-insight-list">
                        {aiInsights.data.trends.map((t, i) => <li key={i}>{t}</li>)}
                      </ul>
                    </div>
                  )}
                  {aiInsights.data.correlations && (
                    <div className="ai-insight-block">
                      <span className="ai-insight-label">{ICONS.link} 跨域关联</span>
                      <ul className="ai-insight-list">
                        {aiInsights.data.correlations.map((c, i) => <li key={i}>{c}</li>)}
                      </ul>
                    </div>
                  )}
                  {aiInsights.data.signals && (
                    <div className="ai-insight-block">
                      <span className="ai-insight-label">{ICONS.bell} 关键信号</span>
                      <ul className="ai-insight-list">
                        {aiInsights.data.signals.map((s, i) => <li key={i} className="ai-signal-item">{s}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              {!aiInsights.loading && !aiInsights.data && !aiInsights.error && (
                <div className="ai-insights-placeholder">
{!llmConfig.baseUrl ? (
                     <>
                       <div className="llm-status-row">
                         <span className="llm-status-indicator warning" title="未配置">●</span>
                         <span className="llm-model-name">未配置</span>
                       </div>
                       <p className="ai-insights-hint">配置大模型后自动生成洞察</p>
                       <button className="btn-quick-config primary" onClick={() => setShowLlmQuickConfig(true)}>{ICONS.settings}<span>快速配置</span></button>
                     </>
                   ) : (
                     <>
                       <div className="llm-status-row">
                         <span className="llm-status-indicator success" title="已配置">●</span>
                         <span className="llm-model-name">{llmConfig.selectedModel || '未选择模型'}</span>
                       </div>
                       <p className="ai-insights-hint">已配置 LLM，点击「重新分析」生成当前资讯的洞察</p>
                       <div className="llm-action-row">
                         <button className="btn-test-inline" onClick={fetchAiInsights} disabled={llmTesting}>{llmTesting ? '...' : '分析'}</button>
                         <button className="btn-edit-config" onClick={() => setShowLlmQuickConfig(true)}>{ICONS.settings}<span>修改</span></button>
                       </div>
                     </>
                   )}
                </div>
              )}
            </section>
            </>
          )}
          </>
        )}
      </aside>
  );
}
