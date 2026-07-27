import React, { useState, useEffect } from 'react';
import { ICONS } from '../../constants/index.jsx';

const EMPTY_RESEARCH_NOTE = { thesis: '', counterEvidence: '', invalidation: '', horizon: '20d', status: 'watching' };

function ResearchJournal({ code, name, realtime, diagnosis }) {
  const [draft, setDraft] = useState(EMPTY_RESEARCH_NOTE);
  const [savedAt, setSavedAt] = useState(null);
  const [history, setHistory] = useState([]);
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    try {
      const store = JSON.parse(localStorage.getItem('stockResearchJournalV1') || '{}');
      const saved = store[code];
      const current = saved?.current || saved || null;
      const savedHistory = Array.isArray(saved?.history) ? saved.history : (current?.updatedAt ? [current] : []);
      setDraft(current ? { ...EMPTY_RESEARCH_NOTE, ...current } : EMPTY_RESEARCH_NOTE);
      setSavedAt(current?.updatedAt || null);
      setHistory(savedHistory);
      setSaveStatus('');
    } catch {
      setDraft(EMPTY_RESEARCH_NOTE);
      setSavedAt(null);
      setHistory([]);
    }
  }, [code]);

  const update = (field, value) => setDraft(current => ({ ...current, [field]: value }));
  const importAnalysis = () => setDraft(current => ({
    ...current,
    thesis: diagnosis?.bullCase?.join('\n') || current.thesis,
    counterEvidence: diagnosis?.bearCase?.join('\n') || current.counterEvidence,
    invalidation: diagnosis?.invalidation?.join('\n') || current.invalidation,
  }));
  const save = () => {
    const updatedAt = new Date().toISOString();
    const record = {
      ...draft,
      code,
      name,
      updatedAt,
      snapshot: {
        price: realtime?.price ?? null,
        rating: diagnosis?.rating || null,
        risk: diagnosis?.risk || null,
        excessReturn20: diagnosis?.metrics?.excessReturn20 ?? null,
      },
    };
    try {
      const store = JSON.parse(localStorage.getItem('stockResearchJournalV1') || '{}');
      const previous = store[code];
      const previousHistory = Array.isArray(previous?.history)
        ? previous.history
        : (previous?.updatedAt ? [previous] : []);
      const nextHistory = [record, ...previousHistory.filter(item => item.updatedAt !== updatedAt)].slice(0, 20);
      localStorage.setItem('stockResearchJournalV1', JSON.stringify({ ...store, [code]: { current: record, history: nextHistory } }));
      setDraft(record);
      setSavedAt(updatedAt);
      setHistory(nextHistory);
      setSaveStatus('已保存新快照');
      window.setTimeout(() => setSaveStatus(''), 2400);
    } catch {
      setSaveStatus('保存失败，请检查浏览器存储权限');
    }
  };
  const clear = () => {
    if (!window.confirm(`确认删除 ${name} 的全部研究快照？`)) return;
    try {
      const store = JSON.parse(localStorage.getItem('stockResearchJournalV1') || '{}');
      delete store[code];
      localStorage.setItem('stockResearchJournalV1', JSON.stringify(store));
    } catch { /* local storage unavailable */ }
    setDraft(EMPTY_RESEARCH_NOTE);
    setSavedAt(null);
    setHistory([]);
    setSaveStatus('');
  };
  const restore = record => {
    setDraft({ ...EMPTY_RESEARCH_NOTE, ...record });
    setSaveStatus('已载入历史快照，修改后请另存新快照');
  };

  return (
    <section className="stock3-panel stock-research-journal">
      <div className="stock-research-head">
        <div>
          <span>研究假设账本</span>
          <strong>{name} · {code}</strong>
        </div>
        <div className="stock-research-actions">
          <button type="button" onClick={importAnalysis} disabled={!diagnosis} title="引用当前分析">{ICONS.sparkle}<span>引用分析</span></button>
          <button type="button" onClick={clear} disabled={history.length === 0} title="删除全部研究快照">{ICONS.trash}</button>
        </div>
      </div>
      <div className="stock-research-meta">
        <label>观察周期<select value={draft.horizon} onChange={event => update('horizon', event.target.value)}><option value="5d">5 个交易日</option><option value="20d">20 个交易日</option><option value="60d">60 个交易日</option><option value="event">事件验证</option></select></label>
        <label>研究状态<select value={draft.status} onChange={event => update('status', event.target.value)}><option value="watching">观察中</option><option value="confirmed">已确认</option><option value="conflicted">证据冲突</option><option value="invalidated">已失效</option></select></label>
        <span>{savedAt ? `更新于 ${new Date(savedAt).toLocaleString('zh-CN')}` : '尚未保存'}</span>
      </div>
      <div className="stock-research-fields">
        <label><span>核心假设</span><textarea value={draft.thesis} onChange={event => update('thesis', event.target.value)} placeholder="哪些事实必须成立，当前判断才有效？" /></label>
        <label><span>反向证据</span><textarea value={draft.counterEvidence} onChange={event => update('counterEvidence', event.target.value)} placeholder="什么证据正在反驳当前判断？" /></label>
        <label><span>失效条件</span><textarea value={draft.invalidation} onChange={event => update('invalidation', event.target.value)} placeholder="出现什么价格、数据或事件后必须重估？" /></label>
      </div>
      <div className="stock-research-foot">
        <span className={saveStatus.includes('失败') ? 'error' : ''}>{saveStatus || '每次保存都会冻结价格与分析背景，生成独立复盘快照。'}</span>
        <button type="button" className="stock-research-save" onClick={save}>保存新快照</button>
      </div>
      <div className="stock-research-history">
        <div className="stock-research-history-head"><strong>复盘历史</strong><span>{history.length} 条，最多保留 20 条</span></div>
        {history.length === 0 ? <p>暂无快照。先写下可验证的假设、反向证据和失效条件。</p> : history.map(record => (
          <button type="button" key={record.updatedAt} onClick={() => restore(record)}>
            <span>{new Date(record.updatedAt).toLocaleString('zh-CN')}</span>
            <strong>{record.snapshot?.price == null ? '--' : `¥${record.snapshot.price}`} · {record.snapshot?.rating || '未分析'}</strong>
            <em>{({ watching: '观察中', confirmed: '已确认', conflicted: '证据冲突', invalidated: '已失效' })[record.status] || record.status}</em>
          </button>
        ))}
      </div>
    </section>
  );
}

const RESEARCH_CHECKLIST_ITEMS = [
  { id: 'business', group: '业务', label: '能用三句话解释商业模式、竞争优势与主要客户' },
  { id: 'financials', group: '财务', label: '已核对收入、利润、现金流及异常会计项目' },
  { id: 'balance', group: '财务', label: '已检查负债、商誉、质押、担保与偿债压力' },
  { id: 'valuation', group: '估值', label: '已选择合理可比公司和至少两种估值口径' },
  { id: 'catalyst', group: '催化', label: '催化剂有时间窗口、证据来源和可验证结果' },
  { id: 'counter', group: '反证', label: '主动寻找最强反方观点，而非只收集支持材料' },
  { id: 'governance', group: '治理', label: '已检查管理层诚信、关联交易与股东减持风险' },
  { id: 'liquidity', group: '执行', label: '仓位、流动性、退出条件与最坏损失均可承受' },
];

function ResearchChecklist({ code, name }) {
  const [record, setRecord] = useState({ statuses: {}, note: '', updatedAt: null });
  const [saveStatus, setSaveStatus] = useState('');
  useEffect(() => {
    try {
      const store = JSON.parse(localStorage.getItem('stockResearchChecklistV1') || '{}');
      setRecord({ statuses: {}, note: '', updatedAt: null, ...(store[code] || {}) });
    } catch { setRecord({ statuses: {}, note: '', updatedAt: null }); }
    setSaveStatus('');
  }, [code]);
  const setItemStatus = (id, status) => setRecord(current => ({ ...current, statuses: { ...current.statuses, [id]: status } }));
  const verified = RESEARCH_CHECKLIST_ITEMS.filter(item => record.statuses[item.id] && record.statuses[item.id] !== 'unverified').length;
  const failed = RESEARCH_CHECKLIST_ITEMS.filter(item => record.statuses[item.id] === 'failed').length;
  const save = () => {
    try {
      const store = JSON.parse(localStorage.getItem('stockResearchChecklistV1') || '{}');
      const next = { ...record, code, name, updatedAt: new Date().toISOString() };
      localStorage.setItem('stockResearchChecklistV1', JSON.stringify({ ...store, [code]: next }));
      setRecord(next);
      setSaveStatus('已保存');
      window.setTimeout(() => setSaveStatus(''), 2000);
    } catch { setSaveStatus('保存失败'); }
  };
  return (
    <section className="stock3-panel stock-research-checklist">
      <div className="stock-research-head">
        <div><span>研究清单</span><strong>{name} · 已验证 {verified}/{RESEARCH_CHECKLIST_ITEMS.length}</strong></div>
        <span className={`stock-checklist-risk ${failed > 0 ? 'failed' : ''}`}>{failed > 0 ? `${failed} 项不通过` : '尚未发现否决项'}</span>
      </div>
      <div className="stock-checklist-notice">平台不会自动把缺失数据判为通过。财务、估值、公告和治理信息需要从原始资料核验。</div>
      <div className="stock-checklist-list">
        {RESEARCH_CHECKLIST_ITEMS.map(item => (
          <div key={item.id} className={`stock-checklist-row ${record.statuses[item.id] || 'unverified'}`}>
            <span>{item.group}</span><strong>{item.label}</strong>
            <select value={record.statuses[item.id] || 'unverified'} onChange={event => setItemStatus(item.id, event.target.value)}>
              <option value="unverified">未验证</option><option value="passed">通过</option><option value="watch">需跟踪</option><option value="failed">不通过</option>
            </select>
          </div>
        ))}
      </div>
      <label className="stock-checklist-note">证据来源与待办<textarea value={record.note} onChange={event => setRecord(current => ({ ...current, note: event.target.value }))} placeholder="记录财报页码、公告链接、访谈结论或仍需核实的问题" /></label>
      <div className="stock-research-foot"><span>{saveStatus || (record.updatedAt ? `更新于 ${new Date(record.updatedAt).toLocaleString('zh-CN')}` : '尚未保存')}</span><button type="button" className="stock-research-save" onClick={save}>保存清单</button></div>
    </section>
  );
}

function BriefingContent({ content }) {
  return (
    <div className="stock-briefing-text">
      {(content || '').split('\n').map((line, index) => {
        const value = line.trim();
        if (!value) return <span className="stock-briefing-space" key={index} />;
        if (value.startsWith('## ')) return <h4 key={index}>{value.slice(3)}</h4>;
        if (/^[-*•]\s/.test(value)) return <p className="bullet" key={index}>{value.replace(/^[-*•]\s*/, '')}</p>;
        return <p key={index}>{value}</p>;
      })}
    </div>
  );
}

export { ResearchJournal, ResearchChecklist, BriefingContent };
