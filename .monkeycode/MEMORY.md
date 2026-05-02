# 用户指令记忆

本文件记录了用户的指令、偏好和教导，用于在未来的交互中提供参考。

## 格式

### 用户指令条目
用户指令条目应遵循以下格式：

[用户指令摘要]
- Date: [YYYY-MM-DD]
- Context: [提及的场景或时间]
- Instructions:
  - [用户教导或指示的内容，逐行描述]

### 项目知识条目
Agent 在任务执行过程中发现的条目应遵循以下格式：

[项目知识摘要]
- Date: [YYYY-MM-DD]
- Context: Agent 在执行 [具体任务描述] 时发现
- Category: [代码结构|代码模式|代码生成|构建方法|测试方法|依赖关系|环境配置]
- Instructions:
  - [具体的知识点，逐行描述]

## 去重策略
- 添加新条目前，检查是否存在相似或相同的指令
- 若发现重复，跳过新条目或与已有条目合并
- 合并时，更新上下文或日期信息
- 这有助于避免冗余条目，保持记忆文件整洁

## 条目

[用户对本轮资讯产品体验的明确要求]
- Date: 2026-04-29
- Context: 用户在本轮迭代反馈中提出的 UI 与数据质量要求
- Instructions:
  - 日程模块视觉需显著优化，避免简陋样式。
  - 资讯聚合需要更丰富且更均衡的来源分布，避免单一平台占比过高。
  - 产品需要支持按信息源筛选资讯。
  - 热门标签统计必须与可筛出的实际资讯一致，避免显示数量与结果不符。

[用户新增本轮迭代要求（顶部筛选与日程弹窗）]
- Date: 2026-04-29
- Context: 用户继续反馈全部动态与日历管理的视觉和数据范围问题
- Instructions:
  - 全部动态顶部菜单中的来源筛选组件不能挤压或遮挡其他控件。
  - 日历管理中的“添加日程”弹窗需要更精致的视觉设计。
  - 资讯总数目标提升到 360 条，并补充更多著名中国信息源。

[Global Tech Radar 项目启动方式]
- Date: 2026-04-29
- Context: Agent 在执行全球科技圈实时资讯聚合平台落地时发现
- Category: 构建方法
- Instructions:
  - 项目使用 React + Vite，开发命令为 `npm run dev`，生产构建命令为 `npm run build`。
  - Vite 开发服务器通过 `server/newsPlugin.js` 提供 `/api/news` 和 `/api/meta`，前端不直接跨域请求 RSS 源。

[Global Tech Radar 资讯聚合模式]
- Date: 2026-04-29
- Context: Agent 在执行全球科技圈实时资讯聚合平台落地时发现
- Category: 代码模式
- Instructions:
  - 公开资讯源集中维护在 `server/newsPlugin.js` 的 `SOURCES` 数组中，每个来源需要配置 `name`、`url`、`region` 和 `defaultCategory`。
  - 新增分类时需要同步更新后端 `CATEGORIES`、分类识别规则和前端筛选展示。

- 侧边栏采用 3 栏 Grid 布局（sidebar + content-panel + utility-panel），不再有重叠问题。
  - 侧边栏支持折叠/展开，折叠时宽度 64px 仅显示图标，展开时 272px 显示完整标签。
  - 折叠状态通过 `localStorage` 持久化，切换时有平滑 CSS 过渡动画。
  - 平板断点（≤1280px）时自动折叠为图标模式，Utility Panel 隐藏。
  - 移动端（≤768px）侧边栏重排为水平标签栏，Grid 退为单列纵向布局。
