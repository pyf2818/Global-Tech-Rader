# 智能推荐引擎 - 需求与技术设计

## 需求概述 (EARS)

### REQ-1: 协同过滤推荐
**系统 SHALL** 基于相似用户推荐：
- "读了这篇的人也读了..."
- 相似阅读兴趣的用户群
- 热门推荐加权

### REQ-2: 内容相似度推荐
**系统 SHALL** 基于内容特征推荐：
- 相同赛道/标签
- 相同来源
- 语义相似度（需要 embedding）

### REQ-3: 探索发现
**系统 SHALL** 帮助用户发现盲区：
- "你很少看芯片内容，但这是热门"
- 跨赛道推荐（AI → 芯片）
- 新兴话题推荐

### REQ-4: 反馈机制
**系统 SHALL** 允许用户反馈推荐质量：
- 点赞/点踩
- "不感兴趣"屏蔽
- 调整推荐权重

## 技术要点

### 推荐算法（简单版）
```typescript
function generateRecommendations(
  userHistory: ReadingRecord[],
  allItems: NewsItem[]
): NewsItem[] {
  // 1. 提取用户兴趣
  const preferredCategories = countCategories(userHistory);
  const preferredSources = countSources(userHistory);
  
  // 2. 过滤已读
  const readIds = new Set(userHistory.map(r => r.newsId));
  const unread = allItems.filter(i => !readIds.has(i.id));
  
  // 3. 打分
  const scored = unread.map(item => ({
    item,
    score: 
      (preferredCategories[item.category] || 0) * 0.4 +
      (preferredSources[item.source] || 0) * 0.3 +
      item.hotScore * 0.3
  }));
  
  // 4. 排序返回
  return scored.sort((a, b) => b.score - a.score).slice(0, 10).map(s => s.item);
}
```

### 组件
```tsx
function RecommendationSection() {
  return (
    <div className="recommendations">
      <h3>为你推荐</h3>
      <NewsCarousel items={recommendations} />
      <FeedbackButtons />
    </div>
  );
}
```

---

**优先级**: P1 | **开发成本**: 中高 | **预计工时**: 5 天
