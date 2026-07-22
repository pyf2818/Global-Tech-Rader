/**
 * TodayNewspaper - 今日速报（报纸形式）
 *
 * - 左侧艺术感竖向时间线：线条节点，可滚动选择历史日期跳转
 * - 中英对照：英文条目点击「中英对照」调用 LLM 翻译，并列显示中文译文
 */
import { useMemo, useState } from 'react';

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatTimelineLabel(dateStr) {
  if (!dateStr) return '';
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateStr === today) return '今天';
  if (dateStr === yesterday) return '昨天';
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function weekdayShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
}

/* 左侧艺术感竖向时间线 */
function NewspaperTimeline({ snapshots, selectedDate, onSelectDate }) {
  const dates = useMemo(() => {
    const set = new Set();
    (snapshots || []).forEach(s => s.date && set.add(s.date));
    if (selectedDate) set.add(selectedDate);
    return [...set].sort((a, b) => String(b).localeCompare(String(a)));
  }, [snapshots, selectedDate]);

  return (
    <aside className="newspaper-timeline">
      <ol className="newspaper-timeline-list custom-scrollbar">
        {dates.length === 0 && <li className="newspaper-timeline-empty">尚无历史日报</li>}
        {dates.map(date => {
          const active = date === selectedDate;
          const snap = (snapshots || []).find(s => s.date === date);
          const count = snap?.stats?.total
            ?? ((snap?.lanes?.public?.length || 0) + (snap?.lanes?.personal?.length || 0));
          return (
            <li key={date} className={`newspaper-timeline-node ${active ? 'active' : ''}`}>
              <button
                type="button"
                onClick={() => onSelectDate?.(date)}
                title={`${formatTimelineLabel(date)} · 周${weekdayShort(date)}${count > 0 ? ` · ${count} 条` : ''}`}
              >
                <span className="newspaper-timeline-diamond" aria-hidden="true">
                  <span className="newspaper-timeline-diamond-glow" />
                  <span className="newspaper-timeline-diamond-core" />
                </span>
                <span className="newspaper-timeline-text">
                  <strong>{formatTimelineLabel(date)}</strong>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}

/* 中英对照切换按钮 */
function BilingualToggle({ item, isEnglish, translation, translating, translationOpen, onRequest, onToggle }) {
  if (!isEnglish) return null;
  const hasTranslation = Boolean(translation?.title);
  const handleClick = () => {
    if (!hasTranslation && !translating) {
      onRequest?.(item);
    }
    onToggle?.(item.id);
  };
  return (
    <button
      type="button"
      className={`newspaper-bilingual-toggle ${translationOpen ? 'active' : ''}`}
      onClick={handleClick}
      disabled={translating}
      title="中英对照"
    >
      {translating ? '翻译中…' : translationOpen ? '收起译文' : '中英对照'}
    </button>
  );
}

function BilingualBody({ item, translation, translationOpen, translating }) {
  if (!translationOpen) return null;
  return (
    <div className="newspaper-bilingual">
      {translating && <p className="newspaper-bilingual-loading">正在生成中文译文…</p>}
      {!translating && translation?.title && (
        <>
          <p className="newspaper-bilingual-zh-title">{translation.title}</p>
          {translation.summary && <p className="newspaper-bilingual-zh-summary">{translation.summary}</p>}
        </>
      )}
      {!translating && !translation?.title && <p className="newspaper-bilingual-empty">译文暂不可用，请稍后重试</p>}
    </div>
  );
}

function Story({ item, rank, onOpenItem, onSaveItem, bilingual }) {
  if (!item) return null;
  const isEnglish = bilingual?.isEnglishText ? bilingual.isEnglishText(item.title) : false;
  const translation = bilingual?.getTranslation?.(item);
  const translating = Boolean(bilingual?.translatingItems?.[item.id]);
  const translationOpen = Boolean(bilingual?.translationOpen?.[item.id]);
  return (
    <article className="newspaper-story">
      <span className="newspaper-story-rank">{String(rank).padStart(2, '0')}</span>
      <div>
        <button type="button" className="newspaper-story-title" onClick={() => onOpenItem(item)}>{item.title}</button>
        <p>{item.summary || item.recommendation || '暂无摘要'}</p>
        <BilingualBody item={item} translation={translation} translationOpen={translationOpen} translating={translating} />
        <footer>
          <span>{item.source || '未知来源'}</span>
          <span>{item.publishedAt ? new Date(item.publishedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
          <span>{Math.round(item.mustReadScore || 0)} 分</span>
          <button type="button" onClick={() => onSaveItem(item)}>沉淀素材</button>
          <BilingualToggle
            item={item}
            isEnglish={isEnglish}
            translation={translation}
            translating={translating}
            translationOpen={translationOpen}
            onRequest={bilingual?.onRequestTranslation}
            onToggle={bilingual?.onToggleTranslation}
          />
        </footer>
      </div>
    </article>
  );
}

export default function TodayNewspaper({
  briefing,
  lanes,
  items = [],
  loading,
  onRefresh,
  onOpenItem,
  onSaveItem,
  onOpenRecommendations,
  snapshots,
  selectedDate,
  onSelectDate,
  translations,
  translationOpen,
  translatingItems,
  onRequestTranslation,
  onToggleTranslation,
  isEnglishText,
}) {
  const allItems = useMemo(
    () => [...(lanes?.public || []), ...(lanes?.personal || [])],
    [lanes?.public, lanes?.personal]
  );
  const lead = briefing?.sections?.lead || allItems[0];
  const domains = briefing?.sections?.domains || [];
  const reportItems = useMemo(() => {
    const seen = new Set();
    return [...allItems, ...(items || [])].filter(item => {
      const key = item?.id || item?.url;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [allItems, items]);
  const sources = [...new Map(reportItems.map(item => [item.source, item])).values()].filter(item => item.source);
  const coveredDomains = [...new Set(reportItems.map(item => item.category).filter(Boolean))];
  const featuredIds = new Set(allItems.map(item => item.id));
  const quickBriefs = reportItems.filter(item => !featuredIds.has(item.id)).slice(0, 12);
  const generatedTime = briefing?.generatedAt
    ? new Date(briefing.generatedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    : '--:--';

  const [bilingualAll, setBilingualAll] = useState(false);
  const englishItems = useMemo(
    () => allItems.filter(item => isEnglishText?.(item.title)),
    [allItems, isEnglishText]
  );
  const englishCount = englishItems.length;

  // 全局中英对照：未翻译的英文条目逐条请求翻译，再统一切换显隐
  const toggleAllBilingual = () => {
    if (!bilingualAll) {
      englishItems.forEach(item => {
        if (!translations?.[item.id]) onRequestTranslation?.(item);
      });
    }
    englishItems.forEach(item => onToggleTranslation?.(item.id));
    setBilingualAll(value => !value);
  };

  const bilingual = {
    translations,
    translationOpen,
    translatingItems,
    onRequestTranslation,
    onToggleTranslation,
    isEnglishText,
    getTranslation: item => translations?.[item.id] || null,
  };

  return (
    <div className="today-newspaper with-timeline">
      <NewspaperTimeline
        snapshots={snapshots}
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
      />

      <div className="newspaper-body">
        <header className="newspaper-masthead">
          <div><span>THE DAILY INTELLIGENCE</span><h1>今日速报</h1></div>
          <div className="newspaper-edition"><time>{briefing?.date}</time><span>{briefing?.mode === 'ai' ? 'AI 增强版' : '算法基础版'}</span></div>
          <div className="newspaper-actions">
            {englishCount > 0 && (
              <button type="button" className={`newspaper-bilingual-all ${bilingualAll ? 'active' : ''}`} onClick={toggleAllBilingual}>
                {bilingualAll ? '收起译文' : `中英对照 ${englishCount}`}
              </button>
            )}
            <button type="button" onClick={onOpenRecommendations}>精准推荐</button>
            <button type="button" onClick={onRefresh}>{loading ? '刷新中' : '刷新'}</button>
          </div>
        </header>

        <dl className="newspaper-digest-strip" aria-label="今日速报概览">
          <div><dt>入选资讯</dt><dd>{reportItems.length}</dd></div>
          <div><dt>重点报道</dt><dd>{allItems.length}</dd></div>
          <div><dt>覆盖领域</dt><dd>{coveredDomains.length}</dd></div>
          <div><dt>独立信源</dt><dd>{sources.length}</dd></div>
          <div><dt>编发时间</dt><dd>{generatedTime}</dd></div>
        </dl>

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
              <section><header><span>PUBLIC SIGNALS</span><h2>公共热点</h2></header>{(lanes.public || []).map((item, index) => <Story key={item.id} item={item} rank={index + 1} onOpenItem={onOpenItem} onSaveItem={onSaveItem} bilingual={bilingual} />)}</section>
              <section><header><span>PERSONAL PRIORITY</span><h2>个人必看</h2></header>{(lanes.personal || []).map((item, index) => <Story key={item.id} item={item} rank={index + 1} onOpenItem={onOpenItem} onSaveItem={onSaveItem} bilingual={bilingual} />)}</section>
            </div>

            {quickBriefs.length > 0 && (
              <section className="newspaper-briefs">
                <header><span>NEWS IN BRIEF</span><h2>当日快讯</h2><small>重点版面之外的补充信号</small></header>
                <ol>
                  {quickBriefs.map((item, index) => (
                    <li key={item.id || item.url}>
                      <span>{String(index + 1).padStart(2, '0')}</span>
                      <button type="button" onClick={() => onOpenItem(item)}>{item.title}</button>
                      <small>{item.category || '综合'} · {item.source || '未知来源'} · {item.publishedAt ? new Date(item.publishedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</small>
                    </li>
                  ))}
                </ol>
              </section>
            )}

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
    </div>
  );
}
