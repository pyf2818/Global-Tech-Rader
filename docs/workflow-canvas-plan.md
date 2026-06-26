# 智能体工作流画布系统 — 架构规划

## 系统总览

四层架构，无外部依赖，纯 React 19 + SVG + CSS 实现。

```
┌─────────────────────────────────────────────────────────┐
│                    Visual Canvas 层                        │
│  WorkflowCanvas (SVG edges + HTML nodes)                  │
│  WorkflowNodeCard | WorkflowEdge | NodePalette            │
├─────────────────────────────────────────────────────────┤
│                    Runtime Engine 层                       │
│  WorkflowEngine class: topological sort, per-node dispatch│
│  useWorkflowEngine hook → React state bridge              │
├─────────────────────────────────────────────────────────┤
│                    Template Layer 层                       │
│  workflowConstants.js: templates, node types, skill catalog│
│  createWorkflowTemplateInstance()                         │
├─────────────────────────────────────────────────────────┤
│                    Agent Bridge 层                         │
│  LLM nodes → AiElf agent registry + buildPersonalContext()│
│  Skill nodes → internal skill builders                    │
└─────────────────────────────────────────────────────────┘
```

## 节点类型（8种）

| Type | 输入端口 | 输出端口 | 说明 |
|---|---|---|---|
| input | 0 | 1 | 聚合 scopedAgentItems + profile + mission → context blob |
| llm | 1 | 1 | 调用 /api/ai-generate，注入 agent persona |
| skill | 1 | 1 | 执行内置 skill（evidence-pack 等 6 种） |
| classifier | 1 | N | 多路分支：必读/追踪/素材/创作/降噪 |
| condition | 1 | 2 | 双分支：onTrue / onFalse |
| reply | 1 | 1 | 人工审查暂停点 |
| output | 1 | 0 | 终止节点，格式化为 briefing 并持久化 |
| agent | 1 | 1 | 绑定 AiElf agent，支持 relay chain |

## 执行引擎

- 拓扑排序 → 执行 enabled 节点
- 节点间通过 inputKey/outputKey 传递数据
- LLM 节点调用 `/api/ai-generate`，其他节点用本地 handler
- 错误处理：失败节点标记 failed，下游跳过，独立分支继续
- trace 实时更新到 agentWorkflowRun

## 文件清单

```
src/
  constants/workflowConstants.js   # WORKFLOW_NODE_TYPES, templates, DEFAULT_AGENT_WORKFLOW
  utils/workflowEngine.js          # WorkflowEngine class (~500 lines)
  hooks/useWorkflowEngine.js       # React hook wrapper (~200 lines)
  components/
    WorkflowNodeCard.jsx            # 节点卡片 (~80 lines)
    WorkflowEdge.jsx                # SVG 连线 (~60 lines)
    WorkflowCanvas.jsx              # 主画布 (~250 lines)
```

## 实现阶段

**Phase 1** (constants → engine → hook): 从 App.jsx 提取 ~700 行纯逻辑，零 UI 变更
**Phase 2** (canvas components): 构建 WorkflowCanvas + NodeCard + Edge
**Phase 3** (App.jsx cleanup): 移除内联逻辑，替换为组件化结构

## 关键设计决策

1. **无新依赖**：画布用 SVG + HTML 叠加，不用 react-flow
2. **不可变数据**：所有状态更新返回新对象
3. **渐进重构**：先提取引擎使其独立可测，再替换 UI
4. **行为零变更**：用户看到的节点执行结果、输出格式完全一致
