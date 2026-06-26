// WorkflowEdge — SVG edge between two workflow nodes
// Renders bezier curve with status-aware styling

export default function WorkflowEdge({
  fromX,
  fromY,
  toX,
  toY,
  status = 'idle',
  label,
  className = ''
}) {
  const isVertical = Math.abs(toY - fromY) > Math.abs(toX - fromX);
  const midY = (fromY + toY) / 2;

  let path;
  if (isVertical) {
    const ctrlY = midY;
    path = `M ${fromX} ${fromY} C ${fromX} ${ctrlY}, ${toX} ${ctrlY}, ${toX} ${toY}`;
  } else {
    const ctrlX = (fromX + toX) / 2;
    path = `M ${fromX} ${fromY} C ${ctrlX} ${fromY}, ${ctrlX} ${toY}, ${toX} ${toY}`;
  }

  const statusClass = status ? `status-${status}` : '';
  const strokeColor = status === 'running' ? 'var(--accent-cyan)' :
                      status === 'completed' ? 'var(--accent-emerald)' :
                      status === 'failed' ? 'var(--accent-rose)' :
                      status === 'error' ? 'var(--accent-rose)' :
                      status === 'blocked' ? 'var(--accent-amber)' :
                      'var(--border-color)';

  return (
    <g className={`workflow-edge ${statusClass} ${className}`}>
      <path
        d={path}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeDasharray={status === 'running' ? '6 3' : 'none'}
        className="workflow-edge-path"
      />
      {label && (
        <text
          x={(fromX + toX) / 2}
          y={(fromY + toY) / 2 - 6}
          textAnchor="middle"
          className="workflow-edge-label"
          fill="var(--text-muted)"
          fontSize="11"
        >
          {label}
        </text>
      )}
    </g>
  );
}
