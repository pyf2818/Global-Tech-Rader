function Story({ item, rank, onOpenItem, onSaveItem }) {
  if (!item) return null;
  return (
    <article className="newspaper-story">
      <span className="newspaper-story-rank">{String(rank).padStart(2, '0')}</span>
      <div>
        <button type="button" className="newspaper-story-title" onClick={() => onOpenItem(item)}>{item.title}</button>
        <p>{item.summary || item.recommendation || '暂无摘要'}</p>
        <footer>
          <span>{item.source || '未知来源'}</span>
          <span>{item.publishedAt ? new Date(item.publishedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
          <span>{Math.round(item.mustReadScore || 0)} 分</span>
          <button type="button" onClick={() => onSaveItem(item)}>沉淀素材</button>
        </footer>
      </div>
    </article>
  );
}

export default function TodayNewspaper({ briefing, lanes, loading, onRefresh, onOpenItem, onSaveItem, onOpenRecommendations }) {
  const allItems = [...(lanes?.public || []), ...(lanes?.personal || [])];
  const lead = briefing?.sections?.lead || allItems[0];
  const domains = briefing?.sections?.domains || [];
  const sources = [...new Map(allItems.map(item => [item.source, item])).values()].filter(item => item.source);
  return (
    <div className="today-newspaper">
      <header className="newspaper-masthead">
        <div><span>THE DAILY INTELLIGENCE</span><h1>今日速报</h1></div>
        <div className="newspaper-edition"><time>{briefing?.date}</time><span>{briefing?.mode === 'ai' ? 'AI 增强版' : '算法基础版'}</span></div>
        <div className="newspaper-actions"><button type="button" onClick={onOpenRecommendations}>历史推荐</button><button type="button" onClick={onRefresh}>{loading ? '刷新中' : '刷新'}</button></div>
      </header>

      {!lead ? (
        <div className="newspaper-empty">当前日期没有足够资讯形成版面。</div>
      ) : (
        <>
          <section className="newspaper-lead">
            <div className="newspaper-label">今日总判断</div>
            <h2>{briefing.oneLine}</h2>
            <button type="button" onClick={() => onOpenItem(lead)}>{lead.title}</button>
            <p>{lead.summary || lead.recommendation}</p>
            <footer>{lead.source} · {Math.round(lead.mustReadScore || 0)} 分 · {(lead.reasons || lead.recommendationReasons || []).join(' / ')}</footer>
          </section>

          <div className="newspaper-columns">
            <section><header><span>PUBLIC SIGNALS</span><h2>公共热点</h2></header>{(lanes.public || []).map((item, index) => <Story key={item.id} item={item} rank={index + 1} onOpenItem={onOpenItem} onSaveItem={onSaveItem} />)}</section>
            <section><header><span>PERSONAL PRIORITY</span><h2>个人必看</h2></header>{(lanes.personal || []).map((item, index) => <Story key={item.id} item={item} rank={index + 1} onOpenItem={onOpenItem} onSaveItem={onSaveItem} />)}</section>
          </div>

          <section className="newspaper-domain-band">
            <header><span>SECTIONS</span><h2>领域版面</h2></header>
            <div>{domains.filter(domain => domain.items.length).map(domain => <section key={domain.category}><h3>{domain.category || '综合'}</h3>{domain.items.slice(0, 3).map(item => <button type="button" key={item.id} onClick={() => onOpenItem(item)}>{item.title}</button>)}</section>)}</div>
          </section>

          <div className="newspaper-judgement-band">
            <section><h2>机会</h2>{(briefing.opportunities || []).map((entry, index) => <p key={entry.itemId || index}>{typeof entry === 'string' ? entry : entry.text}</p>)}</section>
            <section><h2>风险与待核实</h2>{(briefing.risks || []).length ? briefing.risks.map((entry, index) => <p key={entry.itemId || index}>{typeof entry === 'string' ? entry : entry.text}</p>) : <p>当前入选资讯未触发显著质量风险。</p>}</section>
          </div>

          <section className="newspaper-sources"><h2>今日信源</h2><ol>{sources.map(item => <li key={item.source}><span>{item.source}</span><a href={item.url} target="_blank" rel="noreferrer">{item.title}</a></li>)}</ol></section>
        </>
      )}
    </div>
  );
}
