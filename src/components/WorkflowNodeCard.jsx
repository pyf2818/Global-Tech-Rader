import { useCallback } from 'react';
import { formatWorkflowNodeConfig, getWorkflowSkillMeta, isWorkflowSkillId } from '../constants/workflowConstants.js';

export default function WorkflowNodeCard({
  node,
  index,
  total,
  selected,
  tone,
  status,
  onSelect,
  onToggle,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  outputKeyOverride
}) {
  const config = formatWorkflowNodeConfig(node);
  const skillMeta = node.type === 'skill' ? getWorkflowSkillMeta(node.skillId) : null;
  const isMultiOutput = node.type === 'classifier';

  const handleToggle = useCallback((e) => {
    e.stopPropagation();
    onToggle?.(node.id, !node.enabled);
  }, [node.id, node.enabled, onToggle]);

  const inputLabel = node.inputKey || (index === 0 ? 'context' : `step_${index}`);
  const outputLabel = outputKeyOverride || node.outputKey || (node.type === 'output' ? 'final' : `step_${index + 1}`);

  return (
    <div
      className={`workflow-node-frame ${selected ? 'selected' : ''}`}
      draggable
      onDragStart={(e) => onDragStart?.(e, node.id)}
      onDragOver={(e) => onDragOver?.(e)}
      onDrop={(e) => onDrop?.(e, node.id)}
      onDragEnd={onDragEnd}
    >
      <button
        type="button"
        className={`workflow-canvas-node tone-${tone || 'slate'} ${selected ? 'active' : ''} ${node.enabled === false ? 'disabled' : ''} ${status ? `status-${status}` : ''}`}
        onClick={() => onSelect?.(node.id)}
      >
        <span className="workflow-node-index">{String(index + 1).padStart(2, '0')}</span>
        <span className="workflow-node-type">
          {node.type === 'skill' && skillMeta ? skillMeta.label : node.type}
        </span>
        <strong className="workflow-node-title">{node.title}</strong>
        {node.role && <p className="workflow-node-role">{node.role}</p>}
        {config && <small className="workflow-node-config">{config}</small>}
      </button>

      {index < total - 1 && <span className="workflow-canvas-connector" />}

      <div className="workflow-node-ports">
        <span className="workflow-port input-port" title={`输入: ${inputLabel}`}>in</span>
        {isMultiOutput ? (
          <span className="workflow-port output-port multi" title="多路输出 (分类)">N→</span>
        ) : node.type === 'condition' ? (
          <span className="workflow-port output-port dual" title="双路输出: onTrue / onFalse">2→</span>
        ) : node.type !== 'output' ? (
          <span className="workflow-port output-port" title={`输出: ${outputLabel}`}>out</span>
        ) : null}
      </div>

      <label className="workflow-canvas-toggle" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={node.enabled !== false}
          onChange={handleToggle}
        />
        <span>启用</span>
      </label>
    </div>
  );
}
