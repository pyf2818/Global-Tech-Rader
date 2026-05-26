const CATEGORIES = [
  { id: 'all', label: '全部赛道' },
  { id: 'ai-models', label: 'AI 大模型' },
  { id: 'research', label: '科研前沿' },
  { id: 'open-source', label: '开源生态' },
  { id: 'data-science', label: '数据科学' },
  { id: 'quantum', label: '量子计算' },
  { id: 'cybersecurity', label: '网络安全' },
  { id: 'chips-compute', label: '芯片半导体' },
  { id: 'devices', label: '硬件数码' },
  { id: 'robotics', label: '机器人' },
  { id: 'iot-5g', label: '物联网5G' },
  { id: 'silicon-valley', label: '硅谷欧美' },
  { id: 'china-tech', label: '国内大厂' },
  { id: 'policy-finance', label: '政策财经' },
  { id: 'fintech', label: '金融科技' },
  { id: 'space', label: '太空探索' },
  { id: 'new-energy', label: '新能源' },
  { id: 'climate-esg', label: '气候ESG' },
  { id: 'gaming', label: '游戏电竞' },
  { id: 'metaverse-xr', label: '元宇宙XR' },
  { id: 'healthcare', label: '医疗健康' },
  { id: 'education-tech', label: '教育科技' },
  { id: 'agriculture-tech', label: '农业科技' },
  { id: 'cloud', label: '云计算' },
  { id: 'automotive', label: '智能汽车' },
  { id: 'economy-stock', label: '经济股市' },
  { id: 'game-entertain', label: '游戏娱乐' },
  { id: 'showbiz', label: '影视娱乐圈' },
  { id: 'anime-acg', label: '动漫二次元' }
];

const MODES = [
  { id: 'all', label: '全部内容' },
  { id: 'flash', label: '实时快讯' },
  { id: 'deep', label: '深度解读' },
  { id: 'technical', label: '技术干货' }
];

const DEFAULT_SOURCES = [
  { name: 'TechCrunch', region: 'overseas' },
  { name: 'MIT Technology Review', region: 'overseas' },
  { name: 'The Verge', region: 'overseas' },
  { name: 'Wired', region: 'overseas' },
  { name: 'OpenAI Blog', region: 'overseas' },
  { name: 'Google DeepMind', region: 'overseas' },
  { name: 'Google AI Blog', region: 'overseas' },
  { name: 'ArXiv CS AI', region: 'global' },
  { name: 'MIT News AI', region: 'overseas' },
  { name: 'GitHub Blog', region: 'global' },
  { name: 'Hacker News', region: 'global' },
  { name: '量子位', region: 'domestic' },
  { name: '机器之心', region: 'domestic' },
  { name: '36氪', region: 'domestic' },
  { name: 'Solidot', region: 'domestic' },
  { name: 'OSChina', region: 'domestic' },
  { name: '爱范儿', region: 'domestic' },
  { name: '少数派', region: 'domestic' },
  { name: '虎嗅', region: 'domestic' },
  { name: 'IT之家', region: 'domestic' },
  { name: 'AWS Blog', region: 'overseas' },
  { name: 'Google Cloud', region: 'overseas' }
];

export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    categories: CATEGORIES,
    modes: MODES,
    sources: DEFAULT_SOURCES
  }));
}