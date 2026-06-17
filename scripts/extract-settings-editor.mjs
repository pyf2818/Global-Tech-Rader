import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const appPath = resolve('src/App.jsx');
let lines = readFileSync(appPath, 'utf8').split('\n');
console.log('Before:', lines.length, 'lines');

// --- Find editor block ---
let editorStart = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("{nav === 'editor' &&") && !lines[i].includes('function')) {
    editorStart = i; break;
  }
}
let d = 0, s = false, editorEnd = -1;
for (let j = editorStart; j < lines.length; j++) {
  for (const ch of lines[j]) { if (ch === '{') { d++; s = true; } else if (ch === '}') d--; }
  if (s && d === 0) { editorEnd = j; break; }
}
console.log('Editor: L' + (editorStart+1) + '-L' + (editorEnd+1));

const editorComp = `{nav === 'editor' && <ArticleEditor articles={articles} setArticles={setArticles} currentArticleId={currentArticleId} setCurrentArticleId={setCurrentArticleId} editorTab={editorTab} setEditorTab={setEditorTab} editorCursorPos={editorCursorPos} setEditorCursorPos={setEditorCursorPos} showTemplateMenu={showTemplateMenu} setShowTemplateMenu={setShowTemplateMenu} showAiPanel={showAiPanel} setShowAiPanel={setShowAiPanel} showImagePanel={showImagePanel} setShowImagePanel={setShowImagePanel} aiResult={aiResult} setAiResult={setAiResult} aiCustomPrompt={aiCustomPrompt} setAiCustomPrompt={setAiCustomPrompt} autoSaveTimer={autoSaveTimer} setAutoSaveTimer={setAutoSaveTimer} lastSavedAt={lastSavedAt} setLastSavedAt={setLastSavedAt} articleTagInput={articleTagInput} setArticleTagInput={setArticleTagInput} editingArticleTag={editingArticleTag} setEditingArticleTag={setEditingArticleTag} articleSpaces={articleSpaces} setArticleSpaces={setArticleSpaces} articleSpaceFilter={articleSpaceFilter} setArticleSpaceFilter={setArticleSpaceFilter} articleMaterialSpaceFilter={articleMaterialSpaceFilter} setArticleMaterialSpaceFilter={setArticleMaterialSpaceFilter} articleSpaceFormOpen={articleSpaceFormOpen} setArticleSpaceFormOpen={setArticleSpaceFormOpen} newArticleSpaceName={newArticleSpaceName} setNewArticleSpaceName={setNewArticleSpaceName} articleSpaceForNewArticle={articleSpaceForNewArticle} setArticleSpaceForNewArticle={setArticleSpaceForNewArticle} articleSearch={articleSearch} setArticleSearch={setArticleSearch} articleStatusFilter={articleStatusFilter} setArticleStatusFilter={setArticleStatusFilter} articleTemplateFilter={articleTemplateFilter} setArticleTemplateFilter={setArticleTemplateFilter} articleSort={articleSort} setArticleSort={setArticleSort} articleExportFilter={articleExportFilter} setArticleExportFilter={setArticleExportFilter} createArticle={createArticle} updateArticle={updateArticle} deleteArticle={deleteArticle} duplicateArticle={duplicateArticle} addArticleTag={addArticleTag} removeArticleTag={removeArticleTag} triggerAutoSave={triggerAutoSave} handleContentChange={handleContentChange} handleTitleChange={handleTitleChange} insertAtCursor={insertAtCursor} insertMaterialAtCursor={insertMaterialAtCursor} removeLinkedMaterial={removeLinkedMaterial} handleImageUpload={handleImageUpload} handlePaste={handlePaste} createArticleSpace={createArticleSpace} deleteArticleSpace={deleteArticleSpace} assignArticleToSpace={assignArticleToSpace} batchAssignArticlesToSpace={batchAssignArticlesToSpace} insertAiResult={insertAiResult} clearAiResult={clearAiResult} exportArticleToFile={exportArticleToFile} copyArticleAsRichText={copyArticleAsRichText} materials={materials} llmConfig={llmConfig} />}`;

lines.splice(editorStart, editorEnd - editorStart + 1, editorComp);
console.log('After editor:', lines.length, 'lines');

// --- Find settings block ---
let sStart = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('{showSettings &&') && !lines[i].includes('function')) { sStart = i; break; }
}
let sd = 0, ss = false, sEnd = -1;
for (let j = sStart; j < lines.length; j++) {
  for (const ch of lines[j]) { if (ch === '{') { sd++; ss = true; } else if (ch === '}') sd--; }
  if (ss && sd === 0) { sEnd = j; break; }
}
console.log('Settings: L' + (sStart+1) + '-L' + (sEnd+1));

const sComp = `{showSettings && <SettingsModal settingsTab={settingsTab} setSettingsTab={setSettingsTab} blocked={blocked} setBlocked={setBlocked} allSources={allSources} customSources={customSources} disabledSources={disabledSources} sourceGrades={sourceGrades} sourceHealth={sourceHealth} newSource={newSource} setNewSource={setNewSource} editingSource={editingSource} setEditingSource={setEditingSource} showSourceForm={showSourceForm} setShowSourceForm={setShowSourceForm} searchQuery={searchQuery} setSearchQuery={setSearchQuery} customSourceFilter={customSourceFilter} setCustomSourceFilter={setCustomSourceFilter} regionFilter={regionFilter} setRegionFilter={setRegionFilter} statusFilter={statusFilter} setStatusFilter={setStatusFilter} gradeFilter={gradeFilter} setGradeFilter={setGradeFilter} sourceTypeTab={sourceTypeTab} setSourceTypeTab={setSourceTypeTab} addCustomSource={addCustomSource} removeCustomSource={removeCustomSource} verifySource={verifySource} verifyAllSources={verifyAllSources} verifySingleSource={verifySingleSource} exportSources={exportSources} importSources={importSources} autoMonitorEnabled={autoMonitorEnabled} setAutoMonitorEnabled={setAutoMonitorEnabled} monitorInterval={monitorInterval} setMonitorInterval={setMonitorInterval} monitorAlerts={monitorAlerts} showAlertPanel={showAlertPanel} setShowAlertPanel={setShowAlertPanel} clearAlerts={clearAlerts} llmConfig={llmConfig} setLlmConfig={setLlmConfig} llmModels={llmModels} llmFetching={llmFetching} llmFetchError={llmFetchError} llmTestResult={llmTestResult} llmTesting={llmTesting} llmManualInput={llmManualInput} setLlmManualInput={setLlmManualInput} showLlmQuickConfig={showLlmQuickConfig} setShowLlmQuickConfig={setShowLlmQuickConfig} fetchLlmModels={fetchLlmModels} addManualModel={addManualModel} removeManualModel={removeManualModel} testLlmConnection={testLlmConnection} handleSelectPreset={handleSelectPreset} handleQuickSave={handleQuickSave} handleQuickTest={handleQuickTest} agents={agents} setAgents={setAgents} currentAgent={currentAgent} setCurrentAgent={setCurrentAgent} showAgentForm={showAgentForm} setShowAgentForm={setShowAgentForm} editingAgent={editingAgent} setEditingAgent={setEditingAgent} newAgent={newAgent} setNewAgent={setNewAgent} agentFilter={agentFilter} setAgentFilter={setAgentFilter} agentPromptRefining={agentPromptRefining} setAgentPromptRefining={setAgentPromptRefining} elfAvatar={elfAvatar} setElfAvatar={setElfAvatar} elfAvatarHistory={elfAvatarHistory} setElfAvatarHistory={setElfAvatarHistory} elfName={elfName} setElfName={setElfName} />}`;

lines.splice(sStart, sEnd - sStart + 1, sComp);
console.log('After settings:', lines.length, 'lines');

// --- Add imports ---
const importLine = lines.findIndex(l => l.includes('import AiElf'));
lines.splice(importLine + 1, 0,
  "import SettingsModal from './components/SettingsModal.jsx';",
  "import ArticleEditor from './components/ArticleEditor.jsx';"
);

writeFileSync(appPath, lines.join('\n'));
console.log('Final:', lines.length, 'lines');
