// WorkflowCanvas — visual graph view for workflow nodes
// Replaces vertical node list with SVG edges + HTML node cards

import { useMemo, useRef, useState, useCallback } from 'react';
import WorkflowNodeCard from './WorkflowNodeCard.jsx';
import WorkflowEdge from './WorkflowEdge.jsx';

const NODE_W = 240;
const NODE_H = 120;
const H_GAP = 80;
const V_GAP = 64;

export default function WorkflowCanvas({
  nodes = [],
  selectedNodeId,
  onSelectNode,
  onToggleNode,
  onReorderNode,
  runStatusByNodeId = {},
  toneByNodeType = {},
  disabled = false
}) {
  const containerRef = useRef(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(null);

  const positions = useMemo(() => {
    const cols = Math.ceil(Math.sqrt(nodes.length || 1));
    return nodes.map((node, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      return { x: col * (NODE_W + H_GAP), y: row * (NODE_H + V_GAP) };
    });
  }, [nodes.length]);

  const edges = useMemo(() => {
    const list = [];
    const index = {};
    nodes.forEach((n, i) => { index[n.id] = i; });
    nodes.forEach((node, i) => {
      if (node.enabled === false) return;
      const fromIdx = i;
      if (fromIdx < nodes.length - 1) {
        const toIdx = fromIdx + 1;
        list.push({
          id: `${nodes[fromIdx].id}-${nodes[toIdx].id}`,
          fromNodeId: nodes[fromIdx].id,
          toNodeId: nodes[toIdx].id,
          status: runStatusByNodeId[nodes[fromIdx].id] || 'idle'
        });
      }
    });
    return list;
  }, [nodes, runStatusByNodeId]);

  const handleDragStart = useCallback((e, nodeId) => {
    if (disabled) { e.preventDefault(); return; }
    setDragging(nodeId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/workflow-node-id', nodeId);
  }, [disabled]);

  const handleDrop = useCallback((e, targetId) => {
    e.preventDefault();
    if (!dragging || dragging === targetId) return;
    onReorderNode?.(dragging, targetId);
    setDragging(null);
  }, [dragging, onReorderNode]);

  const handleDragEnd = useCallback(() => setDragging(null), []);

  return (
    <div
      ref={containerRef}
      className="workflow-canvas"
      style={{ opacity: disabled ? 0.6 : 1 }}
    >
      <div
        className="workflow-canvas-viewport"
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      >
        <svg
          className="workflow-canvas-edges"
          width={Math.max(positions[positions.length - 1]?.x + NODE_W + 40, 800) || 800}
          height={Math.max(positions[positions.length - 1]?.y + NODE_H + 80, 300) || 300}
        >
          {edges.map((edge) => {
            const fromPos = positions[edge.fromNodeId] || { x: 0, y: 0 };
            const toPos = positions[edge.toNodeId] || { x: 0, y: 0 };
            const fromNode = nodes.find(n => n.id === edge.fromNodeId);
            const toNode = nodes.find(n => n.id === edge.toNodeId);
            return (
              <WorkflowEdge
                key={edge.id}
                fromX={fromPos.x + NODE_W}
                fromY={fromPos.y + NODE_H / 2}
                toX={toPos.x}
                toY={toPos.y + NODE_H / 2}
                status={edge.status}
                label={edge.status === 'completed' ? '→' : undefined}
              />
            );
          })}
        </svg>

        <div className="workflow-canvas-nodes">
          {nodes.map((node, index) => (
            <WorkflowNodeCard
              key={node.id}
              node={node}
              index={index}
              total={nodes.length}
              selected={selectedNodeId === node.id}
              tone={toneByNodeType[node.type]}
              status={runStatusByNodeId[node.id]}
              onSelect={onSelectNode}
              onToggle={onToggleNode}
              onDragStart={handleDragStart}
              onDragOver={(e) => { if (disabled) return; e.preventDefault(); }}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
            />
          ))}
        </div>
      </div>

      {!nodes.length && (
        <div className="workflow-canvas-empty">
          <p>还没有节点</p>
          <small>从左侧面板添加节点开始构建工作流</small>
        </div>
      )}
    </div>
  );
}
