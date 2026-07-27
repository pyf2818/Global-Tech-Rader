import React, { useMemo, useState, useEffect } from 'react';
import { buildCandidateRadar, buildDecisionCard, buildMarketEvidence } from '../../domain/stock/intelligenceRadar.js';
import { normalizeInvestorPolicy } from '../../domain/stock/investorPolicy.js';

function IntelligenceRadar({ dashboard, sectors, selectedCode, onSelect, onInspect, policy }) {
  const candidates = useMemo(() => buildCandidateRadar(dashboard?.stocks || [], { limit: 5, policy }), [dashboard?.stocks, policy]);
  const evidence = useMemo(() => buildMarketEvidence({ indices: dashboard?.indices || [], sectors, coverage: dashboard?.coverage }), [dashboard?.coverage, dashboard?.indices, sectors]);
  return (
    <section className="stock-intelligence-radar" aria-label="智能机会雷达">
      <div className="stock-intelligence-head">
        <div>
          <strong>智能机会雷达</strong>
          <span>先排序，再研究；不直接等同于买入信号</span>
        </div>
        <div className="stock-intelligence-market"><b>{evidence.indexTone}</b><span>{evidence.indexBreadth}</span></div>
      </div>
      <div className="stock-intelligence-grid">
        {candidates.length === 0 && <span className="stock-intelligence-empty">等待行情样本</span>}
        {candidates.map(item => (
          <article key={item.code} className={`stock-intelligence-card ${item.code === selectedCode ? 'active' : ''}`}>
            <button type="button" className="stock-intelligence-pick" onClick={() => onSelect(item.code, item.name)}>
              <span className="stock-intelligence-card-top"><strong>{item.name}</strong><em>{item.code}</em><b>{item.score}</b></span>
              <span className={`stock-intelligence-state ${item.state === '值得研究' ? 'positive' : ['风险偏高', '超出策略范围'].includes(item.state) ? 'negative' : 'caution'}`}>{item.state} · {item.confidence}置信</span>
              <span className="stock-intelligence-reason">{item.reasons[0]}</span>
              <span className="stock-intelligence-risk">{item.risks[0]}</span>
            </button>
            <button type="button" className="stock-intelligence-inspect" onClick={() => onInspect(item.code, item.name)}>查看决策卡</button>
          </article>
        ))}
      </div>
      <div className="stock-intelligence-foot"><span>覆盖：{evidence.coverageLabel} · {({ conservative: '稳健', balanced: '均衡', aggressive: '进取' })[policy?.riskTolerance] || '均衡'}策略</span><span>{evidence.limitation}</span></div>
    </section>
  );
}

function InvestorPolicyTool({ policy, onSave }) {
  const [draft, setDraft] = useState(policy);
  const [saveStatus, setSaveStatus] = useState('');
  useEffect(() => setDraft(policy), [policy]);
  const update = (key, value) => setDraft(current => ({ ...current, [key]: value }));
  const save = () => {
    const normalized = normalizeInvestorPolicy(draft);
    onSave(normalized);
    setDraft(normalized);
    setSaveStatus('已保存并应用到智能雷达');
    window.setTimeout(() => setSaveStatus(''), 2200);
  };
  const riskBudget = Number(draft.capital || 0) * Number(draft.riskPerTrade || 0) / 100;
  return (
    <section className="stock-policy-tool">
      <div className="stock-research-head"><div><span>投资约束</span><strong>个人策略档案</strong></div><span className="stock-tool-note">所有候选先经过这些硬约束</span></div>
      <div className="stock-policy-grid">
        <label>账户规模<input type="number" min="1000" value={draft.capital} onChange={event => update('capital', event.target.value)} /></label>
        <label>单笔最大风险 %<input type="number" min="0.1" max="10" step="0.1" value={draft.riskPerTrade} onChange={event => update('riskPerTrade', event.target.value)} /></label>
        <label>单只最大仓位 %<input type="number" min="1" max="100" value={draft.maxPosition} onChange={event => update('maxPosition', event.target.value)} /></label>
        <label>研究周期<select value={draft.horizon} onChange={event => update('horizon', event.target.value)}><option value="short">短线 1-5 日</option><option value="swing">波段 2-8 周</option><option value="long">中长线 3 月以上</option></select></label>
        <label>风险偏好<select value={draft.riskTolerance} onChange={event => update('riskTolerance', event.target.value)}><option value="conservative">稳健</option><option value="balanced">均衡</option><option value="aggressive">进取</option></select></label>
        <label className="stock-policy-toggle"><input type="checkbox" checked={draft.allowGrowthBoards !== false} onChange={event => update('allowGrowthBoards', event.target.checked)} /><span>允许创业板和科创板</span></label>
      </div>
      <div className="stock-policy-summary"><div><span>每笔风险上限</span><strong>¥{Number.isFinite(riskBudget) ? riskBudget.toLocaleString('zh-CN', { maximumFractionDigits: 0 }) : '--'}</strong></div><div><span>候选处理</span><strong>不匹配标的降级或排除</strong></div><div><span>用途</span><strong>雷达排序、仓位与提醒</strong></div></div>
      <div className="stock-research-foot"><span>{saveStatus || '策略档案只约束风险，不替代个股证据研究。'}</span><button type="button" className="stock-research-save" onClick={save}>保存并应用</button></div>
    </section>
  );
}

function DecisionEvidenceTool({ stock, realtime, diagnosis, diagnosing, onAnalyze, onOpenTool }) {
  const card = useMemo(() => buildDecisionCard({ stock, realtime, diagnosis }), [diagnosis, realtime, stock]);
  return (
    <section className="stock-decision-tool">
      <div className="stock-decision-summary">
        <div><span>当前结论</span><strong>{card.headline}</strong></div>
        <button type="button" onClick={onAnalyze} disabled={diagnosing || !realtime}>{diagnosing ? '分析中…' : diagnosis ? '刷新证据' : '生成证据'}</button>
      </div>
      <div className="stock-decision-grid">
        <section><strong>已知事实</strong>{card.facts.map(item => <p key={item}>{item}</p>)}</section>
        <section className="support"><strong>支持证据</strong>{card.support.map(item => <p key={item}>{item}</p>)}</section>
        <section className="counter"><strong>反方审查</strong>{card.counter.map(item => <p key={item}>{item}</p>)}</section>
        <section className="invalid"><strong>失效条件</strong>{card.invalidation.map(item => <p key={item}>{item}</p>)}</section>
      </div>
      <div className="stock-decision-missing"><strong>证据缺口</strong>{card.missing.map(item => <span key={item}>{item}</span>)}</div>
      <div className="stock-decision-next"><span>{card.nextAction}</span><div><button type="button" onClick={() => onOpenTool('scenario')}>情景推演</button><button type="button" onClick={() => onOpenTool('risk')}>仓位预算</button></div></div>
    </section>
  );
}

export { IntelligenceRadar, InvestorPolicyTool, DecisionEvidenceTool };
