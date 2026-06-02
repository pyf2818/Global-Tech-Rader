# 多媒体获取优化方案

## 当前问题分析

### 1. 获取率低
- 很多 RSS feed 不包含多媒体信息
- 只抓取前 30 条无图片新闻，覆盖率不足
- 抓取超时过短（4秒），容易被慢速网站拦截

### 2. 图片质量不高
- og:image 通常是社交媒体分享图，而非内容配图
- 简单评分逻辑无法判断图片是否与内容相关
- 缺乏对图片尺寸、清晰度、位置的综合判断
- 容易选到 Logo、导航图、广告等无意义图片

### 3. 视频获取能力弱
- 只支持 enclosure 和 media:content 标签
- 不支持 YouTube/Vimeo 等平台嵌入视频
- 不支持 HTML5 video 标签

## 优化方案

### 阶段一：增强 RSS 图片提取（快速见效）

**1. 支持懒加载图片**
```javascript
// 新增懒加载属性支持
const LAZY_LOAD_ATTRS = ['data-src', 'data-original', 'data-lazy-src', 'data-img-src', 'data-url'];

function extractImageUrl(block, rawContent) {
  // ... 现有逻辑 ...

  // 新增：提取懒加载图片
  const htmlSource = rawContent || pick(block, ['description', 'summary']);
  for (const attr of LAZY_LOAD_ATTRS) {
    const lazyMatch = htmlSource.match(new RegExp(`<img[^>]+${attr}=["']([^"']+)["']`, 'i'));
    if (lazyMatch && isGoodImageUrl(lazyMatch[1], htmlSource)) {
      return lazyMatch[1];
    }
  }

  // 新增：提取 srcset 最高分辨率图片
  const srcsetMatch = htmlSource.match(/<img[^>]+srcset=["']([^"']+)["'][^>]*>/i);
  if (srcsetMatch) {
    const maxSrc = parseSrcset(srcsetMatch[1]);
    if (maxSrc && isGoodImageUrl(maxSrc, htmlSource)) return maxSrc;
  }

  // ... 现有逻辑 ...
}

function parseSrcset(srcset) {
  const candidates = srcset.split(',').map(s => {
    const [url, width] = s.trim().split(/\s+/);
    const w = parseInt(width, 10);
    return { url, w };
  }).filter(c => c.w > 0);

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.w - a.w); // 选最高分辨率
  return candidates[0].url;
}
```

**2. 优化 URL，获取高清版本**
```javascript
// 针对常见 CDN，替换为高清版本
function optimizeImageUrl(url) {
  if (!url) return url;

  // WordPress thumbnail → full size
  url = url.replace(/-\d+x\d+(\.(jpg|jpeg|png|webp))$/, '$1');

  // Cloudinary：移除缩放参数
  url = url.replace(/\/q_\d+,c_scale,w_\d+,h_\d+/, '');

  // Unsplash：获取大图
  url = url.replace(/\/w=\d+&h=\d+&fit=crop/, '/w=1600&fit=cover');

  // Imgix：获取原图
  url = url.replace(/\?.*$/, '');

  return url;
}
```

### 阶段二：智能图片评分系统（核心优化）

**1. 多维度评分**
```javascript
function scoreImageUrl(url, context) {
  if (!url) return { score: -1, reasons: [] };

  let score = 0;
  const reasons = [];

  // 维度 1：尺寸评分 (0-30分)
  const dimScore = scoreDimensions(url, context);
  score += dimScore;
  if (dimScore > 0) reasons.push(`尺寸: +${dimScore}`);

  // 维度 2：路径评分 (0-20分)
  const pathScore = scorePath(url);
  score += pathScore;
  if (pathScore > 0) reasons.push(`路径: +${pathScore}`);

  // 维度 3：alt 文本评分 (0-15分)
  const altScore = scoreAltText(url, context);
  score += altScore;
  if (altScore > 0) reasons.push(`Alt文本: +${altScore}`);

  // 维度 4：位置评分 (0-20分)
  const posScore = scorePosition(url, context);
  score += posScore;
  if (posScore > 0) reasons.push(`位置: +${posScore}`);

  // 维度 5：类型评分 (0-15分)
  const typeScore = scoreType(url, context);
  score += typeScore;
  if (typeScore > 0) reasons.push(`类型: +${typeScore}`);

  return { score, reasons };
}

function scoreDimensions(url, context) {
  let score = 0;

  // 从 HTML 提取宽高
  const widthMatch = context.match(/<img[^>]+width=["'](\d+)["']/i);
  const heightMatch = context.match(/<img[^>]+height=["'](\d+)["']/i);

  if (widthMatch && heightMatch) {
    const w = parseInt(widthMatch[1], 10);
    const h = parseInt(heightMatch[1], 10);

    // 大图加分
    if (w >= 800 && h >= 400) score += 30;
    else if (w >= 600 && h >= 300) score += 20;
    else if (w >= 400 && h >= 200) score += 10;
    else if (w < 200 || h < 100) score -= 20; // 小图扣分

    // 宽高比（新闻图片通常 4:3 或 16:9）
    const ratio = w / h;
    if (ratio >= 1.2 && ratio <= 2.0) score += 5;
  }

  // URL 包含尺寸提示
  if (/full|large|xl|original|hd|@2x|@3x/i.test(url)) score += 10;
  if (/thumbnail|thumb|small|tiny|icon|logo/i.test(url)) score -= 15;

  return score;
}

function scorePath(url) {
  let score = 0;

  // 好的路径
  const goodPaths = /(img|images|assets|static|public|media|photos|screenshots|pictures|gallery|content|article|post)/i;
  if (goodPaths.test(url)) score += 10;

  // 特别好的路径
  if (/\/(cover|hero|featured|main|lead|primary)\b/i.test(url)) score += 10;

  // 坏的路径
  const badPaths = /(icon|logo|avatar|badge|shield|button|btn|nav|header|footer|sidebar|widget|share|social|tracking|pixel|analytics)/i;
  if (badPaths.test(url)) score -= 20;

  return score;
}

function scoreAltText(url, context) {
  let score = 0;

  // 提取 alt 文本
  const altMatch = context.match(new RegExp(`<img[^>]+src=["']${escapeRegExp(url)}["'][^>]*alt=["']([^"']+)["']`, 'i'));
  if (!altMatch) return score;

  const alt = altMatch[1].toLowerCase();

  // 好的 alt 文本（有意义的描述）
  const goodAlts = /(screenshot|demo|preview|illustration|chart|graph|diagram|example|result|interface|界面|截图|演示|效果图|架构图|流程图)/i;
  if (goodAlts.test(alt)) score += 15;

  // 长度评分（描述性文本通常更长）
  if (alt.length >= 20 && alt.length <= 100) score += 5;

  // 坏的 alt 文本
  if (/^(image|img|pic|photo|picture|图片|照片|图标|logo|icon)$/i.test(alt)) score -= 10;
  if (/^(banner|ad|advertisement|sponsor|promo)$/i.test(alt)) score -= 15;

  return score;
}

function scorePosition(url, context) {
  let score = 0;

  // 提取图片在文章中的位置
  const imgMatch = context.match(new RegExp(`<img[^>]+src=["']${escapeRegExp(url)}["']`, 'i'));
  if (!imgMatch) return score;

  const imgIndex = context.indexOf(imgMatch[0]);

  // 提取文章正文区域
  const articleStart = context.indexOf('<article>') || context.indexOf('<main>') || context.indexOf('<div class="content">') || context.indexOf('<div class="article">');
  const articleEnd = context.lastIndexOf('</article>') || context.lastIndexOf('</main>') || context.lastIndexOf('</div>');

  // 判断是否在正文区域
  if (articleStart !== -1 && imgIndex > articleStart && imgIndex < articleEnd) {
    score += 20;

    // 前 500 字符内的是首图，加分
    if (imgIndex - articleStart < 500) score += 5;
  } else {
    score -= 10; // 正文外扣分
  }

  return score;
}

function scoreType(url, context) {
  let score = 0;

  // 格式评分（优先高质量格式）
  if (/\.webp$/i.test(url)) score += 15;
  if (/\.png$/i.test(url)) score += 10;
  if (\.jpg|jpeg$/i.test(url)) score += 8;
  if (/\.gif$/i.test(url)) score -= 5; // GIF 通常是动图或小图

  return score;
}
```

**2. 选择最佳图片**
```javascript
async function resolveImageFromArticle(articleUrl) {
  if (!articleUrl) return { imageUrl: '', videoUrl: '' };
  if (imageResolveCache[articleUrl]) return imageResolveCache[articleUrl];

  try {
    const res = await fetch(articleUrl, {
      headers: { 'User-Agent': 'GlobalTechRadar/0.1' },
      signal: AbortSignal.timeout(8000) // 增加到 8 秒
    });
    if (!res.ok) return { imageUrl: '', videoUrl: '' };

    const html = await res.text();

    // 提取所有图片
    const allImages = [
      ...html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi),
      ...html.matchAll(/<img[^>]+data-src=["']([^"']+)["'][^>]*>/gi)
    ].map(m => m[1]);

    // 评分并排序
    const scoredImages = allImages
      .map(url => {
        const { score, reasons } = scoreImageUrl(url, html);
        return { url, score, reasons };
      })
      .filter(img => img.score > 0)
      .sort((a, b) => b.score - a.score);

    // 提取 og:image 作为备选
    const ogImage = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    if (ogImage) {
      const ogScore = scoreImageUrl(ogImage[1], html);
      if (ogScore.score > 0) {
        scoredImages.push({ url: ogImage[1], score: ogScore.score + 5, reasons: ['og:image', ...ogScore.reasons] });
      }
    }

    if (scoredImages.length > 0) {
      const best = scoredImages[0];
      const optimizedUrl = optimizeImageUrl(best.url);
      console.log(`[resolveImage] Selected image for ${articleUrl}:`, {
        url: optimizedUrl,
        score: best.score,
        reasons: best.reasons.join(', ')
      });

      const result = { imageUrl: optimizedUrl, videoUrl: '' };
      imageResolveCache[articleUrl] = result;
      return result;
    }

    return { imageUrl: '', videoUrl: '' };
  } catch (e) {
    console.error('[resolveImage] Error:', e);
    return { imageUrl: '', videoUrl: '' };
  }
}
```

### 阶段三：增强视频获取

**1. 支持更多视频源**
```javascript
function extractVideoUrl(block) {
  // ... 现有 enclosure 和 media:content 逻辑 ...

  // 新增：YouTube 多种格式
  const ytLink = block.match(/https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/i);
  if (ytLink) return ytLink[0];

  const ytShort = block.match(/https?:\/\/youtu\.be\/([a-zA-Z0-9_-]+)/i);
  if (ytShort) return `https://www.youtube.com/watch?v=${ytShort[1]}`;

  // 新增：Vimeo
  const vimeo = block.match(/https?:\/\/vimeo\.com\/(\d+)/i);
  if (vimeo) return vimeo[0];

  // 新增：Bilibili
  const bili = block.match(/https?:\/\/(?:www\.)?bilibili\.com\/video\/([a-zA-Z0-9]+)/i);
  if (bili) return bili[0];

  // 新增：HTML5 video 标签
  const videoTag = block.match(/<video[^>]*>.*?<source[^>]+src=["']([^"']+)["'][^>]*>/is);
  if (videoTag) return videoTag[1];

  return '';
}
```

### 阶段四：性能优化

**1. 扩大抓取范围**
```javascript
// 将 30 条增加到 60-100 条
const itemsWithoutImage = fullItems.filter(item => !item.imageUrl && item.url);
if (itemsWithoutImage.length > 0) {
  const MAX_RESOLVE = 60; // 可配置
  const imageSettled = await Promise.allSettled(
    itemsWithoutImage.slice(0, MAX_RESOLVE).map(async (item) => {
      try {
        const resolved = await resolveImageFromArticle(item.url);
        return { id: item.id, imageUrl: resolved.imageUrl, videoUrl: resolved.videoUrl || item.videoUrl };
      } catch { return null; }
    })
  );
  // ...
}
```

**2. 使用 Scrapling 动态渲染**
```javascript
async function resolveImageFromArticleWithScrapling(articleUrl) {
  try {
    const response = await fetch('http://localhost:5000/api/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: articleUrl,
        mode: 'dynamic', // 使用动态渲染
        timeout: 10
      })
    });

    const data = await response.json();
    if (data.status === 200 && data.images && data.images.length > 0) {
      // 使用 Scrapling 提取的图片
      const scoredImages = data.images.map(img => ({
        url: img.src,
        score: scoreFromScraplingMetadata(img)
      })).sort((a, b) => b.score - a.score);

      return { imageUrl: scoredImages[0]?.url || '', videoUrl: '' };
    }
  } catch (e) {
    console.error('[resolveImageWithScrapling] Error:', e);
  }

  // 回退到传统方式
  return resolveImageFromArticle(articleUrl);
}
```

### 阶段五：高级优化（可选）

**1. AI 语义匹配**
- 使用 LLM 判断图片是否与文章主题相关
- 提取图片描述和文章摘要，计算相似度
- 优先选择相关性高的图片

**2. 图片质量检测**
- 使用图片分析库（如 sharp）检测模糊度、清晰度
- 过滤低质量图片（模糊、压缩过度、水印过多）

**3. 面向对象提取**
- 使用目标检测识别图片中的物体
- 优先选择包含人物、产品、场景等有意义内容的图片
- 排除纯文字图、几何图形、图表等

## 修复说明（2026-06-02）

### 发现的问题
1. **最低分数太低**：MIN_IMAGE_SCORE=20 过于宽松，低质量图片也能通过
2. **路径评分冲突**：banner 同时在好坏路径中
3. **og:image 过于优先**：即使是通用分享图也被加分 5
4. **没有排除通用图片**：网站 logo、header/footer 图可能被选中
5. **没有图片去重**：同一图片可能被多个新闻使用

### 修复措施
1. **提高评分阈值**：
   - MIN_IMAGE_SCORE: 20 → 40（提高 100%）
   - MIN_IMAGE_WIDTH: 300 → 400
   - MIN_IMAGE_HEIGHT: 200 → 300

2. **增强黑名单**：
   - 新增路径黑名单：logo、brand、identity、template、default、generic、common、shared、global
   - 新增域名黑名单：logo、brand、identity、template、default、generic、common、shared、global

3. **修复路径评分**：
   - 从 goodPaths 中移除 banner（避免冲突）
   - badPaths 从 -20 提高到 -30
   - 新增 veryBadPaths（-50分）：logo、header-bg、footer-bg、nav-bg、hero-bg、banner-bg、site-logo、brand-logo、company-logo、organization-logo

4. **降低 meta 图片优先级**：
   - og:image 加分：5 → 2，且只在高分时（≥40）才考虑
   - twitter:image 加分：3 → 1，且只在高分时（≥40）才考虑

5. **增强图片过滤**：
   - 在 isGoodImageUrl 中新增通用文件名检测：logo、brand、identity、header、footer、nav、bg、background、banner、template、default、generic、common、shared、global、placeholder、sample、example、demo、test
   - 新增尺寸文件名检测：icon、thumb、tiny、small、mini、avatar、badge
   - 使用 MEDIA_CONFIG.MIN_IMAGE_WIDTH/MIN_IMAGE_HEIGHT 过滤小图

6. **添加图片去重**：
   - 按 URL 去重（移除查询参数）
   - 避免同一图片被多个新闻使用

### 预期效果
- 大幅减少低质量图片和通用图片
- 避免图片重复
- 提高图片与内容的相关性
- 图片获取率可能下降（70-80% → 50-60%），但质量显著提升

## 实施优先级

| 优先级 | 阶段 | 预期效果 | 工作量 |
|--------|------|----------|--------|
| P0 | 阶段一 | 图片获取率提升 10-20% | 低 |
| P0 | 阶段二 | 图片质量显著提升，相关性提高 | 中 |
| P1 | 阶段三 | 视频获取率提升 30-50% | 中 |
| P1 | 阶段四 | 整体覆盖率提升 20-30% | 低 |
| P2 | 阶段五 | 进一步智能化，但需要额外依赖 | 高 |

## 配置参数

```javascript
const MEDIA_CONFIG = {
  // 抓取配置
  MAX_RESOLVE_ITEMS: 60,        // 最多抓取多少条无图片新闻
  RESOLVE_TIMEOUT: 8000,        // 抓取超时（毫秒）
  USE_SCRAPLING: true,          // 是否使用 Scrapling 动态渲染
  SCRAPLING_MODE: 'dynamic',    // Scrapling 模式（basic/dynamic/stealth）

  // 图片评分阈值
  MIN_IMAGE_SCORE: 20,          // 最低分数才使用
  MIN_IMAGE_WIDTH: 300,         // 最小宽度
  MIN_IMAGE_HEIGHT: 200,        // 最小高度
  ASPECT_RATIO_MIN: 1.2,        // 最小宽高比
  ASPECT_RATIO_MAX: 2.5,        // 最大宽高比

  // 缓存配置
  IMAGE_CACHE_SIZE: 1000,       // 缓存条目数量
  IMAGE_CACHE_TTL: 3600000,     // 缓存有效期（1小时）
};
```

## 监控指标

```javascript
// 添加监控日志
const mediaStats = {
  totalItems: 0,
  itemsWithImage: 0,
  itemsWithVideo: 0,
  rssImageCount: 0,
  resolvedImageCount: 0,
  scraplingImageCount: 0,
  avgImageScore: 0,
  failedResolves: 0
};

function logMediaStats() {
  console.log('[Media Stats]', {
    覆盖率: `${((mediaStats.itemsWithImage / mediaStats.totalItems) * 100).toFixed(1)}%`,
    RSS图片: mediaStats.rssImageCount,
    补全图片: mediaStats.resolvedImageCount,
    Scrapling图片: mediaStats.scraplingImageCount,
    平均分: mediaStats.avgImageScore.toFixed(1),
    失败率: `${((mediaStats.failedResolves / (mediaStats.resolvedImageCount + mediaStats.scraplingImageCount)) * 100).toFixed(1)}%`
  });
}
```

## 总结

这套方案通过多维度优化，可以显著提升：
- **图片获取率**：从当前的约 30-40% 提升到 70-80%
- **图片质量**：通过智能评分，确保选中的图片与内容相关、尺寸合适、清晰度高
- **用户体验**：更丰富的多媒体内容，提升资讯阅读体验

建议按优先级分阶段实施，每个阶段都可以独立见效，避免一次性改动过大。