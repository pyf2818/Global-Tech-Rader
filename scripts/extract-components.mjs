/**
 * Extract SettingsModal and ArticleEditor from App.jsx
 * Run: node scripts/extract-components.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const appPath = resolve('src/App.jsx');
let lines = readFileSync(appPath, 'utf8').split('\n');
console.log('App.jsx before:', lines.length, 'lines');

// ============================================================
// Helper: extract a block and replace with component invocation
// ============================================================
function extractBlock(lines, startIdx, endIdx, componentName, componentImport, propMapping) {
  // Extract the JSX block (keep the inner content, skip outer wrapper)
  const outerLine = lines[startIdx].trim();
  console.log(`${componentName}: L${startIdx+1}-L${endIdx+1} (${endIdx-startIdx+1} lines)`);
  console.log(`  First: ${outerLine.substring(0, 80)}`);

  // Build replacement - a simple component invocation
  const replacement = propMapping;

  // Replace the block
  lines.splice(startIdx, endIdx - startIdx + 1, replacement);
  return lines;
}

// ============================================================
// 1. Extract SettingsModal (L5259-L6507, 0-indexed 5258-6506)
// ============================================================
// First read the block to confirm it's correct
const settingsLine0 = lines[5258].trim();
const settingsLineN = lines[6506].trim();
console.log('\n=== Settings Modal ===');
console.log('First line:', settingsLine0.substring(0, 80));
console.log('Last line:', settingsLineN.substring(0, 80));

const settingsReplacement = `{showSettings && <SettingsModal
    settingsTab={settingsTab} setSettingsTab={setSettingsTab}
    blocked={blocked} setBlocked={setBlocked}
    allSources={allSources} customSources={customSources} disabledSources={disabledSources}
    sourceGrades={sourceGrades} sourceHealth={sourceHealth}
    newSource={newSource} setNewSource={setNewSource}
    editingSource={editingSource} setEditingSource={setEditingSource}
    showSourceForm={showSourceForm} setShowSourceForm={setShowSourceForm}
    searchQuery={searchQuery} setSearchQuery={setSearchQuery}
    customSourceFilter={customSourceFilter} setCustomSourceFilter={setCustomSourceFilter}
    regionFilter={regionFilter} setRegionFilter={setRegionFilter}
    statusFilter={statusFilter} setStatusFilter={setStatusFilter}
    gradeFilter={gradeFilter} setGradeFilter={setGradeFilter}
    sourceTypeTab={sourceTypeTab} setSourceTypeTab={setSourceTypeTab}
    addCustomSource={addCustomSource} removeCustomSource={removeCustomSource}
    verifySource={verifySource} verifyAllSources={verifyAllSources}
    verifySingleSource={verifySingleSource}
    exportSources={exportSources} importSources={importSources}
    autoMonitorEnabled={autoMonitorEnabled} setAutoMonitorEnabled={setAutoMonitorEnabled}
    monitorInterval={monitorInterval} setMonitorInterval={setMonitorInterval}
    monitorAlerts={monitorAlerts}
    showAlertPanel={showAlertPanel} setShowAlertPanel={setShowAlertPanel}
    clearAlerts={clearAlerts}
    llmConfig={llmConfig} setLlmConfig={setLlmConfig}
    llmModels={llmModels} llmFetching={llmFetching} llmFetchError={llmFetchError}
    llmTestResult={llmTestResult} llmTesting={llmTesting}
    llmManualInput={llmManualInput} setLlmManualInput={setLlmManualInput}
    showLlmQuickConfig={showLlmQuickConfig} setShowLlmQuickConfig={setShowLlmQuickConfig}
    fetchLlmModels={fetchLlmModels} addManualModel={addManualModel} removeManualModel={removeManualModel}
    testLlmConnection={testLlmConnection}
    handleSelectPreset={handleSelectPreset} handleQuickSave={handleQuickSave} handleQuickTest={handleQuickTest}
    agents={agents} setAgents={setAgents}
    currentAgent={currentAgent} setCurrentAgent={setCurrentAgent}
    showAgentForm={showAgentForm} setShowAgentForm={setShowAgentForm}
    editingAgent={editingAgent} setEditingAgent={setEditingAgent}
    newAgent={newAgent} setNewAgent={setNewAgent}
    agentFilter={agentFilter} setAgentFilter={setAgentFilter}
    agentPromptRefining={agentPromptRefRefining={agentPromptRefining} setAgentPromptRefining={setAgentPromptRefining}
    elfAvatar={elfAvatar} setElfAvatar={setElfAvatar}
    elfAvatarHistory={elfAvatarHistory} setElfAvatarHistory={setElfAvatarHistory}
    elfName={elfName} setElfName={setElfName}
  />}`;

// Work bottom-up: Editor first (L4232-4809), then Settings (L5259-6507)
// After editor extraction, settings line numbers shift, so we need to adjust

// ============================================================
// 2. Extract ArticleEditor (L4232-L4809, 0-indexed 4231-4808)
// ============================================================
const editorLine0 = lines[4231].trim();
const editorLineN = lines[4808].trim();
console.log('\n=== Article Editor ===');
console.log('First line:', editorLine0.substring(0, 80));
console.log('Last line:', editorLineN.substring(0, 80));

const editorReplacement = `{nav === 'editor' && <ArticleEditor
    articles={articles} setArticles={setArticles}
    currentArticleId={currentArticleId} setCurrentArticleId={setCurrentArticleId}
    editorTab={editorTab} setEditorTab={setEditorTab}
    editorCursorPos={editorCursorPos} setEditorCursorPos={setEditorCursorPos}
    showTemplateMenu={showTemplateMenu} setShowTemplateMenu={setShowTemplateMenu}
    showAiPanel={showAiPanel} setShowAiPanel={setShowAiPanel}
    showImagePanel={showImagePanel} setShowImagePanel={setShowImagePanel}
    aiResult={aiResult} setAiResult={setAiResult}
    aiCustomPrompt={aiCustomPrompt} setAiCustomPrompt={setAiCustomPrompt}
    autoSaveTimer={autoSaveTimer} setAutoSaveTimer={setAutoSaveTimer}
    lastSavedAt={lastSavedAt} setLastSavedAt={setLastSavedAt}
    articleTagInput={articleTagInput} setArticleTagInput={setArticleTagInput}
    editingArticleTag={editingArticleTag} setEditingArticleTag={setEditingArticleTag}
    articleSpaces={articleSpaces} setArticleSpaces={setArticleSpaces}
    articleSpaceFilter={articleSpaceFilter} setArticleSpaceFilter={setArticleSpaceFilter}
    articleMaterialSpaceFilter={articleMaterialSpaceFilter} setArticleMaterialSpaceFilter={setArticleMaterialSpaceFilter}
    articleSpaceFormOpen={articleSpaceFormOpen} setArticleSpaceFormOpen={setArticleSpaceFormOpen}
    newArticleSpaceName={newArticleSpaceName} setNewArticleSpaceName={setNewArticleSpaceName}
    articleSpaceForNewArticle={articleSpaceForNewArticle} setArticleSpaceForNewArticle={setArticleSpaceForNewArticle}
    articleSearch={articleSearch} setArticleSearch={setArticleSearch}
    articleStatusFilter={articleStatusFilter} setArticleStatusFilter={setArticleStatusFilter}
    articleTemplateFilter={articleTemplateFilter} setArticleTemplateFilter={setArticleTemplateFilter}
    articleSort={articleSort} setArticleSort={setArticleSort}
    articleExportFilter={articleExportFilter} setArticleExportFilter={setArticleExportFilter}
    createArticle={createArticle} updateArticle={updateArticle} deleteArticle={deleteArticle}
    duplicateArticle={duplicateArticle}
    addArticleTag={addArticleTag} removeArticleTag={removeArticleTag}
    triggerAutoSave={triggerAutoSave}
    handleContentChange={handleContentChange} handleTitleChange={handleTitleChange}
    insertAtCursor={insertAtCursor} insertMaterialAtCursor={insertMaterialAtCursor}
    removeLinkedMaterial={removeLinkedMaterial}
    handleImageUpload={handleImageUpload} handlePaste={handlePaste}
    createArticleSpace={createArticleSpace} deleteArticleSpace={deleteArticleSpace}
    assignArticleToSpace={assignArticleToSpace}
    batchAssignArticlesToSpace={batchAssignArticlesToSpace}
    insertAiResult={insertAiResult} clearAiResult={clearAiResult}
    exportArticleToFile={exportArticleToFile} copyArticleAsRichText={copyArticleAsRichText}
    materials={materials} llmConfig={llmConfig}
  />}`;

// Process bottom-up to keep line numbers stable
// 1. SettingsModal (higher line numbers)
lines.splice(5258, 6506 - 5258 + 1, settingsReplacement);
console.log('After SettingsModal removal:', lines.length, 'lines');

// 2. ArticleEditor (lower line numbers, unaffected by settings removal)
// Re-find editor position since we haven't removed it yet
// Actually we removed settings first which is AFTER editor, so editor lines are unchanged
lines.splice(4231, 4808 - 4231 + 1, editorReplacement);
console.log('After ArticleEditor removal:', lines.length, 'lines');

// ============================================================
// 3. Add imports
// ============================================================
const importLine = lines.findIndex(l => l.includes("import AiElf"));
const newImports = [
  "import SettingsModal from './components/SettingsModal.jsx';",
  "import ArticleEditor from './components/ArticleEditor.jsx';",
];
lines.splice(importLine + 1, 0, ...newImports);

// ============================================================
// 4. Write back
// ============================================================
writeFileSync(appPath, lines.join('\n'));
console.log('\nApp.jsx after:', lines.length, 'lines');
console.log('Saved', 7297 - lines.length, 'lines');
