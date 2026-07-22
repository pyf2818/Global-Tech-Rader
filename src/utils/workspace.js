/**
 * workspace.js - 本地工作空间文件系统操作
 *
 * 基于 File System Access API（Chrome/Edge），纯前端读写本地文件夹。
 * - 用户授权一个目录，拿 FileSystemDirectoryHandle
 * - handle 存 IndexedDB，刷新后恢复（需用户点一次确认重新激活权限）
 * - 不支持 File System Access API 的浏览器降级为下载 zip（JSZip 动态导入）
 *
 * 文件组织：类型/日期/文件名.md
 *   news/YYYY-MM-DD/标题.md
 *   briefings/YYYY-MM-DD.md
 *   conversations/会话标题.md
 */

const DB_NAME = 'meridian-workspace';
const STORE = 'handles';
const HANDLE_KEY = 'root';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function isFileSystemSupported() {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/* 选择根目录，返回 handle 并存入 IndexedDB */
export async function pickRootDirectory() {
  if (!isFileSystemSupported()) return null;
  const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(handle, HANDLE_KEY);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  return handle;
}

/* 从 IndexedDB 恢复 handle，需调用 queryPermission/requestPermission 重新激活 */
export async function restoreRootDirectory() {
  if (!isFileSystemSupported()) return null;
  const db = await openDB();
  const handle = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(HANDLE_KEY);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
  if (!handle) return null;
  // 重新激活权限
  const perm = await handle.queryPermission({ mode: 'readwrite' });
  if (perm === 'granted') return handle;
  const requested = await handle.requestPermission({ mode: 'readwrite' });
  return requested === 'granted' ? handle : null;
}

export async function clearRootDirectory() {
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(HANDLE_KEY);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

/* 安全文件名：去除非法字符 */
function safeName(name) {
  return String(name || 'untitled').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 120).trim() || 'untitled';
}

function dateStr(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

/* 确保子目录存在，返回 directoryHandle */
async function ensureDir(root, segments) {
  let dir = root;
  for (const seg of segments) {
    dir = await dir.getDirectoryHandle(safeName(seg), { create: true });
  }
  return dir;
}

/* 写入文件（自动创建目录），返回文件路径 */
export async function writeFile(root, pathSegments, fileName, content) {
  const dirs = pathSegments.slice(0, -1);
  const dirName = pathSegments[pathSegments.length - 1];
  const parent = dirs.length ? await ensureDir(root, dirs) : root;
  const targetDir = dirName ? await parent.getDirectoryHandle(safeName(dirName), { create: true }) : parent;
  const fileHandle = await targetDir.getFileHandle(safeName(fileName), { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
  return [...pathSegments, safeName(fileName)].join('/');
}

/* 读取文件文本 */
export async function readFile(root, pathSegments) {
  let dir = root;
  for (let i = 0; i < pathSegments.length - 1; i++) {
    dir = await dir.getDirectoryHandle(safeName(pathSegments[i]));
  }
  const fileHandle = await dir.getFileHandle(safeName(pathSegments[pathSegments.length - 1]));
  const file = await fileHandle.getFile();
  return await file.text();
}

/* 遍历目录树，返回扁平文件列表 { path, name, handle, depth } */
export async function listFiles(root, maxDepth = 4) {
  const result = [];
  async function walk(dir, prefix, depth) {
    if (depth > maxDepth) return;
    for await (const entry of dir.values()) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.kind === 'file') {
        result.push({ path, name: entry.name, handle: entry, depth, isDir: false });
      } else {
        result.push({ path, name: entry.name, handle: entry, depth, isDir: true });
        await walk(entry, path, depth + 1);
      }
    }
  }
  await walk(root, '', 0);
  return result;
}

/* ===== Markdown 导出构造 ===== */

export function materialToMarkdown(m) {
  const lines = [`# ${m.title || '无标题'}`, ''];
  const meta = [];
  if (m.source) meta.push(`**来源**: ${m.source}`);
  if (m.url) meta.push(`**链接**: ${m.url}`);
  if (m.createdAt) meta.push(`**时间**: ${new Date(m.createdAt).toLocaleString('zh-CN')}`);
  if (m.tags?.length) meta.push(`**标签**: ${m.tags.join(', ')}`);
  if (meta.length) { lines.push(meta.join('  \n'), ''); }
  if (m.content) { lines.push('## 摘要', '', m.content, ''); }
  if (m.fullContent && m.fullContent !== m.content) { lines.push('## 正文', '', m.fullContent, ''); }
  if (m.note) { lines.push('## 笔记', '', m.note, ''); }
  if (m.insight) { lines.push('## 洞察', '', typeof m.insight === 'string' ? m.insight : JSON.stringify(m.insight, null, 2), ''); }
  return lines.join('\n');
}

export function briefingToMarkdown(briefing, lanes) {
  const lines = [`# 今日速报 ${briefing?.date || ''}`, ''];
  if (briefing?.mode) lines.push(`> ${briefing.mode === 'ai' ? 'AI 增强版' : '算法基础版'}`, '');
  if (briefing?.oneLine) { lines.push('## 今日总判断', '', `**${briefing.oneLine}**`, ''); }
  const publicItems = lanes?.public || [];
  const personalItems = lanes?.personal || [];
  if (publicItems.length) {
    lines.push('## 公共热点', '');
    publicItems.forEach((item, i) => lines.push(`${i + 1}. **${item.title}** - ${item.source || ''} - ${item.summary || item.recommendation || ''}`));
    lines.push('');
  }
  if (personalItems.length) {
    lines.push('## 个人必看', '');
    personalItems.forEach((item, i) => lines.push(`${i + 1}. **${item.title}** - ${item.source || ''} - ${item.summary || item.recommendation || ''}`));
    lines.push('');
  }
  if (briefing?.opportunities?.length) {
    lines.push('## 机会', '');
    briefing.opportunities.forEach(o => lines.push(`- ${typeof o === 'string' ? o : o.text}`));
    lines.push('');
  }
  if (briefing?.risks?.length) {
    lines.push('## 风险与待核实', '');
    briefing.risks.forEach(r => lines.push(`- ${typeof r === 'string' ? r : r.text}`));
    lines.push('');
  }
  return lines.join('\n');
}

/* 导出单个素材到工作空间 */
export async function exportMaterial(root, material) {
  const date = material.createdAt ? dateStr(new Date(material.createdAt)) : dateStr();
  const fileName = `${safeName(material.title)}.md`;
  const content = materialToMarkdown(material);
  return writeFile(root, ['news', date], fileName, content);
}

/* 批量导出素材 */
export async function exportMaterials(root, materials) {
  const results = [];
  for (const m of materials) {
    try { results.push({ ok: true, path: await exportMaterial(root, m) }); }
    catch (e) { results.push({ ok: false, error: e.message, title: m.title }); }
  }
  return results;
}

/* 导出今日速报 */
export async function exportBriefing(root, briefing, lanes) {
  const date = briefing?.date || dateStr();
  const content = briefingToMarkdown(briefing, lanes);
  return writeFile(root, ['briefings'], `${date}.md`, content);
}

/* 降级：触发浏览器下载单个文件 */
export function downloadMarkdown(fileName, content) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeName(fileName) + '.md';
  a.click();
  URL.revokeObjectURL(url);
}
