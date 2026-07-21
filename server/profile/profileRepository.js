import { getPool, withTransaction } from '../db/client.js';

export function createProfileRepository(db = getPool()) {
  return {
    async getState(userId) {
      const [profile, domains, sources, follows] = await Promise.all([
        db.query('select version, confidence, behavior_signals as "behaviorSignals" from user_profiles where user_id = $1', [userId]),
        db.query('select domain_id as id, tier from profile_domains where user_id = $1 order by domain_id', [userId]),
        db.query('select source_id as id, tier from profile_sources where user_id = $1 order by source_id', [userId]),
        db.query('select id, type, target, note, created_at as "createdAt" from special_follows where user_id = $1 order by created_at desc', [userId]),
      ]);
      return {
        version: profile.rows[0]?.version || 1,
        confidence: Number(profile.rows[0]?.confidence || 0),
        behaviorSignals: profile.rows[0]?.behaviorSignals || {},
        domains: domains.rows,
        sources: sources.rows,
        specialFollows: follows.rows,
      };
    },
    async saveState(userId, state) {
      return withTransaction(async client => {
        await client.query('insert into user_profiles(user_id) values ($1) on conflict do nothing', [userId]);
        const profile = await client.query(
          `update user_profiles set version = version + 1, confidence = $2, behavior_signals = $3, updated_at = now()
           where user_id = $1 and ($4::integer is null or version = $4) returning version`,
          [userId, state.confidence || 0, JSON.stringify(state.behaviorSignals || {}), state.expectedVersion ?? null],
        );
        if (!profile.rows[0]) throw Object.assign(new Error('画像已在其他设备更新，请重新加载后再保存'), { code: 'PROFILE_VERSION_CONFLICT', status: 409 });
        await client.query('delete from profile_domains where user_id = $1', [userId]);
        await client.query('delete from profile_sources where user_id = $1', [userId]);
        await client.query('delete from special_follows where user_id = $1', [userId]);
        for (const [id, tier] of Object.entries(state.domainTiers || {})) await client.query('insert into profile_domains(user_id, domain_id, tier) values ($1,$2,$3)', [userId, id, tier]);
        for (const [id, tier] of Object.entries(state.sourceTiers || {})) await client.query('insert into profile_sources(user_id, source_id, tier) values ($1,$2,$3)', [userId, id, tier]);
        for (const follow of state.specialFollows || []) await client.query('insert into special_follows(user_id, type, target, note) values ($1,$2,$3,$4) on conflict do nothing', [userId, follow.type, follow.target, follow.note || '']);
        return profile.rows[0]?.version || 1;
      });
    },
  };
}
