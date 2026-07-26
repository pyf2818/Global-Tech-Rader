import { useMemo } from 'react';
import {
  domainTierScore,
  sourceTierScore,
} from '../domain/intelligence/profileTiers.js';
import {
  buildRecommendation,
  clusterEvents,
  selectBriefingLanes,
} from '../domain/intelligence/recommendationEngine.js';
import { buildAlgorithmBriefing } from '../domain/intelligence/briefingEngine.js';

// Category groups used for related-category scoring in todayMustRead.
// Mirrors the App.jsx file-scope constant so the hook stays self-contained
// while preserving identical scoring behavior.
const CATEGORY_GROUPS = [
  { id: 'tech-ai', label: '科技前沿', icon: 'flask', categories: ['ai-models', 'research', 'open-source', 'data-science', 'quantum', 'cybersecurity', 'chips-compute'] },
  { id: 'hardware-consumer', label: '消费电子', icon: 'device', categories: ['devices', 'robotics', 'iot-5g', 'metaverse-xr', 'automotive'] },
  { id: 'industry-economy', label: '产业经济', icon: 'building', categories: ['silicon-valley', 'china-tech', 'policy-finance', 'fintech', 'economy-stock'] },
  { id: 'entertainment', label: '娱乐文化', icon: 'star', categories: ['gaming', 'game-entertain', 'showbiz', 'anime-acg'] },
  { id: 'lifestyle-health', label: '生活健康', icon: 'heart', categories: ['space', 'new-energy', 'climate-esg', 'healthcare', 'education-tech'] }
];

/**
 * Extracts the recommendation-related useMemo computations from App.jsx.
 *
 * Returns the five memoized values:
 *  - followKeywordUpdates
 *  - todayMustRead
 *  - recommendationCandidates
 *  - recommendationLanes
 *  - algorithmBriefing
 *
 * All logic and dependency arrays are preserved verbatim from App.jsx so
 * behavior remains identical.
 *
 * @param {Object} deps
 * @param {Array}  deps.items                    - Current news items pool.
 * @param {Array}  deps.followKeywords           - User-tracked keyword list.
 * @param {Array}  deps.readingHistory           - User reading history records.
 * @param {Array}  deps.bookmarks                - User bookmarked items.
 * @param {Array}  deps.selectedInterests        - User-selected interest category ids.
 * @param {Object} deps.domainTiers              - Profile domain tier map.
 * @param {Object} deps.sourceTiers              - Profile source tier map.
 * @param {Array}  deps.specialFollows           - Special follow entries (source/author/url/keyword).
 * @param {string} deps.selectedNewsDate         - Currently selected news date (YYYY-MM-DD).
 */
export function useRecommendationMemos({
  items,
  followKeywords,
  readingHistory,
  bookmarks,
  selectedInterests,
  domainTiers,
  sourceTiers,
  specialFollows,
  selectedNewsDate,
}) {
  // 我的关注动态：按关键词分组展示最新匹配的资讯
  const followKeywordUpdates = useMemo(() => {
    if (followKeywords.length === 0) return [];
    return followKeywords.map(kw => {
      const matched = items.filter(item =>
        `${item.title} ${item.summary}`.toLowerCase().includes(kw.toLowerCase())
      ).slice(0, 3);
      return { keyword: kw, count: matched.length, items: matched };
    }).filter(g => g.count > 0);
  }, [followKeywords, items]);

  // 统一推荐引擎：系统A(用户权重)+系统B(AI算法)+系统C(动态行为)
  const todayMustRead = useMemo(() => {
    const readIds = new Set(readingHistory.map(h => h.id));
    const bookmarkIds = new Set(bookmarks.map(b => b.itemId || b.id));

    // 领域热度统计（基于当前所有文章）
    const categoryPopularity = new Map();
    items.forEach(item => {
      if (item.category) {
        categoryPopularity.set(item.category, (categoryPopularity.get(item.category) || 0) + 1);
      }
    });
    const maxCategoryPop = Math.max(...categoryPopularity.values(), 1);

    // 热门关键词统计
    const keywordFrequency = new Map();
    items.forEach(item => {
      const text = `${item.title} ${item.summary || ''}`.toLowerCase();
      const words = text.match(/\b[a-z一-龥]{2,}\b/g) || [];
      words.forEach(word => {
        if (!/^[a-z]{2}$/.test(word)) { // 过滤过短的英文单词
          keywordFrequency.set(word, (keywordFrequency.get(word) || 0) + 1);
        }
      });
    });
    const topKeywords = [...keywordFrequency.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .map(([word]) => word);
    const eventClusters = clusterEvents(items);
    const clusterByItemId = new Map();
    eventClusters.forEach(cluster => cluster.itemIds.forEach(id => clusterByItemId.set(id, cluster)));
    const effectiveDomainTiers = selectedInterests.reduce(
      (tiers, id) => ({ ...tiers, [id]: tiers[id] || 'normal' }),
      { ...domainTiers }
    );
    const effectiveSpecialFollows = [
      ...specialFollows,
      ...followKeywords.map(target => ({ type: 'keyword', target })),
    ];

    return items
      .filter(item => !readIds.has(item.id))  // 已读过滤：避免重复推荐
      .map(item => {
        let score = 0;

        // 1. 领域匹配分数（用户关注领域）
        const domainPriority = domainTierScore(domainTiers[item.category]);
        if (domainPriority > 0) {
          score += (domainPriority - 3) * 6;
        }
        if (selectedInterests && selectedInterests.length > 0) {
          if (selectedInterests.includes(item.category)) {
            score += 30; // 直接匹配用户关注的领域
          }
          // 检查相关领域
          const relatedCategories = CATEGORY_GROUPS
            .filter(group => group.categories.includes(item.category))
            .flatMap(group => group.categories);
          if (relatedCategories.some(cat => selectedInterests.includes(cat))) {
            score += 15; // 匹配相关领域
          }
        }

        // 2. 关键词匹配分数
        followKeywords.forEach(kw => {
          if (`${item.title} ${item.summary}`.toLowerCase().includes(kw.toLowerCase())) {
            score += 20;
          }
        });

        // 3. 资讯热度分数
        // 3.1 标题质量（长度适中）
        const titleLen = item.title?.length || 0;
        if (titleLen >= 20 && titleLen <= 60) score += 5;
        else if (titleLen > 60) score += 2;

        // 3.2 摘要完整性
        if (item.summary && item.summary.length > 50) score += 5;

        // 3.3 媒体丰富度
        if (item.imageUrl) score += 5;
        if (item.videoUrl) score += 3;

        // 3.4 领域热度（该领域的文章数量）
        const categoryScore = categoryPopularity.get(item.category) || 0;
        score += Math.round((categoryScore / maxCategoryPop) * 10);

        // 3.5 热门关键词匹配
        const itemText = `${item.title} ${item.summary || ''}`.toLowerCase();
        const hotKeywordMatches = topKeywords.filter(kw => itemText.includes(kw)).length;
        score += Math.min(hotKeywordMatches * 2, 10);

        // 4. 来源权重
        const highWeightSources = ['OpenAI', 'Google', 'Anthropic', 'Meta', 'Microsoft', 'NVIDIA', 'Tesla', 'SpaceX'];
        if (highWeightSources.some(s => item.source?.includes(s))) score += 10;
        const mediumWeightSources = ['IEEE', 'Nature', 'Science', 'MIT', 'Stanford', 'Berkeley'];
        if (mediumWeightSources.some(s => item.source?.includes(s))) score += 5;
        const sourcePriority = sourceTierScore(sourceTiers[item.source]);
        if (sourcePriority > 0) {
          score += (sourcePriority - 3) * 5;
        }
        // 特别关注来源额外加权
        const sf = specialFollows.find(f => {
          const target = f.target?.toLocaleLowerCase();
          if (!target) return false;
          if (f.type === 'source' || f.type === 'author') return item.source?.toLocaleLowerCase().includes(target);
          if (f.type === 'url') return (item.url || item.link || '').toLocaleLowerCase().includes(target);
          return `${item.title || ''} ${item.summary || ''}`.toLocaleLowerCase().includes(target);
        });
        if (sf) score += 20;

        // 5. 互动热度（基于用户行为）
        if (bookmarkIds.has(item.id)) score += 15; // 已收藏
        // 阅读历史中该类别的阅读频率
        const categoryReadCount = readingHistory.filter(h => h.category === item.category).length;
        if (categoryReadCount > 0) score += Math.min(categoryReadCount * 2, 10);
        const sourceReadCount = readingHistory.filter(h => h.source === item.source).length;
        if (sourceReadCount > 0) score += Math.min(sourceReadCount * 1.5, 8);

        // 6. 新鲜度
        const age = (Date.now() - new Date(item.publishedAt).getTime()) / (1000 * 60 * 60);
        if (age < 1) score += 15; // 1小时内
        else if (age < 3) score += 12; // 3小时内
        else if (age < 6) score += 8; // 6小时内
        else if (age < 12) score += 5; // 12小时内
        else if (age < 24) score += 2; // 24小时内
        // 超过24小时不加分

        const recommendationReasons = [];
        const recommendationScoreParts = {};
        if (selectedInterests.includes(item.category)) {
          recommendationReasons.push('匹配你的关注领域');
          recommendationScoreParts.interest = 30;
        }
        if (domainPriority >= 4) {
          recommendationReasons.push('画像提高了该领域优先级');
          recommendationScoreParts.domainPriority = (domainPriority - 3) * 6;
        }
        if (followKeywords.some(kw => `${item.title} ${item.summary}`.toLowerCase().includes(kw.toLowerCase()))) {
          recommendationReasons.push('命中你的追踪关键词');
          recommendationScoreParts.keyword = 20;
        }
        if ((categoryScore / maxCategoryPop) >= 0.7) {
          recommendationReasons.push('所在赛道今日热度高');
          recommendationScoreParts.trend = Math.round((categoryScore / maxCategoryPop) * 10);
        }
        if (highWeightSources.some(s => item.source?.includes(s)) || mediumWeightSources.some(s => item.source?.includes(s))) {
          recommendationReasons.push('来自高质量来源');
          recommendationScoreParts.source = highWeightSources.some(s => item.source?.includes(s)) ? 10 : 5;
        }
        if (sourcePriority >= 4) {
          recommendationReasons.push('来自你高信任信号源');
          recommendationScoreParts.sourcePriority = (sourcePriority - 3) * 5;
        }
        if (age < 6) {
          recommendationReasons.push('发布时间较新');
          recommendationScoreParts.freshness = age < 1 ? 15 : age < 3 ? 12 : 8;
        }
        if (bookmarkIds.has(item.id)) {
          recommendationReasons.push('你已收藏，适合继续沉淀');
          recommendationScoreParts.behavior = 15;
        } else if (categoryReadCount > 0) {
          recommendationReasons.push('符合你的历史阅读偏好');
          recommendationScoreParts.behavior = Math.min(categoryReadCount * 2, 10) + Math.min(sourceReadCount * 1.5, 8);
        }
        if (item.imageUrl || item.videoUrl) {
          recommendationReasons.push('素材形态更完整');
          recommendationScoreParts.media = (item.imageUrl ? 5 : 0) + (item.videoUrl ? 3 : 0);
        }
        const uniqueReasons = [...new Set(recommendationReasons)].slice(0, 3);

        const cluster = clusterByItemId.get(item.id);
        const grade = item.sourceGradeLabel?.charAt(0) || item.grade;
        const sourceQualityScore = ({ S: 20, A: 17, B: 13, C: 9, D: 4 })[grade] || 10;
        return buildRecommendation({
          ...item,
          canonicalId: item.canonicalId || cluster?.id,
          sourceQualityScore,
        }, {
          domainTiers: effectiveDomainTiers,
          sourceTiers,
          specialFollows: effectiveSpecialFollows,
          independentSourceCount: cluster?.independentSourceCount || 1,
          trendVelocity: categoryScore / maxCategoryPop,
          behaviorSignal: bookmarkIds.has(item.id)
            ? 10
            : Math.min(categoryReadCount * 1.5 + sourceReadCount, 10),
          isNovel: !readIds.has(item.id),
        });
      })
      .sort((a, b) => b.mustReadScore - a.mustReadScore)
      .slice(0, 80);
  }, [items, followKeywords, readingHistory, bookmarks, selectedInterests, domainTiers, sourceTiers, specialFollows]);

  const recommendationCandidates = useMemo(() => todayMustRead.filter(item =>
    item.publishedAt?.slice(0, 10) === selectedNewsDate
  ), [todayMustRead, selectedNewsDate]);

  const recommendationLanes = useMemo(() => selectBriefingLanes(recommendationCandidates, {
    perLane: 5,
    maxPerSource: 2,
    maxCategoryRatio: 0.4,
  }), [recommendationCandidates]);

  const algorithmBriefing = useMemo(() => buildAlgorithmBriefing({
    date: selectedNewsDate,
    lanes: recommendationLanes,
  }), [selectedNewsDate, recommendationLanes]);

  return {
    followKeywordUpdates,
    todayMustRead,
    recommendationCandidates,
    recommendationLanes,
    algorithmBriefing,
  };
}

export default useRecommendationMemos;
