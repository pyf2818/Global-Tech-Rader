/**
 * PersonaEditor - 智能体角色设定编辑器（OpenClaw 风格的灵魂设定）
 *
 * 在 AI 工作站（AiChatPanel）顶部入口打开，作为侧滑面板编辑当前 agent 的：
 * - persona: { traits, background, values }
 * - soul: 核心信念
 * - voice: { tone, pace, formality }
 * - habits: 行为习惯列表
 *
 * 编辑后通过 onChange 实时回调，由父组件持久化到 useAgents store
 */
import { useEffect, useState } from 'react';

export default function PersonaEditor({ value, onChange, agentName }) {
  const persona = value?.persona || { traits: [], background: '', values: [] };
  const soul = value?.soul || '';
  const voice = value?.voice || { tone: '', pace: '', formality: '' };
  const habits = Array.isArray(value?.habits) ? value.habits : [];

  const patch = (kv) => onChange({ ...(value || {}), ...kv });

  return (
    <div className="persona-editor">
      <div className="persona-editor-header">
        <h3>角色设定</h3>
        <span className="persona-editor-agent-name">{agentName || '未选择智能体'}</span>
      </div>

      <div className="persona-editor-body">
        <section className="persona-section">
          <div className="persona-section-title">
            <span className="persona-section-icon">🎭</span>
            <span>性格特质（persona）</span>
          </div>
          <div className="persona-field">
            <label>性格特质（逗号分隔）</label>
            <input
              type="text"
              value={(persona.traits || []).join(', ')}
              onChange={e => patch({ persona: { ...persona, traits: e.target.value.split(',').map(t => t.trim()).filter(Boolean) } })}
              placeholder="如：全局视野, 逻辑严密, 决策果断"
              className="persona-input"
            />
          </div>
          <div className="persona-field">
            <label>背景设定</label>
            <input
              type="text"
              value={persona.background || ''}
              onChange={e => patch({ persona: { ...persona, background: e.target.value } })}
              placeholder="如：资深情报分析总监，10年+统筹经验"
              className="persona-input"
            />
          </div>
          <div className="persona-field">
            <label>价值观（逗号分隔）</label>
            <input
              type="text"
              value={(persona.values || []).join(', ')}
              onChange={e => patch({ persona: { ...persona, values: e.target.value.split(',').map(t => t.trim()).filter(Boolean) } })}
              placeholder="如：准确性, 效率, 用户目标对齐"
              className="persona-input"
            />
          </div>
        </section>

        <section className="persona-section">
          <div className="persona-section-title">
            <span className="persona-section-icon">✨</span>
            <span>灵魂（soul）</span>
          </div>
          <div className="persona-field">
            <label className="persona-field-label-with-hint">
              核心信念
              <span className="persona-hint">1-2 句话，定义智能体的内在驱动</span>
            </label>
            <textarea
              value={soul}
              onChange={e => patch({ soul: e.target.value })}
              placeholder="如：我相信好的情报不是堆砌信息，而是把信息变成决策。用户的时间宝贵，我要替他过滤噪声、放大信号。"
              rows={3}
              className="persona-textarea"
            />
          </div>
        </section>

        <section className="persona-section">
          <div className="persona-section-title">
            <span className="persona-section-icon">🎙️</span>
            <span>语气（voice）</span>
          </div>
          <div className="persona-voice-grid">
            <div className="persona-field">
              <label>语气</label>
              <input
                type="text"
                value={voice.tone || ''}
                onChange={e => patch({ voice: { ...voice, tone: e.target.value } })}
                placeholder="如：专业但不冷漠"
                className="persona-input"
              />
            </div>
            <div className="persona-field">
              <label>节奏</label>
              <input
                type="text"
                value={voice.pace || ''}
                onChange={e => patch({ voice: { ...voice, pace: e.target.value } })}
                placeholder="如：紧凑"
                className="persona-input"
              />
            </div>
            <div className="persona-field">
              <label>正式度</label>
              <input
                type="text"
                value={voice.formality || ''}
                onChange={e => patch({ voice: { ...voice, formality: e.target.value } })}
                placeholder="如：适中"
                className="persona-input"
              />
            </div>
          </div>
        </section>

        <section className="persona-section">
          <div className="persona-section-title">
            <span className="persona-section-icon">📋</span>
            <span>行为习惯（habits）</span>
          </div>
          <div className="persona-field">
            <label className="persona-field-label-with-hint">
              行为准则
              <span className="persona-hint">每行一条，回复时遵循</span>
            </label>
            <textarea
              value={habits.join('\n')}
              onChange={e => patch({ habits: e.target.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean) })}
              placeholder={'如：\n先给结论再展开依据\n复杂任务必先拆解为执行计划\n每次回复末尾给出明确的下一步动作'}
              rows={5}
              className="persona-textarea"
            />
          </div>
        </section>
      </div>
    </div>
  );
}

/* 侧滑面板容器：从右侧滑入，背景半透明遮罩，点击遮罩或 Esc 关闭 */
export function PersonaDrawer({ open, onClose, agent, onChange }) {
  const [draft, setDraft] = useState(null);

  // 打开时初始化 draft（深拷贝避免直接修改原 agent）
  useEffect(() => {
    if (open && agent) {
      setDraft({
        persona: agent.persona ? JSON.parse(JSON.stringify(agent.persona)) : { traits: [], background: '', values: [] },
        soul: agent.soul || '',
        voice: agent.voice ? { ...agent.voice } : { tone: '', pace: '', formality: '' },
        habits: Array.isArray(agent.habits) ? [...agent.habits] : [],
      });
    } else {
      setDraft(null);
    }
  }, [open, agent?.id]);

  // Esc 关闭
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !agent) return null;

  const handleSave = () => {
    if (draft && onChange) {
      onChange(agent.id, draft);
    }
    onClose();
  };

  return (
    <div className="persona-drawer-overlay" onClick={onClose}>
      <div className="persona-drawer" onClick={e => e.stopPropagation()}>
        <div className="persona-drawer-header">
          <div className="persona-drawer-title">
            <span className="persona-drawer-icon">⚙️</span>
            <span>角色设定 · {agent.name}</span>
          </div>
          <button className="persona-drawer-close" onClick={onClose} title="关闭（Esc）">×</button>
        </div>
        <div className="persona-drawer-content custom-scrollbar">
          {draft && (
            <PersonaEditor
              value={draft}
              onChange={(patch) => setDraft(prev => ({ ...prev, ...patch }))}
              agentName={agent.name}
            />
          )}
        </div>
        <div className="persona-drawer-footer">
          <button className="persona-drawer-btn persona-drawer-btn-save" onClick={handleSave}>确定</button>
          <button className="persona-drawer-btn persona-drawer-btn-cancel" onClick={onClose}>取消</button>
        </div>
      </div>
    </div>
  );
}
