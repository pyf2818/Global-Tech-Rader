import { describe, expect, it } from 'vitest';
import {
  domainTierScore,
  migrateLegacyPriorities,
  migratePreferenceState,
  migrateSpecialFollows,
  sourceTierScore,
} from '../profileTiers.js';

describe('profile tiers', () => {
  it('maps legacy 1..5 values to explicit tiers', () => {
    expect(migrateLegacyPriorities({ ai: 5, cloud: 3, robotics: 1 })).toEqual({
      ai: 'focus', cloud: 'normal', robotics: 'explore',
    });
  });

  it('uses deterministic domain and source weights', () => {
    expect(['focus', 'normal', 'explore', undefined].map(domainTierScore)).toEqual([25, 14, 5, 8]);
    expect(['focus', 'normal', 'explore', undefined].map(sourceTierScore)).toEqual([20, 11, 4, 7]);
  });

  it('prefers the versioned key and keeps legacy migration deterministic', () => {
    expect(migratePreferenceState({ 'domainTiers:v1': { ai: 'explore' }, domainPriorities: { ai: 5 } }, 'domain')).toEqual({ ai: 'explore' });
    expect(migratePreferenceState({ domainPriorities: { ai: 5, chips: 2 } }, 'domain')).toEqual({ ai: 'focus', chips: 'normal' });
  });

  it('types and deduplicates legacy special follows', () => {
    expect(migrateSpecialFollows([
      { id: 1, name: 'Lab', url: 'https://lab.example', note: '重点' },
      { id: 2, name: 'lab', url: 'duplicate' },
    ])).toEqual([{ id: 1, type: 'source', target: 'Lab', note: '重点', legacyUrl: 'https://lab.example' }]);
  });
});
