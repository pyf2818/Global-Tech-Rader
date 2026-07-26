import AiChatPanel from './AiChatPanel.jsx';

export default function HomePage({
  llmConfig,
  intelligenceProfile,
  workbenchItems,
  selectedInterests,
  categories,
  allLlmModels,
  onOpenLlmConfig,
  pendingMessage,
  onMessageSent,
  selectedNewsDate,
  algorithmBriefing,
  externalIntelligenceItems,
  recommendationLanes,
  onOpenNewspaper,
  todayBriefing,
  todayLanes,
  materials,
}) {
  const intelligenceContext = {
    date: selectedNewsDate,
    briefing: algorithmBriefing,
    items: [...externalIntelligenceItems, ...recommendationLanes.public, ...recommendationLanes.personal].slice(0, 16),
  };

  return (
    <AiChatPanel
      variant="main"
      llmConfig={llmConfig}
      intelligenceProfile={intelligenceProfile}
      workbenchItems={workbenchItems}
      selectedInterests={selectedInterests}
      categories={categories}
      allLlmModels={allLlmModels}
      onOpenLlmConfig={onOpenLlmConfig}
      pendingMessage={pendingMessage}
      onMessageSent={onMessageSent}
      intelligenceContext={intelligenceContext}
      onOpenNewspaper={onOpenNewspaper}
      todayBriefing={todayBriefing}
      todayLanes={todayLanes}
      materials={materials}
    />
  );
}
