# 公司/技术追踪 - 需求文档

## 概述
允许用户关注特定公司或技术，长期追踪相关动态，形成时间轴视图。

---

## 需求规格 (EARS 模式)

### REQ-1: 添加追踪目标
**系统 SHALL** 允许用户添加以下类型的追踪目标：
- **公司追踪**：如 OpenAI、Google、字节跳动、华为
- **技术追踪**：如 React、LLM、RISC-V、Kubernetes
- **项目追踪**：如 vscode、linux、transformers

### REQ-2: 智能匹配规则
**系统 SHALL** 自动匹配相关资讯，当：
- 标题包含追踪关键词
- 摘要包含追踪关键词
- 来源域名匹配公司官网
- 标签与追踪技术一致

### REQ-3: 时间轴视图
**系统 SHALL** 以时间轴形式展示追踪目标的动态：
- 按时间倒序排列
- 支持按月/季度筛选
- 显示关键事件标记（如融资、发布、收购）
- 支持导出时间轴为图片

### REQ-4: 变化通知
**系统 SHALL** 在以下情况通知用户：
- 新增相关资讯（实时/每日汇总）
- 提及量异常增长（如 +50% vs 上周）
- 重大事件检测（基于关键词权重）

### REQ-5: 统计分析
**系统 SHALL** 为每个追踪目标提供统计：
- 近 7 天/30 天/90 天资讯数量趋势
- 声量对比（与其他公司/技术比较）
- 热门话题分布
- 来源分布（哪些媒体经常报道）

### REQ-6: 追踪管理
**系统 SHALL** 允许用户管理追踪列表：
- 编辑追踪目标名称和关键词
- 添加同义词（如 "OpenAI" 别名 "open ai"）
- 暂停追踪（保留历史但不更新）
- 删除追踪目标

### REQ-7: 预设追踪包
**系统 SHALL** 提供预设的追踪包：
- AI 巨头包：OpenAI、Google DeepMind、Anthropic、Meta AI
- 国内大厂包：字节、阿里、腾讯、百度、华为
- 前沿技术包：LLM、Agent、RAG、多模态
- 芯片算力包：NVIDIA、AMD、Intel、ASIC

---

## 用户场景

| 用户类型 | 场景 | 期望结果 |
|---------|------|---------|
| 投资人 | 追踪 10 家 AI 公司动态 | 每周生成对比报告，辅助投资决策 |
| 竞品分析 | 监测竞品公司发布 | 第一时间获知新品/融资/合作 |
| 开发者 | 追踪 React 技术生态 | 了解最新版本、社区动态 |
| 研究员 | 追踪多个技术方向 | 形成技术发展时间线 |

---

## 验收标准

### AC-1: 匹配准确性
- [ ] 公司追踪的资讯匹配准确率 > 85%
- [ ] 技术追踪的误报率 < 10%（如"苹果"水果 vs 公司）
- [ ] 支持排除词（如"苹果 - 水果"）

### AC-2: 响应及时性
- [ ] 新增资讯在 5 分钟内匹配到追踪目标
- [ ] 通知在匹配后 1 分钟内发送
- [ ] 时间轴加载时间 < 2 秒

### AC-3: 功能完整性
- [ ] 至少支持 20 个追踪目标
- [ ] 历史数据回溯至少 90 天
- [ ] 支持导出时间轴图片

---

## 数据模型

```typescript
interface TrackerTarget {
  id: string;
  userId: string;
  type: 'company' | 'technology' | 'project';
  name: string;  // 显示名称
  keywords: string[];  // 匹配关键词
  excludeKeywords?: string[];  // 排除词
  domains?: string[];  // 公司官网域名
  aliases?: string[];  // 别名/简称
  color: string;  // 时间轴颜色标识
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  notifyOnMatch: boolean;  // 是否实时通知
  summaryFrequency: 'none' | 'daily' | 'weekly';  // 汇总频率
}

interface TrackerMatch {
  id: string;
  targetId: string;
  newsId: string;
  matchedKeywords: string[];  // 命中的关键词
  matchScore: number;  // 匹配得分 (0-100)
  matchedAt: string;
}

interface TrackerStats {
  targetId: string;
  period: { start: string; end: string };
  totalMentions: number;
  dailyCounts: Array<{ date: string; count: number }>;
  topSources: Array<{ source: string; count: number }>;
  topTopics: Array<{ topic: string; count: number }>;
  sentiment?: { positive: number; neutral: number; negative: number };
}
```

---

## 关键词匹配规则

| 类型 | 规则 | 示例 |
|------|------|------|
| 精确匹配 | 完全相等 | "OpenAI" |
| 包含匹配 | 关键词在文本中 | "open ai" → "OpenAI 发布" |
| 域名匹配 | 来源域名 | "openai.com" → 官方博客 |
| 正则匹配 | 高级模式 | `/\\bAI\\b/` 避免匹配 "FAIL" |
| 排除匹配 | 含排除词则不匹配 | "苹果" + "水果" → 排除 |

---

## 依赖关系
- 依赖新闻数据源 (`/api/news`)
- 依赖用户配置系统
- 依赖通知系统（站内/邮件）
- 依赖图表库（趋势图）

---

## 风险与约束
1. **重名问题**：如"苹果"需要排除规则
2. **性能问题**：每条新闻需匹配多个追踪目标
3. **误报率**：技术词可能有歧义

---

**日期**: 2026-04-29  
**版本**: v1.0  
**状态**: 待评审
