# 3D全球热点地球 - 扩展功能设计方案

## 一、项目概述

### 1.1 当前状态
- **组件**：`GlobeView.jsx`（基于 `react-globe.gl`）
- **功能**：3D地球 + 红点标记今日资讯 + Tooltip + 点击跳转
- **集成位置**："今日态势"概览页

### 1.2 设计目标
将3D地球从单一的"展示组件"升级为"全球科技资讯态势中心"，提供多维度的数据可视化、时间回溯、智能分析能力。

---

## 二、扩展功能设计方案

### 功能1：热力图模式（Heatmap Layer）

#### 需求描述
将红点升级为热力图层，颜色深浅表示资讯密度，一眼识别全球科技热点区域。

#### 技术实现
```jsx
// 热力点数据生成
const heatmapData = useMemo(() => {
  return Object.values(cityGroups).map(group => ({
    lat: group.lat,
    lng: group.lng,
    value: group.count, // 资讯数量决定热力强度
    maxVal: maxCount,  // 用于归一化
  }));
}, [cityGroups]);

// 颜色映射函数
function getHeatColor(value, maxVal) {
  const intensity = value / maxVal;
  if (intensity > 0.8) return '#ff0000';  // 深红：高密度
  if (intensity > 0.6) return '#ff4444'; // 红
  if (intensity > 0.4) return '#ff8844'; // 橙
  if (intensity > 0.2) return '#ffaa44'; // 黄
  return '#ffcc44'; // 浅黄：低密度
}
```

#### UI设计
- 热力点半径随资讯数量动态变化（`size = 0.3 + count * 0.1`）
- 颜色从浅黄→橙→红渐变
- 添加图例说明密度等级

---

### 功能2：时间轴回放（Timeline Animation）

#### 需求描述
用户可通过时间轴控件，按天/周/月回放资讯分布变化，观察科技热点的时空演进。

#### 技术实现
```jsx
const [selectedDate, setSelectedDate] = useState(new Date());
const [isPlaying, setIsPlaying] = useState(false);

// 播放控制
useEffect(() => {
  if (!isPlaying) return;
  const timer = setInterval(() => {
    setSelectedDate(prev => {
      const next = new Date(prev);
      next.setDate(next.getDate() + 1);
      return next;
    });
  }, 1000); // 1秒切换一天
  return () => clearInterval(timer);
}, [isPlaying]);

// 过滤某天的资讯
const dayItems = useMemo(() => {
  const dayStr = selectedDate.toISOString().slice(0, 10);
  return items.filter(i => i.publishedAt?.slice(0, 10) === dayStr);
}, [items, selectedDate]);
```

#### UI设计
```
┌─────────────────────────────────────────────┐
│  ◀◀  ◀   2025-01-15   ▶  ▶▶  [播放 ▶]   │
│  ├────┬────┬────┬────┬────┬────┬────┤   │
│  01.09  01.10  01.11  01.12  01.13  01.14  01.15 │
└─────────────────────────────────────────────┘
```

---

### 功能3：多维度筛选（Multi-dimensional Filter）

#### 需求描述
用户可按赛道、区域、来源类型筛选，只显示特定类型的资讯分布。

#### 技术实现
```jsx
const [filters, setFilters] = useState({
  category: 'all',    // ai-models / dev-tools / ...
  region: 'all',      // domestic / overseas / global
  sourceType: 'all',  // media / company / community
});

const filteredItems = useMemo(() => {
  return items.filter(item => {
    if (filters.category !== 'all' && item.category !== filters.category) return false;
    if (filters.region !== 'all' && item.region !== filters.region) return false;
    return true;
  });
}, [items, filters]);
```

#### UI设计
```
┌─────────────────────────────────────────────┐
│  赛道: [全部 ▼]  区域: [全部 ▼]  来源: [全部 ▼] │
└─────────────────────────────────────────────┘
```

---

### 功能4：资讯详情面板（Detail Panel）

#### 需求描述
点击红点后不跳转新页面，而是在地球旁边展开详情面板，显示该城市所有资讯列表。

#### 技术实现
```jsx
const [selectedCity, setSelectedCity] = useState(null);

const handlePointClick = (point) => {
  setSelectedCity(point);
};

// 详情面板组件
function CityDetailPanel({ city, onClose }) {
  return (
    <div className="city-detail-panel">
      <div className="panel-header">
        <h3>{city.city} ({city.count}条资讯)</h3>
        <button onClick={onClose}>×</button>
      </div>
      <div className="panel-body">
        {city.items.map(item => (
          <div key={item.id} className="news-item" onClick={() => window.open(item.url)}>
            <span className="news-time">{formatTime(item.publishedAt)}</span>
            <span className="news-title">{item.title}</span>
            <span className="news-source">{item.source}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### UI设计
```
┌──────────────────────────────────────────────────┐
│                                                   │
│    [3D地球]          ┌───────────────────────┐   │
│                     │ 北京 (5条资讯)        × │   │
│                     ├───────────────────────┤   │
│                     │ 2小时前  字节跳动...    │   │
│                     │ 3小时前  OpenAI...      │   │
│                     │ 5小时前  华为...         │   │
│                     └───────────────────────┘   │
└──────────────────────────────────────────────────┘
```

---

### 功能5：脉冲动画效果（Pulse Animation）

#### 需求描述
新资讯到达时，对应城市红点产生脉冲扩散动画，吸引用户注意。

#### 技术实现
```css
/* 脉冲动画 */
@keyframes pulse-ring {
  0% { transform: scale(0.8); opacity: 0.8; }
  100% { transform: scale(2.5); opacity: 0; }
}

.globe-point-pulse {
  position: relative;
}

.globe-point-pulse::before {
  content: '';
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: #ef4444;
  animation: pulse-ring 2s ease-out infinite;
}
```

---

### 功能6：资讯传播路径（Transmission Path）

#### 需求描述
用动画线条展示资讯从发源地传播到其他城市的路径，模拟信息传播过程。

#### 技术实现
```jsx
// 传播路径数据
const transmissionPaths = [
  { from: '北京', to: '旧金山', speed: 2000 },
  { from: '旧金山', to: '伦敦', speed: 1500 },
  // ...
];

// 使用 arcsData 实现
const arcsData = transmissionPaths.map(path => ({
  startLat: getCity(path.from).lat,
  startLng: getCity(path.from).lng,
  endLat: getCity(path.to).lat,
  endLng: getCity(path.to).lng,
  color: '#22d3ee',
  dashLength: 0.4,
  dashGap: 0.1,
  dashAnimateTime: path.speed,
}));
```

---

### 功能7：全球统计面板（Global Stats Panel）

#### 需求描述
在地球上方叠加统计面板，实时显示全球资讯数据概览。

#### 技术实现
```jsx
function GlobalStatsPanel({ items }) {
  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayItems = items.filter(i => i.publishedAt?.slice(0, 10) === today);
    
    return {
      totalToday: todayItems.length,
      topCity: getTopCity(todayItems),
      topCategory: getTopCategory(todayItems),
      growthRate: calculateGrowthRate(items),
    };
  }, [items]);

  return (
    <div className="global-stats">
      <StatCard label="今日收录" value={stats.totalToday} unit="条" />
      <StatCard label="最热城市" value={stats.topCity} />
      <StatCard label="最热赛道" value={stats.topCategory} />
      <StatCard label="环比增长" value={stats.growthRate} unit="%" />
    </div>
  );
}
```

#### UI设计
```
┌──────────────────────────────────────────────────┐
│  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ 今日收录  │ │ 最热城市  │ │ 环比增长  │        │
│  │   156    │ │   北京   │ │   +23%   │        │
│  └──────────┘ └──────────┘ └──────────┘        │
│                                                   │
│              [3D地球]                             │
└──────────────────────────────────────────────────┘
```

---

## 三、技术架构

### 3.1 组件架构
```
GlobeView
├── GlobeControls (控制面板)
│   ├── TimelineBar (时间轴)
│   ├── FilterBar (筛选器)
│   └── ViewToggle (视图切换)
├── Globe (3D地球)
│   ├── HeatmapLayer (热力图层)
│   ├── PointLayer (点图层)
│   ├── PathLayer (路径层)
│   └── LabelLayer (标签层)
└── DetailPanel (详情面板)
    ├── CityHeader
    ├── NewsList
    └── NewsItem
```

### 3.2 状态管理
```
GlobeView State:
├── items: Array<NewsItem>        // 全部资讯
├── selectedDate: Date            // 当前选中的日期
├── filters: FilterState          // 筛选条件
├── viewMode: 'heatmap' | 'point' // 视图模式
├── selectedCity: City | null     // 选中的城市
└── isPlaying: boolean            // 播放状态
```

### 3.3 性能优化
- **虚拟化**：只渲染可视区域内的点
- **防抖**：筛选条件变化时防抖处理
- **缓存**：城市坐标数据缓存
- **节流**：时间轴播放时 throttle 渲染

---

## 四、实施优先级

| 优先级 | 功能 | 预计工时 | 复杂度 |
|--------|------|----------|--------|
| P0 | 热力图模式 | 2天 | 中 |
| P0 | 详情面板 | 1.5天 | 中 |
| P1 | 时间轴回放 | 3天 | 高 |
| P1 | 多维度筛选 | 2天 | 中 |
| P2 | 脉冲动画 | 1天 | 低 |
| P2 | 传播路径 | 2天 | 高 |
| P2 | 统计面板 | 1天 | 低 |

---

## 五、交互流程

### 5.1 用户首次进入
1. 加载3D地球，自动旋转到中心视角
2. 显示今日资讯红点
3. 顶部显示统计面板

### 5.2 用户筛选资讯
1. 选择赛道/区域/来源
2. 地球上的点实时过滤
3. 统计面板数据更新

### 5.3 用户播放时间轴
1. 点击播放按钮
2. 日期自动推进，地球上的点动态变化
3. 可暂停、快进、后退

### 5.4 用户查看详情
1. 点击地球上的红点
2. 右侧展开详情面板
3. 显示该城市所有资讯
4. 点击资讯标题跳转到原文

---

## 六、风险与应对

| 风险 | 应对措施 |
|------|----------|
| 数据量大导致卡顿 | 使用防抖+节流，限制同时渲染的点数 |
| 时间轴播放卡顿 | 预加载数据，使用 requestAnimationFrame |
| 移动端适配 | 简化3D效果，提供2D备选视图 |
| 坐标映射不准确 | 建立完善的 source→城市 映射表 |

---

## 七、验收标准

- [ ] 热力图模式正常显示，颜色深浅表示资讯密度
- [ ] 时间轴播放流畅，无卡顿
- [ ] 多维度筛选实时响应
- [ ] 详情面板正确显示资讯列表
- [ ] 脉冲动画效果明显
- [ ] 统计面板数据准确
- [ ] 移动端可用性良好
