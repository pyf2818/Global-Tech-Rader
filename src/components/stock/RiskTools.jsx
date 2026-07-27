import React, { useState, useEffect } from 'react';
import { calculatePositionSize, calculateScenarioMetrics } from '../../domain/stock/positionSizing.js';

function PositionRiskTool({ code, realtime, diagnosis }) {
  const [capital, setCapital] = useState(() => localStorage.getItem('stockRiskCapital') || '100000');
  const [riskPercent, setRiskPercent] = useState(() => localStorage.getItem('stockRiskPercent') || '1');
  const [stop, setStop] = useState(() => diagnosis?.metrics?.support?.toString() || '');
  const entry = Number(realtime?.price) || 0;
  useEffect(() => { localStorage.setItem('stockRiskCapital', capital); }, [capital]);
  useEffect(() => { localStorage.setItem('stockRiskPercent', riskPercent); }, [riskPercent]);
  useEffect(() => {
    if (diagnosis?.metrics?.support) setStop(String(diagnosis.metrics.support));
  }, [diagnosis?.metrics?.support]);

  const result = calculatePositionSize({ capital, riskPercent, entry, stop });
  const isIndex = /^(sh000001|sz399001|sz399006)$/.test(code || '');
  const money = value => Number.isFinite(value) ? value.toLocaleString('zh-CN', { maximumFractionDigits: 2 }) : '--';
  return (
    <section className="stock3-panel stock-risk-tool">
      <div className="stock-research-head">
        <div><span>风险预算</span><strong>仓位测算</strong></div>
        <span className="stock-tool-note">不含手续费、滑点和涨跌停约束</span>
      </div>
      <div className={`stock-risk-inputs ${isIndex ? 'disabled' : ''}`}>
        <label>账户规模<input type="number" min="0" value={capital} onChange={event => setCapital(event.target.value)} /></label>
        <label>单次风险 %<input type="number" min="0.1" max="100" step="0.1" value={riskPercent} onChange={event => setRiskPercent(event.target.value)} /></label>
        <label>参考价<input type="number" value={entry || ''} readOnly /></label>
        <label>止损价<input type="number" min="0" value={stop} onChange={event => setStop(event.target.value)} placeholder="低于参考价" disabled={isIndex} /></label>
      </div>
      {isIndex ? (
        <div className="stock-risk-warning">指数本身不能按 A 股 100 股一手直接交易。请从左侧选择一只股票后测算仓位；指数仅用于观察市场方向。</div>
      ) : result.status === 'invalid' || result.status === 'below_lot' ? (
        <div className="stock-risk-warning">{result.reason}</div>
      ) : (
        <div className="stock-risk-results">
          <div><span>风险预算</span><strong>{money(result.riskBudget)}</strong></div>
          <div><span>理论股数</span><strong>{result.shares.toLocaleString('zh-CN')} 股</strong></div>
          <div><span>资金占用</span><strong>{money(result.capitalUsed)}</strong></div>
          <div><span>最大估算损失</span><strong>{money(result.estimatedLoss)}</strong></div>
          <div><span>资金占比</span><strong>{result.positionPercent.toFixed(2)}%</strong></div>
        </div>
      )}
      <small className="stock-risk-disclaimer">用法：先限定“最多愿意损失的钱”，再输入判断失效时的止损价，系统按每股风险反推不超过预算的 100 股整数仓位。这是风险控制测算，不是买入建议。</small>
    </section>
  );
}

const EMPTY_SCENARIO_PLAN = {
  bearTarget: '', baseTarget: '', bullTarget: '',
  bearProbability: '25', baseProbability: '50', bullProbability: '25',
};

function ScenarioAnalysisTool({ code, name, realtime, diagnosis }) {
  const [plan, setPlan] = useState(EMPTY_SCENARIO_PLAN);
  const [saveStatus, setSaveStatus] = useState('');
  const entry = Number(realtime?.price) || 0;

  useEffect(() => {
    try {
      const store = JSON.parse(localStorage.getItem('stockScenarioPlansV1') || '{}');
      const saved = store[code];
      setPlan(saved ? { ...EMPTY_SCENARIO_PLAN, ...saved } : EMPTY_SCENARIO_PLAN);
    } catch { setPlan(EMPTY_SCENARIO_PLAN); }
    setSaveStatus('');
  }, [code]);

  useEffect(() => {
    if (!entry || plan.bearTarget || plan.baseTarget || plan.bullTarget) return;
    setPlan(current => ({
      ...current,
      bearTarget: String(diagnosis?.metrics?.support || Number((entry * 0.85).toFixed(2))),
      baseTarget: String(entry),
      bullTarget: String(diagnosis?.metrics?.resistance || Number((entry * 1.15).toFixed(2))),
    }));
  }, [entry, diagnosis?.metrics?.support, diagnosis?.metrics?.resistance, plan.bearTarget, plan.baseTarget, plan.bullTarget]);

  const update = (field, value) => setPlan(current => ({ ...current, [field]: value }));
  const probabilities = ['bearProbability', 'baseProbability', 'bullProbability'].map(key => Number(plan[key]) || 0);
  const targets = ['bearTarget', 'baseTarget', 'bullTarget'].map(key => Number(plan[key]) || 0);
  const probabilityTotal = probabilities.reduce((sum, value) => sum + value, 0);
  const metrics = calculateScenarioMetrics({
    referencePrice: entry,
    scenarios: targets.map((target, index) => ({ target, probability: probabilities[index] })),
  });
  const valid = metrics.status === 'ready';
  const save = () => {
    try {
      const store = JSON.parse(localStorage.getItem('stockScenarioPlansV1') || '{}');
      const record = { ...plan, code, name, referencePrice: entry, updatedAt: new Date().toISOString() };
      localStorage.setItem('stockScenarioPlansV1', JSON.stringify({ ...store, [code]: record }));
      setSaveStatus('已保存');
      window.setTimeout(() => setSaveStatus(''), 2000);
    } catch { setSaveStatus('保存失败'); }
  };

  return (
    <section className="stock3-panel stock-scenario-tool">
      <div className="stock-research-head">
        <div><span>情景推演</span><strong>{name} · 参考价 {entry || '--'}</strong></div>
        <span className="stock-tool-note">概率之和必须为 100%</span>
      </div>
      <div className="stock-scenario-grid">
        {[
          ['bear', '悲观情景', 'bearTarget', 'bearProbability'],
          ['base', '基准情景', 'baseTarget', 'baseProbability'],
          ['bull', '乐观情景', 'bullTarget', 'bullProbability'],
        ].map(([tone, label, targetKey, probabilityKey]) => (
          <div className={`stock-scenario-card ${tone}`} key={tone}>
            <strong>{label}</strong>
            <label>目标价格<input type="number" min="0" value={plan[targetKey]} onChange={event => update(targetKey, event.target.value)} /></label>
            <label>主观概率 %<input type="number" min="0" max="100" value={plan[probabilityKey]} onChange={event => update(probabilityKey, event.target.value)} /></label>
          </div>
        ))}
      </div>
      {!valid && <div className="stock-risk-warning">请填写三个有效目标价，并确保概率合计为 100%。当前合计 {probabilityTotal}% 。</div>}
      {valid && (
        <div className="stock-scenario-results">
          <div><span>概率加权价格</span><strong>{metrics.weightedPrice.toFixed(2)}</strong></div>
          <div><span>期望收益率</span><strong className={metrics.expectedReturn >= 0 ? 'up' : 'down'}>{metrics.expectedReturn >= 0 ? '+' : ''}{metrics.expectedReturn.toFixed(2)}%</strong></div>
          <div><span>乐观空间</span><strong>{metrics.upside >= 0 ? '+' : ''}{metrics.upside.toFixed(2)}%</strong></div>
          <div><span>悲观空间</span><strong>{metrics.downside >= 0 ? '+' : ''}{metrics.downside.toFixed(2)}%</strong></div>
          <div><span>盈亏比</span><strong>{metrics.payoffRatio == null ? '--' : `${metrics.payoffRatio.toFixed(2)} : 1`}</strong></div>
        </div>
      )}
      <div className="stock-research-foot"><span>{saveStatus || '目标价和概率必须来自可验证假设，不是模型预测。'}</span><button type="button" className="stock-research-save" onClick={save}>保存情景</button></div>
    </section>
  );
}

export { PositionRiskTool, ScenarioAnalysisTool };
