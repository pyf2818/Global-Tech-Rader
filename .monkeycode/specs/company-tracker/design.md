# 公司/技术追踪 - 技术设计文档

## 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ TrackerList  │  │ TimelineView │  │ TrackerStats │       │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤       │
│  │ - Add/Edit   │  │ - Timeline   │  │ - Trends     │       │
│  │ - Presets    │  │ - Filters    │  │ - Comparison │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Service Layer                            │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ trackerService   │  │ matcherService   │                │
│  ├──────────────────┤  ├──────────────────┤                │
│  │ - CRUD           │  │ - matchKeywords  │                │
│  │ - stats()        │  │ - calculateScore │                │
│  │ - getTimeline()  │  │ - excludeFilter  │                │
│  └──────────────────┘  └──────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

---

## 核心算法设计

### 1. 关键词匹配引擎

```typescript
interface MatchResult {
  targetId: string;
  matchedKeywords: string[];
  score: number;
  matchType: 'exact' | 'contains' | 'domain' | 'regex';
}

function matchTrackers(news: NewsItem, trackers: TrackerTarget[]): MatchResult[] {
  const results: MatchResult[] = [];
  const text = `${news.title} ${news.summary}`.toLowerCase();
  
  for (const tracker of trackers) {
    if (!tracker.enabled) continue;
    
    const matched: string[] = [];
    let score = 0;
    
    // 1. 域名匹配（最高优先级）
    if (tracker.domains?.includes(news.sourceDomain)) {
      matched.push(`domain:${news.sourceDomain}`);
      score = 100;
    }
    
    // 2. 关键词匹配
    for (const keyword of tracker.keywords) {
      const pattern = typeof keyword === 'string' 
        ? keyword.toLowerCase()
        : keyword.regex;
      
      if (text.includes(pattern)) {
        matched.push(keyword);
        score += 20;
      }
    }
    
    // 3. 排除词过滤
    for (const exclude of tracker.excludeKeywords || []) {
      if (text.includes(exclude.toLowerCase())) {
        return results; // 直接排除
      }
    }
    
    // 4. 别名匹配
    for (const alias of tracker.aliases || []) {
      if (text.includes(alias.toLowerCase())) {
        matched.push(`alias:${alias}`);
        score += 15;
      }
    }
    
    if (matched.length > 0) {
      results.push({
        targetId: tracker.id,
        matchedKeywords: [...new Set(matched)],
        score: Math.min(100, score),
        matchType: score === 100 ? 'domain' : 'contains'
      });
    }
  }
  
  return results.sort((a, b) => b.score - a.score);
}
```

### 2. 时间轴生成

```typescript
function buildTimeline(
  targetId: string,
  matches: TrackerMatch[],
  news: NewsItem[]
): TimelineEvent[] {
  const newsMap = new Map(news.map(n => [n.id, n]));
  
  return matches.map(match => {
    const item = newsMap.get(match.newsId)!;
    return {
      id: match.id,
      date: item.publishedAt,
      title: item.title,
      source: item.source,
      url: item.url,
      category: item.category,
      matchedKeywords: match.matchedKeywords,
      importance: classifyImportance(item) // high/medium/low
    };
  }).sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

function classifyImportance(item: NewsItem): 'high' | 'medium' | 'low' {
  const highKeywords = ['发布', '融资', '收购', '成立', '重大', '首次'];
  const title = item.title.toLowerCase();
  
  if (highKeywords.some(k => title.includes(k.toLowerCase()))) {
    return 'high';
  }
  if (item.source === item.sourceDomain) { // 官方来源
    return 'medium';
  }
  return 'low';
}
```

### 3. 趋势计算

```typescript
function calculateTrend(
  dailyCounts: Array<{ date: string; count: number }>
): { direction: 'up' | 'down' | 'stable'; changePercent: number } {
  const recent = dailyCounts.slice(-7);  // 最近 7 天
  const previous = dailyCounts.slice(-14, -7);  // 前 7 天
  
  const recentAvg = avg(recent.map(d => d.count));
  const previousAvg = avg(previous.map(d => d.count));
  
  const change = (recentAvg - previousAvg) / previousAvg;
  
  return {
    direction: change > 0.1 ? 'up' : change < -0.1 ? 'down' : 'stable',
    changePercent: change * 100
  };
}
```

---

## 组件设计

### TrackerListPanel

```tsx
function TrackerListPanel() {
  const [trackers, setTrackers] = useLocalStorage<TrackerTarget[]>('trackers', []);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTracker, setSelectedTracker] = useState<string | null>(null);
  
  // 预设追踪包
  const PRESET_PACKS = [
    {
      name: 'AI 巨头',
      trackers: [
        { name: 'OpenAI', keywords: ['openai', 'open ai'], domains: ['openai.com'] },
        { name: 'Google DeepMind', keywords: ['deepmind', 'google deepmind'] },
        { name: 'Anthropic', keywords: ['anthropic', 'claude'] }
      ]
    }
  ];
  
  return (
    <div className="tracker-list-panel">
      <header>
        <h2>📌 我的追踪</h2>
        <button onClick={() => setShowAddModal(true)}>+ 添加追踪</button>
      </header>
      
      <div className="tracker-grid">
        {trackers.map(tracker => (
          <TrackerCard
            key={tracker.id}
            tracker={tracker}
            selected={selectedTracker === tracker.id}
            onSelect={() => setSelectedTracker(tracker.id)}
            onToggle={() => toggleTracker(tracker.id)}
            onDelete={() => deleteTracker(tracker.id)}
          />
        ))}
      </div>
      
      {/* 预设包快速添加 */}
      <section className="preset-packs">
        <h3>预设追踪包</h3>
        {PRESET_PACKS.map(pack => (
          <PresetPackCard
            key={pack.name}
            pack={pack}
            onAdd={() => addPreset(pack)}
          />
        ))}
      </section>
    </div>
  );
}
```

### TimelineView

```tsx
function TimelineView({ targetId }: { targetId: string }) {
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [filter, setFilter] = useState<'all' | 'high' | 'official'>('all');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  
  const filtered = timeline.filter(event => {
    if (filter === 'high' && event.importance !== 'high') return false;
    if (filter === 'official' && !event.isOfficial) return false;
    return true;
  });
  
  return (
    <div className="timeline-view">
      <header className="timeline-header">
        <FilterBar filter={filter} onFilterChange={setFilter} />
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
        <button onClick={() => exportTimeline()}>📷 导出图片</button>
      </header>
      
      <div className="timeline-container">
        {filtered.map((event, i) => (
          <TimelineItem
            key={event.id}
            event={event}
            isMajor={event.importance === 'high'}
            showDate={i === 0 || 
              formatDate(event.date) !== formatDate(filtered[i-1].date)}
          />
        ))}
      </div>
    </div>
  );
}

function TimelineItem({ event, isMajor, showDate }: TimelineItemProps) {
  return (
    <div className={`timeline-item ${isMajor ? 'major': ''}`}>
      {showDate && (
        <div className="timeline-date-badge">
          {formatDate(event.date)}
        </div>
      )}
      <div className="timeline-event">
        <div className={`event-dot ${event.importance}`} />
        <div className="event-content">
          <a href={event.url} target="_blank" className="event-title">
            {event.title}
          </a>
          <div className="event-meta">
            <span className="event-source">{event.source}</span>
            {event.matchedKeywords.map(kw => (
              <span key={kw} className="matched-keyword">{kw}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

### TrackerStats Panel

```tsx
function TrackerStatsPanel({ targetId }: { targetId: string }) {
  const [stats, setStats] = useState<TrackerStats | null>(null);
  
  useEffect(() => {
    loadStats(targetId).then(setStats);
  }, [targetId]);
  
  return (
    <div className="tracker-stats-panel">
      {/* 趋势图 */}
      <LineChart
        data={stats?.dailyCounts}
        title="提及量趋势"
        showTrendIndicator={true}
      />
      
      {/* 来源分布 */}
      <BarChart
        data={stats?.topSources}
        title="热门来源"
        horizontal={true}
      />
      
      {/* 话题分布 */}
      <WordCloud data={stats?.topTopics} />
      
      {/* 声量对比 */}
      <ComparisonChart
        targetId={targetId}
        compareWith={getSimilarTrackers(targetId)}
      />
    </div>
  );
}
```

---

## API 设计

### GET /api/tracker/:id/timeline

**Response**:
```json
{
  "targetId": "trk_openai_001",
  "targetName": "OpenAI",
  "timeline": [
    {
      "id": "evt_001",
      "date": "2026-04-29T10:00:00Z",
      "title": "OpenAI 发布 GPT-5",
      "source": "The Verge",
      "url": "https://...",
      "importance": "high",
      "matchedKeywords": ["OpenAI", "发布"]
    }
  ],
  "totalCount": 156
}
```

### GET /api/tracker/:id/stats

**Response**:
```json
{
  "targetId": "trk_openai_001",
  "period": { "start": "2026-02-01", "end": "2026-04-29" },
  "totalMentions": 450,
  "dailyCounts": [
    { "date": "2026-04-22", "count": 12 },
    { "date": "2026-04-23", "count": 15 }
  ],
  "topSources": [
    { "source": "The Verge", "count": 45 },
    { "source": "TechCrunch", "count": 32 }
  ],
  "topTopics": [
    { "topic": "GPT-5", "count": 80 },
    { "topic": "融资", "count": 35 }
  ],
  "trend": {
    "direction": "up",
    "changePercent": 25.5
  }
}
```

---

## 本地存储设计

```typescript
// localStorage 结构
{
  "trackers": [
    {
      "id": "trk_001",
      "type": "company",
      "name": "OpenAI",
      "keywords": ["openai", "open ai"],
      "domains": ["openai.com"],
      "color": "#10a37f",
      "enabled": true,
      "notifyOnMatch": true,
      "summaryFrequency": "daily"
    }
  ],
  "trackerMatches": {
    "trk_001": [
      {
        "id": "match_001",
        "newsId": "news_12345",
        "matchedKeywords": ["OpenAI"],
        "matchScore": 80,
        "matchedAt": "2026-04-29T10:05:00Z"
      }
    ]
  }
}
```

---

## 实现阶段

### Phase 1 (核心功能)
- [ ] 追踪目标 CRUD
- [ ] 关键词匹配逻辑
- [ ] 时间轴视图
- [ ] localStorage 持久化

### Phase 2 (统计与通知)
- [ ] 趨勢統計圖表
- [ ] 实时匹配通知
- [ ] 预设追踪包
- [ ] 导出功能

### Phase 3 (进阶)
- [ ] 声量对比
- [ ] 情感分析
- [ ] 自动发现相关公司/技术

---

**日期**: 2026-04-29  
**版本**: v1.0  
**状态**: 待评审
