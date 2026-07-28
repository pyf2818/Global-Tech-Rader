// 工作流校验：检查节点配置完整性、LLM 配置、上下文项、画像信号等
// 从 App.jsx 抽离，纯函数无副作用
import {
  WORKFLOW_CONDITION_METRICS,
  WORKFLOW_CONDITION_OPERATORS,
  isWorkflowSkillId,
  getWorkflowSkillMeta,
  formatWorkflowNodeConfig,
} from '../constants/appConstants.jsx';

/**
 * 校验工作流草稿
 * @param {Object} params
 * @param {Object} params.draft - 工作流草稿（含 nodes/name/description）
 * @param {Object} params.llmConfig - LLM 配置（baseUrl/selectedModel）
 * @param {Array} params.scopedAgentItems - 当前范围可分析资讯
 * @param {Array} params.selectedInterests - 用户关注领域
 * @param {Array} params.readingHistory - 阅读历史
 * @param {Array} params.bookmarks - 收藏
 * @param {Array} params.materials - 素材库
 * @returns {{ checks: Array, blockingIssues: Array, warnings: Array, ready: boolean, score: number }}
 */
export function validateWorkflowDraft({
  draft,
  llmConfig,
  scopedAgentItems,
  selectedInterests,
  readingHistory,
  bookmarks,
  materials,
}) {
  const nodes = Array.isArray(draft?.nodes) ? draft.nodes : [];
  const enabledNodes = nodes.filter(node => node.enabled !== false);
  const outputKeys = new Set();
  const checks = [];
  const addCheck = (id, label, ok, blocking = false, detail = '') => {
    checks.push({ id, label, ok, blocking, detail });
  };

  addCheck('enabled-nodes', '至少启用一个节点', enabledNodes.length > 0, true, `${enabledNodes.length} 个启用节点`);
  addCheck('output-node', '包含最终输出节点', enabledNodes.some(node => node.type === 'output'), true, '需要 output 节点承接结果');
  addCheck('llm-config', '大模型节点具备运行配置', !enabledNodes.some(node => node.type === 'llm') || Boolean(llmConfig?.baseUrl && llmConfig?.selectedModel), true, llmConfig?.selectedModel || '未选择模型');
  addCheck('context-items', '当前范围有可分析资讯', scopedAgentItems.length > 0, false, `${scopedAgentItems.length} 条资讯`);
  addCheck('profile-signal', '画像有偏好或行为依据', selectedInterests.length > 0 || readingHistory.length > 0 || bookmarks.length > 0 || materials.length > 0, false, `${selectedInterests.length} 个关注领域`);
  addCheck('template-identity', '工作流名称与目标完整', Boolean(String(draft?.name || '').trim() && String(draft?.description || '').trim()), false, '便于导出和复用');

  enabledNodes.forEach((node, index) => {
    const title = String(node.title || '').trim();
    const role = String(node.role || '').trim();
    const prompt = String(node.prompt || '').trim();
    const inputKey = String(node.inputKey || '').trim();
    const outputKey = String(node.outputKey || '').trim();
    const missing = [
      !title ? '标题' : '',
      !role ? '职责' : '',
      !prompt ? 'Prompt' : ''
    ].filter(Boolean);
    addCheck(`node-required-${node.id}`, `${index + 1}. ${title || '未命名节点'} 基础配置`, missing.length === 0, true, missing.length ? `缺少 ${missing.join('、')}` : '已填写');
    addCheck(`node-io-${node.id}`, `${index + 1}. ${title || '未命名节点'} 输入输出变量`, Boolean(inputKey && outputKey), false, inputKey && outputKey ? `${inputKey} -> ${outputKey}` : '建议填写 inputKey / outputKey');
    if (node.type === 'skill') {
      const skillId = node.skillId || 'evidence-pack';
      addCheck(`node-skill-${node.id}`, `${index + 1}. ${title || '工具节点'} 已选择内置能力`, isWorkflowSkillId(skillId), true, getWorkflowSkillMeta(skillId)?.label || '未选择 Skill');
    }
    if (node.type === 'condition') {
      const conditionMetricOk = WORKFLOW_CONDITION_METRICS.some(item => item.id === (node.conditionMetric || 'itemCount'));
      const conditionOperatorOk = WORKFLOW_CONDITION_OPERATORS.some(item => item.id === (node.conditionOperator || '>='));
      const conditionValueOk = Number.isFinite(Number(node.conditionValue ?? 1));
      addCheck(`node-condition-${node.id}`, `${index + 1}. ${title || '条件节点'} 规则可执行`, conditionMetricOk && conditionOperatorOk && conditionValueOk, true, formatWorkflowNodeConfig(node));
    }
    if (node.type === 'classifier') {
      const labels = String(node.classifierLabels || '').split(',').map(item => item.trim()).filter(Boolean);
      addCheck(`node-classifier-${node.id}`, `${index + 1}. ${title || '分类节点'} 分类桶完整`, labels.length >= 2, false, labels.length ? labels.join(' / ') : '建议至少 2 个分类');
    }
    if (outputKey) {
      addCheck(`node-unique-output-${node.id}`, `${index + 1}. ${title || '未命名节点'} 输出变量不重复`, !outputKeys.has(outputKey), true, outputKey);
      outputKeys.add(outputKey);
    }
  });

  const blockingIssues = checks.filter(check => check.blocking && !check.ok);
  const warnings = checks.filter(check => !check.blocking && !check.ok);

  return {
    checks,
    blockingIssues,
    warnings,
    ready: blockingIssues.length === 0,
    score: Math.round((checks.filter(check => check.ok).length / Math.max(checks.length, 1)) * 100)
  };
}
