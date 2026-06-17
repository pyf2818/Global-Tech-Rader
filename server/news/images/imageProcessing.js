import { IMAGE_BLACKLIST_RE, IMAGE_MIN_DIM_HINT, LAZY_LOAD_ATTRS } from '../config/constants.js';
import { escapeRegExp } from '../utils/textProcessing.js';

export function parseSrcset(srcset) {
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

export function optimizeImageUrl(url) {
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

export function isGoodImageUrl(url, htmlSource) {
  if (!url) return false;
  if (IMAGE_BLACKLIST_RE.test(url)) return false;

  // 放宽域名黑名单检查（只排除明显的追踪和分析域名）
  const TRACKING_DOMAINS = /\/\/(gravatar\.|disqus\.|pixel\.|tracking\.|analytics\.|doubleclick\.|adsense\.|adnxs\.|moatads\.|chartbeat\.|newrelic\.|pingdom\.|taboola\.|outbrain\.|zemanta\.)/i;
  if (TRACKING_DOMAINS.test(url)) return false;

  // 排除图标和favicon（增强版）
  const iconPatterns = /\/(favicon|apple-touch-icon|android-chrome|mstile|browserconfig|tile|icon-|logo[-_]?icon|site[-_]?icon|touch[-_]?icon|bookmark[-_]?icon|shortcut[-_]?icon)/i;
  if (iconPatterns.test(url)) return false;

  // 放宽文件类型限制（允许更多格式）
  if (/\.(ico|cur|bmp|svg)$/i.test(url)) {
    // SVG允许特殊情况，其他格式排除
    if (!/svg/i.test(url)) {
      if (!/\/(screenshot|demo|preview|featured|hero|article|post|content)\b/i.test(url)) {
        return false;
      }
    }
  }

  // 放宽尺寸限制（降低要求）
  const dimMatch = htmlSource?.match(IMAGE_MIN_DIM_HINT);
  if (dimMatch) {
    const w = parseInt(dimMatch[1] || '0', 10);
    const h = parseInt(dimMatch[2] || '0', 10);
    // 只排除非常小的图片（从200x150降低到100x100）
    if (w > 0 && w < 100 && h > 0 && h < 100) return false;
  }

  // 增强通用图片文件名排除（排除更多占位图和logo）
  const genericPatterns = /\/(logo|header[-_]?bg|footer[-_]?bg|nav[-_]?bg|hero[-_]?bg|banner[-_]?bg|site[-_]?logo|brand[-_]?logo|company[-_]?logo|organization[-_]?logo|placeholder|no[-_]?image|image[-_]?not[-_]?found|default[-_]?image|generic[-_]?image|common[-_]?image|shared[-_]?image|global[-_]?image|empty|blank|skeleton|loading|spinner|pulse|dots|badge|shield|button[-_]?icon|nav[-_]?icon|menu[-_]?icon|social[-_]?icon|share[-_]?icon|notification[-_]?icon|push[-_]?icon|web[-_]?push[-_]?icon)([-_]|$)/i;
  if (genericPatterns.test(url)) return false;

  // 排除明显的占位符服务
  const placeholderServices = /\/(via\.placeholder\.com|placehold\.co|dummyimage\.com|placehold\.it|fakeimg\.pl|loremflickr\.com|placekitten\.com|baconmockup\.com|placebear\.com)/i;
  if (placeholderServices.test(url)) return false;

  // 排除通用尺寸（只排除明显的图标尺寸）
  if (/\/(16x16|24x24|32x32|40x40|48x48|64x64)\b/i.test(url)) return false;

  // 排除跟踪和分析图片（增强版）
  const trackingPatterns = /\/(tracking|pixel|beacon|stat|analytics|log|impression|click|view|counter|tracker|monitor|telemetry|hit|collect|event|session|user[-_]?id|visitor[-_]?id|page[-_]?view)/i;
  if (trackingPatterns.test(url)) return false;

  return true;
}

export function extractImageUrl(block, rawContent) {
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
    const htmlSource = rawContent || '';

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

export function extractVideoUrl(block) {
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

export function scoreImageUrl(url, context) {
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

export function scoreDimensions(url, context) {
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

export function scorePath(url) {
  let score = 0;

  // 好的路径（降低加分，从10→5）
  const goodPaths = /(img|images|assets|static|public|media|photos|screenshots|pictures|gallery|content|article|post|featured|hero|cover|main|lead|primary|display|thumb|thumbnail)/i;
  if (goodPaths.test(url)) score += 5;

  // 特别好的路径（降低加分，从10→5）
  if (/\/(cover|hero|featured|main|lead|primary|headline|banner-img|article-img|screenshot|demo|screen)(\/|$)/i.test(url)) score += 5;

  // 坏的路径（降低惩罚，从-15→-8）
  const badPaths = /(icon|logo|avatar|badge|shield|button|btn|nav|header|footer|sidebar|widget|share|social|tracking|pixel|analytics|ad|advertisement|sponsor|promo|popup|overlay|separator|divider|spacer|texture|pattern|watermark|brand|identity|template|default|generic|common|shared|global|menu-btn|nav-btn|close-btn|icon-btn|social-icon|share-icon|notification-icon|push-icon|web-push-icon|mstile|apple-touch-icon|android-chrome|safari-pinned|cdnp|cloudfront\.net\/images\/ui|ticker|chart-bar|subscribe|related-post|og-image-default)/i;
  if (badPaths.test(url)) score -= 8;

  // 特别坏的路径（降低惩罚，从-25→-12）
  const veryBadPaths = /(logo|header-bg|footer-bg|nav-bg|hero-bg|banner-bg|site-logo|brand-logo|company-logo|organization-logo|tracking|pixel|beacon|stat|analytics|ad-server|adsense|doubleclick|adnxs|moatads|chartbeat|newrelic|pingdom|taboola|outbrain|zemanta|scoopit|share-bar|social-bar|gravatar|feedburner|rss)/i;
  if (veryBadPaths.test(url)) score -= 12;

  // 新增：识别推荐区域路径并扣分（从-20降低到-10）
  const recommendationPaths = /(recommendation|related|trending|popular|sponsored|promo|advertisement|sidebar|widget|footer)/i;
  if (recommendationPaths.test(url)) {
    score -= 10;
    console.log(`[scorePath] Recommendation path detected: ${url.substring(0, 60)}`);
  }

  return score;
}

export function scoreAltText(url, context) {
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

export function scorePosition(url, context) {
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

export function scoreType(url) {
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

export function scoreSemantic(url, context) {
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
