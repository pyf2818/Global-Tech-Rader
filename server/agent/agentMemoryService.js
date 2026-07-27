// agentMemoryService.js - 智能体跨会话记忆与用户画像深化服务
// 提供 agent_memories 表的 CRUD + 用户画像 persona_summary 读写
import { getPool } from '../db/client.js';

/* ============ Agent 记忆 CRUD ============ */

/**
 * 写入一条 agent 记忆
 * @param {Object} params - { userId, agentId, sessionId, memoryType, content, evidence, weight, expiresAt }
 * @returns {Promise<string>} 新建记忆 id
 */
export async function addAgentMemory({ userId, agentId, sessionId = null, memoryType, content, evidence = [], weight = 1, expiresAt = null }) {
  const pool = getPool();
  const validTypes = ['user_habit', 'user_thought', 'user_trait', 'user_need', 'agent_insight'];
  if (!validTypes.includes(memoryType)) {
    throw new Error(`invalid memory_type: ${memoryType}, must be one of ${validTypes.join('/')}`);
  }
  const result = await pool.query(
    `insert into agent_memories (user_id, agent_id, session_id, memory_type, content, evidence, weight, expires_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
    [userId, agentId, sessionId, memoryType, content, JSON.stringify(evidence), Math.max(1, Math.min(10, weight)), expiresAt]
  );
  return result.rows[0]?.id;
}

/**
 * 批量写入记忆（一次对话总结后调用）
 */
export async function addAgentMemoriesBatch(userId, memories) {
  if (!Array.isArray(memories) || memories.length === 0) return [];
  const pool = getPool();
  const client = await pool.connect();
  const ids = [];
  try {
    await client.query('BEGIN');
    for (const m of memories) {
      const r = await client.query(
        `insert into agent_memories (user_id, agent_id, session_id, memory_type, content, evidence, weight, expires_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
        [userId, m.agentId, m.sessionId || null, m.memoryType, m.content, JSON.stringify(m.evidence || []), Math.max(1, Math.min(10, m.weight || 1)), m.expiresAt || null]
      );
      ids.push(r.rows[0]?.id);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return ids;
}

/**
 * 检索用户记忆（按 agent 或全量，按时间倒序）
 */
export async function getAgentMemories(userId, options = {}) {
  const pool = getPool();
  const agentId = options.agentId;
  const memoryType = options.memoryType;
  const limit = Math.min(Math.max(options.limit || 20, 1), 200);
  const offset = Math.max(options.offset || 0, 0);

  let sql = `select id, agent_id, session_id, memory_type, content, evidence, weight, created_at, expires_at
             from agent_memories where user_id = $1`;
  const params = [userId];
  let idx = 2;
  if (agentId) { sql += ` and agent_id = $${idx++}`; params.push(agentId); }
  if (memoryType) { sql += ` and memory_type = $${idx++}`; params.push(memoryType); }
  sql += ` order by created_at desc limit $${idx++} offset $${idx++}`;
  params.push(limit, offset);

  const result = await pool.query(sql, params);
  return result.rows.map(r => ({
    id: r.id,
    agentId: r.agent_id,
    sessionId: r.session_id,
    memoryType: r.memory_type,
    content: r.content,
    evidence: r.evidence,
    weight: r.weight,
    createdAt: r.created_at,
    expiresAt: r.expires_at,
  }));
}

/**
 * 全文检索记忆（简单 ilike 匹配）
 */
export async function searchAgentMemories(userId, query, options = {}) {
  const pool = getPool();
  const limit = Math.min(Math.max(options.limit || 10, 1), 50);
  const pattern = `%${String(query || '').trim().toLowerCase()}%`;
  const result = await pool.query(
    `select id, agent_id, session_id, memory_type, content, evidence, weight, created_at
     from agent_memories
     where user_id = $1 and lower(content) like $2
     order by weight desc, created_at desc
     limit $3`,
    [userId, pattern, limit]
  );
  return result.rows.map(r => ({
    id: r.id, agentId: r.agent_id, sessionId: r.session_id, memoryType: r.memory_type,
    content: r.content, evidence: r.evidence, weight: r.weight, createdAt: r.created_at,
  }));
}

/**
 * 删除记忆（按 id 或按会话）
 */
export async function deleteAgentMemory(userId, { memoryId = null, sessionId = null } = {}) {
  const pool = getPool();
  if (memoryId) {
    await pool.query('delete from agent_memories where user_id = $1 and id = $2', [userId, memoryId]);
    return { deleted: 1 };
  }
  if (sessionId) {
    const r = await pool.query('delete from agent_memories where user_id = $1 and session_id = $2', [userId, sessionId]);
    return { deleted: r.rowCount };
  }
  return { deleted: 0 };
}

/* ============ 用户画像 persona_summary 深化 ============ */

/**
 * 读取用户画像深化字段（persona_summary + learned_preferences）
 */
export async function getPersonaSummary(userId) {
  const pool = getPool();
  const result = await pool.query(
    `select persona_summary, learned_preferences, persona_updated_at
     from user_profiles where user_id = $1`,
    [userId]
  );
  if (result.rows.length === 0) {
    return { personaSummary: {}, learnedPreferences: {}, personaUpdatedAt: null };
  }
  const row = result.rows[0];
  return {
    personaSummary: row.persona_summary || {},
    learnedPreferences: row.learned_preferences || {},
    personaUpdatedAt: row.persona_updated_at,
  };
}

/**
 * 写入用户画像深化字段
 * personaSummary: { personality, needs, habits, thoughts, preferences, lastUpdated }
 */
export async function setPersonaSummary(userId, personaSummary, learnedPreferences = null) {
  const pool = getPool();
  const fields = ['persona_summary = $2', 'persona_updated_at = now()'];
  const params = [userId, JSON.stringify(personaSummary)];
  let idx = 3;
  if (learnedPreferences !== null) {
    fields.push(`learned_preferences = $${idx++}`);
    params.push(JSON.stringify(learnedPreferences));
  }
  const result = await pool.query(
    `update user_profiles set ${fields.join(', ')} where user_id = $1`,
    params
  );
  return { updated: result.rowCount };
}

/**
 * 合并式更新 personaSummary：读取旧值 → 合并新字段 → 写回
 * 用于「每轮对话后增量深化画像」场景
 */
export async function mergePersonaSummary(userId, patch) {
  const current = await getPersonaSummary(userId);
  const next = { ...current.personaSummary, ...patch, lastUpdated: new Date().toISOString() };
  return setPersonaSummary(userId, next);
}
