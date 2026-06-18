import { DEFAULT_SOURCES, SOURCE_WEIGHTS, CROSS_VERIFY_THRESHOLD, MAX_NEWS_ITEMS, MAX_ITEMS_PER_SOURCE, PAGE_SIZE, MEDIA_CONFIG } from '../config/constants.js';
import { sortSourcesByGrade, getSourceGradeInfo } from '../config/sourceGrades.js';
import { applyBlockedWords, normalizeUrl } from '../utils/textProcessing.js';
import { fetchSource } from './externalFetchers.js';
import {
  mediaStats, resetMediaStats, logMediaStats,
  resetGlobalImageUsage, resolveImageWithScrapling
} from '../images/imageResolver.js';
import { isGoodImageUrl, normalizeImageKey } from '../images/imageProcessing.js';

// 缓存（服务内部拥有）
export const newsCache = { data: null, expiresAt: 0, key: '' };

export function mergeDiverseItems(items, sourceResults, maxItems, perSourceLimit) {
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

export function crossVerifyItems(items) {
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

export async function getNews(blocked, customSources, page = 0, pageSize = PAGE_SIZE, search = '', disabledSources = [], interests = []) {
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

    // 去重RSS图片，防止同一图片在多个资讯中重复出现
    const rssImageUsage = new Map();
    fullItems.forEach(item => {
      if (item.imageUrl) {
        try {
          if (!isGoodImageUrl(item.imageUrl, `${item.title || ''} ${item.summary || ''}`)) {
            item.imageUrl = '';
            return;
          }
          const normalized = normalizeImageKey(item.imageUrl);
          const usageCount = rssImageUsage.get(normalized) || 0;

          if (usageCount >= 1) {
            // 如果图片已经被使用过，清除它
            console.log(`[getNews] Removing duplicate RSS image: ${normalized.substring(0, 60)} (usage: ${usageCount})`);
            item.imageUrl = '';
          } else {
            // 记录图片使用
            rssImageUsage.set(normalized, usageCount + 1);
          }
        } catch (e) {
          // URL解析失败，保留原样
        }
      }
    });

    // 统计 RSS 图片（去重后）
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
          if (idx >= 0) {
            if (result.value.imageUrl) fullItems[idx].imageUrl = result.value.imageUrl;
            if (result.value.videoUrl) fullItems[idx].videoUrl = result.value.videoUrl;
          }
        }
      });
    }

    // 更新统计
    const finalImageUsage = new Map();
    fullItems.forEach(item => {
      if (!item.imageUrl) return;
      try {
        const normalized = normalizeImageKey(item.imageUrl);
        if (finalImageUsage.has(normalized)) {
          console.log(`[getNews] Removing duplicate resolved image: ${normalized.substring(0, 60)}`);
          item.imageUrl = '';
          mediaStats.duplicateFilteredCount++;
          return;
        }
        finalImageUsage.set(normalized, item.id);
      } catch {
        item.imageUrl = '';
      }
    });

    mediaStats.itemsWithImage = 0;
    mediaStats.itemsWithVideo = 0;
    fullItems.forEach(item => {
      if (item.imageUrl) mediaStats.itemsWithImage++;
      if (item.videoUrl) mediaStats.itemsWithVideo++;
    });

    mediaStats.lastUpdate = new Date().toISOString();

    // 输出统计日志
    logMediaStats();

    newsCache.data = { items: fullItems, sourceResults, failedSources, blockedCount };
    newsCache.expiresAt = now + 1000 * 60 * 5;
    newsCache.key = cacheKey;
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
    if (tokens.length === 1 && /[a-z]/.test(q) && /[一-鿿]/.test(q)) {
      const parts = q.match(/([a-z]+|[一-鿿]+)/g);
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

  console.log('[getNews] Pagination:', {
    page,
    pageSize,
    start,
    end,
    filteredItemsLength: filteredItems.length,
    pagedItemsLength: pagedItems.length,
    hasMore: end < filteredItems.length
  });

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
