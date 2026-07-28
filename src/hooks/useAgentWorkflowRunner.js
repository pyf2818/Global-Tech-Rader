import { useCallback } from 'react';
import { getWorkflowSkillMeta, WORKFLOW_CONDITION_METRICS } from '../constants/appConstants.jsx';

/**
 * 智能体工作流运行器（从 App.jsx 抽离）
 *
 * 负责：
 *  - 校验工作流是否就绪
 *  - 执行节点循环（llm / input / classifier / condition / skill / reply / output）
 *  - 维护运行时 trace、变量链与历史记录
 *  - 失败时回写错误状态
 *
 * 入参为 App.jsx 内部的 state/setter 与派生值；返回 runAgentWorkflow 函数。
 */
export function useAgentWorkflowRunner({
  // 静态依赖
  agents,
  intelligenceMissions,
  enabledWorkflowNodes,
  agentWorkflowDraft,
  llmConfig,
  scopedAgentItems,
  selectedNewsDate,
  agentWorkflowScope,
  intelligenceProfile,
  bookmarks,
  materials,
  selectedInterests,
  categories,
  workflowValidation,
  buildWorkbenchContext,
  createWorkflowActions,
  // 状态 setters
  setCurrentAgent,
  setAgentWorkflowPrompt,
  setAgentWorkflowResult,
  setAgentWorkflowRun,
  setAgentWorkflowActions,
  setAgentWorkflowHistory,
  setShowLlmQuickConfig,
}) {
  const runAgentWorkflow = useCallback(async (mission, customPrompt = '') => {
    const selectedMission = mission || intelligenceMissions[0];
    if (!selectedMission) return;
    const agent = agents.find(a => a.id === selectedMission.agentId) || agents.find(a => a.id === 'orchestrator') || agents[0];
    const workflowNodes = enabledWorkflowNodes.length ? enabledWorkflowNodes : agentWorkflowDraft.nodes;
    const blueprintSummary = workflowNodes.map((node, index) => `${index + 1}. ${node.title}｜${node.role}｜${node.prompt}`).join('\n');
    const prompt = customPrompt.trim() || selectedMission.prompt;
    const runId = `run-${Date.now()}`;
    const startedAt = new Date().toISOString();
    const baseTrace = workflowNodes.map((node, index) => ({
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

    if (!workflowValidation.ready) {
      const issueText = workflowValidation.blockingIssues.map(issue => `- ${issue.label}：${issue.detail || '未通过'}`).join('\n');
      setCurrentAgent(agent?.id || 'orchestrator');
      setAgentWorkflowPrompt(prompt);
      setAgentWorkflowResult({
        loading: false,
        content: '',
        error: `工作流尚未就绪，请先处理以下问题：\n${issueText}`,
        missionId: selectedMission.id
      });
      setAgentWorkflowRun({
        id: runId,
        status: 'blocked',
        missionLabel: selectedMission.label,
        startedAt,
        finishedAt: new Date().toISOString(),
        trace: baseTrace.map((step, index) => ({
          ...step,
          status: index === 0 ? 'blocked' : 'skipped',
          detail: index === 0 ? workflowValidation.blockingIssues[0]?.label || '工作流未就绪' : step.detail
        }))
      });
      if (workflowValidation.blockingIssues.some(issue => issue.id === 'llm-config')) setShowLlmQuickConfig(true);
      return;
    }

    setCurrentAgent(agent?.id || 'orchestrator');
    setAgentWorkflowPrompt(prompt);
    setAgentWorkflowResult({ loading: true, content: '', error: '', missionId: selectedMission.id });
    setAgentWorkflowRun({
      id: runId,
      status: 'running',
      missionLabel: selectedMission.label,
      startedAt,
      finishedAt: '',
      trace: baseTrace
    });

    const requiresLlm = workflowNodes.some(node => node.type === 'llm');
    if (requiresLlm && (!llmConfig.baseUrl || !llmConfig.selectedModel)) {
      setAgentWorkflowResult({
        loading: false,
        content: '',
        error: '请先配置大模型，才能运行智能体工作流。',
        missionId: selectedMission.id
      });
      setAgentWorkflowRun(prev => ({
        ...prev,
        status: 'blocked',
        finishedAt: new Date().toISOString(),
        trace: prev.trace.map((step, index) => ({
          ...step,
          status: index === 0 ? 'blocked' : 'skipped',
          detail: index === 0 ? '等待配置大模型后继续运行。' : step.detail
        }))
      }));
      setShowLlmQuickConfig(true);
      return;
    }

    const systemPrompt = `${agent?.systemPrompt || '你是个人情报智能体。'}

你正在宽屏智能体工作流中工作，不是闲聊窗口。请基于用户画像、今日推荐资讯和任务目标输出可执行结果。
要求：
1. 先给一句话结论和优先级。
2. 明确事实、推断、不确定性。
3. 输出下一步动作，能进入追踪、阅读或创作。
4. 回答结构清晰，避免泛泛总结。`;

    let localTrace = baseTrace.map(step => ({ ...step }));
    let activeNodeId = '';

    const setTraceStep = (nodeId, patch) => {
      localTrace = localTrace.map(step => step.nodeId === nodeId ? { ...step, ...patch } : step);
      setAgentWorkflowRun(prev => ({
        ...prev,
        trace: prev.trace.map(step => step.nodeId === nodeId ? { ...step, ...patch } : step)
      }));
    };

    const getCategoryLabel = (categoryId) => categories.find(c => c.id === categoryId)?.label || categoryId || '未分类';
    const trackedTerms = intelligenceProfile.tracked || [];
    const mediaItems = scopedAgentItems.filter(item => item.imageUrl || item.videoUrl);
    const savedScopedItems = scopedAgentItems.filter(item =>
      bookmarks.some(b => b.itemId === item.id) || materials.some(m => m.originalItemId === item.id)
    );
    const materialCandidates = scopedAgentItems.filter(item => !materials.some(m => m.originalItemId === item.id)).slice(0, 5);
    const formatItemLine = (item, index) => {
      const score = Number.isFinite(item.mustReadScore) ? Math.round(item.mustReadScore) : 0;
      return `${index + 1}. ${item.title}｜${item.source || '未知来源'}｜${getCategoryLabel(item.category)}｜推荐分 ${score}`;
    };
    const formatItemLinks = (list) => list.map((item, index) => `${index + 1}. ${item.title}（${item.source || '未知来源'}）${item.url ? `\n   ${item.url}` : ''}`).join('\n');
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
    const compareWorkflowMetric = (left, operator, right) => {
      switch (operator) {
        case '>': return left > right;
        case '<': return left < right;
        case '<=': return left <= right;
        case '==': return left === right;
        case '>=':
        default:
          return left >= right;
      }
    };
    const buildEvidencePack = () => {
      const evidenceLinks = scopedAgentItems.slice(0, 6);
      return {
        evidenceLinks,
        output: `证据包整理完成：\n${formatItemLinks(evidenceLinks) || '暂无可引用链接'}\n\n已保留来源、分类、摘要、推荐分和原文链接，后续节点可以直接引用。`
      };
    };
    const buildMediaAudit = () => {
      const imageUrls = mediaItems.map(item => item.imageUrl).filter(Boolean);
      const duplicateImages = imageUrls.filter((url, index) => imageUrls.indexOf(url) !== index);
      const missingMedia = Math.max(0, scopedAgentItems.length - mediaItems.length);
      return {
        imageUrls,
        duplicateImages,
        mediaAudit: {
          imageCount: imageUrls.length,
          videoCount: mediaItems.filter(item => item.videoUrl).length,
          missingMediaCount: missingMedia,
          duplicateImageCount: new Set(duplicateImages).size
        },
        output: `多媒体审计完成：图片 ${imageUrls.length} 条，视频 ${mediaItems.filter(item => item.videoUrl).length} 条，缺少多媒体 ${missingMedia} 条，重复图片 ${new Set(duplicateImages).size} 条。\n建议优先补齐高推荐分卡片的正文图片，避免使用 logo、favicon 或站点默认图。`
      };
    };
    const buildMaterialExtraction = () => {
      const candidates = materialCandidates.slice(0, 5);
      const lines = candidates.map((item, index) => {
        const type = item.imageUrl ? '图文素材' : (item.summary || '').length > 120 ? '观点素材' : '线索素材';
        return `${index + 1}. ${type}｜${item.title}｜${item.source || '未知来源'}`;
      }).join('\n');
      return {
        candidates,
        output: `素材候选提取完成：${candidates.length} 条。\n${lines || '暂无新的素材候选'}\n\n这些素材可以进入素材库，继续支撑智能体分析和内容创作。`
      };
    };
    const buildProfileMemory = () => {
      const terms = [...new Set([
        ...trackedTerms,
        ...scopedAgentItems.slice(0, 5).flatMap(item => item.tags || []),
        ...scopedAgentItems.slice(0, 3).map(item => getCategoryLabel(item.category))
      ])].filter(Boolean).slice(0, 8);
      return {
        terms,
        output: `画像记忆建议：\n- 建议追踪：${terms.join('、') || '暂无'}\n- 强化领域：${intelligenceProfile.focusLabels.join('、') || '未设置'}\n- 本次行为依据：${scopedAgentItems.length} 条资讯、${savedScopedItems.length} 条收藏/素材命中、${mediaItems.length} 条多媒体线索。`
      };
    };
    const buildArticleOutline = () => {
      const topReads = scopedAgentItems.slice(0, 3);
      return {
        topReads,
        output: `文章草稿架构：\n# ${selectedMission.label || '智能体选题'}\n\n## 核心论点\n基于今日高价值信号，提炼一个清晰判断，而不是罗列资讯。\n\n## 可用素材\n${topReads.map((item, index) => `${index + 1}. ${item.title}｜${item.source || '未知来源'}`).join('\n') || '暂无'}\n\n## 建议结构\n背景 -> 关键事实 -> 对用户的影响 -> 风险与不确定性 -> 下一步行动。`
      };
    };
    const buildGithubEvaluation = () => {
      const repos = scopedAgentItems
        .filter(item => /github/i.test(`${item.source || ''} ${item.url || ''} ${item.category || ''}`))
        .slice(0, 5);
      const targets = repos.length ? repos : scopedAgentItems.slice(0, 5);
      return {
        repos: targets,
        output: `GitHub 项目评估：\n${targets.map((item, index) => `${index + 1}. ${item.title}\n   用途判断：${item.summary || item.recommendation || '需要结合 README 继续分析'}\n   应用场景：可作为技术选型、原型验证或知识库素材。\n   证据：${item.url || '暂无链接'}`).join('\n') || '暂无项目'}`
      };
    };

    const runLocalNode = (node, previousOutput) => {
      const sourceItems = scopedAgentItems.slice(0, 5).map(formatItemLine).join('\n');
      if (node.type === 'input') {
        const categoryMap = scopedAgentItems.reduce((acc, item) => {
          const key = getCategoryLabel(item.category);
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});
        return {
          output: `已载入输入上下文：\n- 日期：${selectedNewsDate}\n- 范围：${agentWorkflowScope}\n- 推荐资讯：${scopedAgentItems.length} 条\n- 关注领域：${intelligenceProfile.focusLabels.join('、') || '未设置'}\n- 收藏/素材命中：${savedScopedItems.length} 条\n- 多媒体线索：${mediaItems.length} 条\n\n领域分布：${Object.entries(categoryMap).map(([name, count]) => `${name} ${count}`).join('、') || '暂无'}\n\n优先素材：\n${sourceItems || '暂无'}`,
          structured: {
            date: selectedNewsDate,
            scope: agentWorkflowScope,
            itemCount: scopedAgentItems.length,
            focus: intelligenceProfile.focusLabels,
            categories: categoryMap,
            mediaCount: mediaItems.length,
            savedCount: savedScopedItems.length
          }
        };
      }
      if (node.type === 'classifier') {
        const labels = String(node.classifierLabels || '必读,追踪,素材,创作,降噪').split(',').map(item => item.trim()).filter(Boolean);
        const mustRead = scopedAgentItems
          .filter(item => (item.mustReadScore || 0) >= 65 || item.sourceGradeLabel?.startsWith('S') || item.sourceGradeLabel?.startsWith('A'))
          .slice(0, 4);
        const followUp = scopedAgentItems
          .filter(item => trackedTerms.some(term => `${item.title} ${item.summary}`.toLowerCase().includes(term.toLowerCase())))
          .slice(0, 4);
        const materialReady = scopedAgentItems
          .filter(item => item.imageUrl || item.videoUrl || (item.summary || '').length > 100 || savedScopedItems.some(saved => saved.id === item.id))
          .slice(0, 5);
        const creationReady = scopedAgentItems
          .filter(item => (item.summary || '').length > 120 || (item.recommendationReasons || []).some(reason => /创作|机会|应用|落地|风险/.test(reason)))
          .slice(0, 4);
        const ignore = scopedAgentItems
          .filter(item => (item.mustReadScore || 0) < 25 && !selectedInterests.includes(item.category))
          .slice(0, 3);
        const buckets = labels.reduce((acc, label) => ({ ...acc, [label]: [] }), {});
        const assignBucket = (label, list) => {
          if (!buckets[label]) buckets[label] = [];
          buckets[label] = list.map(item => item.title);
        };
        assignBucket(labels[0] || '必读', mustRead);
        assignBucket(labels[1] || '追踪', followUp);
        assignBucket(labels[2] || '素材', materialReady);
        assignBucket(labels[3] || '创作', creationReady);
        assignBucket(labels[4] || '降噪', ignore);
        return {
          output: `分类结果：\n${Object.entries(buckets).map(([label, list]) => `- ${label}：${list.join('；') || (label === (labels[1] || '追踪') ? trackedTerms.join('、') : '') || '暂无'}`).join('\n')}\n\n依据上一节点：\n${previousOutput.slice(0, 600)}`,
          structured: {
            labels,
            buckets,
            mustRead: mustRead.map(item => item.id),
            followUp: followUp.map(item => item.id),
            materialReady: materialReady.map(item => item.id),
            creationReady: creationReady.map(item => item.id),
            ignore: ignore.map(item => item.id)
          }
        };
      }
      if (node.type === 'condition') {
        const metric = node.conditionMetric || 'itemCount';
        const operator = node.conditionOperator || '>=';
        const threshold = Number(node.conditionValue ?? 1);
        const current = Number(workflowMetrics[metric] ?? 0);
        const metricLabel = WORKFLOW_CONDITION_METRICS.find(item => item.id === metric)?.label || metric;
        const checks = [{
          label: `${metricLabel} ${operator} ${threshold}（当前 ${current}）`,
          passed: compareWorkflowMetric(current, operator, threshold)
        }];
        const shouldContinue = checks.every(check => check.passed);
        return {
          output: `条件判断：${shouldContinue ? '通过，继续执行后续链路' : '未通过，后续节点将跳过'}。\n${checks.map(check => `- ${check.passed ? '通过' : '未通过'}：${check.label}`).join('\n')}\n\n条件依据：${node.prompt}`,
          shouldContinue,
          structured: { checks, metric, operator, threshold, current, action: shouldContinue ? 'continue' : 'skip-rest' }
        };
      }
      if (node.type === 'skill') {
        const skillId = node.skillId || 'evidence-pack';
        const skillMeta = getWorkflowSkillMeta(skillId);
        const evidencePack = buildEvidencePack();
        const mediaAudit = buildMediaAudit();
        const materialExtraction = buildMaterialExtraction();
        const profileMemory = buildProfileMemory();
        const articleOutline = buildArticleOutline();
        const githubEvaluation = buildGithubEvaluation();
        const skillOutputs = {
          'evidence-pack': evidencePack,
          'media-audit': mediaAudit,
          'material-extractor': materialExtraction,
          'profile-memory': profileMemory,
          'article-outline': articleOutline,
          'github-evaluator': githubEvaluation
        };
        const selectedSkillOutput = skillOutputs[skillId] || evidencePack;
        const combinedOutput = skillId === 'evidence-pack'
          ? `${evidencePack.output}\n\n${mediaAudit.output}\n\n${materialExtraction.output}`
          : selectedSkillOutput.output;
        return {
          output: `工具 Skills 执行结果：${skillMeta.label}\n${skillMeta.description}\n\n${combinedOutput}\n\n工具说明：${node.prompt}`,
          structured: {
            skillId,
            skillLabel: skillMeta.label,
            evidenceLinks: evidencePack.evidenceLinks.map(item => ({ title: item.title, source: item.source, url: item.url })),
            mediaAudit: mediaAudit.mediaAudit,
            materialCandidates: materialExtraction.candidates.map(item => item.id),
            profileTerms: profileMemory.terms,
            githubItems: githubEvaluation.repos.map(item => item.id),
            articleItems: articleOutline.topReads.map(item => item.id)
          }
        };
      }
      if (node.type === 'reply') {
        return {
          output: `${node.prompt}\n\n固定回复基于上一节点：\n${previousOutput.slice(0, 700)}`,
          structured: { mode: 'fixed-reply' }
        };
      }
      if (node.type === 'output') {
        const topReads = scopedAgentItems.slice(0, 3);
        const followActions = [...new Set([
          ...trackedTerms,
          ...scopedAgentItems.slice(0, 3).flatMap(item => item.tags || [])
        ])].filter(Boolean).slice(0, 6);
        return {
          output: `输出节点完成：\n- 任务：${selectedMission.label}\n- 工作流：${agentWorkflowDraft.name}\n- 优先阅读：${topReads.map(item => item.title).join('；') || '暂无'}\n- 建议追踪：${followActions.join('、') || '暂无'}\n- 素材沉淀：${materialCandidates.slice(0, 3).map(item => item.title).join('；') || '暂无'}\n- 创作转化：可导出到内容创作，形成私有知识库资产\n\n参考链接：\n${formatItemLinks(topReads) || '暂无'}\n\n最终输入摘要：\n${previousOutput.slice(0, 900)}`,
          structured: {
            topReads: topReads.map(item => item.id),
            followActions,
            materialCandidates: materialCandidates.slice(0, 3).map(item => item.id)
          }
        };
      }
      return {
        output: `${node.title} 已处理。\n${previousOutput.slice(0, 700)}`,
        structured: { type: node.type }
      };
    };

    try {
      let previousOutput = buildWorkbenchContext(prompt);
      const workflowVariables = {
        user_context: previousOutput,
        context: previousOutput,
        mission: prompt
      };
      const nodeOutputs = [];
      let haltedByCondition = null;

      for (let index = 0; index < workflowNodes.length; index++) {
        const node = workflowNodes[index];
        activeNodeId = node.id;
        const inputKey = node.inputKey || (index === 0 ? 'context' : `step_${index}`);
        const outputKey = node.outputKey || `step_${index + 1}`;
        const nodeInput = workflowVariables[inputKey] || previousOutput;
        localTrace = localTrace.map(step => {
          if (step.nodeId === node.id) return { ...step, status: 'running' };
          if (step.status === 'running') return { ...step, status: 'completed' };
          return step;
        });
        setAgentWorkflowRun(prev => ({
          ...prev,
          trace: prev.trace.map(step => {
            if (step.nodeId === node.id) return { ...step, status: 'running' };
            if (step.status === 'running') return { ...step, status: 'completed' };
            return step;
          })
        }));

        let output = '';
        let structured = null;
        let shouldContinue = true;
        if (node.type === 'llm') {
          const response = await fetch('/api/ai-generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              baseUrl: llmConfig.baseUrl,
              apiKey: llmConfig.apiKey,
              model: llmConfig.selectedModel,
              action: 'chat',
              content: `工作流任务：${prompt}

当前节点：${node.title}
节点职责：${node.role}
节点指令：${node.prompt}
输入变量：${inputKey}
输出变量：${outputKey}

上游输出：
${nodeInput}

完整蓝图：
${blueprintSummary}`,
              systemPrompt,
              messages: [
                { role: 'user', content: String(nodeInput).slice(-6000) }
              ]
            })
          });
          const data = await response.json();
          if (data.error) throw new Error(data.error);
          output = data.content || `${node.title} 暂无输出`;
        } else {
          const localResult = runLocalNode(node, nodeInput);
          output = typeof localResult === 'string' ? localResult : localResult.output;
          structured = typeof localResult === 'string' ? null : localResult.structured;
          shouldContinue = typeof localResult === 'string' ? true : localResult.shouldContinue !== false;
        }

        workflowVariables[outputKey] = output;
        nodeOutputs.push({ nodeId: node.id, title: node.title, type: node.type, inputKey, outputKey, input: nodeInput, output, structured });
        previousOutput = output;
        setTraceStep(node.id, {
          status: 'completed',
          detail: output.slice(0, 220),
          output,
          structured,
          inputKey,
          outputKey,
          variablePreview: `${inputKey} → ${outputKey}`
        });

        if (node.type === 'condition' && !shouldContinue) {
          haltedByCondition = node;
          localTrace = localTrace.map(step => {
            if (step.status === 'queued') {
              return { ...step, status: 'skipped', detail: '条件未通过，已跳过。' };
            }
            return step;
          });
          setAgentWorkflowRun(prev => ({
            ...prev,
            trace: prev.trace.map(step => step.status === 'queued' ? { ...step, status: 'skipped', detail: '条件未通过，已跳过。' } : step)
          }));
          break;
        }
      }

      const finalContent = [
        ...nodeOutputs.map((item, index) => `## ${index + 1}. ${item.title}\n\n${item.output}`),
        haltedByCondition ? `## 条件分支\n\n“${haltedByCondition.title}”未通过，后续节点已跳过。你可以调整条件、扩大资讯范围或补充素材后重新运行。` : ''
      ].filter(Boolean).join('\n\n---\n\n');
      const finishedAt = new Date().toISOString();
      const workflowActions = createWorkflowActions({
        runId,
        mission: selectedMission,
        prompt,
        content: finalContent || previousOutput || '暂无结果',
        nodeOutputs
      });
      setAgentWorkflowResult({
        loading: false,
        content: finalContent || previousOutput || '暂无结果',
        error: '',
        missionId: selectedMission.id
      });
      setAgentWorkflowRun(prev => ({
        ...prev,
        status: 'completed',
        finishedAt,
        trace: localTrace.map(step => {
          if (step.status === 'running') return { ...step, status: 'completed' };
          if (step.status === 'queued') return { ...step, status: haltedByCondition ? 'skipped' : 'completed' };
          return step;
        })
      }));
      setAgentWorkflowActions(workflowActions);
      setAgentWorkflowHistory(prev => [{
        id: runId,
        status: 'completed',
        missionId: selectedMission.id,
        missionLabel: selectedMission.label,
        workflowName: agentWorkflowDraft.name,
        prompt,
        scope: agentWorkflowScope,
        startedAt,
        finishedAt,
        content: finalContent || previousOutput || '暂无结果',
        trace: localTrace,
        nodeOutputs,
        variables: Object.keys(workflowVariables),
        actions: workflowActions,
        haltedByCondition: haltedByCondition?.title || ''
      }, ...prev.filter(item => item.id !== runId)].slice(0, 12));
    } catch (e) {
      const failedAt = new Date().toISOString();
      const failedActions = createWorkflowActions({
        runId,
        mission: selectedMission,
        prompt,
        content: '',
        nodeOutputs: []
      });
      setAgentWorkflowResult({
        loading: false,
        content: '',
        error: e.message || '智能体工作流运行失败',
        missionId: selectedMission.id
      });
      setAgentWorkflowRun(prev => ({
        ...prev,
        status: 'failed',
        finishedAt: failedAt,
        trace: prev.trace.map(step => {
          if (step.nodeId === activeNodeId || step.status === 'running') {
            return { ...step, status: 'failed', detail: e.message || '智能体工作流运行失败' };
          }
          if (step.status === 'queued') return { ...step, status: 'skipped' };
          return step;
        })
      }));
      setAgentWorkflowActions(failedActions);
      setAgentWorkflowHistory(prev => [{
        id: runId,
        status: 'failed',
        missionId: selectedMission.id,
        missionLabel: selectedMission.label,
        workflowName: agentWorkflowDraft.name,
        prompt,
        scope: agentWorkflowScope,
        startedAt,
        finishedAt: failedAt,
        content: '',
        error: e.message || '智能体工作流运行失败',
        trace: localTrace.map(step => {
          if (step.nodeId === activeNodeId || step.status === 'running') return { ...step, status: 'failed', detail: e.message || '智能体工作流运行失败' };
          if (step.status === 'queued') return { ...step, status: 'skipped' };
          return step;
        }),
        nodeOutputs: [],
        actions: failedActions
      }, ...prev.filter(item => item.id !== runId)].slice(0, 12));
    }
  }, [agents, intelligenceMissions, llmConfig, buildWorkbenchContext, enabledWorkflowNodes, agentWorkflowDraft.nodes, agentWorkflowDraft.name, scopedAgentItems, selectedNewsDate, agentWorkflowScope, intelligenceProfile.focusLabels, intelligenceProfile.tracked, bookmarks, materials, selectedInterests, createWorkflowActions]);

  return runAgentWorkflow;
}
