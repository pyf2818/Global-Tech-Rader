import { useCallback } from 'react';
import { showToast } from '../utils/toast.js';
import { useGithubStore } from '../store/index.js';

/**
 * GitHub 项目 AI 情报：实时调 LLM 生成应用场景/适合谁/落地难度/价值判断。
 *
 * 从 App.jsx 提取，保持原行为不变。
 * 状态沿用 useGithubStore（持久化 githubInsights 到 localStorage）。
 */
export function useGithubInsight({ llmConfig }) {
  const githubInsights = useGithubStore(s => s.githubInsights);
  const setGithubInsights = useGithubStore(s => s.setGithubInsights);
  const githubInsightLoading = useGithubStore(s => s.githubInsightLoading);
  const setGithubInsightLoading = useGithubStore(s => s.setGithubInsightLoading);

  // GitHub 项目 AI 情报：实时调 LLM 生成应用场景/适合谁/落地难度/价值判断
  const requestGithubInsight = useCallback(async (repo) => {
    const id = repo.id;
    if (githubInsights[id] || githubInsightLoading[id]) return;
    if (!llmConfig.baseUrl || !llmConfig.selectedModel) {
      showToast('请先在设置中配置大模型 API');
      return;
    }
    setGithubInsightLoading(prev => ({ ...prev, [id]: true }));
    try {
      const content = `项目：${repo.fullName}\n描述：${repo.description || '暂无'}\n语言：${repo.language || '未知'}\nStars：${repo.totalStars || 0}\nTopics：${(repo.topics || []).join(', ')}`;
      const response = await fetch('/api/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: llmConfig.baseUrl,
          apiKey: llmConfig.apiKey,
          model: llmConfig.selectedModel,
          action: 'github-evaluator',
          content
        })
      });
      const data = await response.json();
      if (data.error) { showToast(`分析失败: ${data.error}`); return; }
      // 解析返回的结构化 JSON（github-evaluator skill 输出）
      let insight;
      try {
        const match = (data.content || '').match(/\{[\s\S]*\}/);
        insight = match ? JSON.parse(match[0]) : null;
      } catch { insight = null; }
      if (!insight) {
        // 降级：按行解析
        const lines = (data.content || '').split('\n').filter(l => l.trim());
        insight = {
          scenario: lines[0] || '分析失败',
          audience: lines[1] || '',
          difficulty: lines[2] || '',
          value: lines[3] || '',
        };
      }
      const normalized = {
        scenario: insight.scenario || insight.application || '暂无',
        audience: insight.audience || insight.targetUsers || '暂无',
        difficulty: insight.difficulty || insight.complexity || '暂无',
        value: insight.value || insight.worth || '暂无',
      };
      setGithubInsights(prev => {
        const next = { ...prev, [id]: normalized };
        return next;
      });
    } catch (e) {
      showToast(`分析失败: ${e.message}`);
    } finally {
      setGithubInsightLoading(prev => { const n = { ...prev }; delete n[id]; return n; });
    }
  }, [llmConfig.baseUrl, llmConfig.apiKey, llmConfig.selectedModel, githubInsights, githubInsightLoading, setGithubInsights, setGithubInsightLoading]);

  return { githubInsights, setGithubInsights, githubInsightLoading, setGithubInsightLoading, requestGithubInsight };
}
