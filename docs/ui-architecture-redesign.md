# 万般硅川 UI 架构重新设计方案

> 参考飞书设计理念，结合第一性原理与对抗性思维，对前端 UI 架构进行系统性重构。
> 日期：2026-07-07 | 当前分支：codex/intelligence-workbench-redesign

---

## 一、飞书做对了什么（第一性原理分析）

飞书功能数量远超万般硅川（即时通讯、文档、日历、视频会议、OKR、审批、多维表格、知识库……），但用户感知不是"功能多"，而是"找得到、走得通、不打断"。拆解其底层设计选择：

### 1.1 三段式骨架：导航 → 列表 → 详情

飞书桌面端核心骨架极其稳定：

```
┌─ 左栏 ────┬─ 中栏 ───────────┬─ 右栏/主区 ─────────┐
│ 工作台     │ 当前对象列表       │ 详情/编辑器          │
│ 会话列表   │ 消息流/文档列表     │ 内容主区             │
│ (可折叠)   │                    │ (可选)               │
└────────────┴────────────────────┴──────────────────────┘
```

这套三栏结构在 IM、文档、多维表格、审批里**复用同一套布局原语**，只是中栏/右栏的内容类型不同。用户的肌肉记忆跨模块迁移，学习成本被摊薄到一次。

### 1.2 命令面板（Ctrl+K）是"第一公民"

飞书把"搜索 + 快捷操作 + 跳转"统一进全局命令面板。用户不需要记住功能藏在哪个菜单，`Ctrl+K` 输两三个字就能到达任何地方。这是**对"功能多"最诚实的承认**——功能多了就该被搜索，而不是被塞进导航栏。

### 1.3 上下文持续在场

飞书的侧边栏、AI 助手、通知中心是**全局常驻**的。你在任何文档里都能呼出 AI、看到消息红点、跳回会话。当前页面不会"覆盖"全局上下文。

### 1.4 渐进式披露：先概览再操作

飞书文档列表先展示标题+摘要，hover 才出操作按钮；多维表格先展示视图，点击才进字段配置。**默认状态永远是"看"，操作是"呼出"的**。

### 1.5 视觉降噪：单一布局原语 + 间距系统

飞书的卡片、面板、按钮使用**极少数布局原语**（card / panel / section / row），靠间距和分隔线分层，而不是靠不同的边框圆角背景色。

---

## 二、对抗性思维：先反驳"飞书模式适合你"

在做方案前，必须先质疑这个类比的合法性，否则就是盲目套用。

### 反驳 1：信息密度不同

飞书用户是**主动操作**（写文档、发消息、审批），需要稳定的操作面。万般硅川用户大部分时间是**被动消费+轻度操作**（看资讯、收藏、生成汇报）。强行三栏布局可能让信息消费变得僵硬——读新闻本来就需要"沉浸式纵向流"，不需要左栏列表。

> **结论**：三栏不是教条，但"布局原语统一"和"上下文常驻"是普适的。today/all 这种消费型页面保留纵向流，但 hero/stats/filter 这些非内容元素应被压缩进常驻的顶栏或侧栏，而不是每个页面重画一遍。

### 反驳 2：功能数量不足以支撑命令面板

飞书有几百个入口，`Ctrl+K` 是必需品。当前只有 9 个主导航，命令面板可能显得过度设计。

> **结论**：命令面板的价值不在"功能多"，而在"**手不离键盘 + 跨模块跳转 + 全局搜索资讯**"。核心资产是资讯和素材，一个能同时搜"资讯标题 + 素材 + 文章 + 跳转页面"的统一搜索框，比 9 个导航按钮更有飞书感。优先级低于布局统一，但值得做。

### 反驳 3：快速迭代期不宜大重构

10105 行的 App.jsx + 3784 个 CSS 类，一次性重写必然引入回归（140 个测试只覆盖纯逻辑引擎，UI 零覆盖）。

> **结论**：这恰恰是现在就该做的原因。每加一个页面就要新发明一套 `xxx-panel` 命名和 CSS，技术债在指数级增长。统一原语是**减法**，不是加法——它让后续每个新页面的成本从"设计+实现一套布局"降为"填内容进既有槽位"。但必须分阶段执行，每阶段独立可发布、可回滚。

---

## 三、诊断：万般硅川"方块堆叠"问题的根因

### 3.1 现象层

每个页面都是 hero + 一堆 section + 一堆 card 纵向堆叠：

| 页面 | hero | 统计块 | section 数 | 独特 className 数 |
|------|------|--------|-----------|------------------|
| today | ✓ | 4 stat | 5（overview + feed + hotspot + recs + sentinel） | ~45 |
| studio | ✓ | — | 4（hero + quick-create + module-grid + asset-row） | ~20 |
| profile-center | ✓ | 4 grid | 6（hero + summary + learning + control×2 + calibration + memory） | ~35 |
| agents | ✓ | — | 4（hero + mission + context + builder + result） | ~40 |
| stock | ✓ header | 5 index | 1（三栏 body） | ~60 |

### 3.2 结构层

styles.css 有 **3784 个类选择器**，大量 `*-panel` / `*-card` / `*-grid` 重复定义同样的 padding/border/radius：

```
studio-module-card       → padding:18px border:1px solid var(--border-color) border-radius:12px
profile-summary-grid div → padding:18px border:1px solid var(--border-color) border-radius:12px
studio-asset-panel       → padding:16px display:flex flex-direction:column gap:10px
profile-control-panel    → padding:18px border:1px solid var(--border-color) border-radius:12px
agent-workflow-panel     → min-height:420px padding:18px border:1px solid var(--border-color) border-radius:12px
```

视觉上每块都在"喊话"，没有主次。

### 3.3 架构层

20 个 `nav` 视图分支全部在 App.jsx 里用条件渲染，每个分支内部又是几百行 JSX：

```jsx
// App.jsx（10240 行）中类似结构重复 20 次：
{nav === 'today' && (
  <div className="product-page ...">
    <section className="workbench-overview">
      <div className="hero-briefing-summary">
        <div className="hero-briefing-stat">...</div> ×4
      </div>
      <div className="timeline-manager">...</div>
      <div className="workbench-preferences">...</div>
    </section>
    <section className="workbench-feed-panel">
      <div className="workbench-toolbar">...</div>
      <div className="workbench-filter-row">...</div>
      <div className="workbench-news-list">...</div>
    </section>
  </div>
)}
```

**"方块堆叠"不是 CSS 问题，是信息架构问题**。卡片堆叠只是表象，真正的病根是：每个页面都把"导航/筛选/统计/列表/操作"全部压成纵向 section，没有区分"常驻上下文"和"页面主体"。

---

## 四、优化方案：三层架构 + 统一原语

### 4.1 三层架构：Shell → Page → Block

把现在"App.jsx 既当 shell 又当 page"的扁平结构拆成三层：

```
┌─ AppShell（全局常驻，跨页面不变）───────────────────┐
│  顶栏：品牌 + 全局搜索(Ctrl+K) + AI 精灵入口 + 主题   │
│  左栏：主导航(可折叠) + 上下文摘要(今日必读数等)      │
│  右栏(可选)：AI 精灵常驻面板 / 通知                   │
├─ Page（页面骨架，布局原语统一）──────────────────────┤
│  PageHeader：标题 + 副标题 + 主操作（压缩版）         │
│  PageBody：使用统一 Block 原语组合                    │
│  └─ 支持几种标准布局：List / Split / Canvas           │
└─ Block（内容块，语义化原语）────────────────────────┘
   BlockStat / BlockPanel / BlockList / BlockToolbar / BlockGrid
```

**核心约束**：
- Page 层只决定"用哪种标准布局"，不定义样式
- Block 层只提供语义化原语，样式由统一 CSS 控制
- 新增页面 = 选布局 + 填 Block，不再新发明 className

### 4.2 页面分类：消费型 vs 操作型

按页面性质给不同的标准布局，不要一刀切三栏：

**消费型页面**（today / all / github / stock / square）：
- 布局：`ListLayout`——常驻筛选条 + 纵向内容流
- hero/stats/日期管理这些非内容元素压进顶栏或可折叠的"上下文条"
- 主体只留内容流，沉浸式阅读

**操作型页面**（studio / agents / editor / profile-center / materials）：
- 布局：`SplitLayout`——左栏对象列表 + 右栏操作面
- 比如 studio：左栏是"素材/工作流/文章"列表，右栏是选中对象的编辑/预览
- agents 已经是三栏 grid，方向对，但要纳入统一原语

**特殊页面**：
- `editor`：`CanvasLayout` 全屏，隐藏侧栏
- `WorkflowCanvas`：已经是画布型，保留

### 4.3 全局常驻上下文

飞书最值得借鉴的一点：在左栏底部或顶栏放一个"今日画像摘要"常驻块：

- 今日必读数、关注领域变化、未读素材
- 点击展开详情，不占主内容区
- 跨页面可见，用户心智模型不再随 nav 切换而重置

这把现在 today 页那个占地方的 hero-briefing-summary（4 个 stat）和 date-pill-row 提炼成全局上下文，主页面腾出来给真正的资讯流。

### 4.4 统一命令面板（中期）

一个 `Ctrl+K` 面板，统一：
- 跳转页面（9 个 nav）
- 搜索资讯（已有 search 逻辑，提升为全局）
- 搜索素材/文章/收藏
- 触发常用动作（生成今日汇报、刷新、切换主题）

### 4.5 视觉原语收敛：5 个 Block 替代散落的 className

定义一套语义化 Block 原语，所有页面只用这 5 个：

| Block | 用途 | 替代的现有类 |
|-------|------|-------------|
| `BlockStat` | 数字+标签的统计块 | hero-briefing-stat, stat-item, profile-summary-grid div |
| `BlockPanel` | 带标题的容器面板 | *-panel, *-card, agent-workflow-panel |
| `BlockList` | 列表行（带 hover 操作） | hotspot-row, profile-rec-item, agent-workflow-mission |
| `BlockToolbar` | 筛选/工具条 | workbench-filter-row, github-filter-bar, lang-tabs |
| `BlockGrid` | 卡片网格 | studio-module-grid, profile-calibration-grid, github-grid |

每个 Block 有 `variant` / `density` / `interactive` 等修饰符，而不是新命名。CSS 从 3784 个类收敛到约 200 个语义类 + 变体。

---

## 五、Block 原语 API 设计

### 5.1 BlockStat

```jsx
// 统计数字块：数字 + 标签 + 可选趋势箭头
<BlockStat value={128} label="今日资讯" trend="+12%" />
<BlockStat value="85%" label="画像置信度" />
```

Props:
- `value: number | string` — 显示的数字或百分比
- `label: string` — 标签文字
- `trend?: string` — 可选趋势（+12% / -3%），显示为绿色/红色
- `size?: 'sm' | 'md' | 'lg'` — 尺寸，默认 md

### 5.2 BlockPanel

```jsx
// 容器面板：标题 + 描述 + 内容
<BlockPanel title="画像学习引擎" icon="sparkles" desc="系统会把关注领域和阅读行为汇总成推荐记忆">
  <ProfileLearningContent />
</BlockPanel>

// 变体：简洁面板（无标题栏）
<BlockPanel variant="flat">
  <SimpleContent />
</BlockPanel>
```

Props:
- `title: string` — 面板标题
- `icon?: string` — 标题图标（ICONS key）
- `desc?: string` — 标题下方描述
- `variant?: 'default' | 'flat' | 'highlight'` — 视觉变体
- `children: ReactNode` — 面板内容
- `action?: ReactNode` — 标题栏右侧操作按钮

### 5.3 BlockList

```jsx
// 列表：每行有 rank + 标题 + meta + 可选操作
<BlockList
  items={hotspots}
  renderItem={(item, i) => (
    <BlockList.Row rank={i + 1} title={item.title} meta={`${item.sourceCount} 信源`} onClick={() => open(item)} />
  )}
/>
```

Props:
- `items: Array` — 数据数组
- `renderItem: (item, index) => ReactNode` — 行渲染函数

### 5.4 BlockToolbar

```jsx
// 筛选条：pill 按钮组 + 可选搜索框
<BlockToolbar>
  <BlockToolbar.Pills options={modeOptions} value={mode} onChange={setMode} />
  <BlockToolbar.Pills options={regionOptions} value={region} onChange={setRegion} />
  <BlockToolbar.Search value={query} onChange={setQuery} placeholder="搜索..." />
</BlockToolbar>
```

### 5.5 BlockGrid

```jsx
// 卡片网格：响应式列数，卡片间距统一
<BlockGrid columns={3}>
  {modules.map(m => (
    <BlockGrid.Card key={m.id} icon={m.icon} title={m.title} desc={m.desc} onClick={() => goNav(m.nav)} />
  ))}
</BlockGrid>
```

Props:
- `columns?: 2 | 3 | 4` — 列数，默认 3（响应式降级为 2 → 1）
- `gap?: 'sm' | 'md' | 'lg'` — 间距，默认 md

---

## 六、页面迁移映射

### 6.1 today（今日速报）— 消费型

**现状**：hero（kicker + 标题 + 副标题）→ 4 stat → 日期管理 → 关注领域 → toolbar → filter-row → hotspot-list → profile-recommendations，全部纵向堆叠。

**迁移后**：
- hero-briefing-summary（4 stat）→ 移入 AppShell 底部的 `ContextSummary`
- date-pill-row → 移入 AppShell 顶栏的日期选择器
- 关注领域（ColorfulBubbles）→ 移入左栏的 `ContextSummary`
- 主体只留 `BlockToolbar`（搜索+模式筛选）+ `BlockList`（热点+推荐）
- 总 section 从 5 个减为 2 个

### 6.2 studio（智创中心）— 操作型

**现状**：hero → quick-create ×3 → module-grid（6 card）→ workflow-node-strip → asset-row（2 panel）

**迁移后**：
- 使用 `SplitLayout`
- 左栏：`BlockGrid`（3 card，素材/工作流/文章快捷入口）
- 右栏：选中模块的操作面板（`BlockPanel`）
- hero 压缩为 `PageHeader`（一行标题 + 副操作）

### 6.3 profile-center（用户画像）— 操作型

**现状**：hero → summary-grid → learning-panel（main+side）→ control-layout（2 个 control-panel）→ calibration-panel → memory-panel，6 个 section 纵向堆叠。

**迁移后**：
- 使用 `SplitLayout`
- 左栏：画像概览（`BlockStat` ×4 + 学习引擎摘要 `BlockPanel`）
- 右栏：操作区（Tab 切换：优先级调节 / 校准状态 / 历史记录）
- hero 压缩为 `PageHeader`

### 6.4 agents（智能体）— 操作型

**现状**：hero → workflow-layout（三栏：mission/context + builder + result），方向对但 className 散落。

**迁移后**：
- 保留三栏 grid 结构（已经是正确的布局模式）
- 4 个 panel 统一用 `BlockPanel`
- mission-list 用 `BlockList`
- context-grid 用 `BlockGrid`
- builder 节点编辑器保留现有逻辑，外层包裹 `BlockPanel`

### 6.5 stock（股市）— 消费型

**现状**：header + indices + 三栏 body（left-list / main-chart / right-orderbook），已经是最合理的布局。

**迁移后**：
- 保留三栏结构（已经是正确的终端式布局）
- 外层包裹纳入 `SplitLayout` 或保留自定义（stock 是特化程度最高的页面）
- 内部 panel 用 `BlockPanel` 统一风格

### 6.6 github / square / all（资讯类）— 消费型

- 统一用 `ListLayout`
- hero 压缩为 `PageHeader`
- 筛选条用 `BlockToolbar`
- 内容列表用 `BlockList` 或 `BlockGrid`

---

## 七、目录结构规划

```
src/
  shell/
    AppShell.jsx          # 顶栏 + 左栏 + 右栏骨架
    CommandPalette.jsx    # Ctrl+K 全局命令面板
    ContextSummary.jsx    # 左栏常驻：今日画像摘要 + 快捷操作
  pages/
    TodayPage.jsx         # 从 App.jsx nav==='today' 分支抽出
    AllNewsPage.jsx       # 从 App.jsx nav==='all' 分支抽出
    GithubPage.jsx        # 从 App.jsx nav==='github' 分支抽出
    StockPage.jsx         # 已存在，纳入 pages/
    StudioPage.jsx        # 已存在
    AgentsPage.jsx        # 从 App.jsx nav==='agents' 分支抽出
    EditorPage.jsx        # 从 App.jsx nav==='editor' 分支抽出
    SquarePage.jsx        # 从 App.jsx nav==='square' 分支抽出
    ProfileCenterPage.jsx # 已存在
    MaterialsPage.jsx     # 从 App.jsx nav==='materials' 分支抽出
  blocks/
    BlockStat.jsx
    BlockPanel.jsx
    BlockList.jsx
    BlockToolbar.jsx
    BlockGrid.jsx
    index.js              # 统一导出
  layouts/
    ListLayout.jsx        # 消费型页面骨架
    SplitLayout.jsx       # 操作型页面骨架
    CanvasLayout.jsx      # 全屏编辑/画布
```

App.jsx 退化成路由器：`<AppShell><CurrentPage /></AppShell>`，从 10240 行降到约 200 行。

---

## 八、落地优先级

> 原则：每阶段独立可发布、可回滚、可验证。UI 零测试覆盖下，回归靠人工 smoke test。

| 阶段 | 动作 | 估时 | 风险 | 价值 |
|------|------|------|------|------|
| **P1** | 创建 `blocks/` 5 个原语 + 对应 CSS，在 studio 页试点替换 | 1 天 | 低 | 验证原语可用性 |
| **P2** | 抽 `AppShell.jsx`，把顶栏/左栏/hero-briefing-summary 提为全局常驻 | 1-2 天 | 中 | 立即消除 today 页的 hero 堆叠 |
| **P3** | 把 today / all / profile-center 三个高流量页面迁移到新原语 | 2-3 天 | 中 | 用户可感知的体验提升 |
| **P4** | 实现命令面板（Ctrl+K） | 1 天 | 低 | 跨模块跳转体验 |
| **P5** | 剩余页面迁移 + styles.css 大规模删类 | 2-3 天 | 高 | 技术债清偿 |

### P1 详细任务

1. 创建 `src/blocks/index.js` 导出 5 个 Block
2. 创建 `src/blocks/BlockStat.jsx` — 数字+标签+趋势
3. 创建 `src/blocks/BlockPanel.jsx` — 带标题容器
4. 创建 `src/blocks/BlockList.jsx` — 列表行
5. 创建 `src/blocks/BlockToolbar.jsx` — 筛选条
6. 创建 `src/blocks/BlockGrid.jsx` — 响应式卡片网格
7. 在 `src/styles.css` 中添加 `.block-stat` `.block-panel` 等统一类（不删除现有类）
8. 修改 `StudioPage.jsx`：用 5 个 Block 替换现有 className，验证效果
9. 确认 studio 页面视觉效果与替换前一致

### 回滚策略

- P1：直接 revert StudioPage.jsx 的改动
- P2-P5：AppShell 和 Page 是新增文件，旧代码保留为 `App.jsx.legacy` 分支，通过路由开关切换

---

## 九、风险与缓解

| 风险 | 影响 | 缓解 |
|------|------|------|
| Block 原语不够灵活，特殊页面被迫 hack | 样式失控 | P1 在 studio 试点，若不够灵活则调整原语 API 再扩展 |
| AppShell 抽出后全局状态传递断裂 | 页面白屏 | 用 React Context 传递全局状态，保持 App.jsx 为状态持有者 |
| styles.css 新旧类共存导致冲突 | 样式异常 | 新 Block 类使用 `.block-*` 前缀，与现有 `*-panel`/`*-card` 不冲突 |
| 140 个测试不覆盖 UI | 回归无法自动检测 | P1-P3 每次改动后手动 smoke test：导航切换 → 各页面渲染 → 交互操作 |
| 大重构导致分支冲突 | 合并困难 | 每阶段独立 commit，不积攒大块改动 |

---

## 十、总结

> 飞书的好用不是"功能组织得好"，而是"**承认功能多，然后用统一的布局原语 + 全局常驻上下文 + 命令面板把它兜住**"。

万般硅川现在的问题是每个页面都在重新发明布局。解法不是改 CSS，而是建立 **Shell → Page → Block** 三层架构，让"加新页面"从"设计一套布局"变成"填内容进既有槽位"。

核心收益：
1. **用户层面**：跨页面一致的导航体验 + 全局上下文常驻 + 统一搜索
2. **开发层面**：新页面 30 分钟内可搭完（选布局 + 填 Block）
3. **维护层面**：styles.css 从 3784 个类收敛到 ~200 个语义类，修改一处全局生效

---

## 十一、落地记录（2026-07-07 实际执行）

### 已完成

| 阶段 | commit | 内容 |
|------|--------|------|
| P1.1 | `fbc370b` | 新增 5 个 Block 原语组件（BlockStat/BlockPanel/BlockList/BlockToolbar/BlockGrid）+ index.js，375 行 |
| P1.2 | `f57453d` | styles.css 追加 .block-* 样式，57 个类，338 行 |
| P1.3 | `cb46c9a` | StudioPage 迁移：studio-module-grid→BlockGrid，2×asset-panel→BlockPanel |
| P2   | `373e2df` | today 页 hero-briefing-summary 4 个 stat→BlockStat |
| P3   | `8d54e18` | profile-summary-grid 4 个卡→BlockStat card 变体；BlockStat 扩展 variant=card；BlockToolbar 扩展 hidden；today filter-row→BlockToolbar hidden |
| P4   | `feb8581` | 命令面板 Ctrl+K（src/shell/CommandPalette.jsx），290 行 |

### 原语使用覆盖

- **BlockStat**：today hero（inline）+ profile summary（card）— 2 种变体均验证
- **BlockPanel**：studio asset-panel ×2 — 已验证
- **BlockGrid**：studio module-grid + profile summary-grid — 已验证
- **BlockToolbar**：today filter-row（hidden）— 已验证
- **BlockList**：未使用（现有列表都是高度定制业务组件，语义不匹配）

### 调整结论

1. **AppShell 完整抽取推迟**：sidebar 依赖 35+ 状态，当前抽取 props 传递成本过高。正确顺序是先拆页面让状态聚拢到 hook，再抽 AppShell。

2. **P5 剩余页面不强替换**：github/square/all/agents 的内部元素都是高度定制的业务组件（GithubRepoCard/square-post/agent-workflow-mission 等），强行用通用 Block 原语替换会扭曲语义。Block 原语适用于"统计块/容器面板/筛选条/卡片网格"这类通用结构，特化业务组件保留原样更合理。

3. **styles.css 旧类不删除**：3784 个旧类与 57 个 .block-* 类共存，前缀隔离零冲突。大规模删类需确认无引用后进行，当前阶段保留以降低风险。

### 技术要点

- App.jsx 是混合行尾（10240 CRLF + 1 LF），替换脚本需先统一行尾
- App.jsx 中 '准备你的第一篇内容' 的 '一' 字曾损坏为 U+FFFD×2，已修复
- today 页 workbench-filter-row 原是 display:none 废弃代码，替换为 BlockToolbar hidden 保持行为
- 所有改动经 vite build + 152 tests 验证无回归

### 后续方向

- 拆分 App.jsx 为 pages/ 目录（today/all/github 等各自独立文件），为 AppShell 抽取铺路
- 命令面板扩展：素材/文章搜索、最近访问、智能体快捷调用
- 视觉一致性巡检：统一 hero 区为 PageHeader 组件
