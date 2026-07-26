import React from 'react';
import IntelligenceFeedPanel from './IntelligenceFeedPanel.jsx';
import RecommendationFeed from './RecommendationFeed.jsx';
import NewsItem from './NewsItem.jsx';

function RecommendationsPage({
  // IntelligenceFeedPanel props
  externalIntelligenceItems,
  externalIntelligenceOpportunities,
  externalIntelligenceWeeklySectors,
  externalIntelligenceAlerts,
  externalIntelligenceLoading,
  externalIntelligenceError,
  externalIntelligenceUpdatedAt,
  loadExternalIntelligence,
  // RecommendationFeed props
  displayRecommendationLanes,
  loading,
  error,
  isLoggedIn,
  selectedInterests,
  categories,
  renderLimit,
  viewMode,
  recommendationCandidates,
  selectedRecommendationSnapshot,
  loadMoreNews,
  loadingMore,
  newsHasMore,
  loadNews,
  setShowInterestModal,
  setAuthMode,
  setShowAuthModal,
  // renderCard dependencies
  focusedIndex,
  expandedSummary,
  summaryLoading,
  translationOpen,
  translatingItems,
  followKeywords,
  getSummaryEntry,
  isBookmarked,
  isInMaterials,
  toggleBookmark,
  toggleMaterial,
  handleSummaryToggle,
  recordReading,
  getTranslation,
  requestTranslation,
  setTranslationOpen,
  setLightbox,
}) {
  return (
    <>
      {/* SMART RECOMMENDATIONS - 当日满足用户关注/画像的资讯卡片流（右栏竖向时间线见 panel） */}
      <IntelligenceFeedPanel
        items={externalIntelligenceItems}
        opportunities={externalIntelligenceOpportunities}
        weeklySectors={externalIntelligenceWeeklySectors}
        alerts={externalIntelligenceAlerts}
        loading={externalIntelligenceLoading}
        error={externalIntelligenceError}
        updatedAt={externalIntelligenceUpdatedAt}
        onRefresh={loadExternalIntelligence}
      />
      <RecommendationFeed
        lanes={displayRecommendationLanes}
        loading={loading}
        error={error}
        isLoggedIn={isLoggedIn}
        selectedInterests={selectedInterests}
        categories={categories}
        renderLimit={renderLimit}
        viewMode={viewMode}
        renderCard={(item, i) => {
          const summaryEntry = getSummaryEntry(item);
          return <NewsItem key={item.id} item={item} index={i} viewMode={viewMode} isFocused={focusedIndex === i} isBookmarked={isBookmarked(item.id)} isInMaterials={isInMaterials(item.id)} onBookmark={() => toggleBookmark(item)} onAddMaterial={() => toggleMaterial(item)} onSummary={() => handleSummaryToggle(item)} isSummaryOpen={expandedSummary[item.id]} summaryText={summaryEntry?.text || ''} summaryMode={summaryEntry?.mode || ''} summaryLoading={Boolean(summaryLoading[item.id])} isFollowed={followKeywords.some(kw => `${item.title} ${item.summary}`.toLowerCase().includes(kw.toLowerCase()))} onRead={() => recordReading(item)} showTranslation={translationOpen[item.id]} onToggleTranslation={() => setTranslationOpen(p => ({ ...p, [item.id]: !p[item.id] }))} onRequestTranslation={() => requestTranslation(item)} isTranslating={translatingItems[item.id]} translation={getTranslation(item)} onOpenLightbox={(src, title, images, index) => setLightbox({ open: true, src, title, images: images || [], index: index || 0 })} />;
        }}
        snapshotMeta={recommendationCandidates.length === 0 ? selectedRecommendationSnapshot : null}
        onLoadMore={loadMoreNews}
        loadingMore={loadingMore}
        hasMore={newsHasMore}
        onRefresh={() => loadNews()}
        onPickInterests={() => setShowInterestModal(true)}
        onLogin={() => { setAuthMode('login'); setShowAuthModal(true); }}
      />
    </>
  );
}

export default RecommendationsPage;
