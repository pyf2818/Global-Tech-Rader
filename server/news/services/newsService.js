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
// SWR 模式：staleWhileRevalidate=true 时返回过期数据但后台静默刷新
// staleAt = expiresAt + 5min（stale 窗口），用户过期后仍能秒返旧数据，后台静默刷新
export const newsCache = { data: null, expiresAt: 0, staleAt: 0, key: '', lastWarmAt: 0 };
let fetchingPromise = null; // 防止并发抓取循环
let backgroundRefreshTimer = null; // 后台刷新定时器

// 涉华关键词（中英混合匹配）—— 与前端保持一致，服务端预计算避免前端同步扫描
const CHINA_FOCUSED_KEYWORDS = ['China', '中国', '中企', '中国企业', '人民币', '华为', '腾讯', '阿里巴巴', '字节跳动', '对华', '涉华', '中美', '中欧', '一带一路', 'RCEP', '东盟'];
function computeIsChinaFocused(item) {
  const textToMatch = `${item.title || ''} ${item.summary || ''} ${Array.isArray(item.tags) ? item.tags.join(' ') : ''}`.toLowerCase();
  return CHINA_FOCUSED_KEYWORDS.some(kw => {
    if (/^[a-zA-Z\s]+$/.test(kw)) {
      return textToMatch.includes(kw.toLowerCase()) || textToMatch.includes(kw);
    }
    return textToMatch.includes(kw.toLowerCase());
  });
}

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

export async function getNews(blocked, customSources, page = 0, pageSize = PAGE_SIZE, search = '', disabledSources = [], interests = [], options = {}) {
  const now = Date.now();
  console.log('[getNews] Called with:', { blockedCount: blocked.length, customSourcesCount: customSources.length, disabledSourcesCount: disabledSources.length, page, pageSize, interestsCount: interests.length });

  // 按等级排序源（S级优先获取）
  const filteredDefaultSources = sortSourcesByGrade(DEFAULT_SOURCES.filter(s => !disabledSources.includes(s.name)));
  console.log('[getNews] Filtered sources:', { total: DEFAULT_SOURCES.length, filtered: filteredDefaultSources.length, disabled: disabledSources.length });
  const allSources = [...filteredDefaultSources, ...customSources];
  const cacheKey = JSON.stringify({ blocked, customSources: customSources.map(s => s.url), disabledSources, interests });

  // SWR 模式：
  //   - 新鲜（expiresAt 未到）：直接返回缓存
  //   - 过期但在 stale 窗口内（staleAt 未到）：立即返回旧数据 + 后台静默刷新
  //   - 超过 stale 窗口：等抓取完成（避免首屏白屏，但旧数据已太旧不可信）
  //   - forceRefresh=true：跳过 cacheValid 直接抓取（用户点"刷新"按钮）
  const cacheHit = newsCache.data && newsCache.key === cacheKey;
  const isFresh = cacheHit && newsCache.expiresAt > now;
  const isStale = cacheHit && newsCache.expiresAt <= now && newsCache.staleAt > now;
  const cacheValid = isFresh && !options?.forceRefresh;
  let fullItems;
  let sourceResults;
  let failedSources;
  let blockedCount;

  if (cacheValid) {
    fullItems = newsCache.data.items;
    sourceResults = newsCache.data.sourceResults;
    failedSources = newsCache.data.failedSources;
    blockedCount = newsCache.data.blockedCount;
  } else if (isStale && !options?.forceRefresh) {
    // SWR：返回旧数据 + 后台静默刷新（不阻塞当前请求）
    fullItems = newsCache.data.items;
    sourceResults = newsCache.data.sourceResults;
    failedSources = newsCache.data.failedSources;
    blockedCount = newsCache.data.blockedCount;
    // 后台静默刷新：递归调用 forceRefresh=true，但不 await
    if (!fetchingPromise) {
      console.log('[getNews] SWR: returning stale data, refreshing in background...');
      // setImmediate 让当前响应先返回，再触发抓取
      setImmediate(() => {
        getNews(blocked, customSources, 1, 40, '', disabledSources, interests, { forceRefresh: true })
          .catch(err => console.error('[getNews] Background refresh failed:', err.message));
      });
    }
  } else {
    // 如果已有抓取在进行中，等待其完成
    if (fetchingPromise) {
      console.log('[getNews] Waiting for ongoing fetch...');
      await fetchingPromise;
      // 从缓存读取结果
      fullItems = newsCache.data.items;
      sourceResults = newsCache.data.sourceResults;
      failedSources = newsCache.data.failedSources;
      blockedCount = newsCache.data.blockedCount;
    } else {
    console.log('[getNews] Cache invalid, fetching from sources...', { total: allSources.length });
    // 全部源并行抓取：每个 fetchSource 内部已有 10s 超时控制
    // 之前是分批串行（18 个/批 × 12 批 × 10s = 2 分钟），改为并行后总耗时 ≈ 单源最慢超时（10s）
    const doFetch = async () => {
      console.log(`[getNews] Fetching all ${allSources.length} sources in parallel...`);
      const settled = await Promise.allSettled(allSources.map(source => fetchSource(source)));
      console.log('[getNews] Fetch done', {
        total: settled.length,
        fulfilled: settled.filter(r => r.status === 'fulfilled').length,
        rejected: settled.filter(r => r.status === 'rejected').length,
      });
      return settled;
    };
    fetchingPromise = doFetch().then(r => { fetchingPromise = null; return r; }).catch(e => { fetchingPromise = null; throw e; });
    const settled = await fetchingPromise;
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

    // 为每个item添加源等级信息 + 预计算涉华标记
    fullItems.forEach(item => {
      const gradeInfo = getSourceGradeInfo(item.source);
      item.sourceGrade = gradeInfo.weight;
      item.sourceGradeLabel = gradeInfo.label;
      item.sourceGradeColor = gradeInfo.color;
      item.sourceGradeIcon = gradeInfo.icon;
      item.isChinaFocused = computeIsChinaFocused(item);
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
      console.log(`[getNews] Scheduling background image resolution for ${itemsWithoutImage.length} items (max: ${MEDIA_CONFIG.MAX_RESOLVE_ITEMS}, async — response will not wait)`);

      // 异步解析图片：fire-and-forget，不阻塞当前响应
      // 解析结果写入同一份 fullItems 引用，下次命中缓存时即可看到图片
      Promise.allSettled(itemsWithoutImage.slice(0, MEDIA_CONFIG.MAX_RESOLVE_ITEMS).map(async (item) => {
        try {
          const resolved = await resolveImageWithScrapling(item.url);
          return { id: item.id, imageUrl: resolved.imageUrl, videoUrl: resolved.videoUrl || item.videoUrl, images: resolved.images || [] };
        } catch { return null; }
      })).then(imageSettled => {
        imageSettled.forEach(result => {
          if (result.status === 'fulfilled' && result.value) {
            const idx = fullItems.findIndex(i => i.id === result.value.id);
            if (idx >= 0) {
              if (result.value.imageUrl) fullItems[idx].imageUrl = result.value.imageUrl;
              if (result.value.videoUrl) fullItems[idx].videoUrl = result.value.videoUrl;
              if (result.value.images?.length) fullItems[idx].images = result.value.images;
            }
          }
        });
        // 更新统计（后台完成时）
        mediaStats.lastUpdate = new Date().toISOString();
      }).catch(() => { /* 后台图片解析失败不影响主流程 */ });
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
    newsCache.staleAt = now + 1000 * 60 * 10; // 过期后 5 分钟内仍可返回旧数据（SWR）
    newsCache.key = cacheKey;
    } // end else (no fetchingPromise)
    } // end else (!cacheValid)

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

/**
 * 服务端预热：在用户到来之前主动刷新缓存。
 * 用于启动后定时预热（每 5 分钟一次），让用户进入即看到新鲜数据。
 * fire-and-forget，错误不影响服务运行。
 */
export async function warmNewsCache(options = {}) {
  const now = Date.now();
  // 距上次预热不足 4 分钟则跳过（避免并发调用）
  if (now - newsCache.lastWarmAt < 4 * 60 * 1000) {
    return { skipped: true, reason: 'recently warmed' };
  }
  newsCache.lastWarmAt = now;
  try {
    await getNews(
      options.blocked || [],
      options.customSources || [],
      1,
      40,
      '',
      options.disabledSources || [],
      options.interests || [],
      { forceRefresh: true }
    );
    return { skipped: false, ok: true };
  } catch (err) {
    console.error('[warmNewsCache] failed:', err.message);
    return { skipped: false, ok: false, error: err.message };
  }
}

/**
 * 启动定时预热：服务启动时调用一次，每 5 分钟自动刷新缓存。
 * 返回 stop 函数，可清理定时器。
 */
export function startNewsWarming(intervalMs = 5 * 60 * 1000) {
  if (backgroundRefreshTimer) return () => {};
  // 启动后立即预热一次
  warmNewsCache().catch(() => {});
  backgroundRefreshTimer = setInterval(() => {
    warmNewsCache().catch(err => console.error('[news warming] error:', err.message));
  }, intervalMs);
  return () => {
    if (backgroundRefreshTimer) {
      clearInterval(backgroundRefreshTimer);
      backgroundRefreshTimer = null;
    }
  };
}
