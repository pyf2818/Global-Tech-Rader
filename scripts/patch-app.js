import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, '..', 'src', 'App.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Find the runAgentWorkflow function and its block, through the getFeedbackTerm function
const startMarker = '  const runAgentWorkflow = useCallback(async (mission, customPrompt = \'\') => {';
const startIdx = content.indexOf(startMarker);
if (startIdx === -1) {
  console.error('Could not find runAgentWorkflow start marker');
  process.exit(1);
}

// Find the end of the dependency array (which is followed by getFeedbackTerm)
const endMarker = '  function getFeedbackTerm(item) {';
const endIdx = content.indexOf(endMarker, startIdx);
if (endIdx === -1) {
  console.error('Could not find getFeedbackTerm marker');
  process.exit(1);
}

const newBody = `  const runAgentWorkflow = useCallback(async (mission, customPrompt = '') => {
    const selectedMission = mission || intelligenceMissions[0];
    if (!selectedMission) return;

    const agent = agents.find(a => a.id === selectedMission.agentId) || agents.find(a => a.id === 'orchestrator') || agents[0];
    const workflow = enabledWorkflowNodes.length ? { ...agentWorkflowDraft, nodes: enabledWorkflowNodes } : agentWorkflowDraft;
    setCurrentAgent(agent?.id || 'orchestrator');
    setAgentWorkflowPrompt(customPrompt.trim() || selectedMission.prompt);

    const ctx = {
      llmConfig,
      agents,
      scopedAgentItems,
      mediaItems: scopedAgentItems.filter(item => item.imageUrl || item.videoUrl),
      materials,
      bookmarks,
      intelligenceProfile,
      trackedTerms: intelligenceProfile.tracked || [],
      selectedInterests,
      categories: CATEGORIES,
      selectedNewsDate,
      agentWorkflowScope,
      selectedMission,
      customPrompt: customPrompt.trim() || selectedMission.prompt
    };

    await workflowEngine.runWorkflow(workflow, selectedMission, ctx);
  }, [workflowEngine, intelligenceMissions, agents, llmConfig, scopedAgentItems, materials, bookmarks, intelligenceProfile, selectedInterests, selectedNewsDate, agentWorkflowScope, enabledWorkflowNodes, agentWorkflowDraft]);

`;

content = content.substring(0, startIdx) + newBody + content.substring(endIdx);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done. Replaced runAgentWorkflow body.');
