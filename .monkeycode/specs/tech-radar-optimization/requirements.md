# Tech Radar 平台优化方案 - 需求文档

## Introduction

本方案针对 Global Tech Radar 平台进行全面优化，从"信息聚合"升级为"信息消化"平台。覆盖 AI 智能摘要、阅读收藏、视图切换、个性化信息流、事件关联、日历热力图、搜索增强、快捷键等 8 个功能模块。

## Glossary

- **AI 摘要**: 由 LLM 生成的资讯核心要点概括，3句话以内
- **事件卡**: 同一事件多个来源报道的聚合视图
- **热力图**: 日历页中以颜色深浅表示资讯数量的可视化
- **信息流**: 用户自定义关注关键词/赛道后生成的个性化资讯列表
- **视图模式**: 紧凑/标准/卡片三种资讯列表展示方式

## Requirements

### REQ-1: AI 智能摘要

**User Story:** AS 资讯读者, I want 一键获取资讯的核心要点, so that 在信息过载时快速判断是否值得深入阅读

#### Acceptance Criteria

1. WHEN 用户点击资讯条目上的"AI 摘要"按钮, the system SHALL 在条目下方展开显示3句核心要点摘要
2. WHILE AI 摘要正在生成中, the system SHALL 显示加载动画并在3秒内返回结果
3. IF AI 摘要生成失败, the system SHALL 显示错误提示并允许用户重试
4. WHEN 用户在"全部动态"页面, the system SHALL 提供一键生成"今日 AI 日报"功能，归纳 Top 10 要闻
5. the system SHALL 对已生成的摘要进行缓存，重复查看时直接展示

### REQ-2: 阅读列表与收藏

**User Story:** AS 资讯读者, I want 收藏感兴趣的资讯并在稍后阅读, so that 不会错过重要内容且回访时有明确目标

#### Acceptance Criteria

1. WHEN 用户点击资讯条目的收藏按钮, the system SHALL 将该条目加入阅读列表并显示收藏成功提示
2. WHILE 用户在侧边栏点击"阅读列表", the system SHALL 展示所有已收藏资讯，支持按收藏时间排序
3. WHEN 用户点击已收藏条目的取消收藏按钮, the system SHALL 将该条目从阅读列表移除
4. the system SHALL 支持标记资讯为"已读/未读"状态
5. the system SHALL 将收藏数据持久化到 localStorage

### REQ-3: 信息密度视图切换

**User Story:** AS 资讯读者, I want 切换不同的列表展示密度, so that 根据当前场景高效浏览资讯

#### Acceptance Criteria

1. WHEN 用户点击顶栏的视图切换按钮, the system SHALL 在紧凑/标准/卡片三种模式间切换
2. WHILE 处于紧凑模式, the system SHALL 每条仅显示标题+来源+时间，一屏可展示40+条
3. WHILE 处于标准模式, the system SHALL 展示标题+摘要+标签+来源+时间
4. WHILE 处于卡片模式, the system SHALL 以大卡片形式展示，包含完整摘要和标签
5. the system SHALL 记住用户的视图偏好到 localStorage

### REQ-4: 自定义信息流

**User Story:** AS 资讯读者, I want 关注特定的关键词和赛道, so that 只看到与我相关的资讯

#### Acceptance Criteria

1. WHEN 用户在设置中添加关注关键词, the system SHALL 在信息流中优先展示匹配关键词的资讯
2. WHEN 用户关注某个赛道, the system SHALL 在侧边栏"我的关注"中生成对应入口
3. WHILE 信息流中存在匹配关注关键词的资讯, the system SHALL 在条目上标注"关注"标识
4. the system SHALL 支持关注关键词的增删操作
5. the system SHALL 将关注列表持久化到 localStorage

### REQ-5: 事件关联聚合

**User Story:** AS 资讯读者, I want 查看同一事件的不同来源报道, so that 交叉验证获取更全面视角

#### Acceptance Criteria

1. WHEN 系统检测到多条资讯属于同一事件, the system SHALL 将这些资讯聚合为"事件卡"
2. WHILE 用户点击事件卡, the system SHALL 展开显示所有关联来源报道
3. the system SHALL 在事件卡上显示关联来源数量
4. the system SHALL 基于标题关键词相似度进行事件关联匹配

### REQ-6: 日历热力图

**User Story:** AS 资讯读者, I want 在日历上直观看到每天资讯量分布, so that 快速定位资讯热点日期

#### Acceptance Criteria

1. WHILE 用户在日历页面, the system SHALL 在每个日期格子中以颜色深浅表示当天资讯数量
2. WHEN 用户点击有资讯的日期格子, the system SHALL 展示该日的资讯列表
3. the system SHALL 使用5级色阶表示资讯密度

### REQ-7: 搜索增强

**User Story:** AS 资讯读者, I want 更智能的搜索功能, so that 快速找到目标资讯

#### Acceptance Criteria

1. WHEN 用户在搜索框输入关键词, the system SHALL 实时展示搜索建议和历史记录
2. WHILE 搜索结果为空, the system SHALL 推荐相关热门标签供用户点击
3. the system SHALL 支持搜索结果按相关度和时间双排序
4. the system SHALL 将搜索历史持久化到 localStorage

### REQ-8: 快捷键支持

**User Story:** AS 高频资讯读者, I want 使用键盘快捷键操作, so that 高效浏览和管理资讯

#### Acceptance Criteria

1. WHEN 用户按下 J/K 键, the system SHALL 上下移动资讯焦点
2. WHEN 用户按下 O 键, the system SHALL 打开当前焦点资讯的原文链接
3. WHEN 用户按下 S 键, the system SHALL 收藏/取消收藏当前焦点资讯
4. WHEN 用户按下 1-3 数字键, the system SHALL 切换紧凑/标准/卡片视图
5. WHEN 用户按下 ? 键, the system SHALL 显示快捷键帮助面板
6. the system SHALL 在首次访问时提示快捷键可用
