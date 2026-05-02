# 趋势分析看板 - 需求与技术设计

## 需求概述 (EARS)

### REQ-1: 赛道热度趋势
**系统 SHALL** 展示各赛道（AI、芯片、开源等）的热度变化：
- 7 天/30 天/90 天趋势线图
- 热度计算：资讯数量 × 来源权重
- 标注异常波动点（如融资事件导致峰值）

### REQ-2: 关键词云
**系统 SHALL** 动态展示热门技术关键词：
- 词大小表示出现频率
- 颜色表示热度变化（红=上升，绿=下降）
- 点击可筛选相关资讯

### REQ-3: 新兴话题发现
**系统 SHALL** 自动识别新兴话题：
- 本周新增且提及≥5 次的关键词
- 增长率 Top 10 话题
- 与历史话题的关联性分析

### REQ-4: 来源活跃度
**系统 SHALL** 对比各资讯源的发布情况：
- 每日发布数量趋势
- 各赛道覆盖度
- 独家内容标记

## 技术要点

### 热度算法
```typescript
function calculateHeat(items: NewsItem[], sourceWeights: Record<string, number>): number {
  return items.reduce((sum, item) => {
    const weight = sourceWeights[item.source] || 1;
    const recencyFactor = Math.exp(-0.01 * hoursSince(item.publishedAt));
    return sum + weight * recencyFactor;
  }, 0);
}
```

### 组件结构
```
TrendDashboard
├── HeatmapCharts      // 赛道热度趋势
├── KeywordCloud       // 关键词云
├── EmergingTopics     // 新兴话题列表
└── SourceComparison   // 来源对比
```

### 数据结构
```typescript
interface TrendData {
  categoryHeats: Array<{ category: string; dailyData: DailyHeat[] }>;
  keywordFrequency: Map<string, number>;
  emergingTopics: Array<{ keyword: string; growth: number; firstSeen: string }>;
  sourceActivity: Array<{ source: string; count: number; categories: string[] }>;
}
```

---

**优先级**: P0 | **开发成本**: 中 | **预计工时**: 5 天
