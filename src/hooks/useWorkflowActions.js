import { useCallback } from 'react';
import { showToast } from '../utils/toast.js';

/**
 * 智能体工作流「行动队列」管理（从 App.jsx 抽离）
 *
 * 负责：
 *  - createWorkflowActions：根据本次运行结果生成可执行行动候选（沉淀素材/追踪记忆/生成草稿/记录画像/审计备注）
 *  - updateWorkflowActionStatus：更新单条行动状态并同步到 history
 *  - executeWorkflowAction：根据行动类型执行副作用（创建素材、追加追踪词、创建草稿等）
 *
 * 入参为 App.jsx 内部的 state/setter 与派生值；返回三个函数。
 */
export function useWorkflowActions({
  scopedAgentItems,
  items,
  materials,
  followKeywords,
  intelligenceProfile,
  setMaterials,
  setFollowKeywords,
  setRecommendationFeedback,
  setArticles,
  setCurrentArticleId,
  setAgentWorkflowActions,
  setAgentWorkflowHistory,
  setDailyProfileSnapshots,
  detectMaterialType,
  agentWorkflowPrompt,
  agentWorkflowResult,
  todayProfileSnapshot,
  agentWorkflowRun,
  addManualMaterial,
}) {
  const createWorkflowActions = useCallback(({ runId, mission, prompt, content, nodeOutputs }) => {
    const candidates = scopedAgentItems.slice(0, 5);
    const deriveWorkflowTerm = (item) => {
      const tags = item.tags || [];
      const preferredTag = tags.find(tag => tag && tag.length >= 2 && tag.length <= 24);
      if (preferredTag) return preferredTag;
      const titleWords = (item.title || '').match(/[A-Za-z][A-Za-z0-9-]{2,}|[\u4e00-\u9fa5]{2,6}/g) || [];
      return titleWords[0] || item.category || item.source || '';
    };
    const materialItems = candidates
      .filter(item => !materials.some(m => m.originalItemId === item.id))
      .slice(0, 3);
    const termCandidates = [...new Set([
      ...candidates.flatMap(item => item.tags || []),
      ...candidates.map(item => deriveWorkflowTerm(item)),
      ...intelligenceProfile.tracked
    ])].filter(Boolean).slice(0, 6);
    const actions = [];

    materialItems.forEach(item => {
      actions.push({
        id: `${runId}-material-${item.id}`,
        type: 'material',
        label: '沉淀素材',
        title: item.title,
        desc: item.summary || item.recommendation || '保存为智创中心素材，供后续智能体和内容创作复用。',
        itemId: item.id,
        status: 'pending'
      });
    });

    termCandidates
      .filter(term => !followKeywords.includes(term))
      .slice(0, 3)
      .forEach(term => {
        actions.push({
          id: `${runId}-track-${term}`,
          type: 'track',
          label: '追踪记忆',
          title: term,
          desc: '加入用户画像追踪词，后续每日汇报和智能体会提高相关信号权重。',
          term,
          status: 'pending'
        });
      });

    if (content) {
      actions.push({
        id: `${runId}-article`,
        type: 'article',
        label: '生成草稿',
        title: `${mission.label || '智能体任务'} · ${new Date().toLocaleDateString('zh-CN')}`,
        desc: '把本次智能体结果转成内容创作草稿，继续编辑并导出为私有知识库资产。',
        content,
        prompt,
        status: 'pending'
      });
    }

    actions.push({
      id: `${runId}-profile`,
      type: 'profile',
      label: '记录画像',
      title: '生成今日画像快照',
      desc: `记录本次工作流中的关注领域、追踪词、素材数量和输出目标，形成“越用越懂你”的日期记忆。`,
      status: 'pending'
    });

    const hasMediaAudit = nodeOutputs?.some(output => output.structured?.mediaAudit);
    if (hasMediaAudit) {
      actions.push({
        id: `${runId}-media-audit`,
        type: 'note',
        label: '多媒体审计',
        title: '保存图片/视频质量审计',
        desc: '保存缺图、重复图片和可引用链接信息，帮助后续优化资讯卡片多媒体质量。',
        content: nodeOutputs
          .filter(output => output.structured?.mediaAudit)
          .map(output => `${output.title}\n${JSON.stringify(output.structured.mediaAudit, null, 2)}`)
          .join('\n\n'),
        status: 'pending'
      });
    }

    return actions.slice(0, 8);
  }, [scopedAgentItems, materials, followKeywords, intelligenceProfile.tracked]);

  const updateWorkflowActionStatus = useCallback((actionId, status) => {
    setAgentWorkflowActions(prev => prev.map(action => action.id === actionId ? { ...action, status } : action));
    setAgentWorkflowHistory(prev => prev.map(record => ({
      ...record,
      actions: (record.actions || []).map(action => action.id === actionId ? { ...action, status } : action)
    })));
  }, []);

  const executeWorkflowAction = useCallback((action) => {
    if (!action || action.status === 'done') return;
    if (action.type === 'material') {
      const item = scopedAgentItems.find(candidate => candidate.id === action.itemId) || items.find(candidate => candidate.id === action.itemId);
      if (!item) {
        showToast('未找到原始资讯，无法沉淀素材');
        return;
      }
      if (!materials.some(m => m.originalItemId === item.id)) {
        const newMaterial = {
          id: Date.now(),
          type: detectMaterialType(item),
          title: item.title,
          content: item.summary || item.recommendation || item.title,
          fullContent: item.content || item.summary || item.title,
          source: item.source || '智能体工作流',
          url: item.url || '',
          tags: [...new Set([...(item.tags || []), '智能体'])],
          originalItemId: item.id,
          note: '由智能体行动队列沉淀',
          createdAt: new Date().toISOString()
        };
        setMaterials(prev => [...prev, newMaterial]);
      }
      updateWorkflowActionStatus(action.id, 'done');
      showToast('已沉淀到素材库');
      return;
    }

    if (action.type === 'track') {
      const term = action.term || action.title;
      if (!term) return;
      setFollowKeywords(prev => prev.includes(term) ? prev : [term, ...prev].slice(0, 20));
      setRecommendationFeedback(prev => ({
        ...prev,
        trackedTerms: {
          ...(prev.trackedTerms || {}),
          [term]: ((prev.trackedTerms || {})[term] || 0) + 1
        }
      }));
      updateWorkflowActionStatus(action.id, 'done');
      showToast(`已开始追踪「${term}」`);
      return;
    }

    if (action.type === 'article') {
      const newArticle = {
        id: Date.now(),
        title: action.title || `智能体草稿 · ${new Date().toLocaleDateString('zh-CN')}`,
        content: `# ${action.title || '智能体草稿'}\n\n## 任务\n${action.prompt || agentWorkflowPrompt || '智能体工作流'}\n\n## 输出\n${action.content || agentWorkflowResult.content || ''}`,
        template: 'blank',
        materials: [],
        tags: ['智能体', '工作流'],
        status: 'draft',
        spaceId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        images: []
      };
      setArticles(prev => [newArticle, ...prev]);
      setCurrentArticleId(newArticle.id);
      updateWorkflowActionStatus(action.id, 'done');
      showToast('已生成内容创作草稿');
      return;
    }

    if (action.type === 'profile') {
      setDailyProfileSnapshots(prev => [
        { ...todayProfileSnapshot, generatedAt: new Date().toISOString(), workflowRunId: agentWorkflowRun.id || '' },
        ...prev.filter(item => item.date !== todayProfileSnapshot.date)
      ].slice(0, 30));
      updateWorkflowActionStatus(action.id, 'done');
      showToast('已记录今日画像快照');
      return;
    }

    if (action.type === 'note') {
      addManualMaterial({
        title: action.title,
        content: action.content || action.desc,
        type: 'analysis',
        source: '智能体行动队列',
        url: '',
        tags: '智能体,多媒体审计',
        note: action.desc,
        spaceId: null
      });
      updateWorkflowActionStatus(action.id, 'done');
      showToast('已保存审计记录');
    }
  }, [scopedAgentItems, items, materials, detectMaterialType, updateWorkflowActionStatus, agentWorkflowPrompt, agentWorkflowResult.content, todayProfileSnapshot, agentWorkflowRun.id]);

  return {
    createWorkflowActions,
    updateWorkflowActionStatus,
    executeWorkflowAction,
  };
}
