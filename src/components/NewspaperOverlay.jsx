import TodayNewspaper from './TodayNewspaper.jsx';

export default function NewspaperOverlay({
  showNewspaperOverlay,
  setShowNewspaperOverlay,
  todayBriefing,
  todayLanes,
  recommendationCandidates,
  loading,
  loadNews,
  goNav,
  recordReading,
  toggleMaterial,
  recommendationSnapshots,
  selectedNewsDate,
  setSelectedNewsDate,
  translations,
  translationOpen,
  setTranslationOpen,
  translatingItems,
  requestTranslation,
  isEnglishText,
}) {
  if (!showNewspaperOverlay) return null;
  return (
    <div
      className="newspaper-drawer-mask"
      role="dialog"
      aria-modal="true"
      aria-label="今日速报"
      onClick={e => { if (e.target === e.currentTarget) setShowNewspaperOverlay(false); }}
    >
      <aside className="newspaper-drawer">
        <div className="newspaper-drawer-bar">
          <span>今日速报 · 完整日报</span>
          <button
            type="button"
            className="newspaper-drawer-close"
            onClick={() => setShowNewspaperOverlay(false)}
            aria-label="关闭"
          >
            ✕
          </button>
        </div>
        <div className="newspaper-drawer-body custom-scrollbar">
          <TodayNewspaper
            briefing={todayBriefing}
            lanes={todayLanes}
            items={recommendationCandidates}
            loading={loading}
            onRefresh={() => loadNews()}
            onOpenRecommendations={() => { setShowNewspaperOverlay(false); goNav('recommendations'); }}
            onOpenItem={item => {
              recordReading(item);
              if (item.url) window.open(item.url, '_blank', 'noopener,noreferrer');
            }}
            onSaveItem={item => toggleMaterial(item, 'news', '今日速报')}
            snapshots={recommendationSnapshots}
            selectedDate={selectedNewsDate}
            onSelectDate={date => setSelectedNewsDate(date)}
            translations={translations}
            translationOpen={translationOpen}
            translatingItems={translatingItems}
            onRequestTranslation={requestTranslation}
            onToggleTranslation={itemId => setTranslationOpen(p => ({ ...p, [itemId]: !p[itemId] }))}
            isEnglishText={isEnglishText}
          />
        </div>
      </aside>
    </div>
  );
}
