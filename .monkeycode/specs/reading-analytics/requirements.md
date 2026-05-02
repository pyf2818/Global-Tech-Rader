# 阅读统计与分析 - 需求与技术设计

## 需求概述 (EARS)

### REQ-1: 个人阅读统计
**系统 SHALL** 展示用户阅读数据：
- 每日/周/月阅读量（文章数、时间）
- 连续打卡天数
- 阅读时间分布（按小时）

### REQ-2: 内容偏好分析
**系统 SHALL** 分析用户兴趣：
- 各赛道阅读占比
- 偏好来源 Top 5
- 阅读深度（平均阅读时长）

### REQ-3: 成就系统
**系统 SHALL** 提供阅读成就：
- 里程碑徽章（如阅读 100 篇）
- 赛道专家徽章（某赛道阅读 Top 10%）
- 连续打卡奖励

### REQ-4: 周报生成
**系统 SHALL** 每周生成阅读报告：
- 本周阅读总结
- 与上周对比
- 推荐未读的重要内容

## 技术要点

### 数据追踪
```typescript
interface ReadingRecord {
  userId: string;
  newsId: string;
  startedAt: string;
  duration: number; // 秒
  completed: boolean;
  source: string;
  category: string;
}

// localStorage 存储
{
  "readingRecords": [ReadingRecord],
  "achievements": string[],
  "streak": { current: number, longest: number, lastDate: string }
}
```

### 统计视图
```tsx
function ReadingStatsDashboard() {
  return (
    <>
      <ReadingTrendChart period="30d" />
      <CategoryPieChart />
      <SourceBarChart />
      <AchievementGrid />
      <WeeklyReportGenerator />
    </>
  );
}
```

---

**优先级**: P1 | **开发成本**: 低 | **预计工时**: 3 天
