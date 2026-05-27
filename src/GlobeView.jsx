import { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Globe from 'react-globe.gl';

// source -> 城市坐标映射
const SOURCE_CITY_MAP = {
  '36kr': { city: '北京', lat: 39.9042, lng: 116.4074 },
  '极客公园': { city: '北京', lat: 39.9042, lng: 116.4074 },
  '虎嗅': { city: '北京', lat: 39.9042, lng: 116.4074 },
  '钛媒体': { city: '北京', lat: 39.9042, lng: 116.4074 },
  '爱范儿': { city: '广州', lat: 23.1291, lng: 113.2644 },
  '量子位': { city: '北京', lat: 39.9042, lng: 116.4074 },
  '机器之心': { city: '北京', lat: 39.9042, lng: 116.4074 },
  'InfoQ': { city: '北京', lat: 39.9042, lng: 116.4074 },
  '雷锋网': { city: '深圳', lat: 22.5431, lng: 114.0579 },
  '深圳特区报': { city: '深圳', lat: 22.5431, lng: 114.0579 },
  '浙江在线': { city: '杭州', lat: 30.2741, lng: 120.1551 },
  '上海科技报': { city: '上海', lat: 31.2304, lng: 121.4737 },
  '澎湃新闻': { city: '上海', lat: 31.2304, lng: 121.4737 },
  '新浪科技': { city: '北京', lat: 39.9042, lng: 116.4074 },
  '网易科技': { city: '北京', lat: 39.9042, lng: 116.4074 },
  '搜狐科技': { city: '北京', lat: 39.9042, lng: 116.4074 },
  '腾讯科技': { city: '深圳', lat: 22.5431, lng: 114.0579 },
  '阿里巴巴': { city: '杭州', lat: 30.2741, lng: 120.1551 },
  '华为': { city: '深圳', lat: 22.5431, lng: 114.0579 },
  '小米': { city: '北京', lat: 39.9042, lng: 116.4074 },
  '字节跳动': { city: '北京', lat: 39.9042, lng: 116.4074 },
  '百度': { city: '北京', lat: 39.9042, lng: 116.4074 },
  'TechCrunch': { city: '旧金山', lat: 37.7749, lng: -122.4194 },
  'The Verge': { city: '纽约', lat: 40.7128, lng: -74.0060 },
  'Wired': { city: '旧金山', lat: 37.7749, lng: -122.4194 },
  'Ars Technica': { city: '纽约', lat: 40.7128, lng: -74.0060 },
  'Engadget': { city: '纽约', lat: 40.7128, lng: -74.0060 },
  'CNET': { city: '旧金山', lat: 37.7749, lng: -122.4194 },
  'Reuters': { city: '伦敦', lat: 51.5074, lng: -0.1276 },
  'BBC': { city: '伦敦', lat: 51.5074, lng: -0.1276 },
  'Bloomberg': { city: '纽约', lat: 40.7128, lng: -74.0060 },
  'MIT Technology Review': { city: '波士顿', lat: 42.3601, lng: -71.0589 },
  'Nature': { city: '伦敦', lat: 51.5074, lng: -0.1276 },
  'IEEE Spectrum': { city: '纽约', lat: 40.7128, lng: -74.0060 },
  'VentureBeat': { city: '旧金山', lat: 37.7749, lng: -122.4194 },
  'ZDNet': { city: '旧金山', lat: 37.7749, lng: -122.4194 },
  'Forbes': { city: '纽约', lat: 40.7128, lng: -74.0060 },
  'Hacker News': { city: '旧金山', lat: 37.7749, lng: -122.4194 },
  'GitHub Blog': { city: '旧金山', lat: 37.7749, lng: -122.4194 },
  'OpenAI Blog': { city: '旧金山', lat: 37.7749, lng: -122.4194 },
  'Google AI Blog': { city: '山景城', lat: 37.3861, lng: -122.0839 },
  'Meta AI': { city: '门洛帕克', lat: 37.4530, lng: -122.1817 },
  'Apple Newsroom': { city: '库比蒂诺', lat: 37.3230, lng: -122.0322 },
  'Microsoft Blog': { city: '西雅图', lat: 47.6062, lng: -122.3321 },
  'Amazon Web Services': { city: '西雅图', lat: 47.6062, lng: -122.3321 },
  'NVIDIA Blog': { city: '圣克拉拉', lat: 37.3541, lng: -121.9552 },
  'Slashdot': { city: '旧金山', lat: 37.7749, lng: -122.4194 },
  'ArXiv': { city: '纽约', lat: 40.7128, lng: -74.0060 },
  'TechRadar': { city: '伦敦', lat: 51.5074, lng: -0.1276 },
  'Android Police': { city: '纽约', lat: 40.7128, lng: -74.0060 },
  '9to5Mac': { city: '旧金山', lat: 37.7749, lng: -122.4194 },
  'MacRumors': { city: '旧金山', lat: 37.7749, lng: -122.4194 },
  'Android Central': { city: '纽约', lat: 40.7128, lng: -74.0060 },
  'XDA Developers': { city: '纽约', lat: 40.7128, lng: -74.0060 },
  'Phoronix': { city: '纽约', lat: 40.7128, lng: -74.0060 },
  'LWN': { city: '纽约', lat: 40.7128, lng: -74.0060 },
  'DistroWatch': { city: '纽约', lat: 40.7128, lng: -74.0060 },
  'Nikkei Asia': { city: '东京', lat: 35.6895, lng: 139.6917 },
  'TechCrunch Japan': { city: '东京', lat: 35.6895, lng: 139.6917 },
  'The Korea Herald': { city: '首尔', lat: 37.5665, lng: 126.9780 },
  'default-domestic': { city: '北京', lat: 39.9042, lng: 116.4074 },
  'default-overseas': { city: '旧金山', lat: 37.7749, lng: -122.4194 },
  'default-global': { city: '新加坡', lat: 1.3521, lng: 103.8198 },
};

function getCityFromSource(source, region) {
  if (!source) {
    const key = `default-${region || 'overseas'}`;
    return SOURCE_CITY_MAP[key] || SOURCE_CITY_MAP['default-overseas'];
  }
  if (SOURCE_CITY_MAP[source]) return SOURCE_CITY_MAP[source];
  for (const key of Object.keys(SOURCE_CITY_MAP)) {
    if (source.includes(key) || key.includes(source)) return SOURCE_CITY_MAP[key];
  }
  const key = `default-${region || 'overseas'}`;
  return SOURCE_CITY_MAP[key] || SOURCE_CITY_MAP['default-overseas'];
}

function formatTime(publishedAt) {
  if (!publishedAt) return '未知时间';
  const date = new Date(publishedAt);
  const now = new Date();
  const diff = now - date;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return '刚刚';
  if (hours < 24) return `${hours}小时前`;
  return `${Math.floor(hours / 24)}天前`;
}

// 分类 ID -> 名称映射
const CATEGORY_LABELS = {
  'ai-models': 'AI 大模型',
  'research': '科研前沿',
  'open-source': '开源生态',
  'data-science': '数据科学',
  'quantum': '量子计算',
  'cybersecurity': '网络安全',
  'chips-compute': '芯片半导体',
  'devices': '硬件数码',
  'robotics': '机器人',
  'iot-5g': '物联网5G',
  'silicon-valley': '硅谷欧美',
  'china-tech': '国内大厂',
  'policy-finance': '政策财经',
  'fintech': '金融科技',
  'space': '太空探索',
  'new-energy': '新能源',
  'climate-esg': '气候ESG',
  'gaming': '游戏电竞',
  'metaverse-xr': '元宇宙XR',
  'healthcare': '医疗健康',
  'education-tech': '教育科技',
  'agriculture-tech': '农业科技',
  'cloud': '云计算',
  'automotive': '智能汽车',
};

// 赛道分组
const CATEGORY_GROUPS = [
  { id: 'tech-frontier', label: '科技前沿', categories: ['ai-models', 'research', 'open-source', 'data-science', 'quantum', 'cybersecurity'] },
  { id: 'hardware-compute', label: '计算硬件', categories: ['chips-compute', 'devices', 'robotics', 'iot-5g'] },
  { id: 'industry-economy', label: '产业经济', categories: ['silicon-valley', 'china-tech', 'policy-finance', 'fintech'] },
  { id: 'emerging-fields', label: '新兴领域', categories: ['space', 'new-energy', 'climate-esg', 'gaming', 'metaverse-xr'] },
  { id: 'industry-apps', label: '行业应用', categories: ['healthcare', 'education-tech', 'agriculture-tech', 'cloud', 'automotive'] },
];

// 检测当前主题
function isLightTheme() { return document.documentElement.getAttribute('data-theme') === 'light'; }

// 热力图颜色映射：根据主题返回适配颜色
function getHeatColor(count, maxCount) {
  const intensity = maxCount > 0 ? count / maxCount : 0;
  if (isLightTheme()) {
    if (intensity > 0.8) return '#dc2626';
    if (intensity > 0.6) return '#ea580c';
    if (intensity > 0.4) return '#ca8a04';
    if (intensity > 0.2) return '#a16207';
    return '#854d0e';
  }
  if (intensity > 0.8) return '#ef4444';
  if (intensity > 0.6) return '#f97316';
  if (intensity > 0.4) return '#facc15';
  if (intensity > 0.2) return '#fde047';
  return '#fef08a';
}

// 区域映射
function getRegionFromSource(source) {
  if (!source) return 'overseas';
  const domesticSources = ['36kr', '极客公园', '虎嗅', '钛媒体', '爱范儿', '量子位', '机器之心', 'InfoQ', '雷锋网', '深圳特区报', '浙江在线', '上海科技报', '澎湃新闻', '新浪科技', '网易科技', '搜狐科技', '腾讯科技', '阿里巴巴', '华为', '小米', '字节跳动', '百度'];
  if (domesticSources.some(s => source.includes(s) || s.includes(source))) return 'domestic';
  return 'overseas';
}

// ============ 统计面板组件 ============

function StatCard({ label, value, unit, color }) {
  return (
    <div className="globe-stat-card">
      <div className="globe-stat-label">{label}</div>
      <div className="globe-stat-value" style={color ? { color } : {}}>
        {value}
        {unit && <span className="globe-stat-unit">{unit}</span>}
      </div>
    </div>
  );
}

// 左侧面板：分类统计 + 来源分布 + 趋势
function LeftPanel({ items, filteredItems, onCategoryChange }) {
  // 分类统计
  const categoryStats = useMemo(() => {
    const counts = {};
    filteredItems.forEach(item => {
      if (item.category) {
        counts[item.category] = (counts[item.category] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([id, count]) => ({ id, label: CATEGORY_LABELS[id] || id, count }));
  }, [filteredItems]);

  // 来源分布
  const sourceStats = useMemo(() => {
    const counts = {};
    filteredItems.forEach(item => {
      if (item.source) {
        counts[item.source] = (counts[item.source] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));
  }, [filteredItems]);

  // 7日趋势
  const trendData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    return days.map(day => ({
      date: day.slice(5),
      count: items.filter(i => i.publishedAt?.slice(0, 10) === day).length,
    }));
  }, [items]);

  const maxTrend = Math.max(...trendData.map(d => d.count), 1);

  return (
    <div className="globe-panel globe-panel-left">
      {/* 分类统计 */}
      <div className="globe-panel-section">
        <h4 className="globe-panel-title">
          <span className="globe-panel-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
          </span> 资讯分类统计
        </h4>
        <div className="globe-panel-content">
          {categoryStats.length === 0 ? (
            <div className="globe-panel-empty">暂无数据</div>
          ) : (
            categoryStats.map(stat => (
              <div key={stat.id} className="globe-stat-row" onClick={() => onCategoryChange && onCategoryChange(stat.id)}>
                <span className="globe-stat-row-label">{stat.label}</span>
                <div className="globe-stat-row-bar-wrap">
                  <div className="globe-stat-row-bar" style={{ width: `${(stat.count / categoryStats[0].count) * 100}%` }} />
                </div>
                <span className="globe-stat-row-value">{stat.count}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 来源分布 */}
      <div className="globe-panel-section">
        <h4 className="globe-panel-title">
          <span className="globe-panel-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2C7 7 7 17 12 22" />
              <path d="M12 2C17 7 17 17 12 22" />
              <path d="M2 12h20" />
              <path d="M4 7h16" />
              <path d="M4 17h16" />
            </svg>
          </span> 来源分布
        </h4>
        <div className="globe-panel-content">
          {sourceStats.length === 0 ? (
            <div className="globe-panel-empty">暂无数据</div>
          ) : (
            sourceStats.map(stat => (
              <div key={stat.name} className="globe-stat-row">
                <span className="globe-stat-row-label">{stat.name}</span>
                <div className="globe-stat-row-bar-wrap">
                  <div className="globe-stat-row-bar source" style={{ width: `${(stat.count / sourceStats[0].count) * 100}%` }} />
                </div>
                <span className="globe-stat-row-value">{stat.count}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 趋势图表 */}
      <div className="globe-panel-section">
        <h4 className="globe-panel-title">
          <span className="globe-panel-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" />
              <path d="M7 16l4-4 3 3 5-5" />
            </svg>
          </span> 7日趋势
        </h4>
        <div className="globe-panel-content">
          <div className="globe-trend-chart">
            {trendData.map((d, i) => (
              <div key={i} className="globe-trend-col">
                <div className="globe-trend-bar" style={{ height: `${(d.count / maxTrend) * 100}%` }} />
                <span className="globe-trend-date">{d.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// 右侧面板：最新资讯 + 热门话题 + 实时动态
function RightPanel({ filteredItems }) {
  // 最新资讯
  const latestNews = useMemo(() => {
    return [...filteredItems]
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
      .slice(0, 8);
  }, [filteredItems]);

  // 热门话题（简单关键词提取）
  const hotTopics = useMemo(() => {
    const wordCounts = {};
    filteredItems.forEach(item => {
      if (item.title) {
        const words = item.title.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ' ').split(/\s+/).filter(w => w.length >= 2);
        words.forEach(w => {
          wordCounts[w] = (wordCounts[w] || 0) + 1;
        });
      }
    });
    return Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }));
  }, [filteredItems]);

  return (
    <div className="globe-panel globe-panel-right">
      {/* 最新资讯 */}
      <div className="globe-panel-section">
        <h4 className="globe-panel-title">
          <span className="globe-panel-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <line x1="10" y1="9" x2="8" y2="9" />
            </svg>
          </span> 最新资讯
        </h4>
        <div className="globe-panel-content">
          {latestNews.length === 0 ? (
            <div className="globe-panel-empty">暂无数据</div>
          ) : (
            latestNews.map((item, idx) => (
              <div key={idx} className="globe-news-item" onClick={() => item.url && window.open(item.url, '_blank')}>
                <div className="globe-news-title">{item.title}</div>
                <div className="globe-news-meta">
                  <span>{item.source}</span>
                  <span>{formatTime(item.publishedAt)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 热门话题 */}
      <div className="globe-panel-section">
        <h4 className="globe-panel-title">
          <span className="globe-panel-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2c0 4-3 6-3 10 0 3 1.5 5 3 7 1.5-2 3-4 3-7 0-4-3-6-3-10z" />
              <path d="M8 14c-1.5 1-3 3-3 5a5 5 0 0 0 10 0c0-2-1.5-4-3-5" />
            </svg>
          </span> 热门话题
        </h4>
        <div className="globe-panel-content">
          {hotTopics.length === 0 ? (
            <div className="globe-panel-empty">暂无数据</div>
          ) : (
            <div className="globe-topic-cloud">
              {hotTopics.map((topic, idx) => (
                <span key={idx} className="globe-topic-tag" style={{ opacity: 1 - idx * 0.08 }}>
                  {topic.word}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 实时动态 */}
      <div className="globe-panel-section">
        <h4 className="globe-panel-title">
          <span className="globe-panel-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </span> 实时动态
        </h4>
        <div className="globe-panel-content">
          <div className="globe-live-stats">
            <div className="globe-live-item">
              <span className="globe-live-dot" />
              <span>今日收录 {filteredItems.length} 条资讯</span>
            </div>
            <div className="globe-live-item">
              <span className="globe-live-dot green" />
              <span>覆盖 {new Set(filteredItems.map(i => i.source)).size} 个来源</span>
            </div>
            <div className="globe-live-item">
              <span className="globe-live-dot blue" />
              <span>涉及 {new Set(filteredItems.map(i => i.category).filter(Boolean)).size} 个赛道</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ 主地球内容 ============

function GlobeContent({ items, isFullscreen, onClose }) {
  const globeRef = useRef();
  const [selectedCity, setSelectedCity] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterRegion, setFilterRegion] = useState('all');
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  });
  const [isPlaying, setIsPlaying] = useState(false);

  // 自动播放
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setSelectedDate(prev => {
        const [y, m, d] = prev.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        date.setDate(date.getDate() + 1);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (date > today) {
          setIsPlaying(false);
          return prev;
        }
        return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
      });
    }, 1500);
    return () => clearInterval(timer);
  }, [isPlaying]);

  // 日期范围
  const dateRange = useMemo(() => {
    const dates = [...new Set(items.map(i => i.publishedAt?.slice(0, 10)).filter(Boolean))].sort();
    return dates;
  }, [items]);

  const dateItems = useMemo(() => {
    return items.filter(i => i.publishedAt?.slice(0, 10) === selectedDate);
  }, [items, selectedDate]);

  // 过滤
  const filteredItems = useMemo(() => {
    return dateItems.filter(item => {
      if (filterCategory !== 'all' && item.category !== filterCategory) return false;
      if (filterRegion !== 'all') {
        const itemRegion = item.region || getRegionFromSource(item.source);
        if (itemRegion !== filterRegion) return false;
      }
      return true;
    });
  }, [dateItems, filterCategory, filterRegion]);

  // 热力图数据
  const heatmapData = useMemo(() => {
    if (filteredItems.length === 0) return { points: [], maxCount: 0 };
    const cityGroups = {};
    filteredItems.forEach(item => {
      const cityInfo = getCityFromSource(item.source, item.region);
      const key = `${cityInfo.lat}-${cityInfo.lng}`;
      if (!cityGroups[key]) {
        cityGroups[key] = { ...cityInfo, items: [], count: 0 };
      }
      cityGroups[key].items.push(item);
      cityGroups[key].count += 1;
    });
    const maxCount = Math.max(...Object.values(cityGroups).map(g => g.count), 1);
    const points = Object.values(cityGroups).map(group => ({
      lat: group.lat, lng: group.lng,
      size: Math.min(group.count * 0.15 + 0.3, 1.5),
      color: getHeatColor(group.count, maxCount),
      count: group.count, items: group.items, city: group.city,
    }));
    return { points, maxCount };
  }, [filteredItems]);

  // 默认城市
  const defaultPoints = useMemo(() => {
    if (heatmapData.points.length > 0) return [];
    const defaults = [
      { city: '北京', lat: 39.9042, lng: 116.4074 },
      { city: '深圳', lat: 22.5431, lng: 114.0579 },
      { city: '杭州', lat: 30.2741, lng: 120.1551 },
      { city: '上海', lat: 31.2304, lng: 121.4737 },
      { city: '旧金山', lat: 37.7749, lng: -122.4194 },
      { city: '西雅图', lat: 47.6062, lng: -122.3321 },
      { city: '纽约', lat: 40.7128, lng: -74.0060 },
      { city: '伦敦', lat: 51.5074, lng: -0.1276 },
      { city: '东京', lat: 35.6895, lng: 139.6917 },
      { city: '首尔', lat: 37.5665, lng: 126.9780 },
      { city: '新加坡', lat: 1.3521, lng: 103.8198 },
      { city: '班加罗尔', lat: 12.9716, lng: 77.5946 },
    ];
    return defaults.map(d => ({ lat: d.lat, lng: d.lng, size: 0.5, color: '#fde047', count: 0, items: [], city: d.city }));
  }, [heatmapData.points.length]);

  const pointsData = heatmapData.points.length > 0 ? heatmapData.points : defaultPoints;

  // 标签 - 始终显示城市名称
  const labelsData = useMemo(() => {
    return pointsData.map(p => ({
      lat: p.lat,
      lng: p.lng,
      text: p.city || '热点',
      color: isLightTheme() ? '#1e293b' : '#f1f5f9',
      size: p.count > 0 ? 1.2 : 0.8
    }));
  }, [pointsData]);

  // 脉冲环
  const ringsData = useMemo(() => {
    return pointsData.filter(p => p.count > 0).map(p => ({
      lat: p.lat, lng: p.lng, maxR: 3 + p.count * 0.5,
      propagationSpeed: 2, repeatPeriod: 2000, color: p.color,
    }));
  }, [pointsData]);

  // 传播路径
  const arcsData = useMemo(() => {
    const active = pointsData.filter(p => p.count > 0);
    if (active.length < 2) return [];
    const sorted = [...active].sort((a, b) => b.count - a.count);
    const origin = sorted[0];
    return sorted.slice(1).map(p => ({
      startLat: origin.lat, startLng: origin.lng, endLat: p.lat, endLng: p.lng,
      color: '#22d3ee', dashLength: 0.4, dashGap: 0.1, dashAnimateTime: 2000 + Math.random() * 1000,
    }));
  }, [pointsData]);

  // 统计
  const stats = useMemo(() => {
    const totalToday = filteredItems.length;
    const cityCounts = {};
    filteredItems.forEach(item => {
      const cityInfo = getCityFromSource(item.source, item.region);
      cityCounts[cityInfo.city] = (cityCounts[cityInfo.city] || 0) + 1;
    });
    const topCityEntry = Object.entries(cityCounts).sort((a, b) => b[1] - a[1])[0];
    const topCity = topCityEntry ? topCityEntry[0] : '-';
    const categoryCounts = {};
    filteredItems.forEach(item => { if (item.category) categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1; });
    const topCategoryEntry = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0];
    const topCategory = topCategoryEntry ? (CATEGORY_LABELS[topCategoryEntry[0]] || topCategoryEntry[0]) : '-';
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.getFullYear() + '-' + String(yesterday.getMonth() + 1).padStart(2, '0') + '-' + String(yesterday.getDate()).padStart(2, '0');
    const yesterdayCount = items.filter(i => i.publishedAt?.slice(0, 10) === yesterdayStr).length;
    const growthRate = yesterdayCount > 0 ? Math.round(((dateItems.length - yesterdayCount) / yesterdayCount) * 100) : (dateItems.length > 0 ? 100 : 0);
    return { totalToday, topCity, topCategory, growthRate };
  }, [filteredItems, items, dateItems.length]);

  const handlePointClick = (point) => { if (point.items && point.items.length > 0) setSelectedCity(point); };
  const handleClosePanel = () => setSelectedCity(null);
  const handleItemClick = (url) => { if (url) window.open(url, '_blank'); };

  const getPointTooltip = (point) => {
    if (!point.items || point.items.length === 0) return `<div style="color:#22d3ee;font-size:12px;">${point.city || '热点城市'}</div>`;
    const recentItem = point.items[0];
    return `
      <div style="background:rgba(10,12,16,0.9);backdrop-filter:blur(12px);border:1px solid ${point.color};border-radius:10px;padding:12px 16px;color:#f1f5f9;font-size:13px;max-width:280px;box-shadow:0 4px 20px rgba(0,0,0,0.4);">
        <div style="font-weight:700;color:${point.color};font-size:14px;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
          <span style="width:8px;height:8px;background:${point.color};border-radius:50%;display:inline-block;box-shadow:0 0 6px ${point.color};"></span>
          ${point.city} (${point.count}条资讯)
        </div>
        <div style="border-top:1px solid rgba(255,255,255,0.1);padding-top:8px;margin-top:8px;">
          <div style="color:#94a3b8;font-size:11px;margin-bottom:4px;">${formatTime(recentItem.publishedAt)}</div>
          <div style="line-height:1.4;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${recentItem.title}</div>
        </div>
        <div style="margin-top:8px;font-size:11px;color:#22d3ee;">点击查看详情 →</div>
      </div>
    `;
  };

  // 地球尺寸：全屏模式下最大化利用空间
  const globeSize = isFullscreen
    ? { width: window.innerWidth - 600, height: window.innerHeight - 160 }
    : { width: 560, height: 420 };

  // 嵌入模式：原来的简单布局
  if (!isFullscreen) {
    return (
      <div className="globe-container">
        <div className="globe-header">
          <h3 className="globe-title">全球热点</h3>
          <div className="globe-legend">
            <span className="globe-legend-item"><span className="globe-legend-dot heat-low" />低密度</span>
            <span className="globe-legend-item"><span className="globe-legend-dot heat-mid" />中密度</span>
            <span className="globe-legend-item"><span className="globe-legend-dot heat-high" />高密度</span>
          </div>
        </div>
        <div className="globe-timeline">
        <button className="globe-timeline-btn" onClick={() => { const idx = dateRange.indexOf(selectedDate); if (idx > 0) setSelectedDate(dateRange[idx - 1]); }} disabled={dateRange.indexOf(selectedDate) <= 0}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <button className="globe-timeline-play" onClick={() => setIsPlaying(p => !p)}>
          {isPlaying ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="10" y1="15" x2="10" y2="9" />
              <line x1="14" y1="15" x2="14" y2="9" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
        </button>
          <div className="globe-timeline-dates">
            {dateRange.slice(-7).map(date => (
              <button key={date} className={`globe-timeline-date ${date === selectedDate ? 'active' : ''}`} onClick={() => { setSelectedDate(date); setIsPlaying(false); }}>{date.slice(5)}</button>
            ))}
          </div>
        <button className="globe-timeline-btn" onClick={() => { const idx = dateRange.indexOf(selectedDate); if (idx >= 0 && idx < dateRange.length - 1) setSelectedDate(dateRange[idx + 1]); }} disabled={dateRange.indexOf(selectedDate) >= dateRange.length - 1}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        </div>
        <div className="globe-filter-bar">
          <div className="globe-filter-group">
            <label className="globe-filter-label">赛道</label>
            <select className="globe-filter-select" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
              <option value="all">全部赛道</option>
              {CATEGORY_GROUPS.map(group => (
                <optgroup key={group.id} label={group.label}>
                  {group.categories.map(catId => <option key={catId} value={catId}>{CATEGORY_LABELS[catId] || catId}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="globe-filter-group">
            <label className="globe-filter-label">区域</label>
            <select className="globe-filter-select" value={filterRegion} onChange={e => setFilterRegion(e.target.value)}>
              <option value="all">全部区域</option><option value="domestic">国内</option><option value="overseas">海外</option><option value="global">全球</option>
            </select>
          </div>
        </div>
        <div className="globe-stats-bar">
          <StatCard label="今日收录" value={stats.totalToday} unit="条" />
          <StatCard label="最热城市" value={stats.topCity} />
          <StatCard label="最热赛道" value={stats.topCategory} />
          <StatCard label="环比增长" value={`${stats.growthRate >= 0 ? '+' : ''}${stats.growthRate}%`} color={stats.growthRate >= 0 ? '#22c55e' : '#ef4444'} />
        </div>
        <div className="globe-wrapper" style={{ position: 'relative' }}>
          <Globe ref={globeRef} width={globeSize.width} height={globeSize.height}
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
            bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
            backgroundColor="rgba(0,0,0,0)" atmosphereColor="#22d3ee" atmosphereAltitude={0.15}
            pointsData={pointsData} pointColor="color" pointAltitude={0} pointRadius="size" pointResolution={32}
            pointLabel={getPointTooltip} onPointClick={handlePointClick}
            labelsData={labelsData} labelLat="lat" labelLng="lng" labelText="text" labelColor="color" labelSize="size" labelDotRadius={0.3} labelAltitude={0.02}
            ringsData={ringsData} ringColor="color" ringMaxRadius="maxR" ringPropagationSpeed="propagationSpeed" ringRepeatPeriod="repeatPeriod"
            arcsData={arcsData} arcColor="color" arcDashLength="dashLength" arcDashGap="dashGap" arcDashAnimateTime="dashAnimateTime" arcStroke={0.5}
            enablePointerInteraction={true}
          />
          {selectedCity && (
            <div className="globe-detail-panel">
              <div className="globe-detail-header">
                <h4 className="globe-detail-title"><span className="globe-detail-dot" style={{ background: selectedCity.color }} />{selectedCity.city} ({selectedCity.count}条)</h4>
            <button className="globe-detail-close" onClick={handleClosePanel}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
              </div>
              <div className="globe-detail-list">
                {selectedCity.items.map((item, idx) => (
                  <div key={idx} className="globe-detail-item" onClick={() => handleItemClick(item.url)}>
                    <div className="globe-detail-item-title">{item.title}</div>
                    <div className="globe-detail-item-meta"><span>{item.source}</span><span>{formatTime(item.publishedAt)}</span></div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 全屏大屏模式：地球铺满全屏，面板浮层
  const globeWidth = window.innerWidth;
  const globeHeight = window.innerHeight;

  return (
    <div className="globe-dashboard">
      {/* 地球铺满整个背景 */}
      <Globe ref={globeRef} width={globeWidth} height={globeHeight}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundColor="rgba(0,0,0,0)" atmosphereColor="#22d3ee" atmosphereAltitude={0.15}
        pointsData={pointsData} pointColor="color" pointAltitude={0} pointRadius="size" pointResolution={32}
        pointLabel={getPointTooltip} onPointClick={handlePointClick}
        labelsData={labelsData} labelLat="lat" labelLng="lng" labelText="text" labelColor="color" labelSize="size" labelDotRadius={0.3} labelAltitude={0.02}
        ringsData={ringsData} ringColor="color" ringMaxRadius="maxR" ringPropagationSpeed="propagationSpeed" ringRepeatPeriod="repeatPeriod"
        arcsData={arcsData} arcColor="color" arcDashLength="dashLength" arcDashGap="dashGap" arcDashAnimateTime="dashAnimateTime" arcStroke={0.5}
        enablePointerInteraction={true}
      />

      {/* 背景装饰 */}
      <div className="globe-bg-decoration" />
      <div className="globe-scanlines" />

      {/* 四角装饰 */}
      <div className="corner-bl" />
      <div className="corner-br" />

      {/* 顶部标题栏 */}
      <div className="globe-topbar">
        <div className="globe-topbar-left">
          <div className="globe-topbar-brand">
          <span className="globe-brand-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <ellipse cx="12" cy="12" rx="10" ry="4" />
              <path d="M2 12h20" />
              <path d="M12 2c-3 3-5 7-5 12s2 9 5 12c3-3 5-7 5-12s-2-9-5-12z" />
            </svg>
          </span>
            <div>
              <h2 className="globe-brand-title">全球科技资讯态势大屏</h2>
              <div className="globe-brand-subtitle">Global Tech News Command Center</div>
            </div>
          </div>
        </div>
        <div className="globe-topbar-center">
          <div className="globe-topbar-date">
            <span className="globe-date-label">SELECTED DATE</span>
            <span className="globe-date-value">{selectedDate}</span>
          </div>
        </div>
        <div className="globe-topbar-right">
          <div className="globe-topbar-stats">
            <div className="globe-topbar-stat">
              <span className="globe-stat-num">{stats.totalToday}</span>
              <span className="globe-stat-desc">今日收录</span>
            </div>
            <div className="globe-topbar-stat">
              <span className="globe-stat-num">{stats.topCity}</span>
              <span className="globe-stat-desc">最热城市</span>
            </div>
            <div className="globe-topbar-stat">
              <span className="globe-stat-num">{stats.topCategory}</span>
              <span className="globe-stat-desc">最热赛道</span>
            </div>
          </div>
          <button className="globe-close-btn" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* 左侧面板：统计 */}
      <div className="globe-side-panel globe-side-left">
        <LeftPanel items={items} filteredItems={filteredItems} onCategoryChange={setFilterCategory} />
      </div>

      {/* 右侧面板：资讯 */}
      <div className="globe-side-panel globe-side-right">
        <RightPanel items={items} filteredItems={filteredItems} />
      </div>

      {/* 底部时间轴 */}
      <div className="globe-bottombar">
        <button className="globe-timeline-btn" onClick={() => { const idx = dateRange.indexOf(selectedDate); if (idx > 0) setSelectedDate(dateRange[idx - 1]); }} disabled={dateRange.indexOf(selectedDate) <= 0}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <button className="globe-timeline-play" onClick={() => setIsPlaying(p => !p)}>
          {isPlaying ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="10" y1="15" x2="10" y2="9" />
              <line x1="14" y1="15" x2="14" y2="9" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
        </button>
        <div className="globe-timeline-dates">
          {dateRange.slice(-7).map(date => (
            <button key={date} className={`globe-timeline-date ${date === selectedDate ? 'active' : ''}`} onClick={() => { setSelectedDate(date); setIsPlaying(false); }}>{date.slice(5)}</button>
          ))}
        </div>
        <button className="globe-timeline-btn" onClick={() => { const idx = dateRange.indexOf(selectedDate); if (idx >= 0 && idx < dateRange.length - 1) setSelectedDate(dateRange[idx + 1]); }} disabled={dateRange.indexOf(selectedDate) >= dateRange.length - 1}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* 详情面板 */}
      {selectedCity && (
        <div className="globe-detail-panel fullscreen">
          <div className="globe-detail-header">
            <h4 className="globe-detail-title">
              <span className="globe-detail-dot" style={{ background: selectedCity.color }} />
              {selectedCity.city} ({selectedCity.count}条)
            </h4>
                <button className="globe-detail-close" onClick={handleClosePanel}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
          </div>
          <div className="globe-detail-list">
            {selectedCity.items.map((item, idx) => (
              <div key={idx} className="globe-detail-item" onClick={() => handleItemClick(item.url)}>
                <div className="globe-detail-item-title">{item.title}</div>
                <div className="globe-detail-item-meta">
                  <span>{item.source}</span>
                  <span>{formatTime(item.publishedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============ 主组件 ============
export default function GlobeView({ items = [], externalFullscreen, onFullscreenChange }) {
  const [internalFullscreen, setInternalFullscreen] = useState(false);
  const isControlled = externalFullscreen !== undefined;
  const isFullscreen = isControlled ? externalFullscreen : internalFullscreen;

  const openFullscreen = useCallback(() => {
    if (isControlled) {
      onFullscreenChange?.(true);
    } else {
      setInternalFullscreen(true);
    }
  }, [isControlled, onFullscreenChange]);

  const closeFullscreen = useCallback(() => {
    if (isControlled) {
      onFullscreenChange?.(false);
    } else {
      setInternalFullscreen(false);
    }
  }, [isControlled, onFullscreenChange]);

  return (
    <>
      {/* 嵌入模式 */}
      <div className="globe-embed-wrapper">
        <GlobeContent items={items} isFullscreen={false} />
        <button className="globe-expand-btn" onClick={openFullscreen} title="全屏查看">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          </svg>
        </button>
      </div>

      {/* 全屏大屏 - 使用 Portal 渲染到 body，避免被父元素 backdrop-filter 限制 */}
      {isFullscreen && createPortal(
        <div className="globe-dashboard-overlay">
          <GlobeContent items={items} isFullscreen={true} onClose={closeFullscreen} />
        </div>,
        document.body
      )}
    </>
  );
}
