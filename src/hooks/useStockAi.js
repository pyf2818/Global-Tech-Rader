/**
 * useStockAi — 股市智能模块（联动 LLM）
 * 提供：AI 个股诊断 / AI 市场早报 / 自选股智能监控
 * 全部调用 /api/ai-generate，无 LLM 配置时返回引导提示。
 * 合规：仅基于数据做技术面/资金面客观解读，不给买卖建议，标注「仅供参考」。
 */
import { useState, useCallback } from 'react';
import { analyzeStock } from '../domain/stock/algorithmAnalysis.js';

const COMPLIANCE_SUFFIX = '\n\n（以上内容由 AI 基于公开行情数据生成，仅供参考，不构成投资建议）';
const BRIEFING_HISTORY_KEY = 'stockBriefingHistoryV1';
const BRIEFING_HISTORY_LIMIT = 30;

function loadBriefingHistory() {
  try {
    const records = JSON.parse(localStorage.getItem(BRIEFING_HISTORY_KEY) || '[]');
    return Array.isArray(records) ? records : [];
  } catch {
    return [];
  }
}

function persistBriefingHistory(records) {
  try { localStorage.setItem(BRIEFING_HISTORY_KEY, JSON.stringify(records)); } catch { /* storage unavailable */ }
}

// 检查 LLM 是否可用
function useLlmReady(llmConfig) {
  return Boolean(llmConfig?.baseUrl && llmConfig?.apiKey && llmConfig?.selectedModel);
}

// 统一调用 /api/ai-generate
async function callLlm(llmConfig, systemPrompt, userPrompt) {
  const res = await fetch('/api/ai-generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      baseUrl: llmConfig.baseUrl,
      apiKey: llmConfig.apiKey,
      model: llmConfig.selectedModel,
      action: 'chat',
      messages: [{ role: 'user', content: userPrompt }],
      systemPrompt,
    }),
  });
  const data = await res.json();
  if (!data.content) throw new Error(data.message || 'AI 返回为空');
  return data.content;
}

export async function runStockAnalysis({ input, llmConfig, callLlm: invokeLlm = callLlm }) {
  const algorithm = analyzeStock(input);
  const algorithmResult = {
    ...algorithm,
    content: `${algorithm.summary}\n\n${algorithm.disclaimer}`,
  };
  const llmAvailable = Boolean(llmConfig?.baseUrl && llmConfig?.apiKey && llmConfig?.selectedModel);
  if (!llmAvailable || algorithm.status !== 'ready') return algorithmResult;

  const metrics = algorithm.metrics;
  const systemPrompt = '你是专业的股市分析师。只能基于给定的确定性指标增强表述，不得改变算法评级或虚构数据。区分事实与推断，禁止给出买卖建议，180字内。';
  const userPrompt = `股票：${algorithm.stock.name}（${algorithm.stock.code}）
算法评级：${algorithm.rating}；风险：${algorithm.risk}
现价：${metrics.price}；MA5/10/20：${metrics.ma5}/${metrics.ma10}/${metrics.ma20}
5日动量：${metrics.momentum5}%；年化波动率：${metrics.volatility}%
支撑/压力：${metrics.support}/${metrics.resistance}；量能：${metrics.volumeTrend}`;
  try {
    const aiNarrative = await invokeLlm(llmConfig, systemPrompt, userPrompt);
    return {
      ...algorithmResult,
      mode: 'ai',
      aiNarrative,
      algorithm,
      content: `${aiNarrative}${COMPLIANCE_SUFFIX}`,
    };
  } catch (error) {
    return {
      ...algorithmResult,
      aiError: error?.message || 'AI 增强失败，已保留算法分析',
    };
  }
}

export function useStockAi(llmConfig) {
  const llmReady = useLlmReady(llmConfig);
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnosis, setDiagnosis] = useState(null);
  const [diagnoseError, setDiagnoseError] = useState('');

  const [briefingLoading, setBriefingLoading] = useState(false);
  const [briefing, setBriefing] = useState(null);
  const [briefingError, setBriefingError] = useState('');
  const [briefingHistory, setBriefingHistory] = useState(loadBriefingHistory);

  const [alertChecking, setAlertChecking] = useState(false);
  const [alertResults, setAlertResults] = useState([]);

  // ===== 模块 A：确定性算法分析 + 可选 AI 增强 =====
  const diagnoseStock = useCallback(async ({ stock, kline, benchmarkKline, benchmark, realtime, sectors }) => {
    setDiagnosing(true);
    setDiagnoseError('');
    try {
      const result = await runStockAnalysis({
        input: { stock, realtime, klines: kline?.klines || [], benchmarkKlines: benchmarkKline?.klines || [], benchmark },
        llmConfig,
      });
      setDiagnosis({ ...result, at: Date.now() });
    } catch (e) {
      setDiagnoseError(e.message || '行情分析失败');
    }
    setDiagnosing(false);
  }, [llmConfig]);

  // ===== 模块 B：AI 市场早报 =====
  // 输入：大盘指数 + 活跃样本 + 板块
  const generateMorningBrief = useCallback(async ({ indices, stocks, sectors, coverage }) => {
    if (!llmReady) {
      setBriefingError('请先配置大模型');
      return;
    }
    setBriefingLoading(true);
    setBriefingError('');
    try {
      const stockRows = stocks || [];
      const sectorRows = sectors || [];
      const idxText = (indices || []).map(i => `${i.name}：${i.price}，涨跌 ${i.changePct >= 0 ? '+' : ''}${i.changePct}%`).join('\n') || '无数据';
      const stockText = stockRows.slice(0, 20).map(s => `${s.name}(${s.code})：现价 ${s.price}，涨跌 ${s.changePct >= 0 ? '+' : ''}${s.changePct}%，成交额 ${s.amount || '未提供'}`).join('\n') || '无数据';
      const sectorText = sectorRows.slice(0, 12).map(s => `${s.name}：${s.changePct >= 0 ? '+' : ''}${s.changePct}%`).join('\n') || '无数据';
      const up = stockRows.filter(item => item.changePct > 0).length;
      const down = stockRows.filter(item => item.changePct < 0).length;
      const generatedAt = new Date().toISOString();

      const systemPrompt = `你是审慎、专业的中国股票市场研究员。只能使用用户提供的行情样本，生成 700-1200 字中文结构化早报。
必须按以下标题输出：
## 一、执行摘要
## 二、指数与样本广度
## 三、板块主线与轮动
## 四、关键个股观察
## 五、多方情景与反方情景
## 六、风险清单
## 七、今日观察清单
## 八、数据边界
规则：明确区分“数据事实”和“分析推断”；解释驱动因素时只能写待验证假设，不能伪造新闻、公告、财务、资金流或宏观数据；同时给出支持证据、反向证据和失效条件；不提供确定性涨跌预测、目标价或买卖指令。内容具体、可复核，避免空泛套话。`;
      const userPrompt = `生成时间：${generatedAt}
数据口径：${coverage?.label || '行情样本'}，共 ${stockRows.length} 只；上涨 ${up}、下跌 ${down}。这不是全市场涨跌家数。
数据频率：轮询行情，不是交易所逐笔数据。

【主要指数】
${idxText}

【活跃股票样本】
${stockText}

【板块涨幅样本】
${sectorText}

请基于以上有限数据完成早报，并在“数据边界”中明确缺少全市场广度、财务、公告、新闻、资金流、估值与持仓数据。`;

      const content = await callLlm(llmConfig, systemPrompt, userPrompt);
      const record = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        content: content + COMPLIANCE_SUFFIX,
        at: Date.now(),
        meta: { indexCount: indices?.length || 0, stockCount: stockRows.length, sectorCount: sectorRows.length, coverage: coverage?.label || '行情样本' },
      };
      setBriefing(record);
      setBriefingHistory(current => {
        const next = [record, ...current].slice(0, BRIEFING_HISTORY_LIMIT);
        persistBriefingHistory(next);
        return next;
      });
    } catch (e) {
      setBriefingError(e.message || '早报生成失败');
    }
    setBriefingLoading(false);
  }, [llmConfig, llmReady]);

  // ===== 模块 C：自选股智能监控 =====
  // 对自选股逐一检查条件，命中时用 LLM 生成提醒文案
  const checkAlerts = useCallback(async (watchlist, conditions) => {
    if (!llmReady) {
      return { needConfig: true };
    }
    if (!watchlist || watchlist.length === 0) return { hits: [] };
    setAlertChecking(true);
    try {
      // 拉取每只自选股的实时数据
      const results = await Promise.all(watchlist.map(async (stock) => {
        try {
          const res = await fetch(`/api/stock/realtime?code=${stock.code}`);
          const r = await res.json();
          return { stock, realtime: r };
        } catch { return { stock, realtime: null }; }
      }));

      // 本地规则初筛（命中条件的才发给 LLM）
      const hitItems = [];
      for (const { stock, realtime } of results) {
        if (!realtime) continue;
        const hit = evaluateCondition(realtime, conditions[stock.code]);
        if (hit) hitItems.push({ stock, realtime, condition: conditions[stock.code], reason: hit });
      }

      if (hitItems.length === 0) {
        setAlertResults([]);
        return { hits: [] };
      }

      // LLM 批量生成提醒文案
      const systemPrompt = '你是股市监控助手。基于命中的监控条件，用中文为每只股票生成一句话提醒。客观陈述触发事实，不给买卖建议。每只 30 字内。';
      const itemsText = hitItems.map((h, i) => `${i + 1}. ${h.stock.name}(${h.stock.code}) 现价${h.realtime.price} 涨跌${h.realtime.changePct}% 触发：${h.reason}`).join('\n');
      const content = await callLlm(llmConfig, systemPrompt, `以下自选股命中监控条件：\n${itemsText}\n\n请逐只生成提醒。`);

      setAlertResults(hitItems.map((h, i) => ({ ...h, aiText: extractLine(content, i) || h.reason })));
      setAlertChecking(false);
      return { hits: hitItems };
    } catch (e) {
      setAlertChecking(false);
      return { error: e.message || '监控检查失败' };
    }
  }, [llmConfig, llmReady]);

  const clearDiagnosis = useCallback(() => { setDiagnosis(null); setDiagnoseError(''); }, []);
  const clearBriefing = useCallback(() => { setBriefing(null); setBriefingError(''); }, []);
  const openBriefing = useCallback(record => { setBriefing(record); setBriefingError(''); }, []);
  const deleteBriefing = useCallback(id => {
    setBriefingHistory(current => {
      const next = current.filter(record => record.id !== id);
      persistBriefingHistory(next);
      return next;
    });
    setBriefing(current => current?.id === id ? null : current);
  }, []);
  const clearBriefingHistory = useCallback(() => {
    persistBriefingHistory([]);
    setBriefingHistory([]);
    setBriefing(null);
  }, []);

  return {
    llmReady,
    // 诊断
    diagnosing, diagnosis, diagnoseError, diagnoseStock, clearDiagnosis,
    // 早报
    briefingLoading, briefing, briefingError, briefingHistory,
    generateMorningBrief, clearBriefing, openBriefing, deleteBriefing, clearBriefingHistory,
    // 监控
    alertChecking, alertResults, checkAlerts,
  };
}

// 监控条件本地评估 —— 返回命中原因字符串，未命中返回 null
function evaluateCondition(realtime, condition) {
  if (!condition || !realtime) return null;
  const { changePct = 0, price = 0, prevClose = 0 } = realtime;
  switch (condition) {
    case 'up_over_3': return changePct > 3 ? `涨幅 ${changePct.toFixed(2)}% 超过 3%` : null;
    case 'down_over_3': return changePct < -3 ? `跌幅 ${changePct.toFixed(2)}% 超过 3%` : null;
    case 'up_over_5': return changePct > 5 ? `涨幅 ${changePct.toFixed(2)}% 超过 5%` : null;
    case 'down_over_5': return changePct < -5 ? `跌幅 ${changePct.toFixed(2)}% 超过 5%` : null;
    case 'flat': return Math.abs(changePct) < 0.5 ? `横盘整理，涨跌 ${changePct.toFixed(2)}%` : null;
    default: return null;
  }
}

// 从 LLM 多行返回里提取第 i 条
function extractLine(text, index) {
  if (!text) return '';
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  return lines[index] || '';
}

// 监控条件选项（供 UI 渲染）
export const ALERT_CONDITIONS = [
  { id: 'up_over_3', label: '涨幅超 3%' },
  { id: 'down_over_3', label: '跌幅超 3%' },
  { id: 'up_over_5', label: '涨幅超 5%' },
  { id: 'down_over_5', label: '跌幅超 5%' },
  { id: 'flat', label: '横盘整理' },
];
