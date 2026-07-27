// WorkflowEngine — extracted from App.jsx runAgentWorkflow + runLocalNode
// Pure-logic execution over a workflow DAG. No React dependency.

import {
  WORKFLOW_NODE_TYPES,
  WORKFLOW_SKILL_CATALOG,
  WORKFLOW_CONDITION_METRICS,
  getWorkflowSkillMeta,
  isWorkflowSkillId,
  formatWorkflowNodeConfig
} from '../constants/workflowConstants.js';

export function buildWorkbenchContext(prompt, {
  scopedAgentItems = [],
  selectedNewsDate = '',
  agentWorkflowScope = 'today',
  intelligenceProfile = {},
  trackedTerms = [],
  selectedInterests = [],
  bookmarks = [],
  materials = [],
  categories = []
} = {}) {
  const getCategoryLabel = (id) => categories.find(c => c.id === id)?.label || id || '未分类';
  const mediaItems = scopedAgentItems.filter(item => item.imageUrl || item.videoUrl);
  const savedScopedItems = scopedAgentItems.filter(item =>
    bookmarks.some(b => b.itemId === item.id) || materials.some(m => m.originalItemId === item.id)
  );
  const formatItemLink = (item) => `${item.title}（${item.source || '未知来源'}）${item.url ? `\n   ${item.url}` : ''}`;
  const formatItemLine = (item, i) => `${i + 1}. ${item.title}｜${item.source || '未知来源'}｜${getCategoryLabel(item.category)}｜推荐分 ${Math.round(item.mustReadScore || 0)}`;

  const categoryMap = scopedAgentItems.reduce((acc, item) => {
    const key = getCategoryLabel(item.category);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return `${prompt ? `【任务】\n${prompt}\n\n` : ''}【工作台上下文】
日期：${selectedNewsDate}
范围：${agentWorkflowScope}
推荐资讯：${scopedAgentItems.length} 条
关注领域：${(intelligenceProfile.focusLabels || []).join('、') || '未设置'}
追踪记忆：${trackedTerms.join('、') || '暂无'}
推荐深度：${intelligenceProfile.depth || '探索校准'}
收藏/素材命中：${savedScopedItems.length} 条
多媒体线索：${mediaItems.length} 条

领域分布：${Object.entries(categoryMap).map(([n, c]) => `${n} ${c}`).join('、') || '暂无'}

优先素材：
${scopedAgentItems.slice(0, 8).map(formatItemLine).join('\n') || '暂无'}`;
}

export function buildEvidencePack(items) {
  const evidenceLinks = items.slice(0, 6);
  return {
    evidenceLinks,
    output: `证据包整理完成：\n${evidenceLinks.map((item, i) => `${i + 1}. ${item.title}（${item.source || '未知来源'}）\n   ${item.url || '暂无链接'}`).join('\n') || '暂无可引用链接'}\n\n已保留来源、分类、摘要、推荐分和原文链接，后续节点可以直接引用。`
  };
}

export function buildMediaAudit(items) {
  const mediaItems = items.filter(item => item.imageUrl || item.videoUrl);
  const imageUrls = mediaItems.map(item => item.imageUrl).filter(Boolean);
  const duplicateImages = imageUrls.filter((url, i) => imageUrls.indexOf(url) !== i);
  const missingMedia = Math.max(0, items.length - mediaItems.length);
  const audit = {
    imageCount: imageUrls.length,
    videoCount: mediaItems.filter(item => item.videoUrl).length,
    missingMediaCount: missingMedia,
    duplicateImageCount: new Set(duplicateImages).size
  };
  return {
    imageUrls,
    duplicateImages,
    mediaAudit: audit,
    output: `多媒体审计完成：图片 ${audit.imageCount} 条，视频 ${audit.videoCount} 条，缺少多媒体 ${audit.missingMediaCount} 条，重复图片 ${audit.duplicateImageCount} 条。\n建议优先补齐高推荐分卡片的正文图片，避免使用 logo、favicon 或站点默认图。`
  };
}

export function buildMaterialExtraction(items, materials, existingMaterials = []) {
  const existingIds = new Set([...(existingMaterials || []).map(m => m.originalItemId).filter(Boolean)]);
  const candidates = items.filter(item => !existingIds.has(item.id)).slice(0, 5);
  const typeMap = { '图文素材': item => item.imageUrl, '观点素材': item => (item.summary || '').length > 120, '线索素材': () => true };
  const lines = candidates.map((item, i) => {
    let type = '线索素材';
    if (item.imageUrl) type = '图文素材';
    else if ((item.summary || '').length > 120) type = '观点素材';
    return `${i + 1}. ${type}｜${item.title}｜${item.source || '未知来源'}`;
  }).join('\n');
  return {
    candidates,
    output: `素材候选提取完成：${candidates.length} 条。\n${lines || '暂无新的素材候选'}\n\n这些素材可以进入素材库，继续支撑智能体分析和内容创作。`
  };
}

export function buildProfileMemory(items, profile, tracked, bookmarks, materials) {
  const terms = [...new Set([
    ...(tracked || []),
    ...items.slice(0, 5).flatMap(item => item.tags || []),
    ...items.slice(0, 3).map(item => item.category)
  ])].filter(Boolean).slice(0, 8);
  const savedCount = items.filter(item =>
    bookmarks.some(b => b.itemId === item.id) || materials.some(m => m.originalItemId === item.id)
  ).length;
  return {
    terms,
    output: `画像记忆建议：\n- 建议追踪：${terms.join('、') || '暂无'}\n- 强化领域：${(profile?.focusLabels || []).join('、') || '未设置'}\n- 本次行为依据：${items.length} 条资讯、${savedCount} 条收藏/素材命中、${items.filter(item => item.imageUrl || item.videoUrl).length} 条多媒体线索。`
  };
}

export function buildArticleOutline(items, missionLabel) {
  const topReads = items.slice(0, 3);
  return {
    topReads,
    output: `文章草稿架构：\n# ${missionLabel || '智能体选题'}\n\n## 核心论点\n基于今日高价值信号，提炼一个清晰判断，而不是罗列资讯。\n\n## 可用素材\n${topReads.map((item, i) => `${i + 1}. ${item.title}｜${item.source || '未知来源'}`).join('\n') || '暂无'}\n\n## 建议结构\n背景 -> 关键事实 -> 对用户的影响 -> 风险与不确定性 -> 下一步行动。`
  };
}

export function buildGithubEvaluation(items) {
  const targets = items.filter(item => /github/i.test(`${item.source || ''} ${item.url || ''} ${item.category || ''}`)).slice(0, 5);
  const repos = targets.length ? targets : items.slice(0, 5);
  return {
    repos,
    output: `GitHub 项目评估：\n${repos.map((item, i) => `${i + 1}. ${item.title}\n   用途判断：${item.summary || item.recommendation || '需要结合 README 继续分析'}\n   应用场景：可作为技术选型、原型验证或知识库素材。\n   证据：${item.url || '暂无链接'}`).join('\n') || '暂无项目'}`
  };
}

function compareMetric(left, operator, right) {
  switch (operator) {
    case '>': return left > right;
    case '<': return left < right;
    case '<=': return left <= right;
    case '==': return left === right;
    case '>=':
    default: return left >= right;
  }
}

function runLocalNode(node, previousOutput, ctx) {
  const {
    scopedAgentItems = [],
    mediaItems = [],
    materials = [],
    bookmarks = [],
    intelligenceProfile = {},
    trackedTerms = [],
    selectedInterests = [],
    categories = [],
    selectedNewsDate = '',
    agentWorkflowScope = '',
    selectedMission
  } = ctx;

  const getCategoryLabel = (id) => categories.find(c => c.id === id)?.label || id || '未分类';
  const savedScopedItems = scopedAgentItems.filter(item =>
    bookmarks.some(b => b.itemId === item.id) || materials.some(m => m.originalItemId === item.id)
  );
  const materialCandidates = scopedAgentItems.filter(item => !materials.some(m => m.originalItemId === item.id)).slice(0, 5);
  const formatItemLine = (item, i) => `${i + 1}. ${item.title}｜${item.source || '未知来源'}｜${getCategoryLabel(item.category)}｜推荐分 ${Math.round(item.mustReadScore || 0)}`;

  const workflowMetrics = {
    itemCount: scopedAgentItems.length,
    mediaCount: mediaItems.length,
    materialCount: materials.length,
    savedCount: savedScopedItems.length,
    focusCount: scopedAgentItems.filter(item => selectedInterests.includes(item.category)).length,
    githubCount: scopedAgentItems.filter(item =>
      /github/i.test(`${item.source || ''} ${item.url || ''} ${item.category || ''}`)
    ).length
  };

  if (node.type === 'input') {
    const categoryMap = scopedAgentItems.reduce((acc, item) => {
      const key = getCategoryLabel(item.category);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return {
      output: `已载入输入上下文：\n- 日期：${selectedNewsDate}\n- 范围：${agentWorkflowScope}\n- 推荐资讯：${scopedAgentItems.length} 条\n- 关注领域：${(intelligenceProfile?.focusLabels || []).join('、') || '未设置'}\n- 追踪记忆：${(trackedTerms || []).join('、') || '暂无'}\n- 收藏/素材命中：${savedScopedItems.length} 条\n- 多媒体线索：${mediaItems.length} 条\n\n领域分布：${Object.entries(categoryMap).map(([n, c]) => `${n} ${c}`).join('、') || '暂无'}\n\n优先素材：\n${scopedAgentItems.slice(0, 5).map(formatItemLine).join('\n') || '暂无'}`,
      structured: {
        date: selectedNewsDate, scope: agentWorkflowScope, itemCount: scopedAgentItems.length,
        focus: intelligenceProfile?.focusLabels || [], categories: categoryMap,
        mediaCount: mediaItems.length, savedCount: savedScopedItems.length
      }
    };
  }

  if (node.type === 'classifier') {
    const labels = String(node.classifierLabels || '必读,追踪,素材,创作,降噪').split(',').map(s => s.trim()).filter(Boolean);
    const mustRead = scopedAgentItems.filter(item => (item.mustReadScore || 0) >= 65 || item.sourceGradeLabel?.startsWith('S') || item.sourceGradeLabel?.startsWith('A')).slice(0, 4);
    const followUp = scopedAgentItems.filter(item => (trackedTerms || []).some(term => `${item.title} ${item.summary}`.toLowerCase().includes(term.toLowerCase()))).slice(0, 4);
    const materialReady = scopedAgentItems.filter(item => item.imageUrl || item.videoUrl || (item.summary || '').length > 100 || savedScopedItems.some(s => s.id === item.id)).slice(0, 5);
    const creationReady = scopedAgentItems.filter(item => (item.summary || '').length > 120 || (item.recommendationReasons || []).some(r => /创作|机会|应用|落地|风险/.test(r))).slice(0, 4);
    const ignore = scopedAgentItems.filter(item => (item.mustReadScore || 0) < 25 && !(selectedInterests || []).includes(item.category)).slice(0, 3);
    const buckets = labels.reduce((acc, label) => ({ ...acc, [label]: [] }), {});
    const assign = (label, list) => { if (buckets[label]) buckets[label] = list.map(item => item.title); };
    const label0 = labels[0] || '必读', label1 = labels[1] || '追踪', label2 = labels[2] || '素材', label3 = labels[3] || '创作', label4 = labels[4] || '降噪';
    assign(label0, mustRead); assign(label1, followUp); assign(label2, materialReady); assign(label3, creationReady); assign(label4, ignore);
    return {
      output: `分类结果：\n${Object.entries(buckets).map(([label, list]) => `- ${label}：${list.join('；') || (label === label1 ? (trackedTerms || []).join('、') : '') || '暂无'}`).join('\n')}`,
      structured: { labels, buckets, mustRead: mustRead.map(i => i.id), followUp: followUp.map(i => i.id), materialReady: materialReady.map(i => i.id), creationReady: creationReady.map(i => i.id), ignore: ignore.map(i => i.id) }
    };
  }

  if (node.type === 'condition') {
    const metric = node.conditionMetric || 'itemCount';
    const operator = node.conditionOperator || '>=';
    const threshold = Number(node.conditionValue ?? 1);
    const current = Number(workflowMetrics[metric] ?? 0);
    const metricLabel = WORKFLOW_CONDITION_METRICS.find(item => item.id === metric)?.label || metric;
    const passed = compareMetric(current, operator, threshold);
    const checks = [{ label: `${metricLabel} ${operator} ${threshold}（当前 ${current}）`, passed }];
    return {
      output: `条件判断：${passed ? '通过，继续执行后续链路' : '未通过，后续节点将跳过'}。\n${checks.map(c => `- ${c.passed ? '通过' : '未通过'}：${c.label}`).join('\n')}\n\n条件依据：${node.prompt}`,
      shouldContinue: passed,
      structured: { checks, metric, operator, threshold, current, action: passed ? 'continue' : 'skip-rest' }
    };
  }

  if (node.type === 'skill') {
    const skillId = node.skillId || 'evidence-pack';
    const skillMeta = getWorkflowSkillMeta(skillId);
    const evidencePack = buildEvidencePack(scopedAgentItems);
    const mediaAudit = buildMediaAudit(scopedAgentItems);
    const materialExtraction = buildMaterialExtraction(scopedAgentItems, materials, materials);
    const profileMemory = buildProfileMemory(scopedAgentItems, intelligenceProfile, trackedTerms, bookmarks, materials);
    const articleOutline = buildArticleOutline(scopedAgentItems.slice(0, 5), selectedMission?.label);
    const githubEvaluation = buildGithubEvaluation(scopedAgentItems);
    const skillOutputs = {
      'evidence-pack': evidencePack,
      'media-audit': mediaAudit,
      'material-extractor': materialExtraction,
      'profile-memory': profileMemory,
      'article-outline': articleOutline,
      'github-evaluator': githubEvaluation
    };
    const selected = skillOutputs[skillId] || evidencePack;
    const combined = skillId === 'evidence-pack'
      ? `${evidencePack.output}\n\n${mediaAudit.output}\n\n${materialExtraction.output}`
      : selected.output;
    return {
      output: `工具 Skills 执行结果：${skillMeta.label}\n${skillMeta.description}\n\n${combined}\n\n工具说明：${node.prompt}`,
      structured: {
        skillId, skillLabel: skillMeta.label,
        evidenceLinks: evidencePack.evidenceLinks.map(i => ({ title: i.title, source: i.source, url: i.url })),
        mediaAudit: mediaAudit.mediaAudit,
        materialCandidates: materialExtraction.candidates.map(i => i.id),
        profileTerms: profileMemory.terms,
        githubItems: githubEvaluation.repos.map(i => i.id),
        articleItems: articleOutline.topReads.map(i => i.id)
      }
    };
  }

  if (node.type === 'reply') {
    return {
      output: `${node.prompt}\n\n固定回复基于上一节点：\n${(previousOutput || '').slice(0, 700)}`,
      structured: { mode: 'fixed-reply' }
    };
  }

  if (node.type === 'output') {
    const topReads = scopedAgentItems.slice(0, 3);
    const followActions = [...new Set([
      ...(trackedTerms || []),
      ...scopedAgentItems.slice(0, 3).flatMap(item => item.tags || [])
    ])].filter(Boolean).slice(0, 6);
    return {
      output: `输出节点完成：\n- 任务：${selectedMission?.label || '未命名任务'}\n- 工作流：${selectedMission?.workflowName || '默认'}\n- 优先阅读：${topReads.map(i => i.title).join('；') || '暂无'}\n- 建议追踪：${followActions.join('、') || '暂无'}\n- 素材沉淀：${materialCandidates.slice(0, 3).map(i => i.title).join('；') || '暂无'}\n- 创作转化：可导出到内容创作，形成私有知识库资产\n\n参考链接：\n${topReads.map((i, idx) => `${idx + 1}. ${i.title}（${i.source || '未知来源'}）\n   ${i.url || '暂无链接'}`).join('\n') || '暂无'}\n\n最终输入摘要：\n${(previousOutput || '').slice(0, 900)}`,
      structured: {
        topReads: topReads.map(i => i.id), followActions,
        materialCandidates: materialCandidates.slice(0, 3).map(i => i.id)
      }
    };
  }

  // Unknown type fallback
  return {
    output: `${node.title} 已处理。\n${(previousOutput || '').slice(0, 700)}`,
    structured: { type: node.type }
  };
}

export class WorkflowEngine {
  constructor() {
    this.abortController = null;
  }

  /**
   * @param {Object} workflow - { id, name, nodes: Node[] }
   * @param {Object} ctx - execution context (scopedAgentItems, llmConfig, agents, etc.)
   * @param {Function} onStep - callback(nodeId, status, output?, structured?, error?)
   * @returns {Promise<{runId, trace, finalOutput}>}
   */
  async run(workflow, ctx, onStep) {
    this.abortController = new AbortController();
    const runId = `run-${Date.now()}`;
    const startedAt = new Date().toISOString();
    const enabledNodes = (workflow?.nodes || []).filter(n => n.enabled !== false);
    if (!enabledNodes.length) {
      return { runId, status: 'completed', trace: [], finalOutput: '', startedAt, finishedAt: startedAt };
    }

    const trace = enabledNodes.map((node, index) => ({
      id: `${runId}-${node.id}`,
      nodeId: node.id,
      title: node.title,
      type: node.type,
      order: index + 1,
      status: index === 0 ? 'running' : 'queued',
      detail: node.role,
      prompt: node.prompt,
      inputKey: node.inputKey || (index === 0 ? 'context' : `step_${index}`),
      outputKey: node.outputKey || `step_${index + 1}`
    }));

    const getTrace = (nodeId, patch) => trace.map(step => step.nodeId === nodeId ? { ...step, ...patch } : step);
    const setTrace = (nodeId, patch) => {
      for (let i = 0; i < trace.length; i++) {
        if (trace[i].nodeId === nodeId) { Object.assign(trace[i], patch); break; }
      }
    };

    const stepResults = {};
    let previousOutput = buildWorkbenchContext(ctx.customPrompt || '', ctx);
    stepResults['context'] = previousOutput;
    stepResults[enabledNodes[0]?.inputKey || 'context'] = previousOutput;

    let haltedByCondition = null;
    let lastError = null;

    try {
      for (let index = 0; index < enabledNodes.length; index++) {
        if (this.abortController.signal.aborted) throw new Error('工作流已取消');

        const node = enabledNodes[index];
        const inputKey = node.inputKey || (index === 0 ? 'context' : `step_${index}`);
        const outputKey = node.outputKey || `step_${index + 1}`;

        setTrace(node.id, { status: 'running' });
        if (onStep) onStep(node.id, 'running', undefined, undefined, undefined, trace);

        const nodeInput = stepResults[inputKey] || previousOutput;
        let output = '';
        let structured = null;
        let shouldContinue = true;

        /* ============ 多 agent 编排节点（方案 C Phase 5） ============ */
        let nodeResult = null;
        if (node.type === 'subworkflow') {
          nodeResult = await this._runSubworkflow(node, String(nodeInput), ctx, setTrace, onStep, trace);
        } else if (node.type === 'parallel') {
          nodeResult = await this._runParallel(node, String(nodeInput), ctx, setTrace, onStep, trace);
        } else if (node.type === 'router') {
          nodeResult = await this._runRouter(node, String(nodeInput), ctx, setTrace, onStep, trace);
          if (nodeResult.shouldContinue === false) shouldContinue = false;
        } else if (node.type === 'llm') {
          const agent = (ctx.agents || []).find(a => a.id === node.agentId) || (ctx.agents || [])[0];
          const systemPrompt = `${agent?.systemPrompt || '你是个人情报智能体。'}

你正在宽屏智能体工作流中工作，不是闲聊窗口。请基于用户画像、今日推荐资讯和任务目标输出可执行结果。
要求：
1. 先给一句话结论和优先级。
2. 明确事实、推断、不确定性。
3. 输出下一步动作，能进入追踪、阅读或创作。
4. 回答结构清晰，避免泛泛总结。`;

          const messages = node.role && node.role !== node.title
            ? [
                { role: 'system', content: `${node.role}\n${node.prompt}` },
                { role: 'user', content: String(nodeInput).slice(-6000) }
              ]
            : [{ role: 'user', content: `${node.prompt}\n\n${String(nodeInput).slice(-6000)}` }];

          const response = await fetch('/api/ai-generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              baseUrl: ctx.llmConfig?.baseUrl,
              apiKey: ctx.llmConfig?.apiKey,
              model: ctx.llmConfig?.selectedModel,
              action: 'chat',
              systemPrompt,
              messages
            }),
            signal: this.abortController?.signal
          });

          const data = await response.json();
          if (data.error) throw new Error(data.error);
          output = data.content || `${node.title} 暂无输出`;
        } else {
          const localResult = runLocalNode(node, previousOutput, {
            scopedAgentItems: ctx.scopedAgentItems,
            mediaItems: ctx.mediaItems,
            materials: ctx.materials,
            bookmarks: ctx.bookmarks,
            intelligenceProfile: ctx.intelligenceProfile,
            trackedTerms: ctx.trackedTerms,
            selectedInterests: ctx.selectedInterests,
            categories: ctx.categories,
            selectedNewsDate: ctx.selectedNewsDate,
            agentWorkflowScope: ctx.agentWorkflowScope,
            selectedMission: ctx.selectedMission
          });
          output = typeof localResult === 'string' ? localResult : localResult.output;
          structured = typeof localResult === 'string' ? null : localResult.structured;
          shouldContinue = typeof localResult === 'string' ? true : localResult.shouldContinue !== false;
        }

        // 编排节点（subworkflow/parallel/router）失败时已经 setTrace(status='failed')，
        // 主循环不应覆盖其 status 与 detail（避免"未找到子工作流"被截断输出覆盖）。
        if (nodeResult) {
          output = nodeResult.output;
          structured = nodeResult.structured;
        }
        stepResults[outputKey] = output;
        previousOutput = output;
        const currentStep = trace.find(s => s.nodeId === node.id);
        const isFailed = currentStep?.status === 'failed';
        // 编排节点成功时优先使用其自定义 detail（如"子工作流 完成（N 步）"）
        const detailText = nodeResult?.detail || output.slice(0, 220);
        if (!isFailed) {
          setTrace(node.id, {
            status: 'completed',
            detail: detailText,
            output,
            structured,
            inputKey,
            outputKey,
            variablePreview: `${inputKey} → ${outputKey}`
          });
        } else {
          // 仍然补齐 output/structured/inputKey/outputKey，便于后续节点读取与 UI 展示
          setTrace(node.id, { output, structured, inputKey, outputKey });
        }
        if (onStep) onStep(node.id, isFailed ? 'failed' : 'completed', output, structured, undefined, trace);

        if (node.type === 'condition' && !shouldContinue) {
          haltedByCondition = node;
          for (let i = index + 1; i < trace.length; i++) {
            setTrace(trace[i].nodeId, { status: 'skipped', detail: '条件未通过，已跳过。' });
          }
          if (onStep) onStep('skipped-rest', 'skipped', undefined, undefined, undefined, trace);
          break;
        }
      }

      const nodeOutputs = [];
      for (const node of enabledNodes) {
        const out = stepResults[node.outputKey || node.inputKey] || '';
        nodeOutputs.push({ nodeId: node.id, title: node.title, type: node.type, inputKey: node.inputKey, outputKey: node.outputKey, output: out });
      }

      const finalContent = [
        ...nodeOutputs.map((item, i) => `## ${i + 1}. ${item.title}\n\n${item.output}`),
        haltedByCondition ? `## 条件分支\n\n"${haltedByCondition.title}"未通过，后续节点已跳过。你可以调整条件、扩大资讯范围或补充素材后重新运行。` : ''
      ].filter(Boolean).join('\n\n---\n\n');

      return { runId, status: 'completed', trace, finalOutput: finalContent || previousOutput, nodeOutputs, startedAt, finishedAt: new Date().toISOString(), haltedByCondition: haltedByCondition?.title };
    } catch (error) {
      lastError = error;
      const failedNodeId = trace.find(s => s.status === 'running')?.nodeId;
      for (const step of trace) {
        if (step.nodeId === failedNodeId || step.status === 'running') {
          setTrace(step.nodeId, { status: 'failed', detail: error.message || '执行失败' });
        } else if (step.status === 'queued') {
          setTrace(step.nodeId, { status: 'skipped', detail: '前置节点失败，已跳过。' });
        }
      }
      if (onStep) onStep(failedNodeId || 'error', 'failed', undefined, undefined, error.message, trace);
      return { runId, status: 'failed', trace, finalOutput: '', error: error.message || '智能体工作流运行失败', startedAt, finishedAt: new Date().toISOString() };
    }
  }

  /* ============ 多 agent 编排节点实现（方案 C Phase 5） ============ */

  /**
   * 子工作流节点：从 ctx.workflows 找到对应 id 的工作流，递归执行
   * config: { workflowId: string, passThroughInput?: boolean }
   */
  async _runSubworkflow(node, input, ctx, setTrace, onStep, parentTrace) {
    const workflowId = node.workflowId || node.config?.workflowId;
    const workflows = Array.isArray(ctx.workflows) ? ctx.workflows : [];
    const targetWorkflow = workflows.find(w => w.id === workflowId);
    if (!targetWorkflow) {
      setTrace(node.id, { status: 'failed', detail: `未找到子工作流：${workflowId}` });
      return { output: `错误：未找到子工作流 "${workflowId}"`, structured: null };
    }
    // 复用父 ctx 但用新 prompt（input 作为子工作流的 customPrompt）
    const subCtx = { ...ctx, customPrompt: node.passThroughInput === false ? '' : input };
    const subEngine = new WorkflowEngine();
    subEngine.abortController = this.abortController; // 共享 abort 信号
    const result = await subEngine.run(targetWorkflow, subCtx, (subNodeId, status, subOutput) => {
      if (onStep) onStep(node.id, status === 'running' ? 'running' : status, subOutput, undefined, undefined, parentTrace);
    });
    setTrace(node.id, {
      status: result.status === 'failed' ? 'failed' : 'completed',
      detail: `子工作流 "${targetWorkflow.name}" 完成（${result.trace?.length || 0} 步）`,
      output: result.finalOutput,
    });
    return {
      output: result.finalOutput || `子工作流 "${targetWorkflow.name}" 已执行`,
      structured: { workflowId, subRunId: result.runId, subStatus: result.status },
      detail: `子工作流 "${targetWorkflow.name}" 完成（${result.trace?.length || 0} 步）`,
    };
  }

  /**
   * 并行节点：并发执行多个分支（每个分支是一个简化的 LLM 调用）
   * config: { branches: [{ name, prompt, agentId? }], mergeStrategy: 'concat'|'first'|'last'|'summarize' }
   */
  async _runParallel(node, input, ctx, setTrace, onStep, parentTrace) {
    const branches = Array.isArray(node.branches) ? node.branches : (node.config?.branches || []);
    if (branches.length === 0) {
      setTrace(node.id, { status: 'failed', detail: '并行节点缺少 branches 配置' });
      return { output: '错误：并行节点未配置分支', structured: null };
    }
    const mergeStrategy = node.mergeStrategy || node.config?.mergeStrategy || 'concat';
    setTrace(node.id, { status: 'running', detail: `并行执行 ${branches.length} 个分支` });

    // 并发执行每个分支
    const branchResults = await Promise.allSettled(branches.map(async (branch) => {
      const agent = (ctx.agents || []).find(a => a.id === branch.agentId) || (ctx.agents || [])[0];
      const systemPrompt = `${agent?.systemPrompt || '你是个人情报智能体。'}\n\n你在并行分支 "${branch.name}" 中工作，请基于输入独立给出该分支的结论。`;
      const messages = [{ role: 'user', content: `${branch.prompt || ''}\n\n${input.slice(-4000)}` }];
      const response = await fetch('/api/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: ctx.llmConfig?.baseUrl,
          apiKey: ctx.llmConfig?.apiKey,
          model: ctx.llmConfig?.selectedModel,
          action: 'chat',
          systemPrompt,
          messages,
        }),
        signal: this.abortController?.signal,
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      return { name: branch.name, output: data.content || '(无内容)' };
    }));

    // 收集成功的分支结果（失败的保留错误信息）
    const completed = branchResults.map((r, i) => ({
      name: branches[i].name,
      status: r.status,
      output: r.status === 'fulfilled' ? r.value.output : `分支失败：${r.reason?.message || r.reason}`,
    }));

    let mergedOutput = '';
    if (mergeStrategy === 'first') {
      const firstOk = completed.find(b => b.status === 'fulfilled');
      mergedOutput = firstOk ? firstOk.output : completed[0].output;
    } else if (mergeStrategy === 'last') {
      const lastOk = [...completed].reverse().find(b => b.status === 'fulfilled');
      mergedOutput = lastOk ? lastOk.output : completed[completed.length - 1].output;
    } else if (mergeStrategy === 'summarize') {
      // 让 LLM 汇总各分支结果
      const branchDigest = completed.map((b, i) => `### 分支 ${i + 1}：${b.name}\n${b.output}`).join('\n\n');
      const summarizeResp = await fetch('/api/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: ctx.llmConfig?.baseUrl,
          apiKey: ctx.llmConfig?.apiKey,
          model: ctx.llmConfig?.selectedModel,
          action: 'chat',
          systemPrompt: '你是并行执行汇总器。请基于多个分支的结果生成综述，保留关键差异和共识。',
          messages: [{ role: 'user', content: branchDigest.slice(-6000) }],
        }),
        signal: this.abortController?.signal,
      });
      const summarizeData = await summarizeResp.json();
      mergedOutput = summarizeData.content || branchDigest;
    } else {
      // concat：默认拼接
      mergedOutput = completed.map((b, i) => `### 分支 ${i + 1}：${b.name}\n${b.output}`).join('\n\n---\n\n');
    }

    setTrace(node.id, {
      status: 'completed',
      detail: `并行完成：${completed.length} 个分支，合并策略 ${mergeStrategy}`,
      output: mergedOutput,
    });
    return {
      output: mergedOutput,
      structured: { branches: completed, mergeStrategy },
      detail: `并行完成：${completed.length} 个分支，合并策略 ${mergeStrategy}`,
    };
  }

  /**
   * 路由节点：按规则匹配 input，路由到对应的 target（子工作流或 nodeId）
   * config: { routes: [{ match: { op, value }, target, targetName }], default?: { target, targetName } }
   */
  async _runRouter(node, input, ctx, setTrace, onStep, parentTrace) {
    const routes = Array.isArray(node.routes) ? node.routes : (node.config?.routes || []);
    if (routes.length === 0) {
      setTrace(node.id, { status: 'failed', detail: '路由节点缺少 routes 配置' });
      return { output: '错误：路由节点未配置 routes', structured: null };
    }
    // 按顺序匹配 routes
    let matchedRoute = null;
    for (const route of routes) {
      if (this._matchRoute(route.match, input)) { matchedRoute = route; break; }
    }
    if (!matchedRoute) matchedRoute = node.default || node.config?.default || null;

    if (!matchedRoute || !matchedRoute.target) {
      setTrace(node.id, { status: 'completed', detail: '无匹配路由，跳过' });
      return { output: '(无匹配路由，跳过)', structured: { matched: false }, shouldContinue: true };
    }

    const targetWorkflowId = matchedRoute.target;
    const workflows = Array.isArray(ctx.workflows) ? ctx.workflows : [];
    const targetWorkflow = workflows.find(w => w.id === targetWorkflowId);

    setTrace(node.id, {
      status: 'running',
      detail: `路由命中：${matchedRoute.targetName || matchedRoute.target}`,
    });

    if (!targetWorkflow) {
      // target 是 nodeId：把 input 透传给后续节点（不中断执行链）
      setTrace(node.id, {
        status: 'completed',
        detail: `路由到节点 ${targetWorkflowId}（透传 input）`,
        output: input,
      });
      return {
        output: input,
        structured: { matched: true, target: targetWorkflowId, mode: 'passthrough' },
        detail: `路由到节点 ${targetWorkflowId}（透传 input）`,
      };
    }

    // target 是子工作流：递归执行
    const subCtx = { ...ctx, customPrompt: input };
    const subEngine = new WorkflowEngine();
    subEngine.abortController = this.abortController;
    const result = await subEngine.run(targetWorkflow, subCtx);
    setTrace(node.id, {
      status: result.status === 'failed' ? 'failed' : 'completed',
      detail: `路由到子工作流 "${targetWorkflow.name}"`,
      output: result.finalOutput,
    });
    return {
      output: result.finalOutput || input,
      structured: { matched: true, target: targetWorkflowId, subRunId: result.runId, subStatus: result.status },
      detail: `路由到子工作流 "${targetWorkflow.name}"`,
    };
  }

  /** 路由规则匹配 */
  _matchRoute(match, input) {
    if (!match || !match.op || match.value === undefined) return false;
    const inputStr = String(input || '');
    const val = String(match.value);
    switch (match.op) {
      case 'contains':     return inputStr.includes(val);
      case 'not_contains': return !inputStr.includes(val);
      case 'equals':       return inputStr === val;
      case 'starts_with':  return inputStr.startsWith(val);
      case 'regex':
        try { return new RegExp(val).test(inputStr); } catch { return false; }
      default: return false;
    }
  }

  abort() {
    if (this.abortController) {
      this.abortController.abort();
    }
  }
}
