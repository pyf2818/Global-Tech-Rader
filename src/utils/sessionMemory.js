/**
 * sessionMemory.js - 会话记忆（跨对话不失忆）
 *
 * - 会话结束生成摘要（主题+关键结论+涉及情报 ID）
 * - 摘要存 localStorage（sessionMemories），per-session
 * - 新会话时按当前问题关键词检索相关历史摘要，注入 systemPrompt
 *
 * 摘要结构：{ sessionId, title, topic, conclusions[], evidenceIds[], createdAt }
 */

const MEM_KEY = 'sessionMemories';

function loadMemories() {
  try {
    const raw = localStorage.getItem(MEM_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveMemories(mems) {
  try { localStorage.setItem(MEM_KEY, JSON.stringify(mems.slice(-50))); } catch {}
}

export function getSessionMemories() {
  return loadMemories();
}

export function getMemory(sessionId) {
  return loadMemories().find(m => m.sessionId === sessionId) || null;
}

export function deleteMemory(sessionId) {
  const next = loadMemories().filter(m => m.sessionId !== sessionId);
  saveMemories(next);
}

export function clearAllMemories() {
  saveMemories([]);
}

/* 分词：中文按字/英文按词，去停用词 */
const STOP = new Set(['的', '了', '是', '在', '我', '你', '他', '这', '那', '和', '与', '及', '或', '一', '个', '中', '上', '下', '不', '为', '有', 'the', 'a', 'an', 'is', 'are', 'to', 'of', 'in', 'on', 'for', 'and', 'or']);
function tokenize(text) {
  if (!text) return [];
  const lower = String(text).toLowerCase();
  const words = lower.match(/[a-z]{2,}|[一-鿿]/g) || [];
  return words.filter(w => !STOP.has(w));
}

/* 生成会话摘要：调 LLM 提取主题和结论 */
export async function generateSessionSummary(session, llmConfig) {
  if (!llmConfig?.baseUrl || !llmConfig?.selectedModel) return null;
  const userMsgs = session.messages.filter(m => m.role === 'user').map(m => m.content).slice(-6);
  const aiMsgs = session.messages.filter(m => m.role === 'assistant' && !m.error).map(m => m.content).slice(-6);
  if (userMsgs.length === 0) return null;

  const transcript = userMsgs.map((q, i) => `Q${i + 1}: ${q}\nA${i + 1}: ${(aiMsgs[i] || '').slice(0, 500)}`).join('\n\n');
  const evidenceIds = [...session.messages.join('\n').matchAll(/\[资讯:([^\]]+)\]/g)].map(m => m[1].trim());

  try {
    const resp = await fetch('/api/ai-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseUrl: llmConfig.baseUrl,
        apiKey: llmConfig.apiKey,
        model: llmConfig.selectedModel,
        action: 'summary',
        content: `以下是一次用户与情报助手的对话记录。请提取：\n1. topic: 对话主题（不超过15字）\n2. conclusions: 2-3条关键结论（每条不超过40字）\n只输出严格 JSON：{"topic":"","conclusions":["",""]}\n\n对话记录：\n${transcript}`,
      }),
    });
    const data = await resp.json();
    if (data.error) return null;
    const match = (data.content || '').match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    const memory = {
      sessionId: session.id,
      title: session.title || parsed.topic || userMsgs[0].slice(0, 20),
      topic: parsed.topic || session.title || userMsgs[0].slice(0, 15),
      conclusions: Array.isArray(parsed.conclusions) ? parsed.conclusions.slice(0, 3) : [],
      evidenceIds: [...new Set(evidenceIds)].slice(0, 10),
      createdAt: Date.now(),
    };
    const mems = loadMemories().filter(m => m.sessionId !== session.id);
    mems.push(memory);
    saveMemories(mems);
    return memory;
  } catch { return null; }
}

/* 按关键词检索相关历史记忆（排除当前会话） */
export function retrieveRelevantMemories(query, currentSessionId, limit = 3) {
  const queryTokens = new Set(tokenize(query));
  if (queryTokens.size === 0) return [];
  const mems = loadMemories().filter(m => m.sessionId !== currentSessionId);
  const scored = mems.map(m => {
    const memTokens = new Set([...tokenize(m.topic), ...tokenize(m.conclusions.join(' ')), ...tokenize(m.title)]);
    let score = 0;
    queryTokens.forEach(t => { if (memTokens.has(t)) score += 1; });
    return { memory: m, score };
  }).filter(s => s.score > 0).sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(s => s.memory);
}
