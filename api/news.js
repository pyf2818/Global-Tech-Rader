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
  { name: 'Stat News', url: 'https://www.statnews.com/feed/', region: 'overseas', defaultCategory: 'healthcare' }
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
  { id: 'automotive', label: '智能汽车' }
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
  ['automotive', /\b(automotive|tesla|ev|self-driving|autonomous vehicle|smart car|汽车|电动车|自动驾驶|智能汽车|车载系统|车联网)\b/i]
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
  ['Security', /\b(security|漏洞|安全|cyber|hack)\b/i]
];

let cache = { data: null, expiresAt: 0 };

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
    return { source: source.name, items: parseFeed(xml, source).slice(0, 20) };
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

  if (!blocked.length && cache.data && cache.expiresAt > now) {
    const filtered = applyBlockedWords(cache.data.items, blocked);
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      ...cache.data,
      items: filtered,
      blockedCount: cache.data.items.length - filtered.length
    }));
  }

  const settled = await Promise.allSettled(DEFAULT_SOURCES.map(fetchSource));
  const sourceResults = settled
    .filter(result => result.status === 'fulfilled')
    .map(result => result.value);
  const items = sourceResults.flatMap(result => result.items);
  const failedSources = settled.filter(result => result.status === 'rejected').length;

  const cleaned = applyBlockedWords(items, blocked)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  const filtered = cleaned.slice(0, 360);
  const payload = {
    updatedAt: new Date().toISOString(),
    items: filtered,
    sourceCount: DEFAULT_SOURCES.length,
    failedSources,
    blockedCount: items.length - filtered.length
  };

  if (!blocked.length) {
    cache = { data: payload, expiresAt: now + 1000 * 60 * 5 };
  }

  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}