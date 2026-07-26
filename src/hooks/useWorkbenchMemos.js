import { useMemo } from 'react';

/**
 * Extracted workbench and intelligence profile useMemo computations.
 *
 * These blocks originally lived inline in App.jsx (around lines 2411-2625).
 * All logic and deps arrays are kept identical to the original implementation.
 *
 * Source of truth: src/App.jsx (codex/intelligence-workbench-redesign branch).
 */

/**
 * @param {object} params
 * @param {Array}  params.todayMustRead         - Today's must-read items.
 * @param {Array}  params.selectedDateItems     - Items filtered by selected date.
 * @param {Array}  params.selectedInterests     - Selected interest category ids.
 * @param {Array}  params.followKeywords        - Tracked keyword list.
 * @param {object} params.recommendationFeedback - User feedback state (hiddenIds/boostedCategories/mutedSources/trackedTerms).
 * @param {Array}  params.bookmarks             - Saved bookmark items.
 * @param {Array}  params.materials             - Material library items.
 * @param {Array}  params.categories            - Full category list (with id/label/icon).
 * @param {object} params.domainTiers           - Domain tier map (id -> 'focus'|'normal'|'explore').
 * @param {object} params.sourceTiers           - Source tier map (name -> 'focus'|'normal'|'explore').
 * @param {object} params.readingProfile        - Reading profile object (must expose `topSources`).
 * @param {object} params.insightData           - Insight data object (must expose `sourceQuality`).
 * @param {(id: string) => boolean} params.isBookmarked  - Bookmark membership check.
 * @param {(id: string) => boolean} params.isInMaterials - Material membership check.
 */
export function useWorkbenchMemos({
  todayMustRead,
  selectedDateItems,
  selectedInterests,
  followKeywords,
  recommendationFeedback,
  bookmarks,
  materials,
  categories,
  domainTiers,
  sourceTiers,
  readingProfile,
  insightData,
  isBookmarked,
  isInMaterials,
}) {
  const workbenchItems = useMemo(() => {
    const seen = new Set();
    const hiddenIds = new Set(recommendationFeedback.hiddenIds || []);
    const boostedCategories = recommendationFeedback.boostedCategories || {};
    const mutedSources = recommendationFeedback.mutedSources || {};
    const trackedTerms = recommendationFeedback.trackedTerms || {};
    const enrichedDateItems = selectedDateItems
      .filter(item => (item.mustReadScore || 0) > 0 || selectedInterests.includes(item.category) || item.sourceGradeLabel?.startsWith('S') || item.sourceGradeLabel?.startsWith('A'));
    const fallbackDateItems = selectedDateItems.filter(item => !enrichedDateItems.includes(item));
    const primary = [...todayMustRead, ...enrichedDateItems, ...fallbackDateItems]
      .filter(item => {
        if (!item?.id || seen.has(item.id) || hiddenIds.has(item.id)) return false;
        seen.add(item.id);
        return true;
      })
      .map(item => {
        const feedbackBoost = (boostedCategories[item.category] || 0) * 8;
        const sourcePenalty = (mutedSources[item.source] || 0) * 12;
        const trackedBoost = Object.keys(trackedTerms).some(term => `${item.title} ${item.summary}`.toLowerCase().includes(term.toLowerCase())) ? 14 : 0;
        const feedbackScore = feedbackBoost + trackedBoost - sourcePenalty;
        if (item.recommendation) {
          const extraReasons = [];
          if (feedbackBoost > 0) extraReasons.push('你要求更多类似内容');
          if (trackedBoost > 0) extraReasons.push('匹配继续追踪主题');
          if (sourcePenalty > 0) extraReasons.push('已降低此来源权重');
          return {
            ...item,
            mustReadScore: (item.mustReadScore || 0) + feedbackScore,
            recommendationReasons: [...new Set([...(item.recommendationReasons || []), ...extraReasons])].slice(0, 3),
            recommendation: [...new Set([...(item.recommendationReasons || []), ...extraReasons])].slice(0, 3).join(' · ') || item.recommendation
          };
        }
        const reasons = [];
        if (selectedInterests.includes(item.category)) reasons.push('匹配你的关注领域');
        if (followKeywords.some(kw => `${item.title} ${item.summary}`.toLowerCase().includes(kw.toLowerCase()))) reasons.push('命中你的追踪关键词');
        if (item.sourceGradeLabel?.startsWith('S') || item.sourceGradeLabel?.startsWith('A')) reasons.push('来源质量较高');
        const age = (Date.now() - new Date(item.publishedAt).getTime()) / (1000 * 60 * 60);
        if (age < 6) reasons.push('发布时间较新');
        if (feedbackBoost > 0) reasons.push('你要求更多类似内容');
        if (trackedBoost > 0) reasons.push('匹配继续追踪主题');
        if (sourcePenalty > 0) reasons.push('已降低此来源权重');
        return {
          ...item,
          mustReadScore: Math.max(0, feedbackScore),
          recommendationReasons: reasons.slice(0, 3),
          recommendation: reasons.length ? reasons.slice(0, 3).join(' · ') : '与所选日期和当前筛选条件相关'
        };
      })
      .sort((a, b) => (b.mustReadScore || 0) - (a.mustReadScore || 0));
    return primary;
  }, [todayMustRead, selectedDateItems, selectedInterests, followKeywords, recommendationFeedback]);

  const workbenchStats = useMemo(() => {
    const gradeCounts = workbenchItems.reduce((acc, item) => {
      const grade = item.sourceGradeLabel?.charAt(0) || item.grade || 'N/A';
      acc[grade] = (acc[grade] || 0) + 1;
      return acc;
    }, {});
    const focusMatches = workbenchItems.filter(item => selectedInterests.includes(item.category)).length;
    const keywordMatches = workbenchItems.filter(item => followKeywords.some(kw => `${item.title} ${item.summary}`.toLowerCase().includes(kw.toLowerCase()))).length;
    const savedCount = workbenchItems.filter(item => isBookmarked(item.id) || isInMaterials(item.id)).length;
    return { gradeCounts, focusMatches, keywordMatches, savedCount };
  }, [workbenchItems, selectedInterests, followKeywords, bookmarks, materials]);

  const intelligenceProfile = useMemo(() => {
    const focusLabels = selectedInterests.map(id => categories.find(c => c.id === id)?.label || id);
    const boosted = Object.entries(recommendationFeedback.boostedCategories || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => categories.find(c => c.id === id)?.label || id);
    const muted = Object.keys(recommendationFeedback.mutedSources || {}).slice(0, 3);
    const tracked = [...new Set([...followKeywords, ...Object.keys(recommendationFeedback.trackedTerms || {})])].slice(0, 8);

    return {
      focusLabels,
      boosted,
      muted,
      tracked,
      depth: workbenchItems.length > 0 && workbenchStats.focusMatches / Math.max(workbenchItems.length, 1) > 0.5 ? '深度聚焦' : '探索校准',
      outputGoal: materials.length > bookmarks.length ? '素材沉淀' : '阅读判断'
    };
  }, [selectedInterests, recommendationFeedback, followKeywords, workbenchItems.length, workbenchStats.focusMatches, materials.length, bookmarks.length]);

  const profilePriorityItems = useMemo(() => {
    const base = selectedInterests.length ? selectedInterests : categories.slice(0, 6).map(c => c.id);
    return base.slice(0, 8).map((id, index) => {
      const category = categories.find(c => c.id === id);
      return {
        id,
        label: category?.label || id,
        tier: domainTiers[id] || (index < 2 ? 'focus' : index < 5 ? 'normal' : 'explore'),
        icon: category?.icon || 'target'
      };
    });
  }, [selectedInterests, domainTiers, categories]);

  const sourcePriorityItems = useMemo(() => {
    const fallbackSources = Array.isArray(insightData.sourceQuality) ? insightData.sourceQuality : [];
    const sources = readingProfile.topSources.length
      ? readingProfile.topSources
      : fallbackSources.slice(0, 5).map(source => ({ name: source.name, count: source.count }));
    return sources.slice(0, 6).map((source, index) => ({
      name: source.name,
      count: source.count || 0,
      tier: sourceTiers[source.name] || (index < 2 ? 'focus' : index < 4 ? 'normal' : 'explore')
    }));
  }, [readingProfile.topSources, insightData.sourceQuality, sourceTiers]);

  return {
    workbenchItems,
    workbenchStats,
    intelligenceProfile,
    profilePriorityItems,
    sourcePriorityItems,
  };
}
