import React from 'react';
import { ICONS } from '../constants/index.jsx';
import {
  WORKFLOW_TEMPLATE_LIBRARY,
  WORKFLOW_SKILL_CATALOG,
  WORKFLOW_CONDITION_METRICS,
  WORKFLOW_CONDITION_OPERATORS,
} from '../constants/workflowConstants.js';

/* Local helpers (used only by this page) */

function getWorkflowSkillMeta(skillId) {
  return WORKFLOW_SKILL_CATALOG.find(skill => skill.id === skillId) || WORKFLOW_SKILL_CATALOG[0];
}

function formatWorkflowNodeConfig(node) {
  if (!node) return '';
  if (node.type === 'skill') return getWorkflowSkillMeta(node.skillId)?.label || '证据包整理';
  if (node.type === 'condition') {
    const metric = WORKFLOW_CONDITION_METRICS.find(item => item.id === node.conditionMetric)?.label || node.conditionMetric || '资讯数量';
    return metric + ' ' + (node.conditionOperator || '>=') + ' ' + (node.conditionValue || 1);
  }
  if (node.type === 'classifier') return '分类桶：' + (node.classifierLabels || '必读,追踪,素材,创作,降噪');
  return '';
}

/* Component */

function AgentsPage({
  runAgentWorkflow,
  intelligenceMissions,
  agentWorkflowScopes,
  agentWorkflowScope,
  setAgentWorkflowScope,
  agentWorkflowResult,
  agentWorkflowHistory,
  agentWorkflowRun,
  agentWorkflowActions,
  agentWorkflowDraft,
  selectedWorkflowNodeId,
  setSelectedWorkflowNodeId,
  currentAgent,
  workflowTypeMeta,
  workflowRunStatusMeta,
  enabledWorkflowNodes,
  workflowBlueprintText,
  selectedWorkflowNode,
  selectedWorkflowConnections,
  newWorkflowNodeType,
  setNewWorkflowNodeType,
  updateWorkflowNode,
  removeWorkflowNode,
  moveWorkflowNode,
  addWorkflowNode,
  exportWorkflowToMaterials,
  downloadWorkflowJson,
  resetWorkflowDraft,
  executeWorkflowAction,
  clearAgentWorkflowHistory,
  restoreAgentWorkflowHistory,
  sendWorkbenchToElf,
  exportWorkflowResultToEditor,
  addManualMaterial,
  setShowLlmQuickConfig,
  setSettingsTab,
  setShowSettings,
  agents,
  intelligenceProfile,
  agentWorkflowPrompt,
  setAgentWorkflowPrompt,
  workflowTemplates,
  activeWorkflowId,
  switchWorkflowTemplate,
  saveWorkflowAsTemplate,
  deleteWorkflowTemplate,
  workflowImportInputRef,
  importWorkflowJson,
  installWorkflowTemplate,
  workflowValidation,
  updateWorkflowDraft,
  draggingWorkflowNodeId,
  setDraggingWorkflowNodeId,
  reorderWorkflowNode,
}) {
  return (
            <div className="agent-home">
              <section className="agent-home-hero">
                <div>
                  <div className="workbench-kicker">Agentic Intelligence</div>
                  <h1>智能体工作流</h1>
                  <p>这是主力大模型工作区，用来完成深度分析、追踪记忆、风险扫描和创作转化。AI 精灵保留为页面小助手，这里负责真正的宽屏任务处理。</p>
                </div>
                <button
                  className="ai-primary-action"
                  onClick={() => runAgentWorkflow(intelligenceMissions[0])}
                >
                  运行今日简报
                </button>
              </section>

              <section className="agent-workflow-layout">
                <div className="agent-workflow-panel mission-panel">
                  <div className="section-header">
                    <h2 className="section-title">{ICONS.sparkles} 工作流任务</h2>
                    <p className="section-desc">任务会自动携带今日资讯、用户画像、追踪关键词和来源偏好。</p>
                  </div>
                  <div className="agent-scope-selector">
                    {agentWorkflowScopes.map(scope => (
                      <button
                        key={scope.id}
                        type="button"
                        className={agentWorkflowScope === scope.id ? 'active' : ''}
                        onClick={() => setAgentWorkflowScope(scope.id)}
                      >
                        <span>{scope.label}</span>
                        <small>{scope.desc}</small>
                      </button>
                    ))}
                  </div>
                  <div className="agent-workflow-missions">
                    {intelligenceMissions.map(mission => {
                      const agent = agents.find(a => a.id === mission.agentId);
                      return (
                        <button
                          key={mission.id}
                          className={`agent-workflow-mission ${agentWorkflowResult.missionId === mission.id ? 'active' : ''}`}
                          onClick={() => runAgentWorkflow(mission)}
                        >
                          <span>{mission.label}</span>
                          <small>{agent?.name || '智能体'}</small>
                        </button>
                      );
                    })}
                  </div>
                  <div className="agent-custom-run">
                    <label>自定义任务</label>
                    <textarea
                      id="agent-workflow-custom-prompt"
                      name="agentWorkflowPrompt"
                      value={agentWorkflowPrompt}
                      onChange={e => setAgentWorkflowPrompt(e.target.value)}
                      placeholder="例如：只分析我关注领域里的机会，并给出三个可执行创作选题"
                      rows={4}
                    />
                    <button onClick={() => runAgentWorkflow(intelligenceMissions[0], agentWorkflowPrompt)}>
                      运行自定义工作流
                    </button>
                  </div>
                </div>

                <div className="agent-workflow-panel context-panel">
                  <div className="section-header">
                    <h2 className="section-title">{ICONS.follow} 个性化上下文</h2>
                    <p className="section-desc">产品不只聚焦 AI，会从你的选择由小及大扩展到科技、商业、政策和产业赛道。</p>
                  </div>
                  <div className="agent-context-grid">
                    <div><span>关注领域</span><strong>{intelligenceProfile.focusLabels.join('、') || '未设置'}</strong></div>
                    <div><span>追踪记忆</span><strong>{intelligenceProfile.tracked.join('、') || '暂无'}</strong></div>
                    <div><span>推荐深度</span><strong>{intelligenceProfile.depth}</strong></div>
                    <div><span>输出目标</span><strong>{intelligenceProfile.outputGoal}</strong></div>
                  </div>
                  <div className="agent-source-strategy">
                    <strong>信息源增强方向</strong>
                    <p>参考 RSSHub、feedfinder、Readability/Mercury Parser 的思路：用源发现扩大覆盖，用健康评分控制质量，用正文抽取提高图片和摘要准确性。</p>
                    <button onClick={() => { setSettingsTab('sources'); setShowSettings(true); }}>管理信息源</button>
                  </div>
                  <div className="agent-source-strategy">
                    <strong>AI 精灵定位</strong>
                    <p>小精灵继续负责随手问、引用卡片、轻量接力；复杂任务在此页面运行，避免窗口太小影响操作。</p>
                  </div>
                </div>

                <div className="agent-workflow-panel builder-panel">
                  <div className="section-header">
                    <h2 className="section-title">{ICONS.bot} 可视化工作流蓝图</h2>
                    <p className="section-desc">先用可编辑节点定义智能体协作语言，后续再升级为拖拽式画布和真实节点执行。</p>
                  </div>

                  <div className="workflow-template-bar">
                    <label>
                      <span>工作流模板</span>
                      <select value={activeWorkflowId} onChange={e => switchWorkflowTemplate(e.target.value)}>
                        {workflowTemplates.map(template => (
                          <option key={template.id} value={template.id}>{template.name || '未命名工作流'}</option>
                        ))}
                      </select>
                    </label>
                    <button onClick={saveWorkflowAsTemplate}>{ICONS.plus} 保存副本</button>
                    <button onClick={() => deleteWorkflowTemplate(activeWorkflowId)}>删除模板</button>
                  </div>

                  <div className="workflow-template-gallery">
                    <div className="workflow-gallery-head">
                      <div>
                        <span>成熟模板库</span>
                        <strong>从真实工作流产品提炼的三条起步链路</strong>
                      </div>
                      <div className="workflow-import-actions">
                        <input
                          ref={workflowImportInputRef}
                          type="file"
                          accept="application/json,.json"
                          onChange={e => importWorkflowJson(e.target.files?.[0])}
                          hidden
                        />
                        <button type="button" onClick={() => workflowImportInputRef.current?.click()}>
                          导入 JSON
                        </button>
                      </div>
                    </div>
                    <div className="workflow-template-cards">
                      {WORKFLOW_TEMPLATE_LIBRARY.map(template => (
                        <button
                          key={template.id}
                          type="button"
                          className="workflow-template-card"
                          onClick={() => installWorkflowTemplate(template)}
                        >
                          <strong>{template.name}</strong>
                          <p>{template.description}</p>
                          <small>{template.source}</small>
                          <span>{template.nodes.length} 节点 · {template.tags.join(' / ')}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={`workflow-validation-panel ${workflowValidation.ready ? 'ready' : 'blocked'}`}>
                    <div className="workflow-validation-head">
                      <div>
                        <span>运行前检查</span>
                        <strong>{workflowValidation.ready ? '工作流已就绪' : `${workflowValidation.blockingIssues.length} 个阻塞项`}</strong>
                      </div>
                      <em>{workflowValidation.score}%</em>
                    </div>
                    <div className="workflow-validation-list">
                      {workflowValidation.checks.slice(0, 8).map(check => (
                        <div key={check.id} className={`workflow-validation-item ${check.ok ? 'ok' : check.blocking ? 'bad' : 'warn'}`}>
                          <span>{check.ok ? 'OK' : check.blocking ? 'Fix' : 'Warn'}</span>
                          <p>{check.label}<small>{check.detail}</small></p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="workflow-draft-form">
                    <label>
                      <span>工作流名称</span>
                      <input
                        value={agentWorkflowDraft.name}
                        onChange={e => updateWorkflowDraft({ name: e.target.value })}
                      />
                    </label>
                    <label>
                      <span>目标说明</span>
                      <textarea
                        value={agentWorkflowDraft.description}
                        onChange={e => updateWorkflowDraft({ description: e.target.value })}
                        rows={2}
                      />
                    </label>
                  </div>

                  <div className="workflow-canvas">
                    {agentWorkflowDraft.nodes.map((node, index) => (
                      <div
                        key={node.id}
                        className={`workflow-node-frame ${draggingWorkflowNodeId === node.id ? 'dragging' : ''}`}
                        draggable
                        onDragStart={() => setDraggingWorkflowNodeId(node.id)}
                        onDragOver={e => e.preventDefault()}
                        onDrop={() => {
                          reorderWorkflowNode(draggingWorkflowNodeId, node.id);
                          setDraggingWorkflowNodeId('');
                        }}
                        onDragEnd={() => setDraggingWorkflowNodeId('')}
                      >
                        <button
                          type="button"
                          className={`workflow-builder-node tone-${workflowTypeMeta[node.type]?.tone || 'slate'} ${selectedWorkflowNodeId === node.id ? 'active' : ''} ${node.enabled === false ? 'disabled' : ''}`}
                          onClick={() => setSelectedWorkflowNodeId(node.id)}
                        >
                          <span className="workflow-node-index">{String(index + 1).padStart(2, '0')}</span>
                          <span className="workflow-node-type">{workflowTypeMeta[node.type]?.label || node.type}</span>
                          <strong>{node.title}</strong>
                          <p>{node.role}</p>
                          {formatWorkflowNodeConfig(node) && <small>{formatWorkflowNodeConfig(node)}</small>}
                        </button>
                        {index < agentWorkflowDraft.nodes.length - 1 && <span className="workflow-connector">→</span>}
                      </div>
                    ))}
                  </div>

                  <div className="workflow-add-row">
                    <select value={newWorkflowNodeType} onChange={e => setNewWorkflowNodeType(e.target.value)}>
                      {Object.entries(workflowTypeMeta).map(([type, meta]) => (
                        <option key={type} value={type}>{meta.label}</option>
                      ))}
                    </select>
                    <button onClick={addWorkflowNode}>{ICONS.plus} 添加节点</button>
                    <button className="workflow-save-blueprint" onClick={exportWorkflowToMaterials}>{ICONS.layers} 保存蓝图</button>
                    <button className="workflow-download-json" onClick={downloadWorkflowJson}>{ICONS.download} 导出 JSON</button>
                    <button onClick={resetWorkflowDraft}>恢复模板</button>
                  </div>

                  {selectedWorkflowNode && (
                    <div className="workflow-node-editor">
                      <div className="workflow-node-editor-head">
                        <div>
                          <span>节点配置</span>
                          <strong>{selectedWorkflowNode.title}</strong>
                        </div>
                        <div className="workflow-node-tools">
                          <button onClick={() => moveWorkflowNode(selectedWorkflowNode.id, 'up')}>上移</button>
                          <button onClick={() => moveWorkflowNode(selectedWorkflowNode.id, 'down')}>下移</button>
                          <label className="workflow-toggle">
                            <input
                              type="checkbox"
                              checked={selectedWorkflowNode.enabled !== false}
                              onChange={e => updateWorkflowNode(selectedWorkflowNode.id, { enabled: e.target.checked })}
                            />
                            启用
                          </label>
                        </div>
                      </div>
                      <div className="workflow-node-editor-grid">
                        <label>
                          <span>节点标题</span>
                          <input
                            className="workflow-node-title-input"
                            value={selectedWorkflowNode.title}
                            onChange={e => updateWorkflowNode(selectedWorkflowNode.id, { title: e.target.value })}
                          />
                        </label>
                        <label>
                          <span>节点类型</span>
                          <select
                            value={selectedWorkflowNode.type}
                            onChange={e => updateWorkflowNode(selectedWorkflowNode.id, { type: e.target.value })}
                          >
                            {Object.entries(workflowTypeMeta).map(([type, meta]) => (
                              <option key={type} value={type}>{meta.label}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <label>
                        <span>职责说明</span>
                        <textarea
                          value={selectedWorkflowNode.role}
                          onChange={e => updateWorkflowNode(selectedWorkflowNode.id, { role: e.target.value })}
                          rows={2}
                        />
                      </label>
                      <label>
                        <span>执行指令 / Prompt</span>
                        <textarea
                          value={selectedWorkflowNode.prompt}
                          onChange={e => updateWorkflowNode(selectedWorkflowNode.id, { prompt: e.target.value })}
                          rows={4}
                        />
                      </label>
                      {selectedWorkflowNode.type === 'skill' && (
                        <label>
                          <span>内置 Skill 能力</span>
                          <select
                            value={selectedWorkflowNode.skillId || 'evidence-pack'}
                            onChange={e => updateWorkflowNode(selectedWorkflowNode.id, { skillId: e.target.value })}
                          >
                            {WORKFLOW_SKILL_CATALOG.map(skill => (
                              <option key={skill.id} value={skill.id}>{skill.label}</option>
                            ))}
                          </select>
                        </label>
                      )}
                      {selectedWorkflowNode.type === 'condition' && (
                        <div className="workflow-node-editor-grid condition-grid">
                          <label>
                            <span>判断指标</span>
                            <select
                              value={selectedWorkflowNode.conditionMetric || 'itemCount'}
                              onChange={e => updateWorkflowNode(selectedWorkflowNode.id, { conditionMetric: e.target.value })}
                            >
                              {WORKFLOW_CONDITION_METRICS.map(metric => (
                                <option key={metric.id} value={metric.id}>{metric.label}</option>
                              ))}
                            </select>
                          </label>
                          <label>
                            <span>条件</span>
                            <select
                              value={selectedWorkflowNode.conditionOperator || '>='}
                              onChange={e => updateWorkflowNode(selectedWorkflowNode.id, { conditionOperator: e.target.value })}
                            >
                              {WORKFLOW_CONDITION_OPERATORS.map(operator => (
                                <option key={operator.id} value={operator.id}>{operator.label}</option>
                              ))}
                            </select>
                          </label>
                          <label>
                            <span>阈值</span>
                            <input
                              type="number"
                              value={selectedWorkflowNode.conditionValue ?? 1}
                              onChange={e => updateWorkflowNode(selectedWorkflowNode.id, { conditionValue: Number(e.target.value) })}
                            />
                          </label>
                        </div>
                      )}
                      {selectedWorkflowNode.type === 'classifier' && (
                        <label>
                          <span>分类桶</span>
                          <input
                            value={selectedWorkflowNode.classifierLabels || '必读,追踪,素材,创作,降噪'}
                            onChange={e => updateWorkflowNode(selectedWorkflowNode.id, { classifierLabels: e.target.value })}
                            placeholder="例如 必读,追踪,素材,创作,降噪"
                          />
                        </label>
                      )}
                      <div className="workflow-node-editor-grid">
                        <label>
                          <span>输入变量</span>
                          <input
                            value={selectedWorkflowNode.inputKey || ''}
                            onChange={e => updateWorkflowNode(selectedWorkflowNode.id, { inputKey: e.target.value })}
                            placeholder="例如 briefing_context"
                          />
                        </label>
                        <label>
                          <span>输出变量</span>
                          <input
                            value={selectedWorkflowNode.outputKey || ''}
                            onChange={e => updateWorkflowNode(selectedWorkflowNode.id, { outputKey: e.target.value })}
                            placeholder="例如 ranked_signals"
                          />
                        </label>
                      </div>
                      <button className="workflow-delete-node" onClick={() => removeWorkflowNode(selectedWorkflowNode.id)}>删除节点</button>
                      <div className="workflow-node-relations">
                        <div>
                          <span>上游</span>
                          <strong>{selectedWorkflowConnections.previous?.title || '起点'}</strong>
                        </div>
                        <div>
                          <span>下游</span>
                          <strong>{selectedWorkflowConnections.next?.title || '终点'}</strong>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="workflow-blueprint-preview">
                    <span>当前启用链路</span>
                    <p>{enabledWorkflowNodes.map(node => node.title).join(' → ') || '暂无启用节点'}</p>
                  </div>
                </div>

                <div className="agent-workflow-panel result-panel">
                  <div className="section-header">
                    <h2 className="section-title">{ICONS.document} 工作流输出</h2>
                    <p className="section-desc">结果可继续交给小助手追问，或沉淀到素材库。</p>
                  </div>
                  <div className={`workflow-run-panel status-${agentWorkflowRun.status || 'idle'}`}>
                    <div className="workflow-run-head">
                      <div>
                        <span>最近运行</span>
                        <strong>{agentWorkflowRun.missionLabel || '尚未运行工作流'}</strong>
                      </div>
                      <em>{workflowRunStatusMeta[agentWorkflowRun.status]?.label || '待运行'}</em>
                    </div>
                    {agentWorkflowRun.startedAt && (
                      <p className="workflow-run-time">
                        开始：{new Date(agentWorkflowRun.startedAt).toLocaleTimeString('zh-CN')}
                        {agentWorkflowRun.finishedAt ? ` · 结束：${new Date(agentWorkflowRun.finishedAt).toLocaleTimeString('zh-CN')}` : ''}
                      </p>
                    )}
                    <div className="workflow-run-trace">
                      {(agentWorkflowRun.trace?.length ? agentWorkflowRun.trace : enabledWorkflowNodes.map((node, index) => ({
                        id: node.id,
                        title: node.title,
                        type: node.type,
                        order: index + 1,
                        status: 'idle',
                        detail: node.role
                      }))).map(step => (
                        <div key={step.id} className={`workflow-trace-step status-${step.status}`}>
                          <span>{String(step.order).padStart(2, '0')}</span>
                          <div>
                            <strong>{step.title}</strong>
                            <p>{step.detail}</p>
                            {(step.inputKey || step.outputKey) && (
                              <small className="workflow-trace-io">
                                {(step.inputKey || 'context')} → {(step.outputKey || 'output')}
                              </small>
                            )}
                            {step.variablePreview && <small className="workflow-trace-io">{step.variablePreview}</small>}
                            {step.output && <pre>{step.output.slice(0, 420)}</pre>}
                          </div>
                          <em>{step.status}</em>
                        </div>
                      ))}
                    </div>
                  </div>
                  {agentWorkflowHistory.length > 0 && (
                    <div className="workflow-memory-panel">
                      <div className="workflow-memory-head">
                        <div>
                          <span>任务记忆</span>
                          <strong>{agentWorkflowHistory.length} 次运行</strong>
                        </div>
                        <button onClick={clearAgentWorkflowHistory}>清空</button>
                      </div>
                      <div className="workflow-memory-list">
                        {agentWorkflowHistory.slice(0, 4).map(record => (
                          <button
                            type="button"
                            key={record.id}
                            className={`workflow-memory-item status-${record.status || 'completed'}`}
                            onClick={() => restoreAgentWorkflowHistory(record)}
                          >
                            <span>{record.missionLabel || '历史任务'}</span>
                            <strong>{record.workflowName || agentWorkflowDraft.name}</strong>
                            <em>{record.finishedAt ? new Date(record.finishedAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '未完成'}</em>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {agentWorkflowResult.loading && <div className="agent-result-loading"><div className="spinner" /><span>智能体正在处理今日情报...</span></div>}
                  {!agentWorkflowResult.loading && agentWorkflowResult.error && (
                    <div className="agent-result-error">
                      <p>{agentWorkflowResult.error}</p>
                      <button onClick={() => setShowLlmQuickConfig(true)}>配置大模型</button>
                    </div>
                  )}
                  {!agentWorkflowResult.loading && !agentWorkflowResult.error && !agentWorkflowResult.content && (
                    <div className="agent-result-empty">
                      <p>选择左侧任务后，结果会在这里生成。</p>
                    </div>
                  )}
                  {!agentWorkflowResult.loading && agentWorkflowResult.content && (
                    <>
                      <pre className="agent-result-content">{agentWorkflowResult.content}</pre>
                      {agentWorkflowActions.length > 0 && (
                        <div className="workflow-action-panel">
                          <div className="workflow-action-head">
                            <div>
                              <span>可执行动作</span>
                              <strong>{agentWorkflowActions.filter(action => action.status !== 'done').length} 个待处理</strong>
                            </div>
                          </div>
                          <div className="workflow-action-list">
                            {agentWorkflowActions.map(action => (
                              <div key={action.id} className={`workflow-action-item status-${action.status || 'pending'}`}>
                                <div className="workflow-action-main">
                                  <span>{action.label}</span>
                                  <strong>{action.title}</strong>
                                  <p>{action.desc}</p>
                                </div>
                                <button onClick={() => executeWorkflowAction(action)}>
                                  {action.status === 'done' ? '已完成' : '执行'}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="agent-result-actions">
                        <button onClick={() => addManualMaterial({
                          title: `${agentWorkflowDraft.name || '智能体工作流'} ${new Date().toLocaleDateString('zh-CN')}`,
                          content: `${agentWorkflowResult.content}\n\n---\n\n工作流蓝图\n${workflowBlueprintText}`,
                          type: 'analysis',
                          source: '智能体工作流',
                          url: '',
                          tags: '智能体,情报分析',
                          note: '',
                          spaceId: null
                        })}>存入素材库</button>
                        <button onClick={exportWorkflowResultToEditor}>导出到内容创作</button>
                        <button onClick={() => sendWorkbenchToElf(`请基于以下智能体工作流结果继续追问：\n${agentWorkflowResult.content}`, currentAgent)}>
                          交给小助手追问
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </section>
            </div>
  );
}

export default AgentsPage;
