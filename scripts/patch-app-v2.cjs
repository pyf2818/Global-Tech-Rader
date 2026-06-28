var fs = require('fs');
var fp = 'src/App.jsx';
var content = fs.readFileSync(fp, 'utf-8');

// PATCH 1: Replace workbench-ai section with AiChatPanel
var aiSection = content.match(
  /(\s*)<section className="workbench-ai">[\s\S]*?<\/section>/
);
if (aiSection) {
  var aiPanel = [
    '              <AiChatPanel',
    '                llmConfig={llmConfig}',
    '                intelligenceProfile={intelligenceProfile}',
    '                workbenchItems={workbenchItems}',
    '                selectedInterests={selectedInterests}',
    '                categories={CATEGORIES}',
    '                allLlmModels={allLlmModels}',
    '                onOpenLlmConfig={() => setShowLlmQuickConfig(true)}',
    '              />',
  ].join('\n');
  content = content.replace(aiSection[0], '\n' + aiPanel);
  console.log('Patch 1: Replaced workbench-ai with AiChatPanel');
} else {
  console.error('Patch 1: workbench-ai section not found');
}

// PATCH 2: Add topMustRead and profileRecommendations memos
// Insert after workbenchAiInsight memo
var aiInsightMemoEnd = content.indexOf(
  "return {",
  content.indexOf("const workbenchAiInsight = useMemo")
);
// Find the closing of workbenchAiInsight memo — look for }, [workbenchItems
var closingPattern = '], [workbenchItems, selectedInterests';
var closingIdx = content.indexOf(closingPattern, aiInsightMemoEnd);
if (closingIdx < 0) {
  closingPattern = '}, [workbenchItems,';
  closingIdx = content.indexOf(closingPattern, aiInsightMemoEnd);
}

// Find end of this memo
var memoEndIdx = content.indexOf('});', closingIdx);

if (memoEndIdx > 0) {
  var newMemos = `
  // TOP 5 must-read items by score
  const topMustRead = useMemo(() => {
    return workbenchItems
      .filter(item => (item.mustReadScore || 0) > 0)
      .slice(0, 5);
  }, [workbenchItems]);

  // Profile-based recommendations (excluding top 5, unlimited)
  const profileRecommendations = useMemo(() => {
    const topIds = new Set(topMustRead.map(i => i.id));
    return workbenchItems
      .filter(item => !topIds.has(item.id))
      .sort((a, b) => (b.mustReadScore || 0) - (a.mustReadScore || 0));
  }, [workbenchItems, topMustRead]);`;
  content = content.slice(0, memoEndIdx + 3) + newMemos + content.slice(memoEndIdx + 3);
  console.log('Patch 2: Added topMustRead and profileRecommendations memos');
} else {
  console.error('Patch 2: Could not find workbenchAiInsight memo end');
}

// PATCH 3: Add profilePage state after other useState declarations
var profilePageState = "const [profilePage, setProfilePage] = useState(1);";
if (!content.includes('profilePage')) {
  // Find last useState in the function
  var lastUseState = content.lastIndexOf("useState(");
  var lineEnd = content.indexOf('\n', lastUseState);
  content = content.slice(0, lineEnd + 1) + '  ' + profilePageState + '\n' + content.slice(lineEnd + 1);
  console.log('Patch 3: Added profilePage state');
}

fs.writeFileSync(fp, content, 'utf-8');
console.log('All patches applied. File written.');
