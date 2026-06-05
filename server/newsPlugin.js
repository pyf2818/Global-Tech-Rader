// ========== 多媒体配置 ==========
const MEDIA_CONFIG = {
  // 抓取配置
  MAX_RESOLVE_ITEMS: 80,        // 最多抓取80条无图片新闻（从60提高）
  RESOLVE_TIMEOUT: 12000,       // 抓取超时（毫秒，从8秒提高到12秒）
  USE_SCRAPLING: true,          // 启用 Scrapling 动态渲染（从false改为true）
  SCRAPLING_MODE: 'dynamic',    // Scrapling 模式（basic/dynamic/stealth）
  SCRAPLING_TIMEOUT: 15000,     // Scrapling 超时（毫秒，从10秒提高到15秒）

  // 图片评分阈值（降低以提高覆盖率）
  MIN_IMAGE_SCORE: 25,          // 最低分数才使用（从40降低到25，平衡质量和数量）
  MIN_IMAGE_WIDTH: 300,         // 最小宽度（像素，从400降低到300）
  MIN_IMAGE_HEIGHT: 200,        // 最小高度（像素，从300降低到200）
  ASPECT_RATIO_MIN: 0.8,        // 最小宽高比（从1.2降低到0.8）
  ASPECT_RATIO_MAX: 3.0,        // 最大宽高比（从2.5提高到3.0）

  // 缓存配置
  IMAGE_CACHE_SIZE: 2000,       // 缓存条目数量（从1000提高到2000）
  IMAGE_CACHE_TTL: 7200000,     // 缓存有效期（2小时，从1小时提高）

  // 图片去重配置
  MAX_IMAGE_REUSE: 2,           // 同一图片最多使用次数
};

// ========== 多媒体统计 ==========
const mediaStats = {
  totalItems: 0,
  itemsWithImage: 0,
  itemsWithVideo: 0,
  rssImageCount: 0,
  resolvedImageCount: 0,
  scraplingImageCount: 0,
  ogImageCount: 0,
  twitterImageCount: 0,
  duplicateFilteredCount: 0,     // 重复图片过滤数量
  validationFailedCount: 0,     // 图片验证失败数量
  retrySuccessCount: 0,         // 重试成功数量
  totalImageScore: 0,
  failedResolves: 0,
  lastUpdate: null
};

function resetMediaStats() {
  mediaStats.totalItems = 0;
  mediaStats.itemsWithImage = 0;
  mediaStats.itemsWithVideo = 0;
  mediaStats.rssImageCount = 0;
  mediaStats.resolvedImageCount = 0;
  mediaStats.scraplingImageCount = 0;
  mediaStats.ogImageCount = 0;
  mediaStats.twitterImageCount = 0;
  mediaStats.duplicateFilteredCount = 0;
  mediaStats.validationFailedCount = 0;
  mediaStats.retrySuccessCount = 0;
  mediaStats.totalImageScore = 0;
  mediaStats.failedResolves = 0;
  mediaStats.lastUpdate = new Date().toISOString();
}

function logMediaStats() {
  const totalResolveAttempts = mediaStats.resolvedImageCount + mediaStats.scraplingImageCount + mediaStats.failedResolves;
  const coverageRate = mediaStats.totalItems > 0 ? ((mediaStats.itemsWithImage / mediaStats.totalItems) * 100).toFixed(1) : '0.0';
  const avgScore = mediaStats.itemsWithImage > 0 ? (mediaStats.totalImageScore / mediaStats.itemsWithImage).toFixed(1) : '0.0';
  const failRate = totalResolveAttempts > 0 ? ((mediaStats.failedResolves / totalResolveAttempts) * 100).toFixed(1) : '0.0';

  console.log('[Media Stats]', {
    更新时间: mediaStats.lastUpdate,
    总条目: mediaStats.totalItems,
    图片覆盖率: `${coverageRate}%`,
    RSS图片: mediaStats.rssImageCount,
    补全图片: mediaStats.resolvedImageCount,
    Og图片: mediaStats.ogImageCount,
    Twitter图片: mediaStats.twitterImageCount,
    Scrapling图片: mediaStats.scraplingImageCount,
    重复过滤: mediaStats.duplicateFilteredCount,
    验证失败: mediaStats.validationFailedCount,
    重试成功: mediaStats.retrySuccessCount,
    平均图片分: avgScore,
    失败率: `${failRate}%`
  });
}

// ========== 全局图片使用跟踪（防重复） ==========
const globalImageUsage = new Map(); // 图片URL -> 使用次数

function getImageUsageCount(imageUrl) {
  try {
    const urlObj = new URL(imageUrl);
    urlObj.search = '';
    urlObj.hash = '';
    const normalized = urlObj.href;
    return globalImageUsage.get(normalized) || 0;
  } catch {
    return 0;
  }
}

function incrementImageUsage(imageUrl) {
  try {
    const urlObj = new URL(imageUrl);
    urlObj.search = '';
    urlObj.hash = '';
    const normalized = urlObj.href;
    const count = globalImageUsage.get(normalized) || 0;
    globalImageUsage.set(normalized, count + 1);
    return count + 1;
  } catch {
    return 1;
  }
}

function resetGlobalImageUsage() {
  globalImageUsage.clear();
}

// ========== 图片验证函数 ==========
async function validateImageUrl(url, timeout = 3000) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) return false;

    const contentType = response.headers.get('content-type');
    if (!contentType?.startsWith('image/')) {
      console.log(`[validateImageUrl] Invalid content-type: ${contentType}`);
      return false;
    }

    const contentLength = parseInt(response.headers.get('content-length') || '0');
    if (contentLength > 0 && contentLength < 10240) { // 小于10KB可能是占位图
      console.log(`[validateImageUrl] Image too small: ${contentLength} bytes`);
      return false;
    }

    return true;
  } catch (e) {
    console.log(`[validateImageUrl] Validation failed for ${url.substring(0, 60)}:`, e.message);
    return false;
  }
}

// ========== 智能重试函数 ==========
async function resolveImageWithRetry(articleUrl, maxRetries = 2) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await resolveImageFromArticle(articleUrl);
      if (result.imageUrl) {
        if (attempt > 0) {
          mediaStats.retrySuccessCount++;
          console.log(`[resolveImageWithRetry] Success on attempt ${attempt + 1} for ${articleUrl}`);
        }
        return result;
      }

      // 失败后等待一段时间再重试
      if (attempt < maxRetries - 1) {
        await sleep(1000 * (attempt + 1));
      }
    } catch (e) {
      console.error(`[resolveImageWithRetry] Attempt ${attempt + 1} failed for ${articleUrl}:`, e.message);
      if (attempt < maxRetries - 1) {
        await sleep(1000 * (attempt + 1));
      }
    }
  }

  return { imageUrl: '', videoUrl: '' };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ========== 信息源质量权重 ==========
// 从顶级项目（Horizon/TrendRadar）学到的：给不同质量源设置权重，高权重源优先展示
const SOURCE_WEIGHTS = {
  // 顶刊（权重1.0）- 学术权威最高级别
  'Nature': 1.0,
  'Science Magazine': 1.0,
  'Nature Machine Intelligence': 1.0,
  'Nature Biotechnology': 1.0,
  'Nature Medicine': 1.0,
  'Science Advances': 1.0,

  // 政府官方机构（权重1.0）- 权威性最高
  'NIST Technology': 1.0,
  'DARPA News': 1.0,
  '工信部': 1.0,
  '科技部': 1.0,
  '中国法院网': 1.0,

  // 顶级研究实验室（权重1.0）- 科研权威
  'MIT CSAIL': 1.0,
  'Stanford HAI': 1.0,
  'Stanford SAIL': 1.0,
  'UC Berkeley BAIR': 1.0,
  'CMU RI': 1.0,
  'Google Research Blog': 1.0,
  'Microsoft Research': 1.0,
  'IBM Research': 1.0,
  'Meta AI Research (FAIR)': 1.0,
  'Amazon Science': 1.0,

  // 顶级财经媒体（权重1.0）- 金融权威
  'Wall Street Journal': 1.0,
  'Bloomberg Markets': 1.0,
  'Reuters Finance': 1.0,
  'Financial Times Markets': 1.0,
  'CNBC Markets': 1.0,

  // AI官方博客（一手信息，权重1.0）
  'OpenAI Blog': 1.0,
  'Anthropic News': 1.0,
  'Google DeepMind': 1.0,
  'Meta AI Blog': 1.0,
  'Google AI Blog': 1.0,
  'Microsoft AI Blog': 1.0,
  'Microsoft Research AI': 1.0,
  'Apple Machine Learning': 1.0,
  'NVIDIA AI Blog': 1.0,
  'Amazon AI Blog': 1.0,

  // 学术源（权重0.95）
  'ArXiv CS AI': 0.95,
  'ArXiv CS ML': 0.95,
  'ArXiv CS CL': 0.95,
  'ArXiv CS CV': 0.95,
  'ArXiv CS RO': 0.95,
  'ArXiv CS NE': 0.95,
  'ArXiv Quantitative Finance': 0.95,
  'MIT News AI': 0.9,
  'MIT News Tech': 0.9,
  'Stanford HAI': 0.9,
  'Science Daily': 0.85,
  'IEEE Spectrum': 0.9,
  'ACM TechNews': 0.85,

  // 国内权威财经媒体（权重0.95）
  '财新网': 0.95,
  '第一财经': 0.95,
  '华尔街见闻': 0.9,
  '经济观察网': 0.85,
  '证券时报': 0.85,
  '中国证券报': 0.85,
  '东方财富': 0.8,
  '雪球': 0.75,

  // 专业投资机构（权重0.85）
  'Seeking Alpha': 0.85,
  'MarketWatch': 0.8,
  'Kiplinger': 0.75,
  'Investing.com': 0.75,
  'Barron\'s': 0.8,
  'Motley Fool': 0.75,

  // 开发者社区（高信噪比，权重0.85）
  'Hacker News': 0.85,
  'Hacker News Best': 0.9,
  'GitHub Blog': 0.85,
  'GitHub Engineering': 0.85,
  'Dev.to': 0.75,
  'Smashing Magazine': 0.8,
  'Slashdot': 0.75,
  'Lobsters': 0.75,
  'CoolShell': 0.75,

  // 顶级科技媒体（权重0.8）
  'TechCrunch': 0.8,
  'MIT Technology Review': 0.85,
  'The Verge': 0.8,
  'Wired': 0.8,
  'Ars Technica': 0.8,
  'VentureBeat': 0.75,
  'IEEE Spectrum': 0.85,
  'TechRadar': 0.75,
  'Gizmodo': 0.7,

  // 专业科技媒体（权重0.75）
  'CNET': 0.65,
  'ZDNet': 0.65,
  'Engadget': 0.7,

  // 国内头部科技媒体（权重0.75）
  '量子位': 0.75,
  '机器之心': 0.75,
  '36氪': 0.7,
  'InfoQ CN': 0.7,
  '虎嗅': 0.7,
  '钛媒体': 0.7,
  '爱范儿': 0.65,
  '少数派': 0.65,
  'IT之家': 0.6,

  // 云厂商官方博客（权重0.7）
  'AWS Blog': 0.7,
  'Google Cloud Blog': 0.7,
  'Microsoft Azure Blog': 0.7,
  'IBM Cloud Blog': 0.7,
  '腾讯云开发者': 0.65,
  '阿里云开发者': 0.65,
  '华为云开发者': 0.65,

  // 垂直领域权威媒体
  'KrebsOnSecurity': 0.85,
  'The Hacker News': 0.8,
  'Dark Reading': 0.75,
  'Semiconductor Engineering': 0.85,
  'EE Times': 0.8,
  'AnandTech': 0.75,
  "Tom's Hardware": 0.75,
  'Stat News': 0.8,
  'FierceBiotech': 0.75,
  'Nature Medicine': 0.85,
  'Canary Media': 0.75,
  'Quanta Magazine': 0.85,
  'Electrek': 0.7,

  // 医疗健康权威源（权重0.8）
  'MedTech': 0.75,
  'HealthTech': 0.75,
  'Medscape': 0.75,
  '丁香园': 0.7,
  '医学界': 0.7,
  '健康界': 0.7,

  // 游戏娱乐
  'PC Gamer': 0.75,
  'Steam News': 0.8,
  'Ars Technica Gaming': 0.75,
  'Rock Paper Shotgun': 0.7,
  'Nintendo Life': 0.7,
  'TechCrunch Gaming': 0.7,

  // 影视娱乐
  'Variety': 0.75,
  'Hollywood Reporter': 0.75,
  'TMZ': 0.65,
  'The Guardian Film': 0.75,
  'BBC Entertainment': 0.75,
  'Rolling Stone': 0.75,

  // 动漫二次元
  'Crunchyroll News': 0.75,
  'Anime News Network': 0.75,
  'MyAnimeList': 0.7,
  'ComicBook.com': 0.65,

  // 芯片半导体
  'Semiconductor Engineering': 0.85,
  'EE Times': 0.8,
  'AnandTech': 0.75,

  // 机器人
  'TechCrunch Robotics': 0.75,
  'IEEE Spectrum': 0.85,
  'Engadget': 0.8,
  'The Verge': 0.8,

  // 前沿科技
  'Futurism': 0.75,
  'SingularityHub': 0.75,
  'Quanta Magazine': 0.85,

  // 新能源
  'Canary Media': 0.75,
  'Electrek': 0.7,
  'Green Car Reports': 0.7,
  'CleanTechnica': 0.7,

  // 物联网5G
  'IoT World Today': 0.75,
  'Light Reading': 0.7,

  // 太空探索
  'SpaceNews': 0.75,
  'Space.com': 0.75,

  // 智能汽车
  'CleanTechnica': 0.7,
  'Electrek': 0.7,
  'The Verge Automotive': 0.75,

  // 教育科技
  'EdSurge': 0.75,
  'TechCrunch Education': 0.7,

  // 金融科技
  'Cointelegraph': 0.75,
  'The Block': 0.75,
  'Popular Mechanics': 0.7,

  // 数据科学
  'KDnuggets': 0.75,
  'Towards Data Science': 0.75,

  // 量子计算
  'Quantum Computing Report': 0.75,
  'Quanta Magazine': 0.85,

  // 法律法规
  'Legaltech News': 0.75,
  'Law.com': 0.75,
  'Reuters Legal': 0.8,
  '中国法院网': 0.8,
  '法制日报': 0.75,
  '北大法宝': 0.75,

  // 医疗健康
  'MedTech': 0.75,
  'HealthTech': 0.75,
  'Medscape': 0.75,
  '丁香园': 0.7,
  '医学界': 0.7,
  '健康界': 0.7,
  '36氪医疗': 0.7,

  // 前沿科技
  'IEEE Spectrum': 0.85,
  'ACM TechNews': 0.85,
  'Nature Biotechnology': 0.85,
  'Science Advances': 0.85,
  'TechRadar': 0.7,
  'Gizmodo': 0.7,

  // 国内官方财经信息（权重0.8）
  '中国新闻网财经': 0.8,
  '人民网财经': 0.8,

  // 云计算权威源
  'AWS Blog': 0.7,
  'Google Cloud Blog': 0.7,
  'Microsoft Azure Blog': 0.7,
  'IBM Cloud Blog': 0.7,
  '腾讯云开发者': 0.65,
  '阿里云开发者': 0.65,
  '华为云开发者': 0.65,

  // 硬件数码权威源
  "Tom's Hardware": 0.75,
  'AnandTech': 0.75,
  'PC Gamer': 0.75,
  'Steam News': 0.8,

  // 前沿科技权威源
  'Quanta Magazine': 0.85,
  'Futurism': 0.75,
  'SingularityHub': 0.75,

  // 新能源官方源
  'Canary Media': 0.75,
  'Electrek': 0.7,
  'Green Car Reports': 0.7,
  'CleanTechnica': 0.7,

  // 医疗健康权威源
  'Stat News': 0.8,
  'Nature Medicine': 0.85,
  'FierceBiotech': 0.75,
  'MedTech': 0.75,
  'HealthTech': 0.75,
  'Medscape': 0.75,
  '丁香园': 0.7,
  '医学界': 0.7,
  '健康界': 0.7,

  // 政策财经权威源
  'Reuters Business': 0.8,
  'Bloomberg Technology': 0.8,
  'Financial Times Tech': 0.8,

  // 网络安全权威源
  'KrebsOnSecurity': 0.85,
  'The Hacker News': 0.8,
  'Dark Reading': 0.75,

  // 游戏娱乐权威源
  'Ars Technica Gaming': 0.75,
  'Rock Paper Shotgun': 0.7,
  'Nintendo Life': 0.7,
  'TechCrunch Gaming': 0.7,

  // 影视娱乐圈权威源
  'Variety': 0.75,
  'Hollywood Reporter': 0.75,
  'TMZ': 0.65,
  'The Guardian Film': 0.75,
  'BBC Entertainment': 0.75,
  'Rolling Stone': 0.75,

  // 动漫二次元权威源
  'Crunchyroll News': 0.75,
  'ComicBook.com': 0.65,

  // 芯片半导体权威源
  'Semiconductor Engineering': 0.85,
  'EE Times': 0.8,
  'AnandTech': 0.75,

  // 机器人权威源
  'TechCrunch Robotics': 0.75,
  'Engadget': 0.8,

  // 物联网5G权威源
  'IoT World Today': 0.75,
  'Light Reading': 0.7,

  // 太空探索权威源
  'SpaceNews': 0.75,
  'Space.com': 0.75,

  // 智能汽车权威源
  'CleanTechnica': 0.7,
  'Electrek': 0.7,
  'The Verge Automotive': 0.75,

  // 教育科技权威源
  'EdSurge': 0.75,
  'TechCrunch Education': 0.7,

  // 金融科技权威源
  'Cointelegraph': 0.75,
  'The Block': 0.75,

  // 数据科学权威源
  'KDnuggets': 0.75,
  'Towards Data Science': 0.75,

  // 量子计算权威源
  'Quantum Computing Report': 0.75,

  // 法律法规权威源
  'Legaltech News': 0.75,
  'Law.com': 0.75,
  'Reuters Legal': 0.8,
  '中国法院网': 0.8,
  '北大法宝': 0.75,

  // RSSHub聚合源（权重0.65-0.75）
  '知乎热榜': 0.7,
  '知乎科技': 0.7,
  '知乎AI': 0.7,
  '微博热搜科技': 0.65,
  '微博热搜AI': 0.65,
  'GitHub Trending JS': 0.8,
  'GitHub Trending Python': 0.8,
  'GitHub Trending Rust': 0.8,
  'GitHub Trending TypeScript': 0.8,
  'GitHub Trending Go': 0.8,
  'Product Hunt Daily': 0.75,
  'V2EX 技术': 0.7,
  'Segmentfault 热榜': 0.65,
  '掘金热榜': 0.65,
  'CSDN 热榜': 0.6,
};

// ========== 信息源评级系统 ==========
// 权重分级与等级映射
const SOURCE_GRADES = {
  'S': { weight: 1.0, label: 'S级-权威官方', description: '政府机构、顶级学术期刊、官方博客', color: '#dc2626', icon: '🏛️' },
  'A': { weight: 0.95, label: 'A级-顶级源', description: '顶级研究机构、权威财经媒体', color: '#ea580c', icon: '🥇' },
  'B': { weight: 0.85, label: 'B级-优质源', description: '知名科技媒体、专业行业媒体', color: '#16a34a', icon: '🥈' },
  'C': { weight: 0.75, label: 'C级-标准源', description: '一般媒体、开发者社区', color: '#2563eb', icon: '🥉' },
  'D': { weight: 0.65, label: 'D级-基础源', description: 'RSSHub聚合、一般源', color: '#64748b', icon: '📰' }
};

// 信息源等级映射（按名称到等级）
const SOURCE_GRADE_MAP = {
  // S级 - 权威官方（政府机构、顶级期刊）
  'Nature': 'S',
  'Science Magazine': 'S',
  'Nature Machine Intelligence': 'S',
  'Nature Biotechnology': 'S',
  'Nature Medicine': 'S',
  'Science Advances': 'S',
  'NIST Technology': 'S',
  'DARPA News': 'S',
  '工信部': 'S',
  '科技部': 'S',
  '中国法院网': 'S',
  'MIT CSAIL': 'S',
  'Stanford HAI': 'S',
  'Stanford SAIL': 'S',
  'UC Berkeley BAIR': 'S',
  'CMU RI': 'S',
  'Google Research Blog': 'S',
  'Microsoft Research': 'S',
  'IBM Research': 'S',
  'Meta AI Research (FAIR)': 'S',
  'Amazon Science': 'S',
  'Wall Street Journal': 'S',
  'Bloomberg Markets': 'S',
  'Reuters Finance': 'S',
  'Financial Times Markets': 'S',
  'CNBC Markets': 'S',
  'OpenAI Blog': 'S',
  'Anthropic News': 'S',
  'Google DeepMind': 'S',
  'Meta AI Blog': 'S',
  'Google AI Blog': 'S',
  'Microsoft AI Blog': 'S',
  'Microsoft Research AI': 'S',
  'Apple Machine Learning': 'S',
  'NVIDIA AI Blog': 'S',
  'Amazon AI Blog': 'S',

  // A级 - 顶级源（权威财经媒体、顶级研究）
  'ArXiv CS AI': 'A',
  'ArXiv CS ML': 'A',
  'ArXiv CS CL': 'A',
  'ArXiv CS CV': 'A',
  'ArXiv CS RO': 'A',
  'ArXiv CS NE': 'A',
  'ArXiv Quantitative Finance': 'A',
  'MIT News AI': 'A',
  'MIT News Tech': 'A',
  'Science Daily': 'A',
  'IEEE Spectrum': 'A',
  'ACM TechNews': 'A',
  '财新网': 'A',
  '第一财经': 'A',
  '华尔街见闻': 'A',
  'Seeking Alpha': 'A',
  'MarketWatch': 'A',
  'Barron\'s': 'A',
  'Kiplinger': 'A',
  'Investing.com': 'A',
  '证券时报': 'A',
  '中国证券报': 'A',
  'Hacker News': 'A',
  'Hacker News Best': 'A',
  'GitHub Blog': 'A',
  'GitHub Engineering': 'A',

  // B级 - 优质源（知名媒体、专业平台）
  'MIT Technology Review': 'B',
  'The Verge': 'B',
  'Wired': 'B',
  'Ars Technica': 'B',
  'VentureBeat': 'B',
  'TechCrunch': 'B',
  'Google Cloud Blog': 'B',
  'Microsoft Azure Blog': 'B',
  'AWS Blog': 'B',
  'IBM Cloud Blog': 'B',
  '量子位': 'B',
  '机器之心': 'B',
  '36氪': 'B',
  'InfoQ CN': 'B',
  '虎嗅': 'B',
  '钛媒体': 'B',
  'KrebsOnSecurity': 'B',
  'The Hacker News': 'B',
  'Semiconductor Engineering': 'B',
  'EE Times': 'B',
  'AnandTech': 'B',
  'Tom\'s Hardware': 'B',
  'Stat News': 'B',
  'FierceBiotech': 'B',
  'Nature Medicine': 'B',
  'Canary Media': 'B',
  'Quanta Magazine': 'B',
  'Variety': 'B',
  'Hollywood Reporter': 'B',
  'The Guardian Film': 'B',
  'BBC Entertainment': 'B',
  'Rolling Stone': 'B',

  // C级 - 标准源（一般媒体、开发者社区）
  'Dev.to': 'C',
  'Smashing Magazine': 'C',
  'Slashdot': 'C',
  'Lobsters': 'C',
  'CoolShell': 'C',
  'Solidot': 'C',
  'OSChina': 'C',
  '爱范儿': 'C',
  '少数派': 'C',
  'IT之家': 'C',
  'CNET': 'C',
  'ZDNet': 'C',
  'Engadget': 'C',
  'TechRadar': 'C',
  'Gizmodo': 'C',
  '腾讯云开发者': 'C',
  '阿里云开发者': 'C',
  '华为云开发者': 'C',
  '经济观察网': 'C',
  '东方财富': 'C',
  '雪球': 'C',
  'Motley Fool': 'C',
  'Dark Reading': 'C',
  'Electrek': 'C',
  'Green Car Reports': 'C',
  'CleanTechnica': 'C',
  'PC Gamer': 'C',
  'Steam News': 'C',
  'Ars Technica Gaming': 'C',
  'Rock Paper Shotgun': 'C',
  'Nintendo Life': 'C',
  'TechCrunch Gaming': 'C',
  'Crunchyroll News': 'C',
  'Anime News Network': 'C',
  'MyAnimeList': 'C',
  'ComicBook.com': 'C',
  'TechCrunch Robotics': 'C',
  'The Verge': 'C',
  'IoT World Today': 'C',
  'Light Reading': 'C',
  'SpaceNews': 'C',
  'Space.com': 'C',
  'The Verge Automotive': 'C',
  'EdSurge': 'C',
  'TechCrunch Education': 'C',
  'Cointelegraph': 'C',
  'The Block': 'C',
  'Popular Mechanics': 'C',
  'KDnuggets': 'C',
  'Towards Data Science': 'C',
  'Quantum Computing Report': 'C',
  'Legaltech News': 'C',
  'Law.com': 'C',
  'Reuters Legal': 'C',
  '北大法宝': 'C',
  'MedTech': 'C',
  'HealthTech': 'C',
  'Medscape': 'C',
  '丁香园': 'C',
  '医学界': 'C',
  '健康界': 'C',
  '36氪医疗': 'C',

  // D级 - 基础源（RSSHub聚合、一般源）
  '知乎热榜': 'D',
  '知乎科技': 'D',
  '知乎AI': 'D',
  '微博热搜科技': 'D',
  '微博热搜AI': 'D',
  'GitHub Trending JS': 'D',
  'GitHub Trending Python': 'D',
  'GitHub Trending Rust': 'D',
  'GitHub Trending TypeScript': 'D',
  'GitHub Trending Go': 'D',
  'Product Hunt Daily': 'D',
  'V2EX 技术': 'D',
  'Segmentfault 热榜': 'D',
  '掘金热榜': 'D',
  'CSDN 热榜': 'D',
  'Hugging Face Blog': 'D',
  'Reddit Technology': 'D',
  'Reddit MachineLearning': 'D',
  '中国新闻网财经': 'D',
  '人民网财经': 'D',
  '36氪': 'D',
  '中国新闻网': 'D',
  '人民网财经': 'D',
  'IT之家': 'D',
  'TMZ': 'D',
};

// 获取信息源等级
function getSourceGrade(sourceName) {
  return SOURCE_GRADE_MAP[sourceName] || 'D';
}

// 获取信息源等级信息
function getSourceGradeInfo(sourceName) {
  const grade = getSourceGrade(sourceName);
  return SOURCE_GRADES[grade];
}

// 按等级排序信息源（S级优先）
function sortSourcesByGrade(sources) {
  const gradeOrder = { 'S': 0, 'A': 1, 'B': 2, 'C': 3, 'D': 4 };
  return sources.sort((a, b) => {
    const gradeA = getSourceGrade(a.name);
    const gradeB = getSourceGrade(b.name);
    return gradeOrder[gradeA] - gradeOrder[gradeB];
  });
}

// 多源交叉验证阈值：同一URL在多少个源出现才算高可信度
const CROSS_VERIFY_THRESHOLD = 3;

// ========== 用户认证系统 ==========
const users = new Map(); // 内存用户存储
const userSessions = new Map(); // 会话存储

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function createUser(username, password, email, interests = []) {
  const id = generateToken();
  const hashedPassword = await hashPassword(password);
  const user = {
    id,
    username,
    password: hashedPassword,
    email,
    interests,
    createdAt: new Date().toISOString(),
    displayName: username,
    avatar: '',
    signature: ''
  };
  users.set(username, user);
  return user;
}

async function verifyUser(username, password) {
  const user = users.get(username);
  if (!user) return null;
  const hashedPassword = await hashPassword(password);
  if (user.password !== hashedPassword) return null;
  return user;
}

function getUserByToken(token) {
  return userSessions.get(token) || null;
}

const DEFAULT_SOURCES = [
  // 学术权威（最高优先级）
  { name: 'Nature', url: 'https://www.nature.com/nature.rss', region: 'global', defaultCategory: 'research' },
  { name: 'Science Magazine', url: 'https://www.science.org/rss/news_current.xml', region: 'global', defaultCategory: 'research' },
  { name: 'Nature Machine Intelligence', url: 'https://www.nature.com/natmachintell.rss', region: 'global', defaultCategory: 'research' },
  { name: 'ArXiv CS AI', url: 'https://export.arxiv.org/rss/cs.AI', region: 'global', defaultCategory: 'research' },
  { name: 'ArXiv CS ML', url: 'https://export.arxiv.org/rss/cs.LG', region: 'global', defaultCategory: 'research' },
  { name: 'ArXiv CS CL', url: 'https://export.arxiv.org/rss/cs.CL', region: 'global', defaultCategory: 'research' },
  { name: 'ArXiv CS CV', url: 'https://export.arxiv.org/rss/cs.CV', region: 'global', defaultCategory: 'research' },
  { name: 'MIT News AI', url: 'https://news.mit.edu/rss/topic/artificial-intelligence2', region: 'overseas', defaultCategory: 'research' },
  { name: 'Stanford HAI', url: 'https://hai.stanford.edu/news/rss.xml', region: 'overseas', defaultCategory: 'research' },
  { name: 'Science Daily', url: 'https://www.sciencedaily.com/rss/', region: 'overseas', defaultCategory: 'research' },
  { name: 'IEEE Spectrum', url: 'https://spectrum.ieee.org/rss/fulltext', region: 'overseas', defaultCategory: 'research' },
  
  // AI/大模型官方博客（一手信息）
  { name: 'OpenAI Blog', url: 'https://openai.com/blog/rss.xml', region: 'overseas', defaultCategory: 'ai-models' },
  { name: 'Anthropic News', url: 'https://www.anthropic.com/news/rss', region: 'overseas', defaultCategory: 'ai-models' },
  { name: 'Google DeepMind', url: 'https://deepmind.google/discover/blog/rss/', region: 'overseas', defaultCategory: 'ai-models' },
  { name: 'Meta AI Blog', url: 'https://ai.meta.com/blog/rss/', region: 'overseas', defaultCategory: 'ai-models' },
  { name: 'Google AI Blog', url: 'https://blog.google/technology/ai/rss/', region: 'overseas', defaultCategory: 'ai-models' },
  { name: 'Microsoft AI Blog', url: 'https://blogs.microsoft.com/ai/feed/', region: 'overseas', defaultCategory: 'ai-models' },
  { name: 'Apple Machine Learning', url: 'https://machinelearning.apple.com/rss.xml', region: 'overseas', defaultCategory: 'ai-models' },
  { name: 'Hugging Face Blog', url: 'https://huggingface.co/blog/feed.xml', region: 'global', defaultCategory: 'ai-models' },
  { name: 'AI News', url: 'https://www.artificialintelligence-news.com/feed/', region: 'overseas', defaultCategory: 'ai-models' },
  
  // 国际顶级科技媒体（权威性媒体）
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', region: 'overseas', defaultCategory: 'silicon-valley' },
  { name: 'MIT Technology Review', url: 'https://www.technologyreview.com/feed/', region: 'overseas', defaultCategory: 'research' },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', region: 'overseas', defaultCategory: 'devices' },
  { name: 'Wired', url: 'https://www.wired.com/feed/rss', region: 'overseas', defaultCategory: 'silicon-valley' },
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', region: 'overseas', defaultCategory: 'silicon-valley' },
  { name: 'VentureBeat', url: 'https://venturebeat.com/feed/', region: 'overseas', defaultCategory: 'silicon-valley' },
  { name: 'IEEE Spectrum', url: 'https://spectrum.ieee.org/rss/fulltext', region: 'overseas', defaultCategory: 'devices' },

  // 专业科技媒体（高信噪比）
  { name: 'CNET', url: 'https://www.cnet.com/rss/news/', region: 'overseas', defaultCategory: 'devices' },
  { name: 'ZDNet', url: 'https://www.zdnet.com/news/rss.xml', region: 'overseas', defaultCategory: 'silicon-valley' },
  { name: 'Engadget', url: 'https://www.engadget.com/rss.xml', region: 'overseas', defaultCategory: 'devices' },
  { name: 'TechRadar', url: 'https://www.techradar.com/rss', region: 'overseas', defaultCategory: 'devices' },
  { name: 'Gizmodo', url: 'https://gizmodo.com/rss', region: 'overseas', defaultCategory: 'devices' },

  // ========== 开发者社区与开源（高信噪比）==========
  { name: 'Hacker News', url: 'https://hnrss.org/frontpage', region: 'global', defaultCategory: 'open-source' },
  { name: 'Hacker News Best', url: 'https://hnrss.org/best', region: 'global', defaultCategory: 'open-source' },
  { name: 'GitHub Blog', url: 'https://github.blog/feed/', region: 'global', defaultCategory: 'open-source' },
  { name: 'GitHub Engineering', url: 'https://githubengineering.com/', region: 'global', defaultCategory: 'open-source' },
  { name: 'Dev.to', url: 'https://dev.to/feed', region: 'global', defaultCategory: 'open-source' },
  { name: 'Smashing Magazine', url: 'https://www.smashingmagazine.com/feed/', region: 'global', defaultCategory: 'open-source' },
  { name: 'Reddit Technology', url: 'https://www.reddit.com/r/technology/.rss', region: 'global', defaultCategory: 'silicon-valley' },
  { name: 'Reddit MachineLearning', url: 'https://www.reddit.com/r/MachineLearning/.rss', region: 'global', defaultCategory: 'ai-models' },
  { name: 'Slashdot', url: 'https://rss.slashdot.org/Slashdot/slashdotMain', region: 'overseas', defaultCategory: 'open-source' },

  // 国内头部科技媒体
  { name: '量子位', url: 'https://www.qbitai.com/feed', region: 'domestic', defaultCategory: 'ai-models' },
  { name: '机器之心', url: 'https://www.jiqizhixin.com/rss', region: 'domestic', defaultCategory: 'ai-models' },
  { name: '36氪', url: 'https://36kr.com/feed', region: 'domestic', defaultCategory: 'china-tech' },
  { name: 'InfoQ CN', url: 'https://www.infoq.cn/feed', region: 'domestic', defaultCategory: 'china-tech' },
  { name: '虎嗅', url: 'https://www.huxiu.com/rss/0.xml', region: 'domestic', defaultCategory: 'china-tech' },
  { name: '钛媒体', url: 'https://www.tmtpost.com/rss.xml', region: 'domestic', defaultCategory: 'china-tech' },

  // 国内开发者社区
  { name: 'Solidot', url: 'https://www.solidot.org/index.rss', region: 'domestic', defaultCategory: 'open-source' },
  { name: 'OSChina', url: 'https://www.oschina.net/news/rss', region: 'domestic', defaultCategory: 'open-source' },
  { name: 'CoolShell', url: 'https://coolshell.cn/feed', region: 'domestic', defaultCategory: 'open-source' },
  { name: '少数派', url: 'https://sspai.com/feed', region: 'domestic', defaultCategory: 'devices' },
  { name: '爱范儿', url: 'https://www.ifanr.com/feed', region: 'domestic', defaultCategory: 'devices' },
  { name: 'IT之家', url: 'https://www.ithome.com/rss/', region: 'domestic', defaultCategory: 'devices' },

  // ========== 云计算权威源（厂商官方）==========
  { name: 'AWS Blog', url: 'https://aws.amazon.com/blogs/aws/feed/', region: 'overseas', defaultCategory: 'cloud' },
  { name: 'Google Cloud Blog', url: 'https://cloud.google.com/blog/feed', region: 'overseas', defaultCategory: 'cloud' },
  { name: 'Microsoft Azure Blog', url: 'https://azure.microsoft.com/en-us/blog/feed/', region: 'overseas', defaultCategory: 'cloud' },
  { name: 'IBM Cloud Blog', url: 'https://www.ibm.com/cloud/blog/feed', region: 'overseas', defaultCategory: 'cloud' },
  { name: '腾讯云开发者', url: 'https://cloud.tencent.com/developer/rss', region: 'domestic', defaultCategory: 'cloud' },
  { name: '阿里云开发者', url: 'https://developer.aliyun.com/rss', region: 'domestic', defaultCategory: 'cloud' },
  { name: '华为云开发者', url: 'https://rsshub.rssforever.com/huaweicloud/zh/blog', region: 'domestic', defaultCategory: 'cloud' },

  // ========== 硬件数码权威源（专业评测）==========
  { name: "Tom's Hardware", url: 'https://www.tomshardware.com/feeds/all', region: 'overseas', defaultCategory: 'devices' },
  { name: 'AnandTech', url: 'https://www.anandtech.com/rss/newsfeed.aspx', region: 'overseas', defaultCategory: 'devices' },
  { name: 'PC Gamer', url: 'https://www.pcgamer.com/rss/', region: 'overseas', defaultCategory: 'devices' },
  { name: 'Steam News', url: 'https://store.steampowered.com/feeds/news.xml', region: 'global', defaultCategory: 'game-entertain' },

  // ========== 前沿科技权威源（深度分析）==========
  { name: 'Quanta Magazine', url: 'https://www.quantamagazine.org/feed/', region: 'overseas', defaultCategory: 'research' },
  { name: 'Futurism', url: 'https://futurism.com/feed', region: 'overseas', defaultCategory: 'tech-frontier' },
  { name: 'SingularityHub', url: 'https://singularityhub.com/feed/', region: 'overseas', defaultCategory: 'tech-frontier' },

  // ========== 新能源官方源（权威机构）==========
  { name: 'Canary Media', url: 'https://www.canarymedia.com/feed', region: 'overseas', defaultCategory: 'new-energy' },
  { name: 'Electrek', url: 'https://electrek.co/feed/', region: 'overseas', defaultCategory: 'new-energy' },
  { name: 'Green Car Reports', url: 'https://www.greencarreports.com/news/rss.xml', region: 'overseas', defaultCategory: 'new-energy' },
  { name: 'CleanTechnica', url: 'https://cleantechnica.com/feed/', region: 'overseas', defaultCategory: 'new-energy' },

  // ========== 医疗健康权威源（官方机构）==========
  { name: 'Stat News', url: 'https://www.statnews.com/feed/', region: 'overseas', defaultCategory: 'healthcare' },
  { name: 'Nature Medicine', url: 'https://www.nature.com/nm.rss', region: 'global', defaultCategory: 'healthcare' },
  { name: 'FierceBiotech', url: 'https://www.fiercebiotech.com/rss', region: 'overseas', defaultCategory: 'healthcare' },
  { name: 'MedTech', url: 'https://www.medtechdive.com/rss/news/', region: 'overseas', defaultCategory: 'healthcare' },
  { name: 'HealthTech', url: 'https://www.healthtechzone.com/rss/feed.xml', region: 'overseas', defaultCategory: 'healthcare' },
  { name: 'Medscape', url: 'https://www.medscape.com/rss/news', region: 'overseas', defaultCategory: 'healthcare' },
  { name: '丁香园', url: 'https://rsshub.rssforever.com/dxy/dxyc', region: 'domestic', defaultCategory: 'healthcare' },
  { name: '医学界', url: 'https://rsshub.rssforever.com/yxj/xwzx', region: 'domestic', defaultCategory: 'healthcare' },
  { name: '健康界', url: 'https://rsshub.rssforever.com/cn-healthcare/news', region: 'domestic', defaultCategory: 'healthcare' },

  // ========== 政策财经权威源（官方和媒体）==========
  { name: 'Reuters Business', url: 'https://www.reuters.com/business/feed/', region: 'overseas', defaultCategory: 'policy-finance' },
  { name: 'Bloomberg Technology', url: 'https://feeds.bloomberg.com/technology/news.rss', region: 'overseas', defaultCategory: 'policy-finance' },
  { name: 'Financial Times Tech', url: 'https://www.ft.com/technology?format=rss', region: 'overseas', defaultCategory: 'policy-finance' },

  // ========== 网络安全权威源（专业媒体）==========
  { name: 'KrebsOnSecurity', url: 'https://krebsonsecurity.com/feed/', region: 'overseas', defaultCategory: 'cybersecurity' },
  { name: 'The Hacker News', url: 'https://feeds.feedburner.com/TheHackersNews', region: 'global', defaultCategory: 'cybersecurity' },
  { name: 'Dark Reading', url: 'https://www.darkreading.com/rss.xml', region: 'overseas', defaultCategory: 'cybersecurity' },

  // ========== 游戏娱乐权威源（专业媒体）==========
  { name: 'Ars Technica Gaming', url: 'https://feeds.arstechnica.com/arstechnica/gaming', region: 'overseas', defaultCategory: 'game-entertain' },
  { name: 'Rock Paper Shotgun', url: 'https://www.rockpapershotgun.com/feed', region: 'overseas', defaultCategory: 'game-entertain' },
  { name: 'Nintendo Life', url: 'https://www.nintendolife.com/feeds/news', region: 'overseas', defaultCategory: 'game-entertain' },
  { name: 'TechCrunch Gaming', url: 'https://techcrunch.com/category/gaming/feed/', region: 'overseas', defaultCategory: 'game-entertain' },

  // ========== 影视娱乐圈权威源（行业媒体）==========
  { name: 'Variety', url: 'https://variety.com/feed/', region: 'overseas', defaultCategory: 'showbiz' },
  { name: 'Hollywood Reporter', url: 'https://www.hollywoodreporter.com/feed/', region: 'overseas', defaultCategory: 'showbiz' },
  { name: 'TMZ', url: 'https://www.tmz.com/rss.xml', region: 'overseas', defaultCategory: 'showbiz' },
  { name: 'The Guardian Film', url: 'https://www.theguardian.com/film/rss', region: 'overseas', defaultCategory: 'showbiz' },
  { name: 'BBC Entertainment', url: 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml', region: 'overseas', defaultCategory: 'showbiz' },
  { name: 'Rolling Stone', url: 'https://www.rollingstone.com/feed/', region: 'overseas', defaultCategory: 'showbiz' },

  // ========== 动漫二次元权威源（专业媒体）==========
  { name: 'Crunchyroll News', url: 'https://feeds.feedburner.com/crunchyroll/animenews', region: 'overseas', defaultCategory: 'anime-acg' },
  { name: 'ComicBook.com', url: 'https://comicbook.com/feed/', region: 'overseas', defaultCategory: 'anime-acg' },

  // ========== 芯片半导体权威源（专业媒体）==========
  { name: 'Semiconductor Engineering', url: 'https://semiengineering.com/feed/', region: 'overseas', defaultCategory: 'chips-compute' },
  { name: 'EE Times', url: 'https://www.eetimes.com/feed/', region: 'overseas', defaultCategory: 'chips-compute' },
  { name: 'AnandTech', url: 'https://www.anandtech.com/rss/newsfeed.aspx', region: 'overseas', defaultCategory: 'chips-compute' },

  // ========== 机器人权威源（专业媒体）==========
  { name: 'TechCrunch Robotics', url: 'https://techcrunch.com/category/robotics/feed/', region: 'overseas', defaultCategory: 'robotics' },
  { name: 'Engadget', url: 'https://www.engadget.com/rss.xml', region: 'overseas', defaultCategory: 'robotics' },

  // ========== 物联网5G权威源（专业媒体）==========
  { name: 'IoT World Today', url: 'https://www.iotworldtoday.com/feed', region: 'overseas', defaultCategory: 'iot-5g' },
  { name: 'Light Reading', url: 'https://www.lightreading.com/rss.asp', region: 'overseas', defaultCategory: 'iot-5g' },

  // ========== 太空探索权威源（专业媒体）==========
  { name: 'SpaceNews', url: 'https://spacenews.com/feed/', region: 'overseas', defaultCategory: 'space' },
  { name: 'Space.com', url: 'https://www.space.com/feeds/all', region: 'overseas', defaultCategory: 'space' },

  // ========== 智能汽车权威源（专业媒体）==========
  { name: 'CleanTechnica', url: 'https://cleantechnica.com/feed/', region: 'overseas', defaultCategory: 'automotive' },
  { name: 'Electrek', url: 'https://electrek.co/feed/', region: 'overseas', defaultCategory: 'automotive' },
  { name: 'The Verge Automotive', url: 'https://www.theverge.com/transportation/rss/index.xml', region: 'overseas', defaultCategory: 'automotive' },

  // ========== 教育科技权威源（专业媒体）==========
  { name: 'EdSurge', url: 'https://www.edsurge.com/rss.xml', region: 'overseas', defaultCategory: 'education-tech' },
  { name: 'TechCrunch Education', url: 'https://techcrunch.com/category/education/feed/', region: 'overseas', defaultCategory: 'education-tech' },

  // ========== 金融科技权威源（专业媒体）==========
  { name: 'Cointelegraph', url: 'https://cointelegraph.com/rss', region: 'overseas', defaultCategory: 'fintech' },
  { name: 'The Block', url: 'https://www.theblock.co/rss', region: 'overseas', defaultCategory: 'fintech' },

  // ========== 数据科学权威源（专业媒体）==========
  { name: 'KDnuggets', url: 'https://www.kdnuggets.com/feed', region: 'overseas', defaultCategory: 'data-science' },
  { name: 'Towards Data Science', url: 'https://towardsdatascience.com/feed', region: 'overseas', defaultCategory: 'data-science' },

  // ========== 量子计算权威源（专业媒体）==========
  { name: 'Quantum Computing Report', url: 'https://quantumcomputingreport.com/feed/', region: 'overseas', defaultCategory: 'quantum' },

  // ========== 法律法规权威源（官方和专业）==========
  { name: 'Legaltech News', url: 'https://www.law.com/legaltechnews/feed/', region: 'overseas', defaultCategory: 'policy-finance' },
  { name: 'Law.com', url: 'https://www.law.com/feed/', region: 'overseas', defaultCategory: 'policy-finance' },
  { name: 'Reuters Legal', url: 'https://www.reuters.com/legal/feed/', region: 'overseas', defaultCategory: 'policy-finance' },
  { name: '中国法院网', url: 'https://www.chinacourt.org/article/rss.shtml', region: 'domestic', defaultCategory: 'policy-finance' },
  { name: '北大法宝', url: 'https://rsshub.rssforever.com/pkulaw/chl', region: 'domestic', defaultCategory: 'policy-finance' },

  // ========== RSSHub 高价值源（从顶级项目学来）==========
  // 知乎热榜（社区筛选的高质量内容）
  { name: '知乎热榜', url: 'https://rsshub.rssforever.com/zhihu/hotlist', region: 'domestic', defaultCategory: 'tech-frontier' },
  { name: '知乎科技', url: 'https://rsshub.rssforever.com/zhihu/topic/19550517', region: 'domestic', defaultCategory: 'tech-frontier' },
  { name: '知乎AI', url: 'https://rsshub.rssforever.com/zhihu/topic/19550517', region: 'domestic', defaultCategory: 'ai-models' },
  // GitHub Trending（开发者社区投票筛选）
  { name: 'GitHub Trending JS', url: 'https://rsshub.rssforever.com/github/trending/daily/javascript', region: 'global', defaultCategory: 'open-source' },
  { name: 'GitHub Trending Python', url: 'https://rsshub.rssforever.com/github/trending/daily/python', region: 'global', defaultCategory: 'open-source' },
  { name: 'GitHub Trending Rust', url: 'https://rsshub.rssforever.com/github/trending/daily/rust', region: 'global', defaultCategory: 'open-source' },
  { name: 'GitHub Trending TypeScript', url: 'https://rsshub.rssforever.com/github/trending/daily/typescript', region: 'global', defaultCategory: 'open-source' },
  { name: 'GitHub Trending Go', url: 'https://rsshub.rssforever.com/github/trending/daily/go', region: 'global', defaultCategory: 'open-source' },
  // 社交媒体热门
  { name: '微博热搜科技', url: 'https://rsshub.rssforever.com/weibo/search/hot/科技', region: 'domestic', defaultCategory: 'tech-frontier' },
  { name: '微博热搜AI', url: 'https://rsshub.rssforever.com/weibo/search/hot/AI', region: 'domestic', defaultCategory: 'ai-models' },
  // 产品发现
  { name: 'Product Hunt Daily', url: 'https://rsshub.rssforever.com/producthunt/today', region: 'overseas', defaultCategory: 'silicon-valley' },
  // 开发者社区
  { name: 'V2EX 技术', url: 'https://rsshub.rssforever.com/v2ex/topics/hot', region: 'domestic', defaultCategory: 'open-source' },
  { name: 'Segmentfault 热榜', url: 'https://rsshub.rssforever.com/segmentfault/hot', region: 'domestic', defaultCategory: 'open-source' },
  // 技术博客聚合
  { name: '掘金热榜', url: 'https://rsshub.rssforever.com/juejin/trending/javascript/7days', region: 'domestic', defaultCategory: 'open-source' },
  { name: 'CSDN 热榜', url: 'https://rsshub.rssforever.com/csdn/blog/hot', region: 'domestic', defaultCategory: 'open-source' },

  // ========== 经济股市 ==========
  { name: '财新网', url: 'https://rsshub.rssforever.com/caixin/latest', region: 'domestic', defaultCategory: 'economy-stock' },
  { name: 'Seeking Alpha', url: 'https://seekingalpha.com/feed/feed.xml', region: 'overseas', defaultCategory: 'economy-stock' },
  { name: '经济观察网', url: 'https://www.eeo.com.cn/rss.xml', region: 'domestic', defaultCategory: 'economy-stock' },
  { name: 'MarketWatch', url: 'https://www.marketwatch.com/rss/topstories', region: 'overseas', defaultCategory: 'economy-stock' },
  { name: 'Kiplinger', url: 'https://www.kiplinger.com/rss/feed', region: 'overseas', defaultCategory: 'economy-stock' },
  { name: 'Investing.com', url: 'https://www.investing.com/rss/news_25.rss', region: 'overseas', defaultCategory: 'economy-stock' },
  { name: '36氪', url: 'https://www.36kr.com/feed', region: 'domestic', defaultCategory: 'economy-stock' },
  { name: '中国新闻网', url: 'https://www.chinanews.com/rss/finance.xml', region: 'domestic', defaultCategory: 'economy-stock' },
  { name: '人民网财经', url: 'https://www.people.com.cn/rss/finance.xml', region: 'domestic', defaultCategory: 'economy-stock' },
  { name: 'IT之家', url: 'https://www.ithome.com/rss', region: 'domestic', defaultCategory: 'economy-stock' },
  { name: 'PC Gamer', url: 'https://www.pcgamer.com/rss/', region: 'overseas', defaultCategory: 'game-entertain' },
  { name: 'Steam News', url: 'https://store.steampowered.com/feeds/news.xml', region: 'global', defaultCategory: 'game-entertain' },
  { name: 'Ars Technica Gaming', url: 'https://feeds.arstechnica.com/arstechnica/gaming', region: 'overseas', defaultCategory: 'game-entertain' },
  { name: 'Rock Paper Shotgun', url: 'https://www.rockpapershotgun.com/feed', region: 'overseas', defaultCategory: 'game-entertain' },
  { name: 'Nintendo Life', url: 'https://www.nintendolife.com/feeds/news', region: 'overseas', defaultCategory: 'game-entertain' },
  { name: 'TechCrunch Gaming', url: 'https://techcrunch.com/category/gaming/feed/', region: 'overseas', defaultCategory: 'game-entertain' },

  // ========== 影视娱乐圈 ==========
  { name: 'Variety', url: 'https://variety.com/feed/', region: 'overseas', defaultCategory: 'showbiz' },
  { name: 'Hollywood Reporter', url: 'https://www.hollywoodreporter.com/feed/', region: 'overseas', defaultCategory: 'showbiz' },
  { name: 'TMZ', url: 'https://www.tmz.com/rss.xml', region: 'overseas', defaultCategory: 'showbiz' },
  { name: 'The Guardian Film', url: 'https://www.theguardian.com/film/rss', region: 'overseas', defaultCategory: 'showbiz' },
  { name: 'BBC Entertainment', url: 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml', region: 'overseas', defaultCategory: 'showbiz' },
  { name: 'Rolling Stone', url: 'https://www.rollingstone.com/feed/', region: 'overseas', defaultCategory: 'showbiz' },

  // ========== 动漫二次元 ==========
  { name: 'Crunchyroll News', url: 'https://feeds.feedburner.com/crunchyroll/animenews', region: 'overseas', defaultCategory: 'anime-acg' },
  { name: 'ComicBook.com', url: 'https://comicbook.com/feed/', region: 'overseas', defaultCategory: 'anime-acg' },

  // ========== 芯片半导体 ==========
  { name: 'Semiconductor Engineering', url: 'https://semiengineering.com/feed/', region: 'overseas', defaultCategory: 'chips-compute' },
  { name: 'EE Times', url: 'https://www.eetimes.com/feed/', region: 'overseas', defaultCategory: 'chips-compute' },
  { name: 'AnandTech', url: 'https://www.anandtech.com/rss/newsfeed.aspx', region: 'overseas', defaultCategory: 'chips-compute' },

  // ========== 机器人 ==========
  { name: 'TechCrunch Robotics', url: 'https://techcrunch.com/category/robotics/feed/', region: 'overseas', defaultCategory: 'robotics' },
  { name: 'IEEE Spectrum', url: 'https://spectrum.ieee.org/rss', region: 'overseas', defaultCategory: 'robotics' },
  { name: 'Engadget', url: 'https://www.engadget.com/rss.xml', region: 'overseas', defaultCategory: 'robotics' },

  // ========== 物联网5G ==========
  { name: 'IoT World Today', url: 'https://www.iotworldtoday.com/feed', region: 'overseas', defaultCategory: 'iot-5g' },
  { name: 'Light Reading', url: 'https://www.lightreading.com/rss.asp', region: 'overseas', defaultCategory: 'iot-5g' },

  // ========== 太空探索 ==========
  { name: 'SpaceNews', url: 'https://spacenews.com/feed/', region: 'overseas', defaultCategory: 'space' },
  { name: 'Space.com', url: 'https://www.space.com/feeds/all', region: 'overseas', defaultCategory: 'space' },

  // ========== 智能汽车 ==========
  { name: 'CleanTechnica', url: 'https://cleantechnica.com/feed/', region: 'overseas', defaultCategory: 'automotive' },
  { name: 'Electrek', url: 'https://electrek.co/feed/', region: 'overseas', defaultCategory: 'automotive' },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', region: 'overseas', defaultCategory: 'automotive' },

  // ========== 教育科技 ==========
  { name: 'EdSurge', url: 'https://www.edsurge.com/rss.xml', region: 'overseas', defaultCategory: 'education-tech' },
  { name: 'TechCrunch Education', url: 'https://techcrunch.com/category/education/feed/', region: 'overseas', defaultCategory: 'education-tech' },

  // ========== 金融科技 ==========
  { name: 'Cointelegraph', url: 'https://cointelegraph.com/rss', region: 'overseas', defaultCategory: 'fintech' },
  { name: 'Popular Mechanics', url: 'https://www.popularmechanics.com/rss/', region: 'overseas', defaultCategory: 'fintech' },

  // ========== 数据科学 ==========
  { name: 'KDnuggets', url: 'https://www.kdnuggets.com/feed', region: 'overseas', defaultCategory: 'data-science' },
  { name: 'Towards Data Science', url: 'https://towardsdatascience.com/feed', region: 'overseas', defaultCategory: 'data-science' },

  // ========== 量子计算 ==========
  { name: 'Quantum Computing Report', url: 'https://quantumcomputingreport.com/feed/', region: 'overseas', defaultCategory: 'quantum' },
  { name: 'Quanta Magazine', url: 'https://www.quantamagazine.org/feed/', region: 'overseas', defaultCategory: 'quantum' },

  // ========== 金融股市高质量专业源（最高优先级）==========
  // 顶级财经媒体
  { name: 'Wall Street Journal', url: 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml', region: 'overseas', defaultCategory: 'economy-stock' },
  { name: 'Bloomberg Markets', url: 'https://feeds.bloomberg.com/markets/news.rss', region: 'overseas', defaultCategory: 'economy-stock' },
  { name: 'Reuters Finance', url: 'https://www.reuters.com/business/finance/feed/', region: 'overseas', defaultCategory: 'economy-stock' },
  { name: 'CNBC Markets', url: 'https://www.cnbc.com/id/10000664/device/rss/rss.html', region: 'overseas', defaultCategory: 'economy-stock' },
  { name: 'Financial Times Markets', url: 'https://www.ft.com/markets?format=rss', region: 'overseas', defaultCategory: 'economy-stock' },
  { name: 'Barron\'s', url: 'https://www.barrons.com/rss.xml', region: 'overseas', defaultCategory: 'economy-stock' },
  { name: 'MarketWatch', url: 'https://www.marketwatch.com/rss/topstories', region: 'overseas', defaultCategory: 'economy-stock' },

  // 国内顶级财经媒体
  { name: '财新网', url: 'https://rsshub.rssforever.com/caixin/latest', region: 'domestic', defaultCategory: 'economy-stock' },
  { name: '第一财经', url: 'https://www.yicai.com/rss/', region: 'domestic', defaultCategory: 'economy-stock' },
  { name: '华尔街见闻', url: 'https://rss.wallstreetcn.com/latest', region: 'domestic', defaultCategory: 'economy-stock' },
  { name: '经济观察网', url: 'https://www.eeo.com.cn/rss.xml', region: 'domestic', defaultCategory: 'economy-stock' },

  // 专业投资机构
  { name: 'Seeking Alpha', url: 'https://seekingalpha.com/feed/feed.xml', region: 'overseas', defaultCategory: 'economy-stock' },
  { name: 'Kiplinger', url: 'https://www.kiplinger.com/rss/feed', region: 'overseas', defaultCategory: 'economy-stock' },
  { name: 'Investing.com', url: 'https://www.investing.com/rss/news_25.rss', region: 'overseas', defaultCategory: 'economy-stock' },
  { name: 'Motley Fool', url: 'https://www.fool.com/the-motley-fool/rss.aspx', region: 'overseas', defaultCategory: 'economy-stock' },

  // 国内股市专业媒体
  { name: '证券时报', url: 'https://rsshub.rssforever.com/stcn/xwzx', region: 'domestic', defaultCategory: 'economy-stock' },
  { name: '中国证券报', url: 'https://rsshub.rssforever.com/cs/zjxw', region: 'domestic', defaultCategory: 'economy-stock' },
  { name: '东方财富', url: 'https://rsshub.rssforever.com/eastmoney/cyxw', region: 'domestic', defaultCategory: 'economy-stock' },
  { name: '雪球', url: 'https://rsshub.rssforever.com/xueqiu/user/2588023793', region: 'domestic', defaultCategory: 'economy-stock' },

  // 官方财经信息
  { name: '中国新闻网财经', url: 'https://www.chinanews.com/rss/finance.xml', region: 'domestic', defaultCategory: 'economy-stock' },
  { name: '人民网财经', url: 'https://www.people.com.cn/rss/finance.xml', region: 'domestic', defaultCategory: 'economy-stock' },

  // ========== 科技权威官方源（最高优先级）==========
  // 顶级研究实验室
  { name: 'MIT CSAIL', url: 'https://www.csail.mit.edu/news/feed', region: 'overseas', defaultCategory: 'research' },
  { name: 'Stanford HAI', url: 'https://hai.stanford.edu/news/rss.xml', region: 'overseas', defaultCategory: 'research' },
  { name: 'Stanford SAIL', url: 'https://ai.stanford.edu/news/feed', region: 'overseas', defaultCategory: 'research' },
  { name: 'UC Berkeley BAIR', url: 'https://bair.berkeley.edu/blog/feed.xml', region: 'overseas', defaultCategory: 'research' },
  { name: 'CMU RI', url: 'https://www.ri.cmu.edu/news/feed/', region: 'overseas', defaultCategory: 'research' },

  // 科技巨头研究院
  { name: 'Google Research Blog', url: 'https://blog.google/technology/research/', region: 'overseas', defaultCategory: 'research' },
  { name: 'Microsoft Research', url: 'https://www.microsoft.com/en-us/research/blog/feed/', region: 'overseas', defaultCategory: 'research' },
  { name: 'IBM Research', url: 'https://www.ibm.com/research/feed', region: 'overseas', defaultCategory: 'research' },
  { name: 'Meta AI Research (FAIR)', url: 'https://ai.facebook.com/blog/feed/', region: 'overseas', defaultCategory: 'research' },
  { name: 'Amazon Science', url: 'https://www.amazon.science/feed', region: 'overseas', defaultCategory: 'research' },

  // 政府科技机构
  { name: 'NIST Technology', url: 'https://www.nist.gov/news-events/technology-news/feed', region: 'overseas', defaultCategory: 'policy-finance' },
  { name: 'DARPA News', url: 'https://www.darpa.mil/news-events/feed', region: 'overseas', defaultCategory: 'research' },
  { name: '欧盟AI法案', url: 'https://digital-strategy.ec.europa.eu/en/artificial-intelligence', region: 'overseas', defaultCategory: 'policy-finance' },

  // 国内科技官方源
  { name: '工信部', url: 'https://rsshub.rssforever.com/miit/xwzx', region: 'domestic', defaultCategory: 'policy-finance' },
  { name: '科技部', url: 'https://rsshub.rssforever.com/most/kjyw', region: 'domestic', defaultCategory: 'policy-finance' },

  // ========== 学术权威源（最高优先级）==========
  { name: 'Nature', url: 'https://www.nature.com/nature.rss', region: 'global', defaultCategory: 'research' },
  { name: 'Science Magazine', url: 'https://www.science.org/rss/news_current.xml', region: 'global', defaultCategory: 'research' },
  { name: 'Nature Machine Intelligence', url: 'https://www.nature.com/natmachintell.rss', region: 'global', defaultCategory: 'research' },
  { name: 'Nature Biotechnology', url: 'https://www.nature.com/nbt.rss', region: 'global', defaultCategory: 'research' },
  { name: 'Nature Medicine', url: 'https://www.nature.com/nm.rss', region: 'global', defaultCategory: 'research' },
  { name: 'Science Advances', url: 'https://www.science.org/rss/advance.xml', region: 'global', defaultCategory: 'research' },

  // ArXiv计算机科学领域
  { name: 'ArXiv CS AI', url: 'https://export.arxiv.org/rss/cs.AI', region: 'global', defaultCategory: 'research' },
  { name: 'ArXiv CS ML', url: 'https://export.arxiv.org/rss/cs.LG', region: 'global', defaultCategory: 'research' },
  { name: 'ArXiv CS CL', url: 'https://export.arxiv.org/rss/cs.CL', region: 'global', defaultCategory: 'research' },
  { name: 'ArXiv CS CV', url: 'https://export.arxiv.org/rss/cs.CV', region: 'global', defaultCategory: 'research' },
  { name: 'ArXiv CS RO', url: 'https://export.arxiv.org/rss/cs.RO', region: 'global', defaultCategory: 'research' },
  { name: 'ArXiv CS NE', url: 'https://export.arxiv.org/rss/cs.NE', region: 'global', defaultCategory: 'research' },
  { name: 'ArXiv Quantitative Finance', url: 'https://export.arxiv.org/rss/q-fin', region: 'global', defaultCategory: 'economy-stock' },

  // MIT专业领域
  { name: 'MIT News AI', url: 'https://news.mit.edu/rss/topic/artificial-intelligence2', region: 'overseas', defaultCategory: 'research' },
  { name: 'MIT News Tech', url: 'https://news.mit.edu/rss/topic/technology', region: 'overseas', defaultCategory: 'research' },
  { name: 'Science Daily', url: 'https://www.sciencedaily.com/rss/', region: 'overseas', defaultCategory: 'research' },
  { name: 'IEEE Spectrum', url: 'https://spectrum.ieee.org/rss/fulltext', region: 'overseas', defaultCategory: 'research' },
  { name: 'ACM TechNews', url: 'https://technews.acm.org/rss', region: 'overseas', defaultCategory: 'research' },

  // ========== AI/大模型官方博客（一手信息，最高优先级）==========
  { name: 'OpenAI Blog', url: 'https://openai.com/blog/rss.xml', region: 'overseas', defaultCategory: 'ai-models' },
  { name: 'Anthropic News', url: 'https://www.anthropic.com/news/rss', region: 'overseas', defaultCategory: 'ai-models' },
  { name: 'Google DeepMind', url: 'https://deepmind.google/discover/blog/rss/', region: 'overseas', defaultCategory: 'ai-models' },
  { name: 'Meta AI Blog', url: 'https://ai.meta.com/blog/rss/', region: 'overseas', defaultCategory: 'ai-models' },
  { name: 'Google AI Blog', url: 'https://blog.google/technology/ai/rss/', region: 'overseas', defaultCategory: 'ai-models' },
  { name: 'Microsoft AI Blog', url: 'https://blogs.microsoft.com/ai/feed/', region: 'overseas', defaultCategory: 'ai-models' },
  { name: 'Microsoft Research AI', url: 'https://www.microsoft.com/en-us/research/blog/topic/artificial-intelligence/feed/', region: 'overseas', defaultCategory: 'ai-models' },
  { name: 'Apple Machine Learning', url: 'https://machinelearning.apple.com/rss.xml', region: 'overseas', defaultCategory: 'ai-models' },
  { name: 'NVIDIA AI Blog', url: 'https://blogs.nvidia.com/ai/feed/', region: 'overseas', defaultCategory: 'ai-models' },
  { name: 'Hugging Face Blog', url: 'https://huggingface.co/blog/feed.xml', region: 'global', defaultCategory: 'ai-models' },
  { name: 'Amazon AI Blog', url: 'https://aws.amazon.com/blogs/machine-learning/feed/', region: 'overseas', defaultCategory: 'ai-models' },

  // ========== 法律法规 ==========
  { name: 'Legaltech News', url: 'https://www.law.com/legaltechnews/feed/', region: 'overseas', defaultCategory: 'policy-finance' },
  { name: 'Law.com', url: 'https://www.law.com/feed/', region: 'overseas', defaultCategory: 'policy-finance' },
  { name: 'Reuters Legal', url: 'https://www.reuters.com/legal/feed/', region: 'overseas', defaultCategory: 'policy-finance' },
  { name: '中国法院网', url: 'https://www.chinacourt.org/article/rss.shtml', region: 'domestic', defaultCategory: 'policy-finance' },
  { name: '法制日报', url: 'https://rsshub.rssforever.com/legaldaily/xwsf', region: 'domestic', defaultCategory: 'policy-finance' },
  { name: '北大法宝', url: 'https://rsshub.rssforever.com/pkulaw/chl', region: 'domestic', defaultCategory: 'policy-finance' },

  // ========== 医疗健康 ==========
  { name: 'MedTech', url: 'https://www.medtechdive.com/rss/news/', region: 'overseas', defaultCategory: 'healthcare' },
  { name: 'HealthTech', url: 'https://www.healthtechzone.com/rss/feed.xml', region: 'overseas', defaultCategory: 'healthcare' },
  { name: 'Medscape', url: 'https://www.medscape.com/rss/news', region: 'overseas', defaultCategory: 'healthcare' },
  { name: '丁香园', url: 'https://rsshub.rssforever.com/dxy/dxyc', region: 'domestic', defaultCategory: 'healthcare' },
  { name: '医学界', url: 'https://rsshub.rssforever.com/yxj/xwzx', region: 'domestic', defaultCategory: 'healthcare' },
  { name: '健康界', url: 'https://rsshub.rssforever.com/cn-healthcare/news', region: 'domestic', defaultCategory: 'healthcare' },
  { name: '36氪医疗', url: 'https://rsshub.rssforever.com/36kr/motif/5474', region: 'domestic', defaultCategory: 'healthcare' },

  // ========== 前沿科技 ==========
  { name: 'IEEE Spectrum', url: 'https://spectrum.ieee.org/rss/fulltext', region: 'overseas', defaultCategory: 'research' },
  { name: 'ACM TechNews', url: 'https://technews.acm.org/rss', region: 'overseas', defaultCategory: 'research' },
  { name: 'Nature Biotechnology', url: 'https://www.nature.com/nbt.rss', region: 'overseas', defaultCategory: 'research' },
  { name: 'Science Advances', url: 'https://www.science.org/rss/advance.xml', region: 'overseas', defaultCategory: 'research' },
  { name: 'TechRadar', url: 'https://www.techradar.com/rss', region: 'overseas', defaultCategory: 'devices' },
  { name: 'Gizmodo', url: 'https://gizmodo.com/rss', region: 'overseas', defaultCategory: 'devices' },

  // ========== 欧美主流官方RSS（国际权威媒体）==========
  // 英国
  { name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', region: 'overseas', defaultCategory: 'economy-stock' },
  { name: 'BBC Business', url: 'https://feeds.bbci.co.uk/news/business/rss.xml', region: 'overseas', defaultCategory: 'economy-stock' },
  { name: 'BBC Technology', url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', region: 'overseas', defaultCategory: 'devices' },
  { name: 'Guardian International', url: 'https://www.theguardian.com/world/rss', region: 'overseas', defaultCategory: 'economy-stock' },
  { name: 'SkyNews World', url: 'https://feeds.skynews.com/feeds/rss/world.xml', region: 'overseas', defaultCategory: 'economy-stock' },
  // 美国
  { name: 'Reuters TopNews', url: 'https://feeds.reuters.com/reuters/topNews', region: 'overseas', defaultCategory: 'economy-stock' },
  { name: 'Reuters World', url: 'https://feeds.reuters.com/reuters/worldNews', region: 'overseas', defaultCategory: 'economy-stock' },
  { name: 'CNN World', url: 'http://rss.cnn.com/rss/cnn_world.rss', region: 'overseas', defaultCategory: 'economy-stock' },
  { name: 'NYT Homepage', url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml', region: 'overseas', defaultCategory: 'economy-stock' },
  { name: 'Washington Post World', url: 'https://feeds.washingtonpost.com/rss/world', region: 'overseas', defaultCategory: 'economy-stock' },
  { name: 'NPR Global', url: 'https://feeds.npr.org/1001/rss.xml', region: 'overseas', defaultCategory: 'economy-stock' },
  { name: 'CNBC Global', url: 'https://www.cnbc.com/id/100003114/device/rss/rss.xml', region: 'overseas', defaultCategory: 'economy-stock' },
  // 欧洲/加拿大
  { name: 'DW English', url: 'https://rss.dw.com/rdf/rss-en-all', region: 'overseas', defaultCategory: 'economy-stock' },
  { name: 'France24 International', url: 'https://www.france24.com/en/rss', region: 'overseas', defaultCategory: 'economy-stock' },
  { name: 'CBC World', url: 'https://www.cbc.ca/rss/world.xml', region: 'overseas', defaultCategory: 'economy-stock' },
  { name: 'GlobalNews World', url: 'https://globalnews.ca/world/feed/', region: 'overseas', defaultCategory: 'economy-stock' },
  // 日韩/亚太
  { name: 'NHK World', url: 'https://www3.nhk.or.jp/rss/news/cat0.xml', region: 'overseas', defaultCategory: 'economy-stock' },
  { name: 'SCMP International', url: 'https://www.scmp.com/rss/91/feed', region: 'overseas', defaultCategory: 'economy-stock' },
  { name: 'RT International', url: 'https://www.rt.com/rss/news/', region: 'overseas', defaultCategory: 'economy-stock' },
  // 中文外媒
  { name: '联合早报', url: 'https://www.zaobao.com/rss.xml', region: 'domestic', defaultCategory: 'china-tech' },
  { name: '德国之声中文', url: 'https://rss.dw.com/rdf/rss-zh-all', region: 'domestic', defaultCategory: 'china-tech' },
  { name: '香港电台国际', url: 'https://news.rthk.hk/rthk/ch/rss/international.xml', region: 'domestic', defaultCategory: 'china-tech' },
  // 中文科技媒体（官方RSS）
  { name: '观察者网', url: 'https://www.guancha.cn/rss', region: 'domestic', defaultCategory: 'china-tech' },
];

const RSSHUB_BASE = 'https://rsshub.rssforever.com';

const TRENDING_SOURCES = [
  // === 国内平台 ===
  // 科技媒体热门
  { name: '36氪', url: 'https://36kr.com/feed', region: 'domestic', platform: '36氪' },
  { name: '36氪快讯', url: `${RSSHUB_BASE}/36kr/newsflashes`, region: 'domestic', platform: '36氪' },
  { name: '少数派', url: 'https://sspai.com/feed', region: 'domestic', platform: '少数派' },
  { name: '爱范儿', url: 'https://www.ifanr.com/feed', region: 'domestic', platform: '爱范儿' },
  { name: '品玩', url: 'https://www.pingwest.com/feed', region: 'domestic', platform: '品玩' },
  { name: '虎扑', url: 'https://bbs.hupu.com/feed', region: 'domestic', platform: '虎扑' },
  // 热门排行榜
  { name: 'IT之家 24h 热榜', url: `${RSSHUB_BASE}/ithome/ranking/24h`, region: 'domestic', platform: 'IT之家' },
  
  // === 国际平台 ===
  // 技术社区热榜
  { name: 'Hacker News Top', url: 'https://hnrss.org/frontpage', region: 'global', platform: 'Hacker News' },
  { name: 'Hacker News Best', url: 'https://hnrss.org/best', region: 'global', platform: 'Hacker News' },
  { name: 'Dev.to', url: 'https://dev.to/feed', region: 'global', platform: 'Dev.to' },
  { name: 'Lobsters', url: 'https://lobste.rs/rss', region: 'global', platform: 'Lobsters' },
  // 新产品/项目发现
  { name: 'Product Hunt', url: 'https://www.producthunt.com/feed', region: 'global', platform: 'Product Hunt' },
  { name: 'GitHub Blog', url: 'https://github.blog/feed/', region: 'global', platform: 'GitHub' },
  // 顶级科技媒体
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', region: 'global', platform: 'TechCrunch' },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', region: 'global', platform: 'The Verge' },
  { name: 'Ars Technica', url: 'https://arstechnica.com/feed/', region: 'global', platform: 'Ars Technica' },
  { name: 'Wired', url: 'https://www.wired.com/feed/rss', region: 'global', platform: 'Wired' },
  { name: 'MIT Technology Review', url: 'https://www.technologyreview.com/feed/', region: 'global', platform: 'MIT Review' },
  // 综合科技/极客
  { name: 'Engadget', url: 'https://www.engadget.com/rss.xml', region: 'global', platform: 'Engadget' },
  { name: 'Slashdot', url: 'https://rss.slashdot.org/Slashdot/slashdotMain', region: 'global', platform: 'Slashdot' },
  { name: 'Smashing Magazine', url: 'https://www.smashingmagazine.com/feed/', region: 'global', platform: 'Smashing Mag' },
];

const CATEGORY_GROUPS = [
  {
    id: 'tech-ai',
    label: '科技前沿',
    icon: 'flask',
    categories: ['ai-models', 'research', 'open-source', 'data-science', 'quantum', 'cybersecurity', 'chips-compute']
  },
  {
    id: 'hardware-consumer',
    label: '消费电子',
    icon: 'device',
    categories: ['devices', 'robotics', 'iot-5g', 'metaverse-xr', 'automotive']
  },
  {
    id: 'industry-economy',
    label: '产业经济',
    icon: 'building',
    categories: ['silicon-valley', 'china-tech', 'policy-finance', 'fintech', 'economy-stock']
  },
  {
    id: 'entertainment',
    label: '娱乐文化',
    icon: 'star',
    categories: ['gaming', 'game-entertain', 'showbiz', 'anime-acg']
  },
  {
    id: 'lifestyle-health',
    label: '生活健康',
    icon: 'heart',
    categories: ['space', 'new-energy', 'climate-esg', 'healthcare', 'education-tech']
  }
];

const CATEGORIES = [
  { id: 'all', label: '全部内容' },
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

const CATEGORY_RULES = [
  ['ai-models', /\b(ai|artificial intelligence|llm|gpt|model|agent|deepmind|openai|anthropic|gemini|claude|大模型|人工智能|智能体|machine learning|neural|transformer)\b/i],
  ['research', /\b(research|paper|study|scientist|arxiv|mit|科研|论文|研究|nature|science|academic)\b/i],
  ['open-source', /\b(open source|github|linux|rust|python|kubernetes|developer|repo|开源|开发者|docker|k8s|javascript|typescript)\b/i],
  ['data-science', /\b(data science|big data|analytics|machine learning|deep learning|数据科学|大数据|分析|算法工程师|data analyst|data engineer)\b/i],
  ['quantum', /\b(quantum|qubit|quantum computing|量子|量子计算|量子通信|量子纠缠|superposition|entanglement)\b/i],
  ['cybersecurity', /\b(security|hack|breach|vulnerability|exploit|ransomware|phishing|malware|cyber|attack|漏洞|安全|黑客|勒索软件|钓鱼|数据泄露|隐私)\b/i],
  ['chips-compute', /\b(chip|semiconductor|gpu|nvidia|amd|intel|tsmc|compute|cuda|芯片|半导体|算力|processor|cpu|tpu|silicon|asic|fpga|制程|光刻)\b/i],
  ['devices', /\b(iphone|android|device|wearable|hardware|phone|laptop|数码|手机|硬件|macbook|ipad|watch|headphone)\b/i],
  ['robotics', /\b(robot|robotics|humanoid|autonomous|机器人|自动驾驶|drone|automation|boston dynamics|协作机器人)\b/i],
  ['iot-5g', /\b(iot|internet of things|5g|sensor|edge computing|物联网|传感器|边缘计算|smart city|智慧城市|connected device)\b/i],
  ['silicon-valley', /\b(silicon valley|startup|tech company|硅谷|科技巨头|venture capital|unicorn)\b/i],
  ['china-tech', /\b(alibaba|tencent|baidu|bytedance|huawei|xiaomi|china|阿里|腾讯|百度|字节|华为|小米|国内|jd|京东|美团|didi)\b/i],
  ['policy-finance', /\b(policy|regulation|funding|ipo|investment|venture|finance|stock|market|earnings|gdp|inflation|fed|央行|融资|政策|监管|投资|金融|股票|财报|股市|利率|宏观经济|legislation)\b/i],
  ['fintech', /\b(fintech|payment|blockchain|cryptocurrency|bitcoin|defi|digital banking|neobank|金融科技|支付|区块链|数字货币|银行科技|信贷科技|保险科技)\b/i],
  ['space', /\b(space|nasa|spacex|rocket|satellite|mars|moon|starlink|blue origin|太空|航天|火箭|卫星|火星|月球|发射|轨道|starship)\b/i],
  ['new-energy', /\b(solar|wind|ev|battery|lithium|carbon|储能|光伏|锂电|新能源|碳中和|清洁能源|电动车|solar energy|wind power|hydrogen|hydrogen fuel)\b/i],
  ['climate-esg', /\b(climate|esg|carbon neutral|sustainability|green finance|emission|气候|碳减排|esg|可持续|绿色金融|碳中和|温室气体|减排)\b/i],
  ['gaming', /\b(gaming|esports|video game|nintendo|playstation|xbox|steam|unreal engine|unity|游戏|电竞|主机游戏|手游|游戏引擎|game developer)\b/i],
  ['metaverse-xr', /\b(metaverse|vr|ar|xr|virtual reality|augmented reality|oculus|vision pro|spatial computing|元宇宙|虚拟现实|增强现实|空间计算|headset)\b/i],
  ['healthcare', /\b(health|medical|biotech|pharma|drug|clinical|医疗|健康|生物|制药|基因|therapy|diagnosis|patient|hospital|disease|cancer|数字医疗|ai医疗)\b/i],
  ['education-tech', /\b(edtech|online learning|e-learning|mooc|education technology|教育科技|在线教育|数字教育|edtech|慕课|教育平台)\b/i],
  ['agriculture-tech', /\b(agtech|precision agriculture|vertical farming|smart farming|agricultural technology|农业科技|精准农业|垂直农场|智慧农业|数字农业)\b/i],
  ['cloud', /\b(cloud|aws|azure|google cloud|serverless|database|云计算|云服务|kubernetes|docker|devops|saas|paas|iaas)\b/i],
  ['automotive', /\b(automotive|tesla|ev|self-driving|autonomous vehicle|smart car|汽车|电动车|自动驾驶|智能汽车|车载系统|车联网)\b/i],
  ['economy-stock', /\b(stock|market|ipo|trading|investment|earnings|gdp|inflation|fed|央行|融资|股票|股市|财报|利率|宏观经济|证券|基金|期货|港股|美股|a股|债券|汇率|财经|经济)\b/i],
  ['game-entertain', /\b(game|gaming|esports|playstation|xbox|nintendo|steam|unreal|unity|游戏|电竞|手游|主机|端游|网游|steam|任天堂|索尼|微软|腾讯游戏|网易游戏|米哈游|原神|王者荣耀)\b/i],
  ['showbiz', /\b(movie|film|tv show|celebrity|actor|actress|director|oscar|grammy|emmy|电影|电视剧|演员|导演|明星|综艺|颁奖|票房|好莱坞|bollywood|netflix|hbo|disney)\b/i],
  ['anime-acg', /\b(anime|manga|otaku|cosplay|light novel|vtuber|waifu|二次元|动漫|番剧|漫画|轻小说|cosplay|手办|谷子|同人|本子|新番|漫展|acg)\b/i]
];

const TAG_RULES = [
  ['AI', /\b(ai|artificial intelligence|llm|gpt|model|agent|大模型|人工智能)\b/i],
  ['Chip', /\b(chip|gpu|semiconductor|nvidia|芯片|半导体|算力)\b/i],
  ['Open Source', /\b(open source|github|linux|开源)\b/i],
  ['Cloud', /\b(cloud|aws|azure|serverless|云)\b/i],
  ['Research', /\b(research|paper|arxiv|论文|研究)\b/i],
  ['Policy', /\b(policy|regulation|监管|政策)\b/i],
  ['Funding', /\b(funding|investment|ipo|融资|投资)\b/i],
  ['Hardware', /\b(device|hardware|phone|laptop|硬件|手机)\b/i],
  ['Robotics', /\b(robot|robotics|机器人)\b/i],
  ['Mobile', /\b(iphone|android|ios|app store)\b/i],
  ['Security', /\b(security|漏洞|安全|cyber|hack)\b/i],
  ['Startup', /\b(startup|创业|venture|funding)\b/i],
  ['New Energy', /\b(solar|wind|ev|battery|新能源|储能|光伏|锂电)\b/i],
  ['Healthcare', /\b(health|medical|biotech|pharma|drug|医疗|健康|生物|制药)\b/i],
  ['Finance', /\b(finance|stock|market|earnings|金融|股票|财报|股市)\b/i],
  ['Space', /\b(space|nasa|spacex|rocket|satellite|太空|航天|火箭|卫星)\b/i],
  ['Gaming', /\b(gaming|esports|video game|游戏|电竞)\b/i],
  ['Climate', /\b(climate|esg|carbon|sustainability|气候|碳减排|esg|可持续)\b/i],
  ['Automotive', /\b(automotive|tesla|ev|self-driving|汽车|电动车|自动驾驶)\b/i],
  ['Data', /\b(data science|big data|analytics|数据科学|大数据|算法)\b/i],
  ['Quantum', /\b(quantum|量子计算|qubit)\b/i],
  ['IoT', /\b(iot|5g|sensor|物联网|传感器|边缘计算)\b/i],
  ['Fintech', /\b(fintech|payment|blockchain|cryptocurrency|金融科技|支付|区块链)\b/i],
  ['Metaverse', /\b(metaverse|vr|ar|xr|虚拟现实|元宇宙)\b/i],
  ['Education', /\b(edtech|online learning|教育科技|在线教育)\b/i],
  ['Agriculture', /\b(agtech|precision agriculture|农业科技|智慧农业)\b/i]
];

let newsCache = { data: null, expiresAt: 0 };
let trendingCache = { data: null, expiresAt: 0 };
let githubCaches = {};
let imageResolveCache = {};

const MAX_NEWS_ITEMS = 500;
const MAX_ITEMS_PER_SOURCE = 16;
const PAGE_SIZE = 60;

export function newsPlugin() {
  return {
    name: 'global-tech-news-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const requestUrl = new URL(req.url, 'http://localhost');

        if (requestUrl.pathname === '/api/meta') {
          return sendJson(res, {
            categories: CATEGORIES,
            modes: MODES,
            sources: DEFAULT_SOURCES.map(({ name, region }) => {
              const gradeInfo = getSourceGradeInfo(name);
              return {
                name,
                region,
                grade: getSourceGrade(name),
                gradeInfo: {
                  label: gradeInfo.label,
                  description: gradeInfo.description,
                  color: gradeInfo.color,
                  icon: gradeInfo.icon,
                  weight: gradeInfo.weight
                }
              };
            }),
            sourceGrades: SOURCE_GRADES
          });
        }

        // ========== 认证路由 ==========
        if (requestUrl.pathname === '/api/auth/register') {
          const body = await parseBody(req);
          const { username, password, email, interests = [] } = body;
          if (!username || !password) {
            return sendJson(res, { ok: false, message: 'Username and password are required' }, 400);
          }
          if (users.has(username)) {
            return sendJson(res, { ok: false, message: 'Username already exists' }, 400);
          }
          const user = await createUser(username, password, email, interests);
          const token = generateToken();
          userSessions.set(token, user);
          return sendJson(res, {
            ok: true,
            token,
            user: { id: user.id, username: user.username, email: user.email, interests: user.interests, displayName: user.displayName, avatar: user.avatar, signature: user.signature }
          });
        }

        if (requestUrl.pathname === '/api/auth/login') {
          const body = await parseBody(req);
          const { username, password } = body;
          const user = await verifyUser(username, password);
          if (!user) {
            return sendJson(res, { ok: false, message: 'Invalid username or password' }, 401);
          }
          const token = generateToken();
          userSessions.set(token, user);
          return sendJson(res, {
            ok: true,
            token,
            user: { id: user.id, username: user.username, email: user.email, interests: user.interests, displayName: user.displayName, avatar: user.avatar, signature: user.signature }
          });
        }

        if (requestUrl.pathname === '/api/auth/me') {
          const token = requestUrl.searchParams.get('token') || '';
          const user = getUserByToken(token);
          if (!user) {
            return sendJson(res, { ok: false, message: 'Unauthorized' }, 401);
          }
          return sendJson(res, {
            ok: true,
            user: { id: user.id, username: user.username, email: user.email, interests: user.interests, displayName: user.displayName, avatar: user.avatar, signature: user.signature }
          });
        }

        if (requestUrl.pathname === '/api/user/profile') {
          const body = await parseBody(req);
          const { token, displayName, avatar, signature } = body;
          const user = getUserByToken(token);
          if (!user) {
            return sendJson(res, { ok: false, message: 'Unauthorized' }, 401);
          }
          if (displayName !== undefined) user.displayName = displayName;
          if (avatar !== undefined) user.avatar = avatar;
          if (signature !== undefined) user.signature = signature;
          return sendJson(res, {
            ok: true,
            user: { id: user.id, username: user.username, email: user.email, interests: user.interests, displayName: user.displayName, avatar: user.avatar, signature: user.signature }
          });
        }

        if (requestUrl.pathname === '/api/user/interests') {
          const body = await parseBody(req);
          const { token, interests } = body;
          const user = getUserByToken(token);
          if (!user) {
            return sendJson(res, { ok: false, message: 'Unauthorized' }, 401);
          }
          user.interests = interests;
          return sendJson(res, { ok: true, interests: user.interests });
        }

        if (requestUrl.pathname === '/api/news') {
          const blocked = requestUrl.searchParams
            .get('blocked')
            ?.split(',')
            .map(word => word.trim().toLowerCase())
            .filter(Boolean) ?? [];

          const customParams = requestUrl.searchParams.getAll('custom');
          let customSources = [];
          try {
            customSources = customParams.map(p => JSON.parse(p)).filter(s => s.name && s.url);
          } catch {}

          const disabledSourcesParam = requestUrl.searchParams.get('disabledSources') || '';
          const disabledSources = disabledSourcesParam
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);

          const page = parseInt(requestUrl.searchParams.get('page') || '0', 10);
          const pageSize = parseInt(requestUrl.searchParams.get('pageSize') || String(PAGE_SIZE), 10);
          const search = requestUrl.searchParams.get('search') || '';
          const interestsParam = requestUrl.searchParams.get('interests') || '';
          const interests = interestsParam ? interestsParam.split(',').filter(Boolean) : [];
          const payload = await getNews(blocked, customSources, page, pageSize, search, disabledSources, interests);
          return sendJson(res, payload);
        }

        if (requestUrl.pathname === '/api/trending') {
          const platform = requestUrl.searchParams.get('platform') || 'all';
          const page = parseInt(requestUrl.searchParams.get('page') || '0', 10);
          const pageSize = parseInt(requestUrl.searchParams.get('pageSize') || '60', 10);
          const payload = await getTrending(platform, page, pageSize);
          return sendJson(res, payload);
        }

        if (requestUrl.pathname === '/api/github-trending') {
          const lang = requestUrl.searchParams.get('lang') || '';
          const since = requestUrl.searchParams.get('since') || 'weekly';
          const payload = await getGithubTrending(lang, since);
          return sendJson(res, payload);
        }

        if (requestUrl.pathname === '/api/verify-source') {
          const url = requestUrl.searchParams.get('url') || '';
          if (!url) return sendJson(res, { ok: false, message: 'URL is required' }, 400);
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);
            const response = await fetch(url, {
              headers: { 'User-Agent': 'GlobalTechRadar/0.1 (+https://localhost)' },
              signal: controller.signal
            });
            clearTimeout(timeout);
            if (!response.ok) return sendJson(res, { ok: false, message: `HTTP ${response.status}`, status: response.status });
            const xml = await response.text();
            const isFeed = /<rss\b|<feed\b|<channel\b/i.test(xml);
            if (!isFeed) return sendJson(res, { ok: false, message: 'Not a valid RSS/Atom feed' });
            const items = matchBlocks(xml, 'item').length || matchBlocks(xml, 'entry').length;
            const title = cleanText(pick(matchBlocks(xml, 'channel').concat(matchBlocks(xml, 'feed')).join(''), ['title'])) || url;
            return sendJson(res, { ok: true, title, itemCount: items, message: 'Feed is valid' });
          } catch (e) {
            return sendJson(res, { ok: false, message: e.message });
          }
        }

        if (requestUrl.pathname === '/api/llm-models') {
          const baseUrl = requestUrl.searchParams.get('baseUrl') || '';
          const apiKey = requestUrl.searchParams.get('apiKey') || '';
          if (!baseUrl) return sendJson(res, { ok: false, message: 'baseUrl is required' }, 400);
          try {
            const apiUrl = baseUrl.replace(/\/+$/, '') + '/v1/models';
            const headers = { 'Content-Type': 'application/json' };
            if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);
            const response = await fetch(apiUrl, { headers, signal: controller.signal });
            clearTimeout(timeout);
            if (!response.ok) {
              const errText = await response.text().catch(() => '');
              return sendJson(res, { ok: false, message: `API responded ${response.status}: ${errText.slice(0, 200)}`, status: response.status });
            }
            const data = await response.json();
            const models = (data.data || []).map(m => ({ id: m.id, name: m.id, owned_by: m.owned_by || '' }));
            return sendJson(res, { ok: true, models });
          } catch (e) {
            return sendJson(res, { ok: false, message: e.message });
          }
        }

        if (requestUrl.pathname === '/api/llm-test') {
          const body = await parseBody(req);
          const { baseUrl = '', apiKey = '', model = '', prompt = 'Hello' } = body;
          if (!baseUrl || !model) return sendJson(res, { ok: false, message: 'baseUrl and model are required' }, 400);
          try {
            const cleanBaseUrl = baseUrl.replace(/\/$/, '');
            const apiUrl = cleanBaseUrl.endsWith('/v1') || cleanBaseUrl.endsWith('/v2') || cleanBaseUrl.endsWith('/v3') || cleanBaseUrl.endsWith('/v4')
              ? cleanBaseUrl + '/chat/completions'
              : cleanBaseUrl + '/v1/chat/completions';
            const headers = { 'Content-Type': 'application/json' };
            if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000);
            const response = await fetch(apiUrl, {
              method: 'POST',
              headers,
              body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 50 }),
              signal: controller.signal
            });
            clearTimeout(timeout);
            if (!response.ok) {
              const errText = await response.text().catch(() => '');
              return sendJson(res, { ok: false, message: `API responded ${response.status}: ${errText.slice(0, 200)}` });
            }
            const data = await response.json();
            const reply = data.choices?.[0]?.message?.content || '';
            return sendJson(res, { ok: true, reply, model });
          } catch (e) {
            return sendJson(res, { ok: false, message: e.message });
          }
        }

if (requestUrl.pathname === '/api/ai-insights') {
          const body = await parseBody(req);
          const { baseUrl = '', apiKey = '', model = '', items = [] } = body;
          console.log('[AI Insights] Request:', { baseUrl, model, itemsCount: items.length, hasKey: !!apiKey });
          if (!baseUrl || !model) return sendJson(res, { error: 'baseUrl and model are required' }, 400);
          if (items.length === 0) return sendJson(res, { error: 'items required' }, 400);
          try {
            const cleanBaseUrl = baseUrl.replace(/\/$/, '');
            const apiUrl = cleanBaseUrl.endsWith('/v1') || cleanBaseUrl.endsWith('/v2') || cleanBaseUrl.endsWith('/v3') || cleanBaseUrl.endsWith('/v4')
              ? cleanBaseUrl + '/chat/completions'
              : cleanBaseUrl + '/v1/chat/completions';
            const headers = { 'Content-Type': 'application/json' };
            if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
            console.log('[AI Insights] Calling:', apiUrl, 'model:', model);
            const prompt = `你是一个科技趋势分析师。请分析以下${items.length}条技术资讯，输出**简洁**的纯 JSON（不要 markdown 代码块）：

{"trends":["趋势 1","趋势 2","趋势 3"],"correlations":["关联 1","关联 2"],"signals":["信号 1","信号 2","信号 3"]}

资讯列表：
${items.map((i, idx) => {
  const summaryLine = i.summary ? ` | 摘要: ${i.summary}` : '';
  const tagsLine = i.tags ? ` | 标签: ${i.tags}` : '';
  return `${idx + 1}. [${i.category || '未分类'}] ${i.title} - ${i.source || '未知'}${summaryLine}${tagsLine}`;
}).join('\n')}

要求：
- trends：基于当前资讯内容，提炼 3 条最显著的技术趋势
- correlations：发现不同领域/赛道之间的关联或共同主题
- signals：指出值得关注的早期信号或潜在变化
- 每条**不超过 30 字**，简洁明了
- 只输出 JSON，不要其他文字`;

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 30000);
            const response = await fetch(apiUrl, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 1000,
                temperature: 0.7
              }),
              signal: controller.signal
            });
            clearTimeout(timeout);
            console.log('[AI Insights] API response status:', response.status);
            if (!response.ok) {
              const errText = await response.text().catch(() => '');
              console.error('[AI Insights] API error:', response.status, errText);
              return sendJson(res, { error: `API responded ${response.status}: ${errText.slice(0, 200)}` });
            }
            const data = await response.json();
            console.log('[AI Insights] API response data:', JSON.stringify(data, null, 2).slice(0, 500));
            const content = data.choices?.[0]?.message?.content || '';
            console.log('[AI Insights] Raw response:', content.slice(0, 500));
            try {
              let cleaned = content.trim();
              cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
              const start = cleaned.indexOf('{');
              let end = cleaned.lastIndexOf('}');
              
              if (start === -1) {
                console.log('[AI Insights] No opening brace found');
                throw new Error('AI 响应缺少 JSON 开始标记');
              }
              
              if (end === -1 || end <= start) {
                console.log('[AI Insights] No closing brace, trying to repair...');
                end = cleaned.length - 1;
                cleaned = cleaned + ']}]}'.repeat(3);
              }
              
              const jsonStr = cleaned.slice(start, end + 1);
              console.log('[AI Insights] Extracted JSON:', jsonStr.slice(0, 300));
              
              try {
                const insights = JSON.parse(jsonStr);
                return sendJson(res, insights);
              } catch (parseErr) {
                console.log('[AI Insights] JSON parse failed, content may be truncated');
                throw new Error(`JSON 解析失败，响应可能被截断：${parseErr.message}`);
              }
            } catch (e) {
              console.error('[AI Insights] Parse error:', e.message, 'Content:', content);
              return sendJson(res, { error: `AI 返回格式错误：${e.message}`, raw: content.slice(0, 300) });
            }
          } catch (e) {
              console.error('[AI Insights] Outer error:', e);
              return sendJson(res, { error: e.message });
            }
          }

        // 获取网页内容
        if (requestUrl.pathname === '/api/fetch-page') {
          const url = requestUrl.searchParams.get('url');
          if (!url) return sendJson(res, { error: 'url is required' }, 400);
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);
            const response = await fetch(url, {
              headers: { 'User-Agent': 'GlobalTechRadar/0.1' },
              signal: controller.signal
            });
            clearTimeout(timeout);
            if (!response.ok) {
              return sendJson(res, { error: `Failed to fetch: ${response.status}` }, 500);
            }
            const html = await response.text();
            // 提取正文内容
            const textContent = html
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, 15000);
            return sendJson(res, { content: textContent });
          } catch (e) {
            return sendJson(res, { error: e.message }, 500);
          }
        }

        // AI 辅助写作
        if (requestUrl.pathname === '/api/ai-generate') {
          const body = await parseBody(req);
          const { baseUrl = '', apiKey = '', model = '', action = '', content = '', context = '', messages = [], systemPrompt = '' } = body;
          if (!baseUrl || !model) return sendJson(res, { error: 'baseUrl and model are required' }, 400);
          try {
            const cleanBaseUrl = baseUrl.replace(/\/$/, '');
            const apiUrl = cleanBaseUrl.endsWith('/v1') || cleanBaseUrl.endsWith('/v2') || cleanBaseUrl.endsWith('/v3') || cleanBaseUrl.endsWith('/v4')
              ? cleanBaseUrl + '/chat/completions'
              : cleanBaseUrl + '/v1/chat/completions';
            const headers = { 'Content-Type': 'application/json' };
            if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

            const prompts = {
              continue: `请继续以下文章的内容，保持相同的风格和语气：\n\n${content}`,
              rewrite: `请改写以下段落，使其更清晰、更专业，但保持原意不变：\n\n${content}`,
              expand: `请扩展以下内容，添加更多细节和论据，使其更丰富：\n\n${content}`,
              simplify: `请简化以下段落，使其更简洁易懂：\n\n${content}`,
              translate_zh: `请将以下内容翻译成中文。只输出翻译结果，不要添加任何解释、说明、前缀或后缀：\n\n${content}`,
              translate_en: `请将以下内容翻译成英文：\n\n${content}`,
              title: `请为以下文章生成 5 个吸引人的标题，每个标题不超过 30 字：\n\n${content}`,
              summary: `请为以下文章生成一段简洁的摘要（不超过 100 字）：\n\n${content}`
            };

            let apiMessages;

            if (action === 'chat' && messages.length > 0) {
              apiMessages = [];
              if (systemPrompt) {
                apiMessages.push({ role: 'system', content: systemPrompt });
              }
              const recentMessages = messages.slice(-20);
              for (const msg of recentMessages) {
                apiMessages.push({ role: msg.role, content: msg.content });
              }
              apiMessages.push({ role: 'user', content });
            } else {
              const prompt = prompts[action] || `请根据以下要求处理内容：\n要求：${action}\n内容：${content}`;
              apiMessages = [];
              if (systemPrompt) {
                apiMessages.push({ role: 'system', content: systemPrompt });
              }
              apiMessages.push({ role: 'user', content: prompt });
            }

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 30000);
            const response = await fetch(apiUrl, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                model,
                messages: apiMessages,
                max_tokens: 1500,
                temperature: 0.7
              }),
              signal: controller.signal
            });
            clearTimeout(timeout);
            if (!response.ok) {
              const errText = await response.text().catch(() => '');
              return sendJson(res, { error: `API responded ${response.status}: ${errText.slice(0, 200)}` });
            }
            const data = await response.json();
            const generated = data.choices?.[0]?.message?.content || '';
            return sendJson(res, { ok: true, content: generated });
          } catch (e) {
            return sendJson(res, { error: e.message });
          }
        }

        if (requestUrl.pathname.startsWith('/api/ai/') || requestUrl.pathname.startsWith('/api/translate') || requestUrl.pathname.startsWith('/api/subscriptions') || requestUrl.pathname.startsWith('/api/bookmarks')) {
          return sendJson(res, { ok: false, message: 'Reserved extension endpoint.' }, 501);
        }

        next();
      });
    }
  };
}

async function getNews(blocked, customSources, page = 0, pageSize = PAGE_SIZE, search = '', disabledSources = [], interests = []) {
  const now = Date.now();
  console.log('[getNews] Called with:', { blockedCount: blocked.length, customSourcesCount: customSources.length, disabledSourcesCount: disabledSources.length, page, pageSize, interestsCount: interests.length });

  // 按等级排序源（S级优先获取）
  const filteredDefaultSources = sortSourcesByGrade(DEFAULT_SOURCES.filter(s => !disabledSources.includes(s.name)));
  console.log('[getNews] Filtered sources:', { total: DEFAULT_SOURCES.length, filtered: filteredDefaultSources.length, disabled: disabledSources.length });
  const allSources = [...filteredDefaultSources, ...customSources];
  const cacheKey = JSON.stringify({ blocked, customSources: customSources.map(s => s.url), disabledSources, interests });

  const cacheValid = newsCache.data && newsCache.expiresAt > now && newsCache.key === cacheKey;
  let fullItems;
  let sourceResults;
  let failedSources;
  let blockedCount;

  if (cacheValid) {
    fullItems = newsCache.data.items;
    sourceResults = newsCache.data.sourceResults;
    failedSources = newsCache.data.failedSources;
    blockedCount = newsCache.data.blockedCount;
  } else {
    console.log('[getNews] Cache invalid, fetching from sources...');
    const settled = await Promise.allSettled(allSources.map(fetchSource));
    console.log('[getNews] Fetch results:', { total: settled.length, fulfilled: settled.filter(r => r.status === 'fulfilled').length, rejected: settled.filter(r => r.status === 'rejected').length });
    sourceResults = settled
      .filter(result => result.status === 'fulfilled')
      .map(result => result.value);
    const rawItems = sourceResults.flatMap(result => result.items);
    console.log('[getNews] Raw items:', rawItems.length);
    failedSources = settled.filter(result => result.status === 'rejected').length;
    const cleaned = applyBlockedWords(rawItems, blocked)
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    const deduped = mergeDiverseItems(cleaned, sourceResults, MAX_NEWS_ITEMS, MAX_ITEMS_PER_SOURCE);
    blockedCount = rawItems.length - cleaned.length;

    // 多源交叉验证 + 质量评分
    fullItems = crossVerifyItems(deduped);

    // 为每个item添加源等级信息
    fullItems.forEach(item => {
      const gradeInfo = getSourceGradeInfo(item.source);
      item.sourceGrade = gradeInfo.weight;
      item.sourceGradeLabel = gradeInfo.label;
      item.sourceGradeColor = gradeInfo.color;
      item.sourceGradeIcon = gradeInfo.icon;
    });

    // 按综合质量分数降序排列（高分优先），同一分数时按源等级排序
    fullItems.sort((a, b) => {
      const qualityDiff = (b.qualityScore || 0) - (a.qualityScore || 0);
      if (qualityDiff !== 0) return qualityDiff;
      // 同等质量时，按源等级排序
      return (b.sourceGrade || 0) - (a.sourceGrade || 0);
    });

    // 初始化统计
    resetMediaStats();
    resetGlobalImageUsage(); // 重置全局图片使用跟踪
    mediaStats.totalItems = fullItems.length;

    // 统计 RSS 图片
    fullItems.forEach(item => {
      if (item.imageUrl) {
        mediaStats.itemsWithImage++;
        mediaStats.rssImageCount++;
      }
      if (item.videoUrl) {
        mediaStats.itemsWithVideo++;
      }
    });

    const itemsWithoutImage = fullItems.filter(item => !item.imageUrl && item.url);
    if (itemsWithoutImage.length > 0) {
      console.log(`[getNews] Resolving images for ${itemsWithoutImage.length} items without images (max: ${MEDIA_CONFIG.MAX_RESOLVE_ITEMS})`);
      
      const imageSettled = await Promise.allSettled(itemsWithoutImage.slice(0, MEDIA_CONFIG.MAX_RESOLVE_ITEMS).map(async (item) => {
        try {
          const resolved = await resolveImageWithScrapling(item.url);
          return { id: item.id, imageUrl: resolved.imageUrl, videoUrl: resolved.videoUrl || item.videoUrl };
        } catch { return null; }
      }));
      
      imageSettled.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          const idx = fullItems.findIndex(i => i.id === result.value.id);
          if (idx >= 0 && result.value.imageUrl) {
            fullItems[idx].imageUrl = result.value.imageUrl;
            if (result.value.videoUrl) fullItems[idx].videoUrl = result.value.videoUrl;
          }
        }
      });
    }

    // 更新统计
    mediaStats.lastUpdate = new Date().toISOString();

    // 输出统计日志
    logMediaStats();

    newsCache = { data: { items: fullItems, sourceResults, failedSources, blockedCount }, expiresAt: now + 1000 * 60 * 5, key: cacheKey };
  }

  // 兴趣过滤
  let filteredItems = fullItems;
  if (interests.length > 0) {
    filteredItems = fullItems.filter(item => {
      if (!item.category) return false;
      return interests.includes(item.category);
    });
    console.log('[getNews] Interest filtering:', { before: fullItems.length, after: filteredItems.length, interests });
  }

  if (search) {
    const q = search.toLowerCase();
    const tokens = q.split(/\s+/).filter(Boolean);
    if (tokens.length === 1 && /[a-z]/.test(q) && /[\u4e00-\u9fff]/.test(q)) {
      const parts = q.match(/([a-z]+|[\u4e00-\u9fff]+)/g);
      if (parts && parts.length > 1) tokens.length = 0;
      if (parts && parts.length > 1) parts.forEach(p => tokens.push(p));
    }

    filteredItems = filteredItems.filter(item => {
      const txt = `${item.title} ${item.summary} ${item.source} ${(item.tags || []).join(' ')}`.toLowerCase();
      if (tokens.length > 1) {
        return tokens.every(t => txt.includes(t));
      }
      return txt.includes(q);
    });

    filteredItems.sort((a, b) => {
      const aTxt = `${a.title} ${a.summary}`.toLowerCase();
      const bTxt = `${b.title} ${b.summary}`.toLowerCase();
      if (tokens.length > 1) {
        const aScore = tokens.filter(t => aTxt.includes(t)).length;
        const bScore = tokens.filter(t => bTxt.includes(t)).length;
        if (aScore !== bScore) return bScore - aScore;
      }
      const aTitle = tokens.some(t => a.title.toLowerCase().includes(t)) ? 1 : 0;
      const bTitle = tokens.some(t => b.title.toLowerCase().includes(t)) ? 1 : 0;
      return bTitle - aTitle;
    });
  }

  const start = page * pageSize;
  const end = start + pageSize;
  const pagedItems = filteredItems.slice(start, end);

  return {
    updatedAt: new Date().toISOString(),
    items: pagedItems,
    total: filteredItems.length,
    page,
    pageSize,
    hasMore: end < filteredItems.length,
    sourceCount: allSources.length,
    failedSources,
    blockedCount
  };
}

function mergeDiverseItems(items, sourceResults, maxItems, perSourceLimit) {
  const seen = new Set();
  const deduped = [];
  items.forEach(item => {
    const key = `${item.source}|${normalizeUrl(item.url)}|${item.title.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    deduped.push(item);
  });

  const sourceCounts = new Map();
  const capped = [];
  deduped.forEach(item => {
    const count = sourceCounts.get(item.source) || 0;
    if (count >= perSourceLimit) return;
    sourceCounts.set(item.source, count + 1);
    capped.push(item);
  });

  return capped
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, maxItems);
}

function normalizeUrl(url) {
  return String(url || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
}

async function resolveImageFromArticle(articleUrl) {
  if (!articleUrl) return { imageUrl: '', videoUrl: '' };
  if (imageResolveCache[articleUrl]) return imageResolveCache[articleUrl];

  try {
    const res = await fetch(articleUrl, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7'
      },
      signal: AbortSignal.timeout(MEDIA_CONFIG.RESOLVE_TIMEOUT)
    });
    if (!res.ok) return { imageUrl: '', videoUrl: '' };

    const html = await res.text();

    // 提取所有图片（包括懒加载图片）- 增强版
    const allImages = [];
    const imgMatches = [
      ...html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi),
      ...html.matchAll(/<img[^>]+data-src=["']([^"']+)["'][^>]*>/gi),
      ...html.matchAll(/<img[^>]+data-original=["']([^"']+)["'][^>]*>/gi),
      ...html.matchAll(/<img[^>]+data-lazy-src=["']([^"']+)["'][^>]*>/gi),
      ...html.matchAll(/<img[^>]+data-srcset=["']([^"']+)["'][^>]*>/gi),
      ...html.matchAll(/<img[^>]+data-lazy=["']([^"']+)["'][^>]*>/gi),
      ...html.matchAll(/<img[^>]+data-img=["']([^"']+)["'][^>]*>/gi)
    ];

    for (const match of imgMatches) {
      // 处理srcset中的多张图片
      if (match[1].includes(',')) {
        const maxSrc = parseSrcset(match[1]);
        if (maxSrc) allImages.push(maxSrc);
      } else {
        allImages.push(match[1]);
      }
    }

    // 提取 srcset 中的图片
    const srcsetMatches = [...html.matchAll(/srcset=["']([^"']+)["']/gi)];
    for (const match of srcsetMatches) {
      const maxSrc = parseSrcset(match[1]);
      if (maxSrc) allImages.push(maxSrc);
    }

    // 提取背景图片
    const bgImageMatches = [
      ...html.matchAll(/background-image:\s*url\(["']?([^"')\s]+)["']?\)/gi),
      ...html.matchAll(/background:\s*url\(["']?([^"')\s]+)["']?\)/gi),
      ...html.matchAll(/data-background=["']([^"']+)["']/gi),
    ];
    for (const match of bgImageMatches) {
      allImages.push(match[1]);
    }

    // 标准化URL并去重（增强版：基于多维度去重）
    const normalizedImages = [...new Set(allImages.map(url => {
      try {
        const urlObj = new URL(url, articleUrl);
        // 移除常见查询参数但保留关键的尺寸参数
        const paramsToRemove = ['ref', 'utm_source', 'utm_medium', 'utm_campaign', 'fbclid', 'gclid', 't', 'time'];
        paramsToRemove.forEach(param => urlObj.searchParams.delete(param));
        return urlObj.href;
      } catch {
        return url;
      }
    }))].filter(url => {
      // 多维度去重：基于文件名、路径、尺寸等特征
      try {
        const urlObj = new URL(url);

        // 1. 移除查询参数和哈希
        urlObj.search = '';
        urlObj.hash = '';
        const normalized = urlObj.href;

        // 2. 提取文件名和路径特征
        const pathname = urlObj.pathname.toLowerCase();
        const filename = pathname.split('/').pop();

        // 3. 排除常见的通用图片文件名
        const genericFilenames = [
          'default', 'placeholder', 'generic', 'common', 'shared',
          'no-image', 'no-image-available', 'image-not-found',
          'logo', 'header', 'footer', 'banner', 'background',
          'icon', 'favicon', 'badge', 'shield'
        ];
        if (genericFilenames.some(name => filename.includes(name))) {
          return false;
        }

        // 4. 检查图片使用次数
        const usageCount = getImageUsageCount(normalized);
        if (usageCount >= MEDIA_CONFIG.MAX_IMAGE_REUSE) {
          return false;
        }

        return true;
      } catch {
        return false;
      }
    });

    // 对所有图片进行评分和过滤
    const scoredImages = normalizedImages
      .filter(url => isGoodImageUrl(url, html))
      .map(url => {
        const { score, reasons } = scoreImageUrl(url, html);
        return { url, score, reasons };
      })
.filter(img => img.score >= MEDIA_CONFIG.MIN_IMAGE_SCORE)
      .sort((a, b) => b.score - a.score);

    // 提取视频（增强版）

    // 选择最佳图片（带全局使用跟踪和验证）
    if (scoredImages.length > 0) {
      let best = scoredImages[0];
      const optimizedUrl = optimizeImageUrl(best.url);

      // 检查图片使用次数，如果已达到最大使用次数，尝试次优图片
      const usageCount = getImageUsageCount(optimizedUrl);
      if (usageCount >= MEDIA_CONFIG.MAX_IMAGE_REUSE) {
        console.log(`[resolveImage] Image exceeded max reuse: ${optimizedUrl.substring(0, 60)} (usage: ${usageCount})`);
        mediaStats.duplicateFilteredCount++;

        // 尝试次优图片
        for (let i = 1; i < scoredImages.length; i++) {
          const candidate = scoredImages[i];
          const candidateUrl = optimizeImageUrl(candidate.url);
          const candidateUsage = getImageUsageCount(candidateUrl);
          if (candidateUsage < MEDIA_CONFIG.MAX_IMAGE_REUSE) {
            best = candidate;
            break;
          }
        }
      }

      // 验证最佳图片
      const bestUrl = optimizeImageUrl(best.url);
      const isValid = await validateImageUrl(bestUrl, 5000); // 5秒超时
      
      if (isValid) {
        incrementImageUsage(bestUrl);
        console.log(`[resolveImage] Selected for ${articleUrl}:`, {
          url: bestUrl.substring(0, 80),
          score: best.score,
          reasons: best.reasons.join(', ')
        });

        const result = { imageUrl: bestUrl, videoUrl };
        imageResolveCache[articleUrl] = result;

        // 统计
        mediaStats.resolvedImageCount++;
        mediaStats.totalImageScore += best.score;
        if (best.reasons.includes('og:image')) mediaStats.ogImageCount++;
        if (best.reasons.includes('twitter:image')) mediaStats.twitterImageCount++;

        return result;
      } else {
        console.log(`[resolveImage] Best image validation failed for ${articleUrl}`);
        mediaStats.validationFailedCount++;

        // 尝试次优图片（最多3个）
        for (let i = 1; i < Math.min(4, scoredImages.length); i++) {
          const candidate = scoredImages[i];
          const candidateUrl = optimizeImageUrl(candidate.url);
          const candidateUsage = getImageUsageCount(candidateUrl);
          
          if (candidateUsage >= MEDIA_CONFIG.MAX_IMAGE_REUSE) continue;
          
          const candidateValid = await validateImageUrl(candidateUrl, 3000);
          if (candidateValid) {
            incrementImageUsage(candidateUrl);
            console.log(`[resolveImage] Selected backup image ${i} for ${articleUrl}:`, {
              url: candidateUrl.substring(0, 80),
              score: candidate.score
            });

            const result = { imageUrl: candidateUrl, videoUrl };
            imageResolveCache[articleUrl] = result;
            mediaStats.resolvedImageCount++;
            mediaStats.totalImageScore += candidate.score;
            return result;
          }
        }
      }
    }

    // 备用：使用社交媒体图片（降低要求）
    const ogImage = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    const twitterImage = html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i);
    
    const socialImages = [];
    if (ogImage) socialImages.push({ url: ogImage[1], type: 'og:image' });
    if (twitterImage) socialImages.push({ url: twitterImage[1], type: 'twitter:image' });

    for (const social of socialImages) {
      const optimizedUrl = optimizeImageUrl(social.url);
      const usageCount = getImageUsageCount(optimizedUrl);
      
      if (usageCount < MEDIA_CONFIG.MAX_IMAGE_REUSE) {
        const isValid = await validateImageUrl(optimizedUrl, 3000);
        if (isValid) {
          incrementImageUsage(optimizedUrl);
          console.log(`[resolveImage] Fallback to ${social.type} for ${articleUrl}`);
          
          const result = { imageUrl: optimizedUrl, videoUrl };
          imageResolveCache[articleUrl] = result;
          mediaStats.resolvedImageCount++;
          if (social.type === 'og:image') mediaStats.ogImageCount++;
          if (social.type === 'twitter:image') mediaStats.twitterImageCount++;
          return result;
        }
}
    }

    // 提取视频（增强版）
    let videoUrl = '';
    const videoMatches = [
      ...html.matchAll(/<iframe[^>]+src=["']([^"']*youtube\.com[^"']*)["'][^>]*>/gi),
      ...html.matchAll(/<iframe[^>]+src=["']([^"']*youtu\.be[^"']*)["'][^>]*>/gi),
      ...html.matchAll(/<iframe[^>]+src=["']([^"']*vimeo\.com[^"']*)["'][^>]*>/gi),
      ...html.matchAll(/<iframe[^>]+src=["']([^"']*bilibili\.com[^"']*)["'][^>]*>/gi),
      ...html.matchAll(/<video[^>]+src=["']([^"']+)["'][^>]*>/gi),
      ...html.matchAll(/<source[^>]+src=["']([^"']+\.mp4[^"']*)["'][^>]*>/gi),
      ...html.matchAll(/<embed[^>]+src=["']([^"']*youtube\.com[^"']*)["'][^>]*>/gi),
    ];
    if (videoMatches.length > 0) {
      videoUrl = videoMatches[0][1];
    }

    // 选择最佳图片（带全局使用跟踪和验证）
    let bestImage = null;
    let bestScore = 0;
    let bestReasons = [];

    for (let i = 0; i < scoredImages.length; i++) {
      const img = scoredImages[i];
      const normalizedUrl = img.url.split('?')[0];

      // 检查全局使用次数
      const usageCount = globalImageUsage.get(normalizedUrl) || 0;
      if (usageCount >= MEDIA_CONFIG.MAX_IMAGE_REUSE) {
        console.log(`[resolveImage] Image already used ${usageCount} times, skipping:`, normalizedUrl.substring(0, 80));
        continue;
      }

      // 验证图片URL
      const isValid = await validateImageUrl(img.url);
      if (!isValid) {
        console.log(`[resolveImage] Image validation failed:`, img.url.substring(0, 80));
        mediaStats.validationFailedCount++;
        continue;
      }

      bestImage = img;
      bestScore = img.score;
      bestReasons = img.reasons;
      break;
    }

    // 如果没有找到有效的图片，尝试使用社交媒体图片
    if (!bestImage) {
      const socialImages = [
        html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i),
        html.match(/<meta\s+property=["']og:image:url["']\s+content=["']([^"']+)["']/i),
        html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i),
        html.match(/<link\s+rel=["']image_src["']\s+href=["']([^"']+)["']/i)
      ];

      for (const match of socialImages) {
        if (match) {
          const url = match[1];
          const normalizedUrl = url.split('?')[0];
          const usageCount = globalImageUsage.get(normalizedUrl) || 0;

          if (usageCount < MEDIA_CONFIG.MAX_IMAGE_REUSE) {
            const isValid = await validateImageUrl(url);
            if (isValid) {
              bestImage = { url, score: 15, reasons: ['social-image'] };
              console.log(`[resolveImage] Using social image as fallback:`, url.substring(0, 80));
              break;
            }
          }
        }
      }
    }

    if (bestImage) {
      const optimizedUrl = optimizeImageUrl(bestImage.url);
      const normalizedUrl = bestImage.url.split('?')[0];

      // 更新全局使用计数
      globalImageUsage.set(normalizedUrl, (globalImageUsage.get(normalizedUrl) || 0) + 1);

      console.log(`[resolveImage] Selected for ${articleUrl}:`, {
        url: optimizedUrl.substring(0, 80),
        score: bestScore,
        reasons: bestReasons.join(', ')
      });

      const result = { imageUrl: optimizedUrl, videoUrl };
      imageResolveCache[articleUrl] = result;
      mediaStats.resolvedImageCount++;
      mediaStats.totalImageScore += bestScore;
      return result;
    }

    mediaStats.failedResolves++;
    return { imageUrl: '', videoUrl };
  } catch (e) {
    console.error(`[resolveImage] Error for ${articleUrl}:`, e.message);
    mediaStats.failedResolves++;
    return { imageUrl: '', videoUrl: '' };
  }
}

async function resolveImageWithScrapling(articleUrl) {
  if (!MEDIA_CONFIG.USE_SCRAPLING) {
    return resolveImageFromArticle(articleUrl);
  }

  try {
    const response = await fetch('http://localhost:5000/api/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: articleUrl,
        mode: MEDIA_CONFIG.SCRAPLING_MODE,
        timeout: MEDIA_CONFIG.SCRAPLING_TIMEOUT / 1000
      }),
      signal: AbortSignal.timeout(MEDIA_CONFIG.SCRAPLING_TIMEOUT)
    });

    if (!response.ok) {
      console.error(`[resolveImageWithScrapling] Scrapling returned ${response.status}`);
      return resolveImageFromArticle(articleUrl);
    }

    const data = await response.json();

    if (data.status === 200 && data.images && data.images.length > 0) {
      const scoredImages = data.images
        .filter(img => img.src && isGoodImageUrl(img.src, data.content || ''))
        .map(img => {
          const { score, reasons } = scoreImageUrl(img.src, data.content || '');
          return { url: img.src, score, reasons };
        })
        .filter(img => img.score >= MEDIA_CONFIG.MIN_IMAGE_SCORE)
        .sort((a, b) => b.score - a.score);

      if (scoredImages.length > 0) {
        const best = scoredImages[0];
        const optimizedUrl = optimizeImageUrl(best.url);
        const result = { imageUrl: optimizedUrl, videoUrl: '' };
        imageResolveCache[articleUrl] = result;
        mediaStats.scraplingImageCount = (mediaStats.scraplingImageCount || 0) + 1;
        mediaStats.totalImageScore += best.score;
        return result;
      }
    }

    return resolveImageFromArticle(articleUrl);
  } catch (e) {
    console.error(`[resolveImageWithScrapling] Error:`, e.message);
    return resolveImageFromArticle(articleUrl);
  }
}

async function getTrending(platformFilter = 'all', page = 0, pageSize = 60) {
  const now = Date.now();
  
  // 获取所有数据（从缓存或重新获取）
  let allItems = [];
  if (trendingCache.data && trendingCache.expiresAt > now && trendingCache.data.items?.length > 0) {
    allItems = trendingCache.data.items;
  } else {
    const settled = await Promise.allSettled(TRENDING_SOURCES.map(fetchTrendingSource));
    const results = settled.flatMap(result => (result.status === 'fulfilled' ? result.value : []));
    allItems = results.flatMap(r => r.items || []);
    
    // 按时间排序
    allItems.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    
    // 更新缓存（存储所有数据）
    trendingCache = { data: { items: allItems }, expiresAt: now + 1000 * 60 * 10 };
  }
  
  // 按平台筛选
  let items = allItems;
  if (platformFilter !== 'all') {
    items = items.filter(item => item.platform === platformFilter);
  }
  
  // 分页
  const start = page * pageSize;
  const end = start + pageSize;
  const pagedItems = items.slice(start, end);

  const payload = { 
    updatedAt: new Date().toISOString(), 
    items: pagedItems,
    sourcesCount: TRENDING_SOURCES.length,
    hasMore: end < items.length
  };
  return payload;
}

async function fetchTrendingSource(source) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(source.url, {
      headers: { 'User-Agent': 'GlobalTechRadar/0.1 (+https://localhost)' },
      signal: controller.signal
    });

    if (!response.ok) throw new Error(`${source.name} responded ${response.status}`);

    const xml = await response.text();
    const items = parseFeed(xml, source).slice(0, 15);
    return { source: source.name, items: items.map(item => ({ ...item, platform: source.platform })) };
  } catch (e) {
    console.warn(`[Trending] Failed to fetch ${source.name}: ${e.message}`);
    return { source: source.name, items: [], error: e.message };
  } finally {
    clearTimeout(timeout);
  }
}

async function getGithubTrending(lang, since) {
  const validSince = ['daily', 'weekly', 'monthly'].includes(since) ? since : 'weekly';
  const now = Date.now();
  const cacheKey = `github-${lang}-${validSince}`;
  if (githubCaches[cacheKey] && githubCaches[cacheKey].expiresAt > now) {
    return githubCaches[cacheKey].data;
  }

  try {
    const dateRange = validSince === 'daily' ? getYesterday() : validSince === 'monthly' ? get30DaysAgo() : get7DaysAgo();
    const langQuery = lang ? `+language:${encodeURIComponent(lang)}` : '';
    const apiUrl = `https://api.github.com/search/repositories?q=created:>${dateRange}${langQuery}&sort=stars&order=desc&per_page=25`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(apiUrl, {
      headers: { 'User-Agent': 'GlobalTechRadar/0.1', 'Accept': 'application/vnd.github.v3+json' },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!response.ok) throw new Error(`GitHub API responded ${response.status}`);

    const data = await response.json();
    const rawRepos = data.items || [];

    const repos = rawRepos.slice(0, 25).map(item => ({
      id: hash(item.full_name),
      fullName: item.full_name,
      name: item.name,
      url: item.html_url,
      description: item.description || '暂无描述',
      language: item.language || '',
      totalStars: item.stargazers_count || 0,
      forks: item.forks_count || 0,
      starsToday: validSince === 'daily' ? item.stargazers_count : 0,
      starsThisWeek: validSince === 'weekly' ? item.stargazers_count : 0,
      starsThisMonth: validSince === 'monthly' ? item.stargazers_count : 0,
      period: validSince,
      periodLabel: validSince === 'daily' ? 'today' : validSince === 'monthly' ? 'this month' : 'this week',
      homepage: item.homepage || '',
      topics: item.topics || [],
      openIssues: item.open_issues_count || 0,
      watchers: item.watchers_count || 0,
      imageUrl: '',
      readmeIntro: '',
      tutorial: ''
    }));

    const settled = await Promise.allSettled(rawRepos.slice(0, 5).map(async (item, i) => {
      try {
        const branches = ['main', 'master'];
        let content = '';
        for (const branch of branches) {
          const rawUrl = `https://raw.githubusercontent.com/${item.full_name}/${branch}/README.md`;
          const rawRes = await fetch(rawUrl, {
            headers: { 'User-Agent': 'GlobalTechRadar/0.1' },
            signal: AbortSignal.timeout(5000)
          });
          if (rawRes.ok) { content = await rawRes.text(); break; }
        }
        if (!content) {
          const readmeUrl = `https://api.github.com/repos/${item.full_name}/readme`;
          const readmeRes = await fetch(readmeUrl, {
            headers: { 'User-Agent': 'GlobalTechRadar/0.1', 'Accept': 'application/vnd.github.raw' },
            signal: AbortSignal.timeout(6000)
          });
          if (!readmeRes.ok) return null;
          content = await readmeRes.text();
        }
const imageUrls = [...content.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map(m => m[1]);
        const markdownImages = [...content.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map(m => m[1]);
        const readmeBadImgRe = /(badge|shield|icon|logo|status|build|coverage|codecov|travis|circleci|github\.com\/.*\/badges|npm\/badge|snyk|dependabot|renovate|license|downloads|version|size|rating|stars|follow|tweet|share|sponsor|patreon|ko-fi|buy_me_a_coffee|opencollective|code_style|lint|test|ci|workflow|actions|progress|compat|platform|browser|stack|node|python|java|rust|go|typescript|javascript|swift|kotlin|ruby|php|docker|podman|kubernetes|terraform|ansible|visual.studio|vscode|jetbrains|intellij|emacs|vim|neovim|sublime)\b/i;
        const readmeGoodImgRe = /(screenshot|demo|preview|example|result|output|architecture|diagram|flow|chart|graph|figure|fig|illustration|展示|演示|截图|效果图|架构图|流程图|界面|画面|界面截图)/i;
        const candidates = [];
        const resolveUrl = (src) => {
          if (src.startsWith('http://') || src.startsWith('https://')) return src;
          const base = `https://raw.githubusercontent.com/${item.full_name}/main`;
          const path = src.startsWith('/') ? src.slice(1) : src;
          return `${base}/${path}`;
        };
        const markdownMatches = [...content.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)];
        for (const m of markdownMatches) {
          const alt = m[1];
          let src = m[2];
          if (!/\.(jpg|jpeg|png|gif|webp)/i.test(src)) continue;
          src = resolveUrl(src);
          if (readmeBadImgRe.test(src) || readmeBadImgRe.test(alt)) continue;
          if (!isGoodImageUrl(src, content)) continue;
          const goodScore = (readmeGoodImgRe.test(src) || readmeGoodImgRe.test(alt)) ? 2 : 0;
          const pathScore = /\/(img|images|assets|static|public|media|pics|screenshots|screens|docs\/images|doc\/img|examples)\b/i.test(src) ? 1 : 0;
          candidates.push({ src, score: goodScore + pathScore });
        }
        const htmlMatches = [...content.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)];
        for (const m of htmlMatches) {
          let src = m[1];
          if (!/\.(jpg|jpeg|png|gif|webp)/i.test(src)) continue;
          src = resolveUrl(src);
          if (readmeBadImgRe.test(src)) continue;
          if (!isGoodImageUrl(src, content)) continue;
          const goodScore = readmeGoodImgRe.test(src) ? 2 : 0;
          const pathScore = /\/(img|images|assets|static|public|media|pics|screenshots|screens|docs\/images|doc\/img|examples)\b/i.test(src) ? 1 : 0;
          candidates.push({ src, score: goodScore + pathScore });
        }
        candidates.sort((a, b) => b.score - a.score);
        const imageUrl = candidates.length > 0 ? candidates[0].src : (item.homepage ? '' : '');

        const tutorial = extractTutorial(content);
        const intro = content.replace(/!\[[^\]]*\]\([^\)]+\)/g, '').replace(/<[^>]+>/g, '').replace(/#{1,4}\s/g, '').replace(/\s+/g, ' ').trim().slice(0, 200);
        return { index: i, imageUrl, tutorial, readmeIntro: intro };
      } catch { return null; }
    }));

    settled.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        const { index, imageUrl, tutorial, readmeIntro } = result.value;
        if (repos[index]) {
          repos[index].imageUrl = imageUrl;
          repos[index].tutorial = tutorial;
          repos[index].readmeIntro = readmeIntro;
        }
      }
    });

    const payload = { updatedAt: new Date().toISOString(), language: lang || 'all', period: validSince, repos };
    githubCaches[cacheKey] = { data: payload, expiresAt: now + 1000 * 60 * 30 };
    return payload;
  } catch (e) {
    return { updatedAt: new Date().toISOString(), language: lang || 'all', period: validSince, repos: [], error: e.message };
  }
}

function extractTutorial(readme) {
  const sections = readme.split(/\n(?=#{1,3}\s)/);
  for (const section of sections) {
    const lower = section.toLowerCase();
    if (/(installation|install|setup|getting started|quick start|usage|how to use|how to run|教程|使用说明|安装|快速开始)/i.test(lower.slice(0, 80))) {
      const cleaned = section.replace(/#{1,3}\s/g, '').replace(/!\[[^\]]*\]\([^\)]+\)/g, '').replace(/<[^>]+>/g, '').replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1').trim();
      const lines = cleaned.split('\n').filter(l => l.trim());
      const meaningfulLines = lines.filter(l => !/^\s*(```|---|\*|\*\*|$)/.test(l.trim()));
      if (meaningfulLines.length < 2) return '';
      return meaningfulLines.join('\n').trim();
    }
  }
  return '';
}

function getYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function get7DaysAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().split('T')[0];
}

function get30DaysAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split('T')[0];
}

// 旧的 fetchSource 已被上面的增强版替换（包含 Jina AI Reader）

function parseFeed(xml, source) {
  const blocks = matchBlocks(xml, 'item').length ? matchBlocks(xml, 'item') : matchBlocks(xml, 'entry');
  return blocks.map((block, index) => normalizeItem(block, source, index)).filter(item => item.title && item.url);
}

function normalizeItem(block, source, index) {
  const title = cleanText(pick(block, ['title']));
  const rawSummary = cleanText(pick(block, ['description', 'summary']));
  const rawContent = pick(block, ['content:encoded', 'content']);
  const bodyIntro = trimIntro(cleanText(rawContent));
  const summary = trimSummary(rawSummary || bodyIntro);
  const url = cleanText(pick(block, ['link'])) || pickAtomLink(block);
  const publishedAt = normalizeDate(pick(block, ['pubDate', 'published', 'updated', 'dc:date']));
  const text = `${title} ${summary} ${bodyIntro} ${source.name}`;
  const category = detectCategory(text, source.defaultCategory);
  const tags = detectTags(text, category);

  const imageUrl = extractImageUrl(block, rawContent);
  const videoUrl = extractVideoUrl(block);

  return {
    id: hash(`${source.name}-${url}-${index}`),
    title,
    summary,
    bodyIntro,
    url,
    source: source.name,
    sourceUrl: source.url,
    region: source.region,
    category,
    mode: detectMode(text, source.name),
    publishedAt,
    tags,
    imageUrl,
    videoUrl
  };
}

function matchBlocks(xml, tag) {
  const pattern = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  return [...xml.matchAll(pattern)].map(match => match[1]);
}

function pick(block, tags) {
  for (const tag of tags) {
    const pattern = new RegExp(`<${escapeRegExp(tag)}\\b[^>]*>([\\s\\S]*?)<\\/${escapeRegExp(tag)}>`, 'i');
    const match = block.match(pattern);
    if (match?.[1]) return match[1];
  }
  return '';
}

function pickAtomLink(block) {
  const href = block.match(/<link\\b[^>]*href=["']([^"']+)["'][^>]*>/i)?.[1];
  return href ? decodeEntities(href) : '';
}

// 懒加载图片属性
const LAZY_LOAD_ATTRS = ['data-src', 'data-original', 'data-lazy-src', 'data-img-src', 'data-url', 'data-lazy', 'data-aspect-url'];

function parseSrcset(srcset) {
  const candidates = srcset.split(',').map(s => {
    const parts = s.trim().split(/\s+/);
    if (parts.length < 2) return null;
    const url = parts[0];
    const widthMatch = parts[1].match(/(\d+)w/);
    const width = widthMatch ? parseInt(widthMatch[1], 10) : 0;
    return { url, width };
  }).filter(Boolean);

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.width - a.width);
  return candidates[0].url;
}

function optimizeImageUrl(url) {
  if (!url) return url;

  try {
    const urlObj = new URL(url);

    // WordPress thumbnail → full size
    url = url.replace(/-\d+x\d+(\.(jpg|jpeg|png|webp))/i, '$1');

    // Cloudinary：移除缩放参数
    url = url.replace(/\/upload\/(q_\d+,c_scale,w_\d+,h_\d+|c_fill,w_\d+,h_\d+|w_\d+,h_\d+,c_scale)/, '/upload');

    // Unsplash：获取大图
    url = url.replace(/\/w=\d+&h=\d+&fit=crop/, '/w=1600&fit=cover');
    url = url.replace(/\/w=\d+&q=\d+/, '/w=1600&q=90');

    // Imgix：获取原图
    url = url.replace(/\?.*$/, '');

    // WordPress.com：移除尺寸参数
    url = url.replace(/\?w=\d+(&h=\d+)?(&fit=crop)?/, '');

    // 移除常见查询参数以获取原图
    url = url.replace(/[?&](width|height|w|h|size|resize|scale|quality|q)=\d+/gi, '');
    url = url.replace(/[?&](fit|crop|fill|pad)=\w+/gi, '');

    // 确保只有一个 ?
    url = url.replace(/[?&]+/, '?').replace(/\?$/, '');

    return url;
  } catch {
    return url;
  }
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const IMAGE_BLACKLIST_RE = /(\/|^)(ads|advert|banner|sponsor|promo|tracking|pixel|beacon|stat|analytics|share-bar|social-bar|gravatar|feedburner|rss|newsletter-signup|popup|overlay|interstitial|cdnp|cloudfront\.net\/images\/ui|fb-[a-z]|tw-[a-z]|linkedin-[a-z]|pinterest-[a-z]|buffer-[a-z]|addthis|sharethis|disqus|wp-emoticon|mstile|apple-touch-icon|android-chrome|safari-pinned|og-image-default|placeholder|stock|ticker|chart-bar|subscribe|related-post|sidebar|widget|newsletter|popup-icon|notification|push|web-push|logo|brand|identity|template|default|generic|common|shared|global|header-bg|footer-bg|nav-bg|hero-bg|banner-bg|site-logo|company-logo|organization-logo)\b/i;
const IMAGE_BLACKLIST_DOMAINS = /\/\/(feedburner\.|gravatar\.|disqus\.|addthis\.|sharethis\.|buffer\.|pixel\.|tracking\.|analytics\.|doubleclick\.|adsense\.|adnxs\.|moatads\.|chartbeat\.|newrelic\.|pingdom\.|taboola\.|outbrain\.|zemanta\.|scoopit\.|logo\.|brand\.|identity\.|template\.|default\.|generic\.|common\.|shared\.|global\.)/i;
const IMAGE_MIN_DIM_HINT = /width=["']([0-9]+)["']|height=["']([0-9]+)["']/i;

function isGoodImageUrl(url, htmlSource) {
  if (!url) return false;
  if (IMAGE_BLACKLIST_RE.test(url)) return false;
  
  // 放宽域名黑名单检查（只排除明显的追踪和分析域名）
  const TRACKING_DOMAINS = /\/\/(gravatar\.|disqus\.|pixel\.|tracking\.|analytics\.|doubleclick\.|adsense\.|adnxs\.|moatads\.|chartbeat\.|newrelic\.|pingdom\.|taboola\.|outbrain\.|zemanta\.)/i;
  if (TRACKING_DOMAINS.test(url)) return false;

  // 放宽文件类型限制（允许更多格式）
  if (/\.(ico|cur|bmp)$/i.test(url)) {
    // 允许某些特殊情况下的这些格式
    if (!/\/(screenshot|demo|preview|featured|hero|article|post|content)\b/i.test(url)) {
      return false;
    }
  }

  // 放宽尺寸限制（降低要求）
  const dimMatch = htmlSource?.match(IMAGE_MIN_DIM_HINT);
  if (dimMatch) {
    const w = parseInt(dimMatch[1] || '0', 10);
    const h = parseInt(dimMatch[2] || '0', 10);
    // 只排除非常小的图片
    if (w > 0 && w < 200 && h > 0 && h < 150) return false;
  }

  // 精简通用图片文件名排除（减少误判）
  const genericPatterns = /\/(logo|header-bg|footer-bg|nav-bg|hero-bg|banner-bg|site-logo|brand-logo|company-logo|organization-logo|placeholder|no-image|image-not-found)([-_]|$)/i;
  if (genericPatterns.test(url)) return false;

  // 排除明显的占位符服务
  const placeholderServices = /\/(via\.placeholder\.com|placehold\.co|dummyimage\.com|placehold\.it|fakeimg\.pl)/i;
  if (placeholderServices.test(url)) return false;

  // 排除通用尺寸（只排除明显的图标尺寸）
  if (/\/(16x16|32x32|48x48)\b/i.test(url)) return false;

  return true;
}

function extractImageUrl(block, rawContent) {
  let url = '';

  // 1. <enclosure> with image type
  const enclosure = block.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]+type=["'][^"']*image[^"']*["']/i)
    || block.match(/<enclosure[^>]+type=["'][^"']*image[^"']*["'][^>]+url=["']([^"']+)["']/i);
  if (enclosure && isGoodImageUrl(enclosure[1], block)) {
    url = enclosure[1];
  }

  // 2. <media:thumbnail> or <media:content> with image
  if (!url) {
    const mediaThumb = block.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i);
    if (mediaThumb && isGoodImageUrl(mediaThumb[1], block)) {
      url = mediaThumb[1];
    }
  }

  if (!url) {
    const mediaContent = block.match(/<media:content[^>]+(?:medium|type)=["']image["'][^>]+url=["']([^"']+)["']/i)
      || block.match(/<media:content[^>]+url=["']([^"']+)["'][^>]+(?:medium|type)=["']image["']/i);
    if (mediaContent && isGoodImageUrl(mediaContent[1], block)) {
      url = mediaContent[1];
    }
  }

  // 3. <enclosure> without type (assume image if url looks like one)
  if (!url) {
    const encNoType = block.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
    if (encNoType && /\.(jpg|jpeg|png|gif|webp|avif)/i.test(encNoType[1]) && isGoodImageUrl(encNoType[1], block)) {
      url = encNoType[1];
    }
  }

  // 4. <img> tags inside content/description HTML — scan all images
  if (!url) {
    const htmlSource = rawContent || pick(block, ['description', 'summary']);

    // 4a. Check for lazy-loaded images first (they are usually the main images)
    for (const attr of LAZY_LOAD_ATTRS) {
      const lazyMatch = htmlSource.match(new RegExp(`<img[^>]+${attr}=["']([^"']+)["'][^>]*>`, 'i'));
      if (lazyMatch && isGoodImageUrl(lazyMatch[1], htmlSource)) {
        url = lazyMatch[1];
        break;
      }
    }

    // 4b. Check for srcset and use highest resolution
    if (!url) {
      const srcsetMatch = htmlSource.match(/<img[^>]+srcset=["']([^"']+)["'][^>]*>/i);
      if (srcsetMatch) {
        const maxSrc = parseSrcset(srcsetMatch[1]);
        if (maxSrc && isGoodImageUrl(maxSrc, htmlSource)) {
          url = maxSrc;
        }
      }
    }

    // 4c. Fall back to regular src attribute
    if (!url) {
      const allImages = [...htmlSource.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)];
      for (const imgMatch of allImages) {
        const src = imgMatch[1];
        const fullTag = imgMatch[0];
        if (isGoodImageUrl(src, fullTag) && /\.(jpg|jpeg|png|gif|webp|avif)/i.test(src)) {
          url = src;
          break;
        }
      }
    }
  }

// Optimize the URL if found
  return url ? optimizeImageUrl(url) : '';
}

function extractVideoUrl(block) {
  // 1. <enclosure> with video type
  const videoEnc = block.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]+type=["'][^"']*video[^"']*["']/i)
    || block.match(/<enclosure[^>]+type=["'][^"']*video[^"']*["'][^>]+url=["']([^"']+)["']/i);
  if (videoEnc) return videoEnc[1];

  // 2. <media:content> with video
  const mediaVideo = block.match(/<media:content[^>]+(?:medium|type)=["']video["'][^>]+url=["']([^"']+)["']/i);
  if (mediaVideo) return mediaVideo[1];

  // 3. YouTube formats
  const ytWatch = block.match(/https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/i);
  if (ytWatch) return ytWatch[0];

  const ytShort = block.match(/https?:\/\/youtu\.be\/([a-zA-Z0-9_-]+)/i);
  if (ytShort) return `https://www.youtube.com/watch?v=${ytShort[1]}`;

  const ytEmbed = block.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/i);
  if (ytEmbed) return `https://www.youtube.com/watch?v=${ytEmbed[1]}`;

  // 4. Vimeo
  const vimeo = block.match(/https?:\/\/vimeo\.com\/(\d+)/i);
  if (vimeo) return vimeo[0];

  // 5. Bilibili
  const bili = block.match(/https?:\/\/(?:www\.)?bilibili\.com\/video\/([a-zA-Z0-9]+)/i);
  if (bili) return bili[0];

  // 6. HTML5 video tag
  const videoTag = block.match(/<video[^>]*>\s*<source[^>]+src=["']([^"']+)["'][^>]*>/is);
  if (videoTag) return videoTag[1];

  const videoTagDirect = block.match(/<video[^>]+src=["']([^"']+)["'][^>]*>/i);
  if (videoTagDirect) return videoTagDirect[1];

  return '';
}

// ========== 智能图片评分系统 ==========

function scoreImageUrl(url, context) {
  if (!url) return { score: -1, reasons: [] };

  let score = 0;
  const reasons = [];

  // 维度 1：尺寸评分 (0-30分)
  const dimScore = scoreDimensions(url, context);
  score += dimScore;
  if (dimScore > 0) reasons.push(`尺寸:${dimScore}`);
  if (dimScore < 0) reasons.push(`尺寸:${dimScore}`);

  // 维度 2：路径评分 (0-20分)
  const pathScore = scorePath(url);
  score += pathScore;
  if (pathScore > 0) reasons.push(`路径:${pathScore}`);
  if (pathScore < 0) reasons.push(`路径:${pathScore}`);

  // 维度 3：alt 文本评分 (0-15分)
  const altScore = scoreAltText(url, context);
  score += altScore;
  if (altScore > 0) reasons.push(`Alt:${altScore}`);
  if (altScore < 0) reasons.push(`Alt:${altScore}`);

  // 维度 4：位置评分 (0-25分)
  const posScore = scorePosition(url, context);
  score += posScore;
  if (posScore > 0) reasons.push(`位置:${posScore}`);
  if (posScore < 0) reasons.push(`位置:${posScore}`);

  // 维度 5：类型评分 (0-15分)
  const typeScore = scoreType(url);
  score += typeScore;
  if (typeScore > 0) reasons.push(`类型:${typeScore}`);
  if (typeScore < 0) reasons.push(`类型:${typeScore}`);

  // 维度 6：语义评分 (0-20分)
  const semanticScore = scoreSemantic(url, context);
  score += semanticScore;
  if (semanticScore > 0) reasons.push(`语义:${semanticScore}`);
  if (semanticScore < 0) reasons.push(`语义:${semanticScore}`);

  return { score, reasons };
}

function scoreDimensions(url, context) {
  let score = 0;

  // 从 HTML 提取宽高
  const widthMatch = context?.match(/<img[^>]+src=["'][^"']*${escapeRegExp(url)}[^"']*["'][^>]*width=["'](\d+)["']/i);
  const heightMatch = context?.match(/<img[^>]+src=["'][^"']*${escapeRegExp(url)}[^"']*["'][^>]*height=["'](\d+)["']/i);

  if (widthMatch && heightMatch) {
    const w = parseInt(widthMatch[1], 10);
    const h = parseInt(heightMatch[1], 10);

    // 大图加分（降低权重，从30→15）
    if (w >= 800 && h >= 400) score += 15;
    else if (w >= 600 && h >= 300) score += 10;
    else if (w >= 400 && h >= 200) score += 5;
    else if (w >= 300 && h >= 150) score += 3;
    // 移除对小图的过度惩罚（不再-20分）

    // 宽高比（新闻图片通常 4:3 或 16:9）
    const ratio = w / h;
    if (ratio >= 0.8 && ratio <= 3.0) score += 3; // 放宽范围，从1.2-2.0→0.8-3.0
  }

  // URL 包含尺寸提示（降低加分，从10→5）
  if (/full|large|xl|xxl|2x|3x|original|hd|highres|maxi|grande/i.test(url)) score += 5;
  // 降低对缩略图的惩罚（从-15→-5）
  if (/thumbnail|thumb|small|tiny|mini|icon|logo|square|avatar|profile/i.test(url)) score -= 5;

  return score;
}

function scorePath(url) {
  let score = 0;

  // 好的路径（降低加分，从10→5）
  const goodPaths = /(img|images|assets|static|public|media|photos|screenshots|pictures|gallery|content|article|post|featured|hero|cover|main|lead|primary|display|thumb|thumbnail)/i;
  if (goodPaths.test(url)) score += 5;

  // 特别好的路径（降低加分，从10→5）
  if (/\/(cover|hero|featured|main|lead|primary|headline|banner-img|article-img|screenshot|demo|screen)(\/|$)/i.test(url)) score += 5;

  // 坏的路径（降低惩罚，从-30→-15）
  const badPaths = /(icon|logo|avatar|badge|shield|button|btn|nav|header|footer|sidebar|widget|share|social|tracking|pixel|analytics|ad|advertisement|sponsor|promo|popup|overlay|separator|divider|spacer|texture|pattern|watermark|brand|identity|template|default|generic|common|shared|global|menu-btn|nav-btn|close-btn|icon-btn|social-icon|share-icon|notification-icon|push-icon|web-push-icon|mstile|apple-touch-icon|android-chrome|safari-pinned|cdnp|cloudfront\.net\/images\/ui|ticker|chart-bar|subscribe|related-post|og-image-default)/i;
  if (badPaths.test(url)) score -= 15;

  // 特别坏的路径（降低惩罚，从-50→-25）
  const veryBadPaths = /(logo|header-bg|footer-bg|nav-bg|hero-bg|banner-bg|site-logo|brand-logo|company-logo|organization-logo|tracking|pixel|beacon|stat|analytics|ad-server|adsense|doubleclick|adnxs|moatads|chartbeat|newrelic|pingdom|taboola|outbrain|zemanta|scoopit|share-bar|social-bar|gravatar|feedburner|rss)/i;
  if (veryBadPaths.test(url)) score -= 25;

  // 新增：识别推荐区域路径并扣分
  const recommendationPaths = /(recommendation|related|trending|popular|sponsored|promo|advertisement|sidebar|widget|footer)/i;
  if (recommendationPaths.test(url)) {
    score -= 20;
    console.log(`[scorePath] Recommendation path detected: ${url.substring(0, 60)}`);
  }

  return score;
}

function scoreAltText(url, context) {
  let score = 0;

  if (!context) return score;

  // 提取 alt 文本
  const altMatch = context.match(new RegExp(`<img[^>]+src=["'][^"']*${escapeRegExp(url)}[^"']*["'][^>]*alt=["']([^"']+)["']`, 'i'));
  if (!altMatch) return 0;

  const alt = altMatch[1].toLowerCase();

  // 好的 alt 文本（降低加分，从15→8）
  const goodAlts = /(screenshot|demo|preview|illustration|chart|graph|diagram|example|result|output|interface|界面|截图|演示|效果图|架构图|流程图|example|diagram|infographic|visual|visualization|mockup|prototype|product|device|scene|scenario|landscape|portrait)/i;
  if (goodAlts.test(alt)) score += 8;

  // 长度评分（降低加分，从5→2）
  if (alt.length >= 10 && alt.length <= 100) score += 2;

  // 坏的 alt 文本（降低惩罚，从-10→-5，从-15→-8）
  if (/^(image|img|pic|photo|picture|图片|照片|图标|logo|icon|photo|screenshot|screenshot of|a|an|the)$/i.test(alt)) score -= 5;
  if (/^(banner|ad|advertisement|sponsor|promo|button|btn|icon|logo|avatar|badge)$/i.test(alt)) score -= 8;

  return score;
}

function scorePosition(url, context) {
  if (!context) return 0;

  let score = 0;

  // 提取图片在文章中的位置
  const imgMatch = context.match(new RegExp(`<img[^>]+src=["'][^"']*${escapeRegExp(url)}[^"']*["']`, 'i'));
  if (!imgMatch) return 0;

  const imgIndex = context.indexOf(imgMatch[0]);

  // 新增：提取图片周围的HTML上下文，识别推荐区域
  const beforeContext = context.substring(Math.max(0, imgIndex - 1000), imgIndex);
  const afterContext = context.substring(imgIndex + imgMatch[0].length, Math.min(context.length, imgIndex + imgMatch[0].length + 1000));
  const surroundingContext = (beforeContext + afterContext).toLowerCase();

  // 识别推荐区域并大幅扣分
  const recommendationPatterns = [
    /related.*post|related.*article|related.*news|related.*story/i,
    /recommended.*for you|you.*might.*also.*like|also.*read|more.*from/i,
    /trending.*now|trending.*topics|popular.*posts|popular.*articles/i,
    /recommended|sponsored|promoted|advertisement|ad.*content/i,
    /相关推荐|相关文章|相关阅读|热门推荐|热门文章|你可能还喜欢|更多精彩|推荐阅读/i
  ];

  for (const pattern of recommendationPatterns) {
    if (pattern.test(surroundingContext)) {
      score -= 50; // 推荐区域大幅扣分
      console.log(`[scorePosition] Recommendation area detected for ${url.substring(0, 60)}: ${pattern.source}`);
      break;
    }
  }

  // 识别侧边栏和底部区域（通常是推荐内容）
  const sidebarPatterns = [
    /<aside[^>]*>.*?${escapeRegExp(imgMatch[0])}|<div[^>]*(class|id)=["'][^"']*(sidebar|footer|widget|recommendation|trending|popular)[^"']*["'][^>]*>.*?${escapeRegExp(imgMatch[0])}/i
  ];
  for (const pattern of sidebarPatterns) {
    if (pattern.test(context)) {
      score -= 30; // 侧边栏扣分
      console.log(`[scorePosition] Sidebar/footer detected for ${url.substring(0, 60)}`);
      break;
    }
  }

  // 提取文章正文区域
  const articlePatterns = [
    /<(article|main)[^>]*>/i,
    /<div[^>]*(class|id)=["'][^"']*(article|content|post|entry|body|text|story)[^"']*["'][^>]*>/i
  ];

  let articleStart = -1;
  let articleEnd = context.length;

  for (const pattern of articlePatterns) {
    const startMatch = context.match(pattern);
    if (startMatch) {
      articleStart = context.indexOf(startMatch[0]) + startMatch[0].length;
      break;
    }
  }

  for (const pattern of articlePatterns) {
    const endMatch = context.match(new RegExp(pattern.source.replace('<', '</'), 'gi'));
    if (endMatch && endMatch.index < articleEnd) {
      articleEnd = endMatch.index;
    }
  }

  // 判断是否在正文区域（增加权重，从20→30）
  if (articleStart !== -1 && imgIndex > articleStart && imgIndex < articleEnd) {
    score += 30;

    // 前 1000 字符内的是首图，增加加分（从5→10）
    if (imgIndex - articleStart < 1000) {
      score += 10;
    }
    // 前 3000 字符内的也是好位置（从2→5）
    else if (imgIndex - articleStart < 3000) {
      score += 5;
    }
  } else {
    score -= 10; // 正文外扣分
  }

  return score;
}

function scoreType(url) {
  let score = 0;

  // 格式评分（优先高质量格式）
  if (/\.webp$/i.test(url)) score += 15;
  if (/\.png$/i.test(url)) score += 10;
  if (/(jpg|jpeg)$/i.test(url)) score += 8;
  if (/\.gif$/i.test(url)) score -= 5; // GIF 通常是动图或小图
  if (/\.svg$/i.test(url)) score -= 10; // SVG 通常是图标
  if (/\.ico$/i.test(url)) score -= 20; // ICO 是图标

  return score;
}

function scoreSemantic(url, context) {
  if (!context) return 0;

  let score = 0;

  // 检查图片周围的文本上下文
  const imgMatch = context.match(new RegExp(`<img[^>]+src=["'][^"']*${escapeRegExp(url)}[^"']*["'][^>]*>`, 'i'));
  if (!imgMatch) return 0;

  const imgIndex = context.indexOf(imgMatch[0]);

  // 提取图片前后 500 字符的上下文
  const beforeText = context.substring(Math.max(0, imgIndex - 500), imgIndex);
  const afterText = context.substring(imgIndex + imgMatch[0].length, Math.min(context.length, imgIndex + imgMatch[0].length + 500));
  const surroundingText = (beforeText + afterText).toLowerCase();

  // 新增：识别推荐关键词并大幅扣分
  const recommendationKeywords = [
    /related.*post|related.*article|related.*news|related.*story/i,
    /recommended.*for you|you.*might.*also.*like|also.*read|more.*from/i,
    /trending.*now|trending.*topics|popular.*posts|popular.*articles/i,
    /sponsored|promoted|promotional|affiliate|referral|tracking|pixel|analytics/i,
    /相关推荐|相关文章|相关阅读|热门推荐|热门文章|你可能还喜欢|更多精彩|推荐阅读|赞助|广告/i
  ];

  for (const pattern of recommendationKeywords) {
    if (pattern.test(surroundingText)) {
      score -= 40; // 推荐关键词大幅扣分
      console.log(`[scoreSemantic] Recommendation keyword detected for ${url.substring(0, 60)}: ${pattern.source}`);
      break;
    }
  }

  // 好的上下文关键词（表示图片是内容的一部分）- 降低加分（从10→5）
  const goodKeywords = /(shown|show|above|below|image|photo|picture|graph|chart|diagram|illustration|screenshot|example|demonstrat|depict|display|feature|illustrate|shown in the figure|as shown in|正文|内容|文章)/i;
  if (goodKeywords.test(surroundingText)) score += 5;

  // 好的中文上下文 - 降低加分（从10→5）
  const goodChineseKeywords = /(如图|图片|照片|截图|演示|示例|上图|下图|所示|显示)/i;
  if (goodChineseKeywords.test(surroundingText)) score += 5;

  // 坏的上下文（表示图片是装饰或广告）- 降低惩罚（从-15→-10）
  const badKeywords = /(advertisement|ad|sponsor|promoted|promotional|affiliate|referral|tracking|pixel|analytics|广告|赞助)/i;
  if (badKeywords.test(surroundingText)) score -= 10;

  // 检查图片标题（figcaption）- 降低加分（从10→5）
  const figcaptionMatch = context.match(new RegExp(`<figcaption[^>]*>.*?(?:${beforeText.slice(-100)})`, 'is'));
  if (figcaptionMatch) score += 5;

  return score;
}

function cleanText(value) {
  return decodeEntities(value)
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function trimSummary(value) {
  if (!value) return '暂无摘要，请前往原文查看完整内容。';
  return value.length > 160 ? `${value.slice(0, 160).trim()}...` : value;
}

function trimIntro(value) {
  if (!value) return '';
  const compact = value.replace(/\s+/g, ' ').trim();
  if (!compact) return '';
  return compact.length > 220 ? `${compact.slice(0, 220).trim()}...` : compact;
}

function normalizeDate(value) {
  const time = new Date(cleanText(value)).getTime();
  return Number.isFinite(time) ? new Date(time).toISOString() : new Date().toISOString();
}

function detectCategory(text, fallback) {
  return CATEGORY_RULES.find(([, pattern]) => pattern.test(text))?.[0] ?? fallback;
}

function detectTags(text, category) {
  const tags = TAG_RULES.filter(([, pattern]) => pattern.test(text)).map(([tag]) => tag);
  const categoryLabel = CATEGORIES.find(item => item.id === category)?.label;
  return [...new Set([...tags, categoryLabel].filter(Boolean))].slice(0, 4);
}

function detectMode(text, sourceName) {
  if (/\b(how to|tutorial|guide|developer|api|release|open source|github|技术|教程|开源|implementation)\b/i.test(text)) return 'technical';
  if (/\b(analysis|review|why|inside|research|study|report|解读|研究|报告|deep dive)\b/i.test(text) || /MIT|ArXiv|Nature/i.test(sourceName)) return 'deep';
  return 'flash';
}

function applyBlockedWords(items, blocked) {
  if (!blocked.length) return items;
  return items.filter(item => {
    const searchable = `${item.title} ${item.summary} ${item.source} ${item.tags.join(' ')}`.toLowerCase();
    return blocked.every(word => !searchable.includes(word));
  });
}

function decodeEntities(value) {
  return String(value)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)));
}

function hash(value) {
  let result = 0;
  for (let i = 0; i < value.length; i += 1) {
    result = (result << 5) - result + value.charCodeAt(i);
    result |= 0;
  }
  return Math.abs(result).toString(36);
}

function sendJson(res, payload, status = 200) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

// ========== Jina AI Reader（绕过反爬虫，获取全文）==========
// 从顶级项目（AI News Radar/Horizon）学来的技术
// Jina AI Reader：免费、无需API Key、绕过所有反爬虫机制
async function jinaFetch(url, timeoutMs = 8000) {
  try {
    const jinaUrl = `https://r.jina.ai/http://${url.replace(/^https?:\/\//, '')}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(jinaUrl, {
      headers: { 'User-Agent': 'GlobalTechRadar/0.1' },
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!response.ok) return null;
    const text = await response.text();
    // Jina returns clean text, extract first 500 chars as summary
    return text.trim().slice(0, 500);
  } catch {
    return null;
  }
}

// ========== 多源交叉验证（从 Horizon 学来）==========
// 同一事件在多个高质量源出现时，标记为高可信度
function crossVerifyItems(items) {
  const urlMap = new Map();
  items.forEach(item => {
    const normalized = normalizeUrl(item.url);
    if (!urlMap.has(normalized)) urlMap.set(normalized, []);
    urlMap.get(normalized).push(item);
  });

  return items.map(item => {
    const normalized = normalizeUrl(item.url);
    const sameUrlItems = urlMap.get(normalized) || [];
    const sourceCount = sameUrlItems.length;
    
    // 计算交叉验证分数
    let crossVerifyScore = 0;
    if (sourceCount >= CROSS_VERIFY_THRESHOLD) crossVerifyScore = 3;
    else if (sourceCount >= 2) crossVerifyScore = 2;
    else if (sourceCount >= 1) crossVerifyScore = 1;

    // 获取源权重
    const sourceWeight = SOURCE_WEIGHTS[item.source] || 0.5;

    return {
      ...item,
      crossVerifyScore,
      sourceWeight,
      // 综合质量分数 = 交叉验证分数 * 源权重 * 10
      qualityScore: Math.round((crossVerifyScore * sourceWeight) * 10) / 10
    };
  });
}

// ========== 增强的获取源函数（支持 Jina AI Reader 回退）==========
async function fetchSource(source) {
  console.log('[fetchSource] Fetching:', source.name, source.url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(source.url, {
      headers: { 'User-Agent': 'GlobalTechRadar/0.1 (+https://localhost)' },
      signal: controller.signal
    });

    if (!response.ok) {
      console.log('[fetchSource] Failed:', source.name, response.status);
      throw new Error(`${source.name} responded ${response.status}`);
    }

    const xml = await response.text();
    const items = parseFeed(xml, source).slice(0, 20);
    console.log('[fetchSource] Success:', source.name, items.length, 'items');
    
    // 尝试用 Jina AI Reader 增强摘要
    if (items.length > 0) {
      const topItems = items.slice(0, 3); // 只处理前3条，避免过多请求
      await Promise.allSettled(topItems.map(async (item) => {
        if (!item.summary || item.summary.length < 100) {
          const enhanced = await jinaFetch(item.url, 5000);
          if (enhanced) {
            item.summary = trimSummary(enhanced);
            item.bodyIntro = trimIntro(enhanced);
          }
        }
      }));
    }
    
    return { source: source.name, items };
  } finally {
    clearTimeout(timeout);
  }
}

function parseBody(req) {
  return new Promise(resolve => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch { resolve({}); }
    });
  });
}
