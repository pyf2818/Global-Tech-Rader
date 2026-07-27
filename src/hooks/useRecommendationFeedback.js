import { useCallback } from 'react';
import { showToast } from '../utils/toast.js';

export function useRecommendationFeedback({
  recommendationFeedback, setRecommendationFeedback,
  recommendationFeedbackEvents, setRecommendationFeedbackEvents,
  selectedInterests, setSelectedInterests,
  followKeywords, setFollowKeywords,
}) {
  function getFeedbackTerm(item) {
    const tags = item.tags || [];
    const preferredTag = tags.find(tag => tag && tag.length >= 2 && tag.length <= 24);
    if (preferredTag) return preferredTag;
    const titleWords = (item.title || '').match(/[A-Za-z][A-Za-z0-9-]{2,}|[\u4e00-\u9fa5]{2,6}/g) || [];
    return titleWords[0] || item.category || item.source || '';
  }

  const handleRecommendationFeedback = useCallback((item, action) => {
    if (!item) return;
    setRecommendationFeedbackEvents(previous => [{
      itemId: item.id,
      action,
      at: new Date().toISOString(),
    }, ...previous].slice(0, 500));
    if (action === 'hide') {
      setRecommendationFeedback(prev => ({
        ...prev,
        hiddenIds: [...new Set([...(prev.hiddenIds || []), item.id])]
      }));
      showToast('已减少这类不感兴趣内容');
      return;
    }

    if (action === 'more-like-this') {
      if (!item.category) return;
      setRecommendationFeedback(prev => ({
        ...prev,
        boostedCategories: {
          ...(prev.boostedCategories || {}),
          [item.category]: ((prev.boostedCategories || {})[item.category] || 0) + 1
        }
      }));
      if (item.category && !selectedInterests.includes(item.category)) {
        setSelectedInterests(prev => [...new Set([...prev, item.category])]);
      }
      showToast('已提高类似内容权重');
      return;
    }

    if (action === 'mute-source') {
      if (!item.source) return;
      setRecommendationFeedback(prev => ({
        ...prev,
        mutedSources: {
          ...(prev.mutedSources || {}),
          [item.source]: ((prev.mutedSources || {})[item.source] || 0) + 1
        }
      }));
      showToast(`已降低 ${item.source || '该来源'} 的推荐权重`);
      return;
    }

    if (action === 'track') {
      const term = getFeedbackTerm(item);
      if (!term) return;
      setRecommendationFeedback(prev => ({
        ...prev,
        trackedTerms: {
          ...(prev.trackedTerms || {}),
          [term]: ((prev.trackedTerms || {})[term] || 0) + 1
        }
      }));
      setFollowKeywords(prev => prev.includes(term) ? prev : [term, ...prev].slice(0, 20));
      showToast(`已开始追踪「${term}」`);
    }
  }, [selectedInterests]);

  return { getFeedbackTerm, handleRecommendationFeedback };
}
