// 素材库上下文派生：对素材列表做归一化、打分、排序，选出 top 6 转成上下文行
// 从 src/components/AiChatPanel.jsx 抽离，纯函数
import { isAiElfAsset, normalizeAsset } from '../../domain/creative/assetModel.js';

/**
 * @param {Array} materials 素材列表
 * @returns {{total:number, elfCount:number, selected:Array, lines:Array<string>, hasElf:boolean}}
 */
export function buildMaterialContext(materials) {
  const materialList = Array.isArray(materials) ? materials : [];
  const normalized = materialList.flatMap((material) => {
    try { return [normalizeAsset(material)]; } catch { return []; }
  });
  const scored = normalized.map((material, index) => ({
    material,
    index,
    score: (isAiElfAsset(material) ? 100 : 0)
      + (material.starred ? 20 : 0)
      + (Date.parse(material.createdAt || '') || 0) / 1_000_000_000_000,
    isElf: isAiElfAsset(material),
  }));
  scored.sort((a, b) => b.score - a.score || b.index - a.index);
  const selected = scored.slice(0, 6).map(entry => entry.material);
  const elfCount = scored.filter(entry => entry.isElf).length;
  const lines = selected.map((material, index) => {
    const tags = Array.isArray(material.tags) ? material.tags.join('、') : '';
    const content = String(material.fullContent || material.content || '').replace(/\s+/g, ' ').slice(0, 900);
    return `[素材:${material.id || index + 1}] 标题：${material.title || '未命名素材'}；来源：${material.source || '未知'}；类型：${material.type || 'material'}；标签：${tags || '无'}；内容：${content || '无内容'}`;
  });
  return {
    total: materialList.length,
    elfCount,
    selected,
    lines,
    hasElf: elfCount > 0,
  };
}
