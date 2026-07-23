/**
 * workspaceIndex.js - 工作空间文件索引与检索
 *
 * - 导出文件后自动建索引（IndexedDB 存 name + content 分词）
 * - 对话时按当前问题检索相关文件，自动召回注入上下文
 * - 打通"沉淀 -> 召回"回路
 *
 * 索引结构：{ path, name, content, tokens: Set, indexedAt }
 */

const DB_NAME = 'meridian-ws-index';
const STORE = 'files';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'path' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const STOP = new Set(['的', '了', '是', '在', '我', '你', '他', '这', '那', '和', '与', '及', '或', '一', '个', '中', '上', '下', '不', '为', '有', 'the', 'a', 'an', 'is', 'are', 'to', 'of', 'in', 'on', 'for', 'and', 'or', 'http', 'https', 'com', 'www']);
function tokenize(text) {
  if (!text) return [];
  const lower = String(text).toLowerCase();
  const words = lower.match(/[a-z]{2,}|[一-鿿]{2,}/g) || [];
  return [...new Set(words.filter(w => !STOP.has(w)))];
}

/* 写入/更新单个文件索引 */
export async function indexFile(path, name, content) {
  const db = await openDB();
  const record = { path, name, content: String(content).slice(0, 4000), tokens: tokenize(name + ' ' + content), indexedAt: Date.now() };
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(record);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

/* 批量重建索引（全量） */
export async function rebuildIndex(files) {
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
    files.forEach(f => {
      tx.objectStore(STORE).put({ path: f.path, name: f.name, content: String(f.content || '').slice(0, 4000), tokens: tokenize(f.name + ' ' + f.content), indexedAt: Date.now() });
    });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

/* 按关键词检索相关文件 */
export async function searchFiles(query, limit = 3) {
  const queryTokens = new Set(tokenize(query));
  if (queryTokens.size === 0) return [];
  const db = await openDB();
  const all = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
  const scored = all.map(f => {
    const memTokens = new Set(f.tokens || []);
    let score = 0;
    queryTokens.forEach(t => { if (memTokens.has(t)) score += 1; });
    return { file: f, score };
  }).filter(s => s.score > 0).sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(s => ({ path: s.file.path, name: s.file.name, content: s.file.content, score: s.score }));
}

export async function clearIndex() {
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

export async function getIndexCount() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).count();
    req.onsuccess = () => resolve(req.result || 0);
    req.onerror = () => reject(req.error);
  });
}
