const DEFAULT_SOURCES = [
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', region: 'overseas', defaultCategory: 'silicon-valley' },
  { name: 'MIT Technology Review', url: 'https://www.technologyreview.com/feed/', region: 'overseas', defaultCategory: 'research' },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', region: 'overseas', defaultCategory: 'devices' },
  { name: 'Wired', url: 'https://www.wired.com/feed/rss', region: 'overseas', defaultCategory: 'silicon-valley' },
  { name: 'OpenAI Blog', url: 'https://openai.com/blog/rss.xml', region: 'overseas', defaultCategory: 'ai-models' },
  { name: 'Google DeepMind', url: 'https://deepmind.google/discover/blog/rss/', region: 'overseas', defaultCategory: 'ai-models' },
  { name: 'Google AI Blog', url: 'https://blog.google/technology/ai/rss/', region: 'overseas', defaultCategory: 'ai-models' },
  { name: 'ArXiv CS AI', url: 'https://export.arxiv.org/rss/cs.AI', region: 'global', defaultCategory: 'research' },
  { name: 'MIT News AI', url: 'https://news.mit.edu/rss/topic/artificial-intelligence2', region: 'overseas', defaultCategory: 'research' },
  { name: 'GitHub Blog', url: 'https://github.blog/feed/', region: 'global', defaultCategory: 'open-source' },
  { name: 'Hacker News', url: 'https://hnrss.org/frontpage', region: 'global', defaultCategory: 'open-source' },
  { name: '量子位', url: 'https://www.qbitai.com/feed', region: 'domestic', defaultCategory: 'ai-models' },
  { name: '机器之心', url: 'https://www.jiqizhixin.com/rss', region: 'domestic', defaultCategory: 'ai-models' },
  { name: '36氪', url: 'https://36kr.com/feed', region: 'domestic', defaultCategory: 'china-tech' },
  { name: 'Solidot', url: 'https://www.solidot.org/index.rss', region: 'domestic', defaultCategory: 'open-source' },
  { name: 'OSChina', url: 'https://www.oschina.net/news/rss', region: 'domestic', defaultCategory: 'open-source' },
  { name: '爱范儿', url: 'https://www.ifanr.com/feed', region: 'domestic', defaultCategory: 'devices' },
  { name: '少数派', url: 'https://sspai.com/feed', region: 'domestic', defaultCategory: 'devices' },
  { name: '虎嗅', url: 'https://www.huxiu.com/rss/0.xml', region: 'domestic', defaultCategory: 'china-tech' },
  { name: 'IT之家', url: 'https://www.ithome.com/rss/', region: 'domestic', defaultCategory: 'devices' },
  { name: 'AWS Blog', url: 'https://aws.amazon.com/blogs/aws/feed/', region: 'overseas', defaultCategory: 'cloud' },
  { name: 'Google Cloud', url: 'https://cloud.google.com/blog/feed', region: 'overseas', defaultCategory: 'cloud' },
  { name: 'Reuters Business', url: 'https://www.reuters.com/business/feed/', region: 'overseas', defaultCategory: 'policy-finance' },
  { name: 'Canary Media', url: 'https://www.canarymedia.com/feed', region: 'overseas', defaultCategory: 'new-energy' },
  { name: 'Electrek', url: 'https://electrek.co/feed/', region: 'overseas', defaultCategory: 'new-energy' },
  { name: 'KrebsOnSecurity', url: 'https://krebsonsecurity.com/feed/', region: 'overseas', defaultCategory: 'cybersecurity' },
  { name: 'Stat News', url: 'https://www.statnews.com/feed/', region: 'overseas', defaultCategory: 'healthcare' },

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

  // ========== 游戏娱乐 ==========
  { name: 'PC Gamer', url: 'https://www.pcgamer.com/rss/', region: 'overseas', defaultCategory: 'game-entertain' },
  { name: 'Steam News', url: 'https://store.steampowered.com/feeds/news.xml', region: 'global', defaultCategory: 'game-entertain' },
  { name: 'Ars Technica Gaming', url: 'https://feeds.arstechnica.com/arstechnica/gaming', region: 'overseas', defaultCategory: 'game-entertain' },

  // ========== 影视娱乐圈 ==========
  { name: 'Variety', url: 'https://variety.com/feed/', region: 'overseas', defaultCategory: 'showbiz' },
  { name: 'Hollywood Reporter', url: 'https://www.hollywoodreporter.com/feed/', region: 'overseas', defaultCategory: 'showbiz' },
  { name: 'TMZ', url: 'https://www.tmz.com/rss.xml', region: 'overseas', defaultCategory: 'showbiz' },

  // ========== 动漫二次元 ==========
  { name: 'Crunchyroll News', url: 'https://feeds.feedburner.com/crunchyroll/animenews', region: 'overseas', defaultCategory: 'anime-acg' },
  { name: 'ComicBook.com', url: 'https://comicbook.com/feed/', region: 'overseas', defaultCategory: 'anime-acg' },

  // ========== 芯片半导体 ==========
  { name: 'Semiconductor Engineering', url: 'https://semiengineering.com/feed/', region: 'overseas', defaultCategory: 'chips-compute' },
  { name: 'EE Times', url: 'https://www.eetimes.com/feed/', region: 'overseas', defaultCategory: 'chips-compute' },

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
];

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
  ['Agriculture', /\b(agtech|precision agriculture|农业科技|智慧农业)\b/i],
  ['Economy', /\b(stock|market|ipo|股票|股市|财报|经济|证券|基金)\b/i],
  ['Game', /\b(game|gaming|esports|游戏|电竞|手游|主机)\b/i],
  ['Showbiz', /\b(movie|film|tv|celebrity|电影|电视剧|演员|明星|综艺)\b/i],
  ['Anime', /\b(anime|manga|otaku|二次元|动漫|番剧|漫画|acg)\b/i],
  ['Security', /\b(security|漏洞|安全|cyber|hack)\b/i]
];

let cache = { data: null, expiresAt: 0 };

// ========== 信息源质量权重（从顶级项目学来）==========
const SOURCE_WEIGHTS = {
  'Nature': 1.0, 'Science Magazine': 1.0, 'Nature Machine Intelligence': 1.0,
  'ArXiv CS AI': 0.9, 'ArXiv CS ML': 0.9, 'ArXiv CS CL': 0.9, 'ArXiv CS CV': 0.9,
  'MIT News AI': 0.9, 'Stanford HAI': 0.9, 'MIT Technology Review': 0.85,
  'OpenAI Blog': 0.9, 'Anthropic News': 0.9, 'Google DeepMind': 0.9,
  'Meta AI Blog': 0.9, 'Apple Machine Learning': 0.9, 'Hugging Face Blog': 0.85,
  'Hacker News': 0.8, 'GitHub Blog': 0.8, 'Lobsters': 0.75,
  'TechCrunch': 0.7, 'The Verge': 0.7, 'Wired': 0.7, 'Ars Technica': 0.7,
  '量子位': 0.75, '机器之心': 0.75, '36氪': 0.7, 'InfoQ CN': 0.7,
  'KrebsOnSecurity': 0.85, 'Reuters Business': 0.8, 'Bloomberg Technology': 0.8,
  'Nature Medicine': 0.85, 'Stat News': 0.8, 'Canary Media': 0.75,
  'AWS Blog': 0.7, 'Google Cloud': 0.7, 'Microsoft Azure': 0.7,
  'IEEE Spectrum': 0.85, 'Engadget': 0.8, 'Cointelegraph': 0.75,
  'Popular Mechanics': 0.7, 'Quanta Magazine': 0.85,
  'MarketWatch': 0.8, 'Kiplinger': 0.75, 'Investing.com': 0.75,
  '中国新闻网': 0.75, '人民网财经': 0.75, 'IT之家': 0.7,
};

// 多源交叉验证阈值
const CROSS_VERIFY_THRESHOLD = 3;

// ========== Jina AI Reader（绕过反爬虫）==========
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
    return text.trim().slice(0, 500);
  } catch {
    return null;
  }
}

// 多源交叉验证
function crossVerifyItems(items) {
  const urlMap = new Map();
  items.forEach(item => {
    const normalized = String(item.url || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (!urlMap.has(normalized)) urlMap.set(normalized, []);
    urlMap.get(normalized).push(item);
  });

  return items.map(item => {
    const normalized = String(item.url || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
    const sameUrlItems = urlMap.get(normalized) || [];
    const sourceCount = sameUrlItems.length;
    let crossVerifyScore = sourceCount >= CROSS_VERIFY_THRESHOLD ? 3 : sourceCount >= 2 ? 2 : 1;
    const sourceWeight = SOURCE_WEIGHTS[item.source] || 0.5;
    return {
      ...item,
      crossVerifyScore,
      sourceWeight,
      qualityScore: Math.round((crossVerifyScore * sourceWeight) * 10) / 10
    };
  });
}

async function fetchSource(source) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(source.url, {
      headers: { 'User-Agent': 'GlobalTechRadar/0.1 (+https://vercel)' },
      signal: controller.signal
    });

    if (!response.ok) throw new Error(`${source.name} responded ${response.status}`);

    const xml = await response.text();
    const items = parseFeed(xml, source).slice(0, 20);
    
    // 尝试用 Jina AI Reader 增强摘要
    if (items.length > 0) {
      await Promise.allSettled(items.slice(0, 3).map(async (item) => {
        if (!item.summary || item.summary.length < 100) {
          const enhanced = await jinaFetch(item.url, 5000);
          if (enhanced) {
            item.summary = enhanced.length > 160 ? `${enhanced.slice(0, 160)}...` : enhanced;
          }
        }
      }));
    }
    
    return { source: source.name, items };
  } catch (e) {
    return { source: source.name, items: [], error: e.message };
  } finally {
    clearTimeout(timeout);
  }
}

function parseFeed(xml, source) {
  const itemPattern = /<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  const blocks = [...xml.matchAll(itemPattern)].map(m => m[2]);
  return blocks.map((block, index) => normalizeItem(block, source, index)).filter(item => item.title && item.url);
}

function normalizeItem(block, source, index) {
  const title = cleanText(pick(block, ['title']));
  const rawSummary = cleanText(pick(block, ['description', 'summary']));
  const bodyIntro = trimIntro(cleanText(pick(block, ['content:encoded', 'content'])));
  const summary = trimSummary(rawSummary || bodyIntro);
  const url = cleanText(pick(block, ['link'])) || pickAtomLink(block);
  const publishedAt = normalizeDate(pick(block, ['pubDate', 'published', 'updated', 'dc:date']));
  const text = `${title} ${summary} ${bodyIntro} ${source.name}`;
  const category = detectCategory(text, source.defaultCategory);
  const tags = detectTags(text, category);

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
    tags
  };
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
  const href = block.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/i)?.[1];
  return href ? decodeEntities(href) : '';
}

function cleanText(value) {
  return decodeEntities(value || '')
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hash(value) {
  let result = 0;
  for (let i = 0; i < value.length; i += 1) {
    result = (result << 5) - result + value.charCodeAt(i);
    result |= 0;
  }
  return Math.abs(result).toString(36);
}

function applyBlockedWords(items, blocked) {
  if (!blocked.length) return items;
  return items.filter(item => {
    const searchable = `${item.title} ${item.summary} ${item.source} ${item.tags.join(' ')}`.toLowerCase();
    return blocked.every(word => !searchable.includes(word));
  });
}

export default async function handler(req, res) {
  const now = Date.now();
  const blocked = (req.query.blocked || '')
    .split(',')
    .map(word => word.trim().toLowerCase())
    .filter(Boolean);

  const disabledSources = (req.query.disabledSources || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const filteredSources = DEFAULT_SOURCES.filter(s => !disabledSources.includes(s.name));

  if (!blocked.length && !disabledSources.length && cache.data && cache.expiresAt > now) {
    const filtered = applyBlockedWords(cache.data.items, blocked);
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      ...cache.data,
      items: filtered,
      blockedCount: cache.data.items.length - filtered.length
    }));
  }

  const settled = await Promise.allSettled(filteredSources.map(fetchSource));
  const sourceResults = settled
    .filter(result => result.status === 'fulfilled')
    .map(result => result.value);
  const items = sourceResults.flatMap(result => result.items);
  const failedSources = settled.filter(result => result.status === 'rejected').length;

  const cleaned = applyBlockedWords(items, blocked)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  // 多源交叉验证 + 质量评分
  const verified = crossVerifyItems(cleaned);
  verified.sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0));

  const filtered = verified.slice(0, 360);
  const payload = {
    updatedAt: new Date().toISOString(),
    items: filtered,
    sourceCount: filteredSources.length,
    failedSources,
    blockedCount: items.length - filtered.length
  };

  if (!blocked.length && !disabledSources.length) {
    cache = { data: payload, expiresAt: now + 1000 * 60 * 5 };
  }

  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}