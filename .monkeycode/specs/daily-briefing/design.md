# 每日/每周简报 - 技术设计文档

## 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ BriefingUI   │  │ BriefingList │  │ ShareImage   │       │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤       │
│  │ - Preview    │  │ - History    │  │ - Generate   │       │
│  │ - Config     │  │ - Export     │  │ - Download   │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Service Layer                            │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ briefingService  │  │ rankingService   │                │
│  ├──────────────────┤  ├──────────────────┤                │
│  │ - generate()     │  │ - calculateScore │                │
│  │ - schedule()     │  │ - sortByCategory │                │
│  │ - history()      │  │ - extractTrends  │                │
│  └──────────────────┘  └──────────────────┘                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Vite Middleware                         │
├─────────────────────────────────────────────────────────────┤
│  POST /api/briefing/generate   - 生成简报                   │
│  GET  /api/briefing/history    - 获取历史列表               │
│  GET  /api/briefing/:id        - 获取详情                   │
│  POST /api/briefing/share      - 生成分享图                 │
│  POST /api/briefing/config     - 更新配置                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 核心算法设计

### 1. 资讯评分算法

```typescript
interface ScoreWeights {
  sourceAuthority: 0.30;  // 来源权威度
  recency: 0.25;          // 时效性
  topicHeat: 0.25;        // 话题热度
  userInterest: 0.20;     // 用户兴趣匹配
}

function calculateScore(item: NewsItem, config: BriefingConfig): number {
  // 1. 来源权威度 (0-100)
  const authorityScore = SOURCE_WEIGHTS[item.source] || 50;
  
  // 2. 时效性 (0-100) - 指数衰减
  const hoursOld = (Date.now() - new Date(item.publishedAt).getTime()) / 3600000;
  const recencyScore = 100 * Math.exp(-0.05 * hoursOld);
  
  // 3. 话题热度 (0-100)
  const topicScore = calculateTopicScore(item.tags, TRENDING_KEYWORDS);
  
  // 4. 用户兴趣 (0-100)
  const interestScore = calculateInterestScore(item, config);
  
  // 加权总分
  return (
    authorityScore * 0.30 +
    recencyScore * 0.25 +
    topicScore * 0.25 +
    interestScore * 0.20
  );
}
```

### 2. 头条选择算法

```typescript
function selectTopStories(items: NewsItem[], limit: number): NewsItem[] {
  // 按分数排序
  const sorted = items.sort((a, b) => b.score - a.score);
  
  // 确保多样性（同一来源最多 2 条）
  const sourceCount = new Map<string, number>();
  const selected: NewsItem[] = [];
  
  for (const item of sorted) {
    if (selected.length >= limit) break;
    const count = sourceCount.get(item.source) || 0;
    if (count < 2) {
      selected.push(item);
      sourceCount.set(item.source, count + 1);
    }
  }
  
  return selected;
}
```

### 3. 新兴话题检测

```typescript
function detectTrendingTopics(
  currentPeriod: NewsItem[],
  previousPeriod: NewsItem[]
): string[] {
  const current = countKeywords(currentPeriod);
  const previous = countKeywords(previousPeriod);
  
  const trending: Array<{ keyword: string; growth: number }> = [];
  
  for (const [keyword, currCount] of current.entries()) {
    const prevCount = previous.get(keyword) || 0;
    if (prevCount === 0 && currCount >= 3) {
      // 全新话题，至少 3 次提及
      trending.push({ keyword, growth: Infinity });
    } else if (prevCount > 0) {
      const growth = (currCount - prevCount) / prevCount;
      if (growth > 0.5) {  // 增长率超过 50%
        trending.push({ keyword, growth });
      }
    }
  }
  
  return trending
    .sort((a, b) => b.growth - a.growth)
    .slice(0, 5)
    .map(t => t.keyword);
}
```

---

## 组件设计

### BriefingConfigPanel

```tsx
interface BriefingConfigPanelProps {
  config: BriefingConfig;
  onSave: (config: BriefingConfig) => void;
}

function BriefingConfigPanel({ config, onSave }: BriefingConfigPanelProps) {
  return (
    <div className="briefing-config-panel">
      {/* 发送时间设置 */}
      <section>
        <h3>发送时间</h3>
        <TimePicker value={config.dailyTime} onChange={...} />
        <Toggle label="周末免打扰" checked={config.weekendOff} />
      </section>
      
      {/* 简报长度 */}
      <section>
        <h3>简报长度</h3>
        <RadioGroup
          options={[
            { value: 'compact', label: '精简版 (5 条)' },
            { value: 'standard', label: '标准版 (10 条)' },
            { value: 'detailed', label: '详细版 (20 条)' }
          ]}
          value={config.length}
        />
      </section>
      
      {/* 必选赛道 */}
      <section>
        <h3>必选赛道</h3>
        <MultiSelect options={CATEGORIES} value={config.requiredCategories} />
      </section>
      
      {/* 推送方式 */}
      <section>
        <h3>推送方式</h3>
        <CheckboxGroup
          options={[
            { value: 'push', label: '站内通知' },
            { value: 'email', label: '邮件' }
          ]}
          value={config.deliveryMethods}
        />
      </section>
    </div>
  );
}
```

### BriefingPreview

```tsx
interface BriefingPreviewProps {
  briefing: Briefing;
  onExport: (format: 'pdf' | 'image') => void;
}

function BriefingPreview({ briefing, onExport }: BriefingPreviewProps) {
  return (
    <div className="briefing-preview" ref={printRef}>
      <header className="briefing-header">
        <h1>
          {briefing.type === 'daily' ? '每日简报' : '每周简报'}
          <span className="date">{formatDate(briefing.generatedAt)}</span>
        </h1>
        <div className="briefing-actions">
          <button onClick={() => onExport('pdf')}>导出 PDF</button>
          <button onClick={() => onExport('image')}>分享长图</button>
        </div>
      </header>
      
      {/* 头条要闻 */}
      <section className="top-stories">
        <h2>📰 头条要闻</h2>
        {briefing.items.filter(i => i.section === 'top').map(item => (
          <NewsCard key={item.id} item={item} rank={item.rank} />
        ))}
      </section>
      
      {/* 赛道动态 */}
      <section className="category-news">
        <h2>🏷️ 赛道动态</h2>
        {groupByCategory(briefing.items).map(([cat, items]) => (
          <CategoryBlock key={cat} category={cat} items={items} />
        ))}
      </section>
      
      {/* 统计信息 */}
      <footer className="briefing-stats">
        <StatItem label="来源数" value={briefing.stats.totalSources} />
        <StatItem label="资讯总数" value={briefing.stats.totalItems} />
        <StatItem label="热门赛道" value={briefing.stats.topCategory} />
      </footer>
    </div>
  );
}
```

---

## API 设计

### POST /api/briefing/generate

**Request**:
```json
{
  "type": "daily",
  "period": {
    "start": "2026-04-28T00:00:00Z",
    "end": "2026-04-29T00:00:00Z"
  },
  "config": {
    "length": "standard",
    "requiredCategories": ["ai-models", "chips-compute"],
    "maxItems": 10
  }
}
```

**Response**:
```json
{
  "id": "brf_20260429_daily",
  "type": "daily",
  "generatedAt": "2026-04-29T08:00:00Z",
  "items": [...],
  "stats": { ... }
}
```

### GET /api/briefing/history

**Response**:
```json
{
  "briefings": [
    {
      "id": "brf_20260429_daily",
      "type": "daily",
      "generatedAt": "2026-04-29T08:00:00Z",
      "itemCount": 10
    }
  ]
}
```

---

## 本地存储设计

```typescript
// localStorage 结构
{
  "briefingConfig": {
    "dailyTime": 8,
    "weeklyDay": 1,
    "weeklyTime": 9,
    "length": "standard",
    "requiredCategories": ["ai-models"],
    "blockedSources": [],
    "timezone": "Asia/Shanghai",
    "weekendOff": false,
    "deliveryMethods": ["push"]
  },
  "briefingHistory": [
    {
      "id": "brf_20260429_daily",
      "type": "daily",
      "generatedAt": "2026-04-29T08:00:00Z",
      "snapshot": { ... }  // 完整简报数据
    }
  ]
}
```

---

## 依赖库

```json
{
  "dependencies": {
    "jspdf": "^2.5.2",           // PDF 生成
    "html2canvas": "^1.4.1",     // 长图生成
    "date-fns": "^3.0.0"         // 日期处理
  }
}
```

---

## 实现阶段

### Phase 1 (核心功能)
- [ ] 手动生成每日简报
- [ ] 简报预览页面
- [ ] 基础算法（按热度排序）
- [ ] localStorage 历史保存

### Phase 2 (配置与导出)
- [ ] 配置面板
- [ ] PDF 导出
- [ ] 分享长图
- [ ] 赛道筛选

### Phase 3 (自动化)
- [ ] 定时任务（需要后台）
- [ ] 邮件推送
- [ ] 站内通知

---

**日期**: 2026-04-29  
**版本**: v1.0  
**状态**: 待评审
