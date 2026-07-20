const LANE_META = {
  public: { label: '公共热点', description: '新鲜度、交叉印证与信源质量' },
  personal: { label: '个人必看', description: '画像等级、特别关注与行为校准' },
};

function Lane({ type, items, onOpenItem }) {
  const meta = LANE_META[type];
  return (
    <section className={`ai-home-lane ai-home-lane-${type}`}>
      <header>
        <div>
          <span>{meta.label}</span>
          <p>{meta.description}</p>
        </div>
        <strong>{items.length}</strong>
      </header>
      {items.length === 0 ? (
        <div className="ai-home-empty">当前没有满足质量约束的资讯</div>
      ) : (
        <ol>
          {items.map(item => (
            <li key={item.id}>
              <button type="button" onClick={() => onOpenItem(item)}>
                <span className="ai-home-item-title">{item.title}</span>
                <span className="ai-home-item-meta">
                  {item.source || '未知来源'}
                  <small>{Math.round(type === 'public' ? item.publicScore : item.personalScore)} 分</small>
                </span>
                <span className="ai-home-reasons">
                  {(item.reasons || item.recommendationReasons || []).map(reason => <em key={reason}>{reason}</em>)}
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default function AiBriefingHome({ briefing, lanes, loading, onAsk, onNavigate, onRefresh, onOpenItem }) {
  const opportunities = briefing?.opportunities || [];
  const risks = briefing?.risks || [];
  return (
    <div className="ai-briefing-home">
      <header className="ai-home-header">
        <div>
          <div className="workbench-kicker">Daily Intelligence Command</div>
          <h1>AI 情报</h1>
          <p>{briefing?.oneLine || '正在建立今日情报判断...'}</p>
          <div className="ai-home-mode">
            <span>{briefing?.mode === 'ai' ? 'AI 增强' : '算法简报'}</span>
            <time>{briefing?.date || new Date().toISOString().slice(0, 10)}</time>
          </div>
        </div>
        <div className="ai-home-actions">
          <button type="button" className="ai-primary-action" onClick={() => onAsk('基于今日证据，按事实、算法判断和风险分别说明最值得关注的三件事。')}>深入研判</button>
          <button type="button" className="secondary-action" onClick={onRefresh} disabled={loading}>{loading ? '刷新中' : '刷新情报'}</button>
        </div>
      </header>

      <div className="ai-home-lanes">
        <Lane type="public" items={lanes?.public || []} onOpenItem={onOpenItem} />
        <Lane type="personal" items={lanes?.personal || []} onOpenItem={onOpenItem} />
      </div>

      <section className="ai-home-signals">
        <div>
          <h2>机会</h2>
          {opportunities.length ? opportunities.map((entry, index) => <p key={entry.itemId || index}>{typeof entry === 'string' ? entry : entry.text}</p>) : <p>暂未识别出高置信机会。</p>}
        </div>
        <div>
          <h2>风险与待核实</h2>
          {risks.length ? risks.map((entry, index) => <p key={entry.itemId || index}>{typeof entry === 'string' ? entry : entry.text}</p>) : <p>当前入选资讯未触发显著质量风险。</p>}
        </div>
      </section>

      <nav className="ai-home-shortcuts" aria-label="情报工作区">
        <button type="button" onClick={() => onNavigate('today')}>阅读今日速报</button>
        <button type="button" onClick={() => onNavigate('recommendations')}>查看精准推荐</button>
        <button type="button" onClick={() => onNavigate('stock')}>进入股市动向</button>
        <button type="button" onClick={() => onNavigate('studio')}>进入智创中心</button>
      </nav>
    </div>
  );
}
