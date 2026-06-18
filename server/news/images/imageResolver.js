import { MEDIA_CONFIG } from '../config/constants.js';
import { isSafeUrl } from '../utils/httpUtils.js';
import { sleep } from '../utils/httpUtils.js';
import {
  collectStructuredImageCandidates,
  normalizeCandidateImageUrl,
  parseSrcset,
  optimizeImageUrl,
  isGoodImageUrl,
  scoreImageUrl,
  normalizeImageKey
} from './imageProcessing.js';

// ========== 多媒体统计 ==========
export const mediaStats = {
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

export function resetMediaStats() {
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

export function logMediaStats() {
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
export const globalImageUsage = new Map(); // 图片URL -> 使用次数

export function getImageUsageCount(imageUrl) {
  try {
    const normalized = normalizeImageKey(imageUrl);
    return globalImageUsage.get(normalized) || 0;
  } catch {
    return 0;
  }
}

export function incrementImageUsage(imageUrl) {
  try {
    const normalized = normalizeImageKey(imageUrl);
    const count = globalImageUsage.get(normalized) || 0;
    globalImageUsage.set(normalized, count + 1);
    return count + 1;
  } catch {
    return 1;
  }
}

export function resetGlobalImageUsage() {
  globalImageUsage.clear();
}

// ========== 图片验证函数 ==========
export async function validateImageUrl(url, timeout = 8000) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal
    });

    if (!response.ok) {
      response = await fetch(url, {
        method: 'GET',
        headers: { Range: 'bytes=0-2048' },
        signal: controller.signal
      });
    }

    clearTimeout(timeoutId);

    if (!response.ok) return false;

    const contentType = response.headers.get('content-type');
    if (!contentType?.startsWith('image/')) {
      console.log(`[validateImageUrl] Invalid content-type: ${contentType}`);
      return false;
    }

    const contentLength = parseInt(response.headers.get('content-length') || '0');
    if (contentLength > 0 && contentLength < 5120) { // 降低到5KB，避免误判有效图片
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
export async function resolveImageWithRetry(articleUrl, maxRetries = 2) {
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

// 图片解析缓存（模块内部）
const imageResolveCache = {};

export async function resolveImageFromArticle(articleUrl) {
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
    const structuredImageCandidates = collectStructuredImageCandidates(html, articleUrl);
    const inlineImageCandidates = [];
    const pushInlineCandidate = (rawUrl, tag = '') => {
      const imageUrl = normalizeCandidateImageUrl(rawUrl, articleUrl);
      if (!imageUrl || !isGoodImageUrl(imageUrl, tag || imageUrl)) return;
      inlineImageCandidates.push({ url: imageUrl, context: tag || imageUrl });
    };
    [...html.matchAll(/<img[^>]*>/gi)].forEach(match => {
      const tag = match[0];
      [...tag.matchAll(/\b(?:src|data-src|data-original|data-lazy-src|data-lazy|data-img|oldsrc)=["']([^"']+)["']/gi)].forEach(attrMatch => {
        const raw = attrMatch[1];
        if (raw.includes(',')) {
          const maxSrc = parseSrcset(raw);
          if (maxSrc) pushInlineCandidate(maxSrc, tag);
        } else {
          pushInlineCandidate(raw, tag);
        }
      });
      const srcset = tag.match(/\b(?:srcset|data-srcset)=["']([^"']+)["']/i)?.[1];
      const maxSrc = srcset ? parseSrcset(srcset) : '';
      if (maxSrc) pushInlineCandidate(maxSrc, tag);
    });

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
        const normalizedUrl = normalizeCandidateImageUrl(url, articleUrl);
        const urlObj = new URL(normalizedUrl, articleUrl);
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
    const scoredStructuredImages = structuredImageCandidates
      .map(candidate => {
        const { score, reasons } = scoreImageUrl(candidate.url, html);
        const sourceBonus = candidate.source === 'og' ? 34
          : candidate.source === 'twitter' ? 32
          : candidate.source === 'json' ? 24
          : candidate.source === 'link' ? 14
          : 0;
        return { url: candidate.url, score: score + sourceBonus, reasons: [...reasons, candidate.source] };
      })
      .filter(img => img.score >= 24);

    const scoredInlineImages = normalizedImages
      .filter(url => isGoodImageUrl(url, html))
      .map(url => {
        const { score, reasons } = scoreImageUrl(url, html);
        return { url, score, reasons };
      })
      .filter(img => img.score >= MEDIA_CONFIG.MIN_IMAGE_SCORE);

    const scoredArticleImages = inlineImageCandidates
      .map(candidate => {
        const { score, reasons } = scoreImageUrl(candidate.url, candidate.context);
        return { url: candidate.url, score: score + 12, reasons: [...reasons, 'article-img'] };
      })
      .filter(img => img.score >= 24);

    const scoredImages = [...scoredStructuredImages, ...scoredArticleImages, ...scoredInlineImages]
      .filter((img, index, list) => {
        const key = normalizeImageKey(img.url);
        return list.findIndex(other => normalizeImageKey(other.url) === key) === index;
      })
      .sort((a, b) => b.score - a.score);

    // 提取视频（增强版）- 在图片之前提取，优先视频
    let videoUrl = '';

    // 1. 提取 YouTube 视频
    const youtubeMatches = [
      ...html.matchAll(/<iframe[^>]+src=["'](?:https?:)?\/\/(?:www\.)?youtube\.com\/embed\/([^"'?&]+)/gi),
      ...html.matchAll(/<iframe[^>]+src=["'](?:https?:)?\/\/(?:www\.)?youtube\.com\/watch\?v=([^"'?&]+)/gi),
      ...html.matchAll(/<iframe[^>]+src=["'](?:https?:)?\/\/youtu\.be\/([^"'?&]+)/gi),
      ...html.matchAll(/(?:https?:)?\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/gi),
      ...html.matchAll(/(?:https?:)?\/\/(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]+)/gi)
    ];

    for (const match of youtubeMatches) {
      const videoId = match[1];
      if (videoId && videoId.length > 5) {
        videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        console.log(`[resolveImage] Found YouTube video: ${videoUrl}`);
        break;
      }
    }

    // 2. 提取 Vimeo 视频
    if (!videoUrl) {
      const vimeoMatches = [
        ...html.matchAll(/<iframe[^>]+src=["'](?:https?:)?\/\/(?:player\.)?vimeo\.com\/video\/(\d+)/gi),
        ...html.matchAll(/(?:https?:)?\/\/(?:www\.)?vimeo\.com\/(\d+)/gi)
      ];

      for (const match of vimeoMatches) {
        const videoId = match[1];
        if (videoId && videoId.length >= 7) {
          videoUrl = `https://vimeo.com/${videoId}`;
          console.log(`[resolveImage] Found Vimeo video: ${videoUrl}`);
          break;
        }
      }
    }

    // 3. 提取 MP4/WebM 视频文件
    if (!videoUrl) {
      const directVideoMatches = [
        ...html.matchAll(/<video[^>]+src=["']([^"']+\.(?:mp4|webm|ogg))["']/gi),
        ...html.matchAll(/<source[^>]+src=["']([^"']+\.(?:mp4|webm|ogg))["'][^>]*type=["']video\//gi)
      ];

      for (const match of directVideoMatches) {
        const url = match[1];
        if (url) {
          videoUrl = url.startsWith('http') ? url : new URL(url, articleUrl).href;
          console.log(`[resolveImage] Found direct video: ${videoUrl.substring(0, 60)}`);
          break;
        }
      }
    }

    // 4. 提取 Bilibili 视频
    if (!videoUrl) {
      const bilibiliMatches = [
        ...html.matchAll(/<iframe[^>]+src=["'](?:https?:)?\/\/(?:www\.)?bilibili\.com\/video\/([a-zA-Z0-9_-]+)/gi),
        ...html.matchAll(/(?:https?:)?\/\/(?:www\.)?bilibili\.com\/video\/([a-zA-Z0-9_-]+)/gi)
      ];

      for (const match of bilibiliMatches) {
        const videoId = match[1];
        if (videoId && videoId.length > 5) {
          videoUrl = `https://www.bilibili.com/video/${videoId}`;
          console.log(`[resolveImage] Found Bilibili video: ${videoUrl}`);
          break;
        }
      }
    }

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
      const isValid = await validateImageUrl(bestUrl, 8000); // 8秒超时（从5秒增加）

      const isHighConfidenceStructured = best.score >= 32
        && best.reasons?.some(reason => ['og', 'twitter', 'json'].includes(reason));

      if (isValid || isHighConfidenceStructured) {
        if (!isValid) {
          console.log(`[resolveImage] Accepting high-confidence structured image despite validation failure: ${bestUrl.substring(0, 80)}`);
        }
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

    // 返回空结果（不使用社交媒体图片作为fallback，避免重复）
    console.log(`[resolveImage] No valid image found for ${articleUrl}`);
    const result = { imageUrl: '', videoUrl };
    imageResolveCache[articleUrl] = result;
    return result;
  } catch (e) {
    console.error(`[resolveImage] Error for ${articleUrl}:`, e.message);
    mediaStats.failedResolves++;
    return { imageUrl: '', videoUrl: '' };
  }
}

export async function resolveImageWithScrapling(articleUrl) {
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
        for (const candidate of scoredImages.slice(0, 5)) {
          const optimizedUrl = optimizeImageUrl(candidate.url);
          if (getImageUsageCount(optimizedUrl) >= MEDIA_CONFIG.MAX_IMAGE_REUSE) {
            mediaStats.duplicateFilteredCount++;
            continue;
          }
          const isValid = await validateImageUrl(optimizedUrl, 5000);
          if (!isValid) {
            mediaStats.validationFailedCount++;
            continue;
          }
          incrementImageUsage(optimizedUrl);
          const result = { imageUrl: optimizedUrl, videoUrl: '' };
          imageResolveCache[articleUrl] = result;
          mediaStats.scraplingImageCount = (mediaStats.scraplingImageCount || 0) + 1;
          mediaStats.totalImageScore += candidate.score;
          return result;
        }
      }
    }

    return resolveImageFromArticle(articleUrl);
  } catch (e) {
    console.error(`[resolveImageWithScrapling] Error:`, e.message);
    return resolveImageFromArticle(articleUrl);
  }
}
