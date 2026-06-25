# 万般硅川 v2 架构蓝图

> 目标：从“资讯聚合站”升级为“高质量、多领域、高精准、智能化程度高的个人情报与创作平台”。

## 1. 产品定位

**万般硅川**不是普通新闻列表，也不是简单 AI 按钮合集，而是一个面向 AI 时代的个人情报操作系统：

- 帮用户从大量多源信息里筛出真正值得看的内容
- 根据用户画像、阅读行为、收藏行为持续理解用户
- 将资讯沉淀为素材、知识资产、文章、智能体工作流
- 用 AI 精灵辅助理解，用智能体工作流执行复杂创作与分析任务

## 2. 核心信息架构

v2 只保留以下核心入口，其余功能隐藏、合并或删除。

```text
万般硅川
├── 每日汇报
├── 全部动态
├── GitHub 热门
├── 智创中心
│   ├── 素材库
│   ├── 智能体工作流
│   └── 内容创作
├── 用户广场
├── 用户画像
└── AI 精灵助手（悬浮，不作为主导航栏目）
```

## 3. 模块定义

### 3.1 每日汇报

每日汇报是首页和核心体验，不是普通推荐列表。

#### 目标

根据用户画像、信源优先级、领域优先级、阅读记录、收藏记录和大模型分析，生成每日高质量信息摘要。

#### 功能

- 今日精选资讯
- 推荐理由
- 对用户的影响
- 值得追踪的信号
- 可沉淀为素材的卡片
- 可转化为文章/选题的建议
- 每日画像快照引用

#### 数据结构建议

```ts
type DailyBriefing = {
  id: string;
  date: string;
  userProfileSnapshotId: string;
  items: DailyBriefingItem[];
  summary: string;
  opportunities: string[];
  risks: string[];
  recommendedReads: string[];
  createdAt: string;
};

type DailyBriefingItem = {
  newsItemId: string;
  score: number;
  reason: string;
  impact: string;
  trackingSuggestion?: string;
  materialSuggestion?: string;
};
```

### 3.2 全部动态

全部动态用于扩展视野，不承担主推荐职责。

#### 保留能力

- 多领域
- 多信源
- 搜索
- 分类筛选
- 来源质量等级
- 信息流浏览

#### 简化方向

- 不再堆叠过多子栏目
- 将“趋势、追踪、日历、阅读画像”等拆入用户画像或每日汇报

### 3.3 GitHub 热门

GitHub 热门不只是 repo 列表，而是项目情报卡。

#### 核心能力

- 日榜 / 周榜 / 月榜
- README 图片解析
- 项目 banner/logo 识别
- AI 应用场景标注
- 项目适用人群
- 技术价值 / 商业价值
- 收藏到素材库

#### 数据结构建议

```ts
type GithubProjectInsight = {
  repo: string;
  url: string;
  stars: number;
  language: string;
  readmeImages: string[];
  applicationScenarios: string[];
  targetUsers: string[];
  technicalValue: string;
  businessValue: string;
  aiSummary: string;
};
```

### 3.4 智创中心

智创中心由三大子系统组成：素材库、智能体工作流、内容创作。

---

## 4. 智能体工作流设计

### 4.1 技术选型

采用 `@xyflow/react`，原因：

- React 原生，适合当前 React + Vite 项目
- Dify / Flowise / Langflow 等 AI 工作流产品均采用 React Flow 或其前身
- 支持自定义节点、边、handle、Minimap、Controls、Background
- 支持序列化：`reactFlowInstance.toObject()`
- 支持复杂分支：多个 sourceHandle / targetHandle
- 社区成熟，维护活跃
- 工作流搭建是可视化的画板，类似dify、n8n可以拖拽节点到画布里可视化搭建

参考文档：`docs/reactflow-implementation-guide.md`

### 4.2 工作流定义态与执行态分离

工作流 JSON 只保存拓扑与配置，不保存运行结果。

```ts
type AgentWorkflowDefinition = {
  id: string;
  name: string;
  version: number;
  active: boolean;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  groups?: WorkflowGroup[];
  viewport?: { x: number; y: number; zoom: number };
  createdAt: string;
  updatedAt: string;
};

type AgentWorkflowExecution = {
  id: string;
  workflowId: string;
  status: 'idle' | 'running' | 'success' | 'failed' | 'canceled';
  startedAt: string;
  stoppedAt?: string;
  runData: Record<string, NodeRunData>;
};
```

### 4.3 节点模型

使用 React Flow 原生 nodes/edges：

```ts
type WorkflowNode = {
  id: string;
  type: WorkflowNodeType;
  typeVersion: number;
  name: string;
  position: { x: number; y: number };
  data: {
    label: string;
    parameters: Record<string, unknown>;
    inputSchema?: NodePortSchema[];
    outputSchema?: NodePortSchema[];
  };
};

type WorkflowEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  type?: 'main' | 'conditional' | 'tool' | 'memory';
  label?: string;
};
```

### 4.4 必备节点类型

第一阶段只做真正有用的节点，不做空壳。


| 节点                | 用途                               |
| ----------------- | -------------------------------- |
| `input`           | 用户输入 / 外部上下文输入                   |
| `llm`             | 大模型调用，包含 system/user prompt、模型参数 |
| `tool`            | 工具调用，如网页抓取、RSS 查询、素材检索           |
| `condition`       | 条件判断，输出 true/false 两个 handle     |
| `classifier`      | 分类节点，多分支输出                       |
| `material-search` | 从素材库检索上下文                        |
| `response`        | 指定回复模板                           |
| `output`          | 工作流最终输出                          |
| `subworkflow`     | 调用另一个工作流                         |
| `note`            | 画布说明便签                           |


### 4.5 连接规则

必须类型化连接，避免任意节点乱连：

```ts
type NodePortSchema = {
  id: string;
  label: string;
  type: 'text' | 'json' | 'items' | 'material' | 'llm-message' | 'boolean';
  required?: boolean;
};
```

连接校验：

- output type 必须兼容 input type
- condition 节点必须有 true/false 两个 sourceHandle
- output 节点不允许有 source handle
- input 节点不允许有 target handle
- 子工作流通过 workflowId 引用，不内联嵌套

### 4.6 执行引擎

执行流程：

1. 校验拓扑是否有起点和终点
2. 构建 DAG
3. 按依赖顺序执行节点
4. condition/classifier 根据结果选择分支
5. 每个节点运行结果写入 `AgentWorkflowExecution.runData`
6. 最终 output 可导出到：素材库 / 内容创作 / 每日汇报

---

## 5. 素材库设计

素材库是信息资产中心。

### 5.1 来源

- 资讯卡片收藏
- GitHub 项目卡
- 每日汇报条目
- 本地上传
- AI 精灵输出
- 智能体工作流输出
- 内容创作草稿片段

### 5.2 数据结构

```ts
type Material = {
  id: string;
  title: string;
  type: 'news' | 'github' | 'briefing' | 'upload' | 'ai-output' | 'workflow-output' | 'note';
  content: string;
  summary?: string;
  sourceUrl?: string;
  tags: string[];
  spaceId: string;
  folderId?: string;
  createdAt: string;
  updatedAt: string;
};
```

### 5.3 必备能力

- 空间管理
- 文件夹管理
- 标签
- 搜索
- 预览
- 发送到内容创作
- 作为智能体工作流上下文

---

## 6. 内容创作设计

内容创作要升级为真正的编辑器，而不是 textarea。

### 6.1 技术方向

候选：

- TipTap：ProseMirror 生态，扩展成熟，适合类 Word / Notion 编辑器
- Lexical：Meta 出品，性能好，但生态和导出链路需要更多自建
- Plate：Slate 生态，插件多，但复杂度高

初步建议：**TipTap**。

### 6.2 能力

- 标题 / 段落 / 列表
- 图片 / 表格 / 引用 / 代码块
- Slash 命令
- 素材库插入
- AI 改写 / 总结 / 扩写
- Markdown / HTML 导出
- 本地知识库资产导出

---

## 7. 用户画像系统

用户画像是每日汇报的基础。

### 7.1 输入信号

- 阅读点击
- 收藏
- 停留时长（后续）
- 关注领域
- 自定义领域优先级（有专门模块可以让用户拖拽排等级管理）
- 信源优先级（有专门模块可以让用户拖拽排等级管理）
- 屏蔽/降权主题
- AI 精灵提问内容

### 7.2 每日画像快照

```ts
type UserProfileSnapshot = {
  id: string;
  date: string;
  focusAreas: string[];
  sourcePreferences: Record<string, number>;
  domainPreferences: Record<string, number>;
  inferredInterests: string[];
  mutedTopics: string[];
  trackingTargets: string[];
  summary: string;
  createdBy: 'system' | 'ai';
};
```

---

## 8. AI 精灵与智能体系统的边界

### AI 精灵

- 浮动小窗
- 辅助理解资讯
- 快速解释 / 追问 / 翻译 / 总结
- 可以引用当前资讯上下文
- 不承担复杂工作流编排

### 智能体工作流

- 在智创中心内
- 可视化编排
- 可保存、复用、导出
- 有节点、边、执行记录
- 可接入素材库和内容创作

---

## 9. 迁移步骤

### Phase 1：产品瘦身

- 主导航只保留 6 个入口：每日汇报、全部动态、GitHub 热门、智创中心、用户广场、用户画像
- AI 精灵保持悬浮
- 其他页面合并或隐藏

### Phase 2：App.jsx 拆分

新增：

```text
src/pages/DailyBriefingPage.jsx
src/pages/AllDynamicsPage.jsx
src/pages/GithubTrendingPage.jsx
src/pages/CreationCenterPage.jsx
src/pages/MaterialsPage.jsx
src/pages/AgentWorkflowPage.jsx
src/pages/ContentEditorPage.jsx
src/pages/SquarePage.jsx
src/pages/ProfilePage.jsx
```

### Phase 3：智能体工作流基础设施

- 安装 `@xyflow/react`
- 新增 workflow 数据模型
- 新增节点注册表
- 新增画布编辑器
- 新增执行态对象

### Phase 4：素材库重建

- 空间 / 文件夹 / 标签
- 统一 Material 数据结构
- 与资讯、GitHub、每日汇报联动

### Phase 5：内容创作升级

- 引入 TipTap
- 支持素材插入和导出
- 接入智能体工作流输出

### Phase 6：每日汇报推荐闭环

- 使用画像 + 行为 + LLM 生成日报
- 每日保留快照
- 支持反馈调优

---

## 10. 质量要求

后续开发必须避免以下问题：

- 不做只有卡片边框的空壳页面
- 不把智能体简化成 prompt 列表
- 不在 App.jsx 继续无限堆逻辑
- 不把执行状态塞进 workflow 定义
- 不把 AI 精灵和智能体工作流混为一谈
- 每个模块必须有真实数据结构和用户操作闭环

