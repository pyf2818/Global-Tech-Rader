export const PROFILE_TIERS = Object.freeze({
  focus: Object.freeze({ id: 'focus', label: '一级 · 重点', shortLabel: '一级' }),
  normal: Object.freeze({ id: 'normal', label: '二级 · 常规', shortLabel: '二级' }),
  explore: Object.freeze({ id: 'explore', label: '三级 · 探索', shortLabel: '三级' }),
});

export const PROFILE_TIER_OPTIONS = Object.freeze(Object.values(PROFILE_TIERS));
export const SPECIAL_FOLLOW_TYPES = Object.freeze([
  Object.freeze({ id: 'source', label: '信源' }),
  Object.freeze({ id: 'author', label: '博主' }),
  Object.freeze({ id: 'keyword', label: '关键词' }),
  Object.freeze({ id: 'url', label: 'URL' }),
]);

const DOMAIN_SCORES = Object.freeze({ focus: 25, normal: 14, explore: 5 });
const SOURCE_SCORES = Object.freeze({ focus: 20, normal: 11, explore: 4 });
const TIER_IDS = new Set(Object.keys(PROFILE_TIERS));

export function normalizeTier(value) {
  if (TIER_IDS.has(value)) return value;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return undefined;
  if (numeric >= 4) return 'focus';
  if (numeric >= 2) return 'normal';
  return 'explore';
}

export function migrateLegacyPriorities(priorities = {}) {
  if (!priorities || typeof priorities !== 'object' || Array.isArray(priorities)) return {};
  return Object.fromEntries(
    Object.entries(priorities)
      .map(([key, value]) => [key, normalizeTier(value)])
      .filter(([, value]) => Boolean(value))
  );
}

export function migratePreferenceState(storageState = {}, kind) {
  if (kind !== 'domain' && kind !== 'source') return {};
  const tierValue = storageState[`${kind}Tiers:v1`];
  if (tierValue && typeof tierValue === 'object' && !Array.isArray(tierValue)) {
    return migrateLegacyPriorities(tierValue);
  }
  return migrateLegacyPriorities(storageState[`${kind}Priorities`] || {});
}

export function migrateSpecialFollows(items = []) {
  if (!Array.isArray(items)) return [];
  const seen = new Set();
  return items.flatMap((item, index) => {
    if (!item || typeof item !== 'object') return [];
    const type = SPECIAL_FOLLOW_TYPES.some(option => option.id === item.type) ? item.type : 'source';
    const target = String(item.target || item.name || item.url || '').trim();
    if (!target) return [];
    const key = `${type}:${target.toLocaleLowerCase()}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{
      id: item.id || `legacy-${index}-${encodeURIComponent(target).slice(0, 32)}`,
      type,
      target,
      note: String(item.note || '').trim(),
      ...(item.target ? {} : { legacyUrl: String(item.url || '').trim() }),
    }];
  });
}

export function domainTierScore(tier) {
  return DOMAIN_SCORES[normalizeTier(tier)] ?? 8;
}

export function sourceTierScore(tier) {
  return SOURCE_SCORES[normalizeTier(tier)] ?? 7;
}
