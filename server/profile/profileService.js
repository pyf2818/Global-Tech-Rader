import { createProfileRepository } from './profileRepository.js';

const TIERS = new Set(['focus', 'normal', 'explore']);
const FOLLOW_TYPES = new Set(['source', 'author', 'keyword', 'url']);
function fail(code, message, status = 400) { throw Object.assign(new Error(message), { code, status }); }

function normalizeTiers(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('INVALID_PROFILE', '画像等级格式无效');
  return Object.fromEntries(Object.entries(value).slice(0, 200).map(([id, tier]) => {
    if (!String(id).trim() || !TIERS.has(tier)) fail('INVALID_PROFILE_TIER', '画像等级无效');
    return [String(id).slice(0, 200), tier];
  }));
}

export function createProfileService(repository = createProfileRepository()) {
  return {
    getState(userId) { if (!userId) fail('UNAUTHORIZED', '请先登录', 401); return repository.getState(userId); },
    async saveState(userId, input) {
      if (!userId) fail('UNAUTHORIZED', '请先登录', 401);
      const domainTiers = normalizeTiers(input.domainTiers || {});
      const sourceTiers = normalizeTiers(input.sourceTiers || {});
      const specialFollows = Array.isArray(input.specialFollows) ? input.specialFollows.slice(0, 100).map(follow => {
        const type = String(follow.type || ''); const target = String(follow.target || '').trim();
        if (!FOLLOW_TYPES.has(type) || !target || target.length > 500) fail('INVALID_SPECIAL_FOLLOW', '特殊关注格式无效');
        return { type, target, note: String(follow.note || '').slice(0, 280) };
      }) : [];
      const confidence = Math.min(100, Math.max(0, Number(input.confidence) || 0));
      return repository.saveState(userId, { domainTiers, sourceTiers, specialFollows, confidence, behaviorSignals: input.behaviorSignals || {} });
    },
  };
}
