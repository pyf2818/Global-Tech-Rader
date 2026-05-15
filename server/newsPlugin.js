const DEFAULT_SOURCES = [
  // 国际权威媒体（优先级最高）
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', region: 'overseas', defaultCategory: 'silicon-valley' },
  { name: 'MIT Technology Review', url: 'https://www.technologyreview.com/feed/', region: 'overseas', defaultCategory: 'research' },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', region: 'overseas', defaultCategory: 'devices' },
  { name: 'Wired', url: 'https://www.wired.com/feed/rss', region: 'overseas', defaultCategory: 'silicon-valley' },
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', region: 'overseas', defaultCategory: 'silicon-valley' },
  { name: 'IEEE Spectrum', url: 'https://spectrum.ieee.org/rss/fulltext', region: 'overseas', defaultCategory: 'research' },
  
  // AI/大模型官方博客
  { name: 'OpenAI Blog', url: 'https://openai.com/blog/rss.xml', region: 'overseas', defaultCategory: 'ai-models' },
  { name: 'Anthropic News', url: 'https://www.anthropic.com/news/rss', region: 'overseas', defaultCategory: 'ai-models' },
  { name: 'Google DeepMind', url: 'https://deepmind.google/discover/blog/rss/', region: 'overseas', defaultCategory: 'ai-models' },
  { name: 'Meta AI Blog', url: 'https://ai.meta.com/blog/rss/', region: 'overseas', defaultCategory: 'ai-models' },
  { name: 'Google AI Blog', url: 'https://blog.google/technology/ai/rss/', region: 'overseas', defaultCategory: 'ai-models' },
  { name: 'Microsoft AI Blog', url: 'https://blogs.microsoft.com/ai/feed/', region: 'overseas', defaultCategory: 'ai-models' },
  { name: 'Hugging Face Blog', url: 'https://huggingface.co/blog/feed.xml', region: 'global', defaultCategory: 'ai-models' },
  
  // 学术前沿
  { name: 'ArXiv CS AI', url: 'https://export.arxiv.org/rss/cs.AI', region: 'global', defaultCategory: 'research' },
  { name: 'ArXiv CS ML', url: 'https://export.arxiv.org/rss/cs.LG', region: 'global', defaultCategory: 'research' },
  { name: 'ArXiv CS CL', url: 'https://export.arxiv.org/rss/cs.CL', region: 'global', defaultCategory: 'research' },
  { name: 'ArXiv CS CV', url: 'https://export.arxiv.org/rss/cs.CV', region: 'global', defaultCategory: 'research' },
  { name: 'Nature Machine Intelligence', url: 'https://www.nature.com/natmachintell.rss', region: 'global', defaultCategory: 'research' },
  { name: 'MIT News AI', url: 'https://news.mit.edu/rss/topic/artificial-intelligence2', region: 'overseas', defaultCategory: 'research' },
  { name: 'Stanford HAI', url: 'https://hai.stanford.edu/news/rss.xml', region: 'overseas', defaultCategory: 'research' },
  
  // 开源与开发者社区
  { name: 'Hacker News', url: 'https://hnrss.org/frontpage', region: 'global', defaultCategory: 'open-source' },
  { name: 'GitHub Blog', url: 'https://github.blog/feed/', region: 'global', defaultCategory: 'open-source' },
  { name: 'Dev.to', url: 'https://dev.to/feed', region: 'global', defaultCategory: 'open-source' },
  { name: 'Reddit Technology', url: 'https://www.reddit.com/r/technology/.rss', region: 'global', defaultCategory: 'silicon-valley' },
  { name: 'Reddit MachineLearning', url: 'https://www.reddit.com/r/MachineLearning/.rss', region: 'global', defaultCategory: 'ai-models' },
  
  // 国内优质
  { name: '量子位', url: 'https://www.qbitai.com/feed', region: 'domestic', defaultCategory: 'ai-models' },
  { name: '机器之心', url: 'https://www.jiqizhixin.com/rss', region: 'domestic', defaultCategory: 'ai-models' },
  { name: '36氪', url: 'https://36kr.com/feed', region: 'domestic', defaultCategory: 'china-tech' },
  { name: 'InfoQ CN', url: 'https://www.infoq.cn/feed', region: 'domestic', defaultCategory: 'china-tech' },
  { name: 'Solidot', url: 'https://www.solidot.org/index.rss', region: 'domestic', defaultCategory: 'open-source' },
  { name: 'OSChina', url: 'https://www.oschina.net/news/rss', region: 'domestic', defaultCategory: 'open-source' },
  { name: '爱范儿', url: 'https://www.ifanr.com/feed', region: 'domestic', defaultCategory: 'devices' },
  { name: '少数派', url: 'https://sspai.com/feed', region: 'domestic', defaultCategory: 'devices' },
  { name: '虎嗅', url: 'https://www.huxiu.com/rss/0.xml', region: 'domestic', defaultCategory: 'china-tech' },
  { name: '钛媒体', url: 'https://www.tmtpost.com/rss.xml', region: 'domestic', defaultCategory: 'china-tech' },
  { name: 'CnBeta', url: 'https://www.cnbeta.com/backend.php', region: 'domestic', defaultCategory: 'devices' },
  { name: 'IT之家', url: 'https://www.ithome.com/rss/', region: 'domestic', defaultCategory: 'devices' },
  { name: '腾讯云开发者', url: 'https://cloud.tencent.com/developer/rss', region: 'domestic', defaultCategory: 'cloud' },
  { name: '阿里云开发者', url: 'https://developer.aliyun.com/rss', region: 'domestic', defaultCategory: 'cloud' },
  
  // 科技媒体
  { name: 'VentureBeat', url: 'https://venturebeat.com/feed/', region: 'overseas', defaultCategory: 'silicon-valley' },
  { name: 'Engadget', url: 'https://www.engadget.com/rss.xml', region: 'overseas', defaultCategory: 'devices' },
  { name: 'AI News', url: 'https://www.artificialintelligence-news.com/feed/', region: 'overseas', defaultCategory: 'ai-models' },
  
  // 云计算
  { name: 'AWS Blog', url: 'https://aws.amazon.com/blogs/aws/feed/', region: 'overseas', defaultCategory: 'cloud' },
  { name: 'Google Cloud', url: 'https://cloud.google.com/blog/feed', region: 'overseas', defaultCategory: 'cloud' },
  { name: 'Microsoft Azure', url: 'https://azure.microsoft.com/en-us/blog/feed/', region: 'overseas', defaultCategory: 'cloud' },
  
  // 硬件数码
  { name: "Tom's Hardware", url: 'https://www.tomshardware.com/feeds/all', region: 'overseas', defaultCategory: 'devices' },
  { name: 'AnandTech', url: 'https://www.anandtech.com/rss/newsfeed.aspx', region: 'overseas', defaultCategory: 'devices' }
];

const TRENDING_SOURCES = [
  { name: '量子位', url: 'https://www.qbitai.com/feed', region: 'domestic', platform: '量子位' },
  { name: '机器之心', url: 'https://www.jiqizhixin.com/rss', region: 'domestic', platform: '机器之心' },
  { name: '36氪', url: 'https://36kr.com/feed', region: 'domestic', platform: '36氪' },
  { name: '爱范儿', url: 'https://www.ifanr.com/feed', region: 'domestic', platform: '爱范儿' },
  { name: '少数派', url: 'https://sspai.com/feed', region: 'domestic', platform: '少数派' },
  { name: 'InfoQ CN AI', url: 'https://www.infoq.cn/feed', region: 'domestic', platform: 'InfoQ' },
  { name: 'Hacker News Top', url: 'https://hnrss.org/frontpage', region: 'global', platform: 'Hacker News' },
  { name: 'ArXiv AI', url: 'https://export.arxiv.org/rss/cs.AI', region: 'global', platform: 'ArXiv' },
  { name: 'OpenAI Blog', url: 'https://openai.com/blog/rss.xml', region: 'overseas', platform: 'OpenAI' },
  { name: 'DeepMind Blog', url: 'https://deepmind.google/discover/blog/rss/', region: 'overseas', platform: 'DeepMind' },
  { name: 'TechCrunch AI', url: 'https://techcrunch.com/tag/artificial-intelligence/feed/', region: 'overseas', platform: 'TechCrunch' }
];

const CATEGORIES = [
  { id: 'all', label: '全部赛道' },
  { id: 'ai-models', label: 'AI 大模型' },
  { id: 'chips-compute', label: '芯片算力' },
  { id: 'open-source', label: '开源生态' },
  { id: 'silicon-valley', label: '硅谷欧美' },
  { id: 'china-tech', label: '国内大厂' },
  { id: 'devices', label: '硬件数码' },
  { id: 'robotics', label: '机器人' },
  { id: 'cloud', label: '云计算' },
  { id: 'research', label: '科研前沿' },
  { id: 'policy-funding', label: '政策投融' }
];

const MODES = [
  { id: 'all', label: '全部内容' },
  { id: 'flash', label: '实时快讯' },
  { id: 'deep', label: '深度解读' },
  { id: 'technical', label: '技术干货' }
];

const CATEGORY_RULES = [
  ['ai-models', /\b(ai|artificial intelligence|llm|gpt|model|agent|deepmind|openai|anthropic|gemini|claude|大模型|人工智能|智能体|machine learning|neural|transformer)\b/i],
  ['chips-compute', /\b(chip|semiconductor|gpu|nvidia|amd|intel|tsmc|compute|cuda|芯片|半导体|算力|processor|cpu|tpu|silicon)\b/i],
  ['open-source', /\b(open source|github|linux|rust|python|kubernetes|developer|repo|开源|开发者|docker|k8s|javascript|typescript)\b/i],
  ['devices', /\b(iphone|android|device|wearable|hardware|phone|laptop|数码|手机|硬件|macbook|ipad|watch|headphone)\b/i],
  ['robotics', /\b(robot|robotics|humanoid|autonomous|机器人|自动驾驶|drone|automation)\b/i],
  ['cloud', /\b(cloud|aws|azure|google cloud|serverless|database|云计算|云服务|kubernetes|docker|devops)\b/i],
  ['research', /\b(research|paper|study|scientist|arxiv|mit|科研|论文|研究|nature|science|academic)\b/i],
  ['policy-funding', /\b(policy|regulation|funding|ipo|investment|venture|融资|政策|监管|投资|regulation|legislation)\b/i],
  ['china-tech', /\b(alibaba|tencent|baidu|bytedance|huawei|xiaomi|china|阿里|腾讯|百度|字节|华为|小米|国内|jd|京东|美团|didi)\b/i]
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
  ['Startup', /\b(startup|创业|venture|funding)\b/i]
];

let newsCache = { data: null, expiresAt: 0 };
let trendingCache = { data: null, expiresAt: 0 };
let githubCaches = {};
let imageResolveCache = {};

const MAX_NEWS_ITEMS = 360;
const MAX_ITEMS_PER_SOURCE = 16;

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
            sources: DEFAULT_SOURCES.map(({ name, region }) => ({ name, region }))
          });
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

          const payload = await getNews(blocked, customSources);
          return sendJson(res, payload);
        }

        if (requestUrl.pathname === '/api/trending') {
          const payload = await getTrending();
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
            const apiUrl = baseUrl.replace(/\/+$/, '') + '/v1/chat/completions';
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

        if (requestUrl.pathname.startsWith('/api/ai/') || requestUrl.pathname.startsWith('/api/translate') || requestUrl.pathname.startsWith('/api/subscriptions') || requestUrl.pathname.startsWith('/api/bookmarks')) {
          return sendJson(res, { ok: false, message: 'Reserved extension endpoint.' }, 501);
        }

        next();
      });
    }
  };
}

async function getNews(blocked, customSources) {
  const now = Date.now();
  const allSources = [...DEFAULT_SOURCES, ...customSources];

  if (!blocked.length && customSources.length === 0 && newsCache.data && newsCache.expiresAt > now) {
    return newsCache.data;
  }

  const settled = await Promise.allSettled(allSources.map(fetchSource));
  const sourceResults = settled
    .filter(result => result.status === 'fulfilled')
    .map(result => result.value);
  const items = sourceResults.flatMap(result => result.items);
  const failedSources = settled.filter(result => result.status === 'rejected').length;
  const cleaned = applyBlockedWords(items, blocked)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  const filtered = mergeDiverseItems(cleaned, sourceResults, MAX_NEWS_ITEMS, MAX_ITEMS_PER_SOURCE);

  const itemsWithoutImage = filtered.filter(item => !item.imageUrl && item.url);
  if (itemsWithoutImage.length > 0) {
    const imageSettled = await Promise.allSettled(itemsWithoutImage.slice(0, 30).map(async (item) => {
      try {
        const resolved = await resolveImageFromArticle(item.url);
        return { id: item.id, imageUrl: resolved.imageUrl, videoUrl: resolved.videoUrl || item.videoUrl };
      } catch { return null; }
    }));
    imageSettled.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        const idx = filtered.findIndex(i => i.id === result.value.id);
        if (idx >= 0 && result.value.imageUrl) {
          filtered[idx].imageUrl = result.value.imageUrl;
          if (result.value.videoUrl) filtered[idx].videoUrl = result.value.videoUrl;
        }
      }
    });
  }

  const payload = {
    updatedAt: new Date().toISOString(),
    items: filtered,
    sourceCount: allSources.length,
    failedSources,
    blockedCount: items.length - filtered.length
  };

  if (!blocked.length && customSources.length === 0) {
    newsCache = { data: payload, expiresAt: now + 1000 * 60 * 5 };
  }

  return payload;
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
      headers: { 'User-Agent': 'GlobalTechRadar/0.1' },
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) return { imageUrl: '', videoUrl: '' };
    const html = await res.text();
    const ogImage = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    if (ogImage && isGoodImageUrl(ogImage[1], html)) {
      const result = { imageUrl: ogImage[1], videoUrl: '' };
      imageResolveCache[articleUrl] = result;
      return result;
    }
    const twitterImage = html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i);
    if (twitterImage && isGoodImageUrl(twitterImage[1], html)) {
      const result = { imageUrl: twitterImage[1], videoUrl: '' };
      imageResolveCache[articleUrl] = result;
      return result;
    }
    const allImgs = [...html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)].map(m => m[1]);
    for (const src of allImgs) {
      if (!/\.(jpg|jpeg|png|gif|webp)/i.test(src)) continue;
      if (!isGoodImageUrl(src, html)) continue;
      const re = /(badge|shield|icon|logo|tracker|pixel|gravatar|avatar|emoji)/i;
      if (r.test(src)) continue;
      const result = { imageUrl: src, videoUrl: '' };
      imageResolveCache[articleUrl] = result;
      return result;
    }
    return { imageUrl: '', videoUrl: '' };
  } catch {
    return { imageUrl: '', videoUrl: '' };
  }
}

async function getTrending() {
  const now = Date.now();
  if (trendingCache.data && trendingCache.expiresAt > now) {
    return trendingCache.data;
  }

  const settled = await Promise.allSettled(TRENDING_SOURCES.map(fetchTrendingSource));
  const items = settled.flatMap(result => (result.status === 'fulfilled' ? result.value.items : []));
  const filtered = items
    .filter(item => /\b(ai|llm|gpt|model|大模型|人工智能|deep|neural|transformer|agent|chat|machine learning|nlp|diffusion)\b/i.test(`${item.title} ${item.summary}`))
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 60);

  const payload = { updatedAt: new Date().toISOString(), items: filtered };
  trendingCache = { data: payload, expiresAt: now + 1000 * 60 * 10 };
  return payload;
}

async function fetchTrendingSource(source) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(source.url, {
      headers: { 'User-Agent': 'GlobalTechRadar/0.1 (+https://localhost)' },
      signal: controller.signal
    });

    if (!response.ok) throw new Error(`${source.name} responded ${response.status}`);

    const xml = await response.text();
    const items = parseFeed(xml, { ...source, defaultCategory: 'ai-models' }).slice(0, 15);
    return { source: source.name, items: items.map(item => ({ ...item, platform: source.platform })) };
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

async function fetchSource(source) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(source.url, {
      headers: { 'User-Agent': 'GlobalTechRadar/0.1 (+https://localhost)' },
      signal: controller.signal
    });

    if (!response.ok) throw new Error(`${source.name} responded ${response.status}`);

    const xml = await response.text();
    return { source: source.name, items: parseFeed(xml, source).slice(0, 20) };
  } finally {
    clearTimeout(timeout);
  }
}

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

const IMAGE_BLACKLIST_RE = /(\/|^)(ads|advert|banner|sponsor|promo|tracking|pixel|beacon|stat|analytics|share-bar|social-bar|gravatar|feedburner|rss|newsletter-signup|popup|overlay|interstitial|cdnp|cloudfront\.net\/images\/ui|fb-[a-z]|tw-[a-z]|linkedin-[a-z]|pinterest-[a-z]|buffer-[a-z]|addthis|sharethis|disqus|wp-emoticon|mstile|apple-touch-icon|android-chrome|safari-pinned|og-image-default|placeholder|stock|ticker|chart-bar|subscribe|related-post|sidebar|widget|newsletter|popup-icon|notification|push|web-push)\b/i;
const IMAGE_BLACKLIST_DOMAINS = /\/\/(feedburner\.|gravatar\.|disqus\.|addthis\.|sharethis\.|buffer\.|pixel\.|tracking\.|analytics\.|doubleclick\.|adsense\.|adnxs\.|moatads\.|chartbeat\.|newrelic\.|pingdom\.|taboola\.|outbrain\.|zemanta\.|scoopit\.)/i;
const IMAGE_MIN_DIM_HINT = /width=["']([0-9]+)["']|height=["']([0-9]+)["']/i;

function isGoodImageUrl(url, htmlSource) {
  if (!url) return false;
  if (IMAGE_BLACKLIST_RE.test(url)) return false;
  if (IMAGE_BLACKLIST_DOMAINS.test(url)) return false;
  if (/\.(ico|cur|bmp|svg)$/i.test(url) && !/\/(thumbnail|preview|featured|hero|cover|banner-img|article-img)\b/i.test(url)) return false;

  const dimMatch = htmlSource?.match(IMAGE_MIN_DIM_HINT);
  if (dimMatch) {
    const w = parseInt(dimMatch[1] || '0', 10);
    const h = parseInt(dimMatch[2] || '0', 10);
    if ((w > 0 && w < 50) || (h > 0 && h < 50)) return false;
  }

  return true;
}

function extractImageUrl(block, rawContent) {
  // 1. <enclosure> with image type
  const enclosure = block.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]+type=["'][^"']*image[^"']*["']/i)
    || block.match(/<enclosure[^>]+type=["'][^"']*image[^"']*["'][^>]+url=["']([^"']+)["']/i);
  if (enclosure && isGoodImageUrl(enclosure[1], block)) return enclosure[1];

  // 2. <media:thumbnail> or <media:content> with image
  const mediaThumb = block.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i);
  if (mediaThumb && isGoodImageUrl(mediaThumb[1], block)) return mediaThumb[1];
  const mediaContent = block.match(/<media:content[^>]+(?:medium|type)=["']image["'][^>]+url=["']([^"']+)["']/i)
    || block.match(/<media:content[^>]+url=["']([^"']+)["'][^>]+(?:medium|type)=["']image["']/i);
  if (mediaContent && isGoodImageUrl(mediaContent[1], block)) return mediaContent[1];

  // 3. <enclosure> without type (assume image if url looks like one)
  const encNoType = block.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
  if (encNoType && /\.(jpg|jpeg|png|gif|webp)/i.test(encNoType[1]) && isGoodImageUrl(encNoType[1], block)) return encNoType[1];

  // 4. <img> inside content/description HTML — scan all images, pick best one
  const htmlSource = rawContent || pick(block, ['description', 'summary']);
  const allImages = [...htmlSource.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)];
  for (const imgMatch of allImages) {
    const src = imgMatch[1];
    const fullTag = imgMatch[0];
    if (isGoodImageUrl(src, fullTag) && /\.(jpg|jpeg|png|gif|webp)/i.test(src)) return src;
  }

  return '';
}

function extractVideoUrl(block) {
  // <enclosure> with video type
  const videoEnc = block.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]+type=["'][^"']*video[^"']*["']/i)
    || block.match(/<enclosure[^>]+type=["'][^"']*video[^"']*["'][^>]+url=["']([^"']+)["']/i);
  if (videoEnc) return videoEnc[1];

  // <media:content> with video
  const mediaVideo = block.match(/<media:content[^>]+(?:medium|type)=["']video["'][^>]+url=["']([^"']+)["']/i);
  if (mediaVideo) return mediaVideo[1];

  // YouTube embed in content
  const ytEmbed = block.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/i);
  if (ytEmbed) return `https://www.youtube.com/watch?v=${ytEmbed[1]}`;

  return '';
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

function sendJson(res, payload, status = 200) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
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
