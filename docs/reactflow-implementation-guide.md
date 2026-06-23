# ReactFlow (@xyflow/react v12.11.1) - Implementation Guide

## 1. Package Info

- **Package**: `@xyflow/react` v12.11.1
- **Dependencies**: `zustand ^4.4.0`, `classcat ^5.0.3`, `@xyflow/system 0.0.78`
- **Peer deps**: `react >=17`, `react-dom >=17` (React 19 fully supported)
- **Exports**: ESM (`dist/esm/index.js`), UMD (`dist/umd/index.js`), CSS (`dist/style.css`, `dist/base.css`)
- **Side effects**: CSS files only

## 2. Vite Setup (Zero Issues)

No special Vite config needed. Install and import:

```bash
npm install @xyflow/react
```

```jsx
import { ReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
```

No ESM compatibility issues. Works with React 19 + Vite out of the box.

## 3. Core Concepts

### Node Structure

```ts
type Node<NodeData, NodeType extends string> = {
  id: string;
  type: NodeType;                    // matches key in nodeTypes registry
  position: { x: number; y: number };
  data: NodeData;                    // arbitrary data passed to component
  style?: CSSProperties;
  className?: string;
  sourcePosition?: Position;         // where source handles render
  targetPosition?: Position;         // where target handles render
  parentId?: string;                 // for nested/group nodes
  zIndex?: number;
  selectable?: boolean;
  draggable?: boolean;
  // ... more optional fields
};
```

### Edge Structure

```ts
type Edge<EdgeData, EdgeType extends string> = {
  id: string;
  source: string;                    // source node id
  target: string;                    // target node id
  sourceHandle?: string | null;      // which source handle (null = default)
  targetHandle?: string | null;      // which target handle (null = default)
  type?: EdgeType;                   // matches key in edgeTypes registry
  data?: EdgeData;
  label?: ReactNode;                 // edge label
  labelStyle?: CSSProperties;
  labelShowBg?: boolean;
  labelBgStyle?: CSSProperties;
  labelBgPadding?: [number, number];
  labelBgBorderRadius?: number;
  animated?: boolean;
  style?: CSSProperties;
  className?: string;
  markerStart?: string;              // SVG marker id
  markerEnd?: string;                // SVG marker id
};
```

### Handle Component

```tsx
import { Handle, Position } from '@xyflow/react';

// HandleProps:
// type: 'source' | 'target' (default: 'source')
// position: Position.Top | Position.Right | Position.Bottom | Position.Left
// id?: string     - required when node has multiple handles of same type
// isConnectable?: boolean
// isConnectableStart?: boolean
// isConnectableEnd?: boolean
// isValidConnection?: (edge) => boolean
// onConnect?: (connection) => void

function MyNode({ data }) {
  return (
    <div>
      <Handle type="target" position={Position.Left} id="input-1" />
      <Handle type="target" position={Position.Left} id="input-2" />
      <div>{data.label}</div>
      <Handle type="source" position={Position.Right} id="output-true" />
      <Handle type="source" position={Position.Right} id="output-false" />
    </div>
  );
}
```

**Connection matching**: Edges connect via `sourceHandle` and `targetHandle` IDs. If no ID is specified, the edge connects to the default (unnamed) handle.

### Built-in Node Types

Built-in types: `'input'`, `'output'`, `'default'`, `'group'`

### Built-in Edge Types

- `'default'` (bezier)
- `'smoothstep'`
- `'step'`
- `'straight'`

### Position Enum

```ts
enum Position {
  Top = 'top',
  Right = 'right',
  Bottom = 'bottom',
  Left = 'left',
}
```

## 4. Custom Node Types

### Registering Custom Node Types

```tsx
import { ReactFlow, NodeTypes, ReactFlowProvider } from '@xyflow/react';

// Define the node type with TypeScript
type ConditionNode = Node<{ condition: string; onTrue: string; onFalse: string }, 'condition'>;
type MyNode = BuiltInNode | ConditionNode;

// Registry - MUST be defined outside component or memoized
const nodeTypes: NodeTypes = {
  condition: ConditionNodeComponent,
};

function Flow() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodeTypes={nodeTypes}  // register here
    />
  );
}

// MUST wrap with ReactFlowProvider when using useReactFlow
export default () => (
  <ReactFlowProvider>
    <Flow />
  </ReactFlowProvider>
);
```

**IMPORTANT**: `nodeTypes` must be defined OUTSIDE the component or memoized with `useMemo`. Defining it inside the component causes re-registration on every render.

### Custom Node Component Pattern

```tsx
import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import type { Node } from '@xyflow/react';

// Define typed data
type SelectorNodeData = { color: string; label: string };
type SelectorNode = Node<SelectorNodeData, 'selectorNode'>;

function SelectorNodeComponent({ data, isConnectable }: NodeProps<SelectorNode>) {
  return (
    <>
      {/* Single target handle */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#555' }}
      />

      {/* Node content */}
      <div style={{ padding: '8px' }}>
        <strong>{data.label}</strong>
        <input type="color" defaultValue={data.color} className="nodrag" />
      </div>

      {/* Multiple source handles with IDs */}
      <Handle
        type="source"
        position={Position.Right}
        id="a"               // handle ID for first output
        style={{ top: 10 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="b"               // handle ID for second output
        style={{ bottom: 10, top: 'auto' }}
      />
    </>
  );
}

// Wrap with memo for performance
export default memo(SelectorNodeComponent);
```

### Connecting Edges to Specific Handles

```ts
const edges = [
  {
    id: 'e1-3',
    source: '1',        // source node id
    target: '3',        // target node id
    sourceHandle: 'a',  // connects to handle with id="a" on source node
    targetHandle: null,  // connects to default handle on target node
    animated: true,
    style: { stroke: '#fff' },
  },
];
```

### Passing Data to Nodes

```ts
// When creating nodes, pass data via the data property:
const nodes = [
  {
    id: '2',
    type: 'selectorNode',
    data: {
      color: '#ff0000',
      label: 'Pick a color',
      onChange: (e) => console.log(e.target.value),  // functions are OK in data
    },
    position: { x: 250, y: 50 },
    style: { border: '1px solid #777', padding: 10 },
  },
];
```

### Styling Custom Nodes

- Use `style` prop on the node object for container styling
- Use `className` prop on the node object for CSS classes
- Special CSS classes: `nodrag` (prevents drag on element), `nopan` (prevents pan), `nowheel` (prevents zoom on element)
- Apply `nodrag` class to interactive elements like inputs/buttons inside nodes

## 5. Conditional Branching Pattern

### Node with Multiple Output Handles

```tsx
function ConditionNode({ data }: NodeProps<ConditionNode>) {
  return (
    <div className="condition-node" style={{
      border: '2px solid #666',
      borderRadius: 8,
      background: '#1a1a2e',
      padding: 12,
    }}>
      <Handle type="target" position={Position.Left} />

      <div className="node-header">
        <span className="icon">?</span>
        <strong>If/Else</strong>
      </div>
      <div className="node-body">{data.condition}</div>

      {/* True branch - top output */}
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        style={{ background: '#16a34a', top: '30%' }}
      />

      {/* False branch - bottom output */}
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        style={{ background: '#dc2626', top: '70%' }}
      />
    </div>
  );
}
```

### Edge Labels for Conditions

Two approaches for edge labels:

**Approach A: Built-in label props on Edge**

```ts
const edges = [
  {
    id: 'e-cond-true',
    source: 'condition-1',
    sourceHandle: 'true',
    target: 'action-yes',
    label: 'Yes',
    labelStyle: { fill: '#16a34a', fontWeight: 'bold' },
    labelShowBg: true,
    labelBgStyle: { fill: '#1a1a2e', fillOpacity: 0.9 },
    labelBgPadding: [6, 3],
    labelBgBorderRadius: 4,
    style: { stroke: '#16a34a' },
  },
  {
    id: 'e-cond-false',
    source: 'condition-1',
    sourceHandle: 'false',
    target: 'action-no',
    label: 'No',
    labelStyle: { fill: '#dc2626', fontWeight: 'bold' },
    labelShowBg: true,
    labelBgStyle: { fill: '#1a1a2e', fillOpacity: 0.9 },
    labelBgPadding: [6, 3],
    labelBgBorderRadius: 4,
    style: { stroke: '#dc2626' },
  },
];
```

**Approach B: EdgeLabelRenderer for complex HTML labels**

```tsx
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react';

function ConditionEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data }: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  return (
    <>
      <BaseEdge id={id} path={edgePath} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            background: data.condition ? '#16a34a' : '#dc2626',
            color: 'white',
            padding: '4px 8px',
            borderRadius: 4,
            fontSize: 12,
            fontWeight: 'bold',
          }}
          className="nodrag nopan"
        >
          {data.label}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
```

**Note**: `EdgeLabelRenderer` is a portal rendering into a div overlay. By default has no pointer events - add `style={{ pointerEvents: 'all' }}` and class `nopan` for interactive labels.

### Visual Differentiation for Branch Types

```ts
// Use different edge styles per branch
const conditionalEdges = [
  {
    id: 'e-true',
    source: 'cond-1',
    sourceHandle: 'true',
    target: 'next-1',
    animated: true,           // animated for "active" branch
    style: { stroke: '#16a34a', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#16a34a' },
  },
  {
    id: 'e-false',
    source: 'cond-1',
    sourceHandle: 'false',
    target: 'next-2',
    animated: false,
    style: { stroke: '#dc2626', strokeWidth: 2, strokeDasharray: '5,5' },  // dashed for inactive
    markerEnd: { type: MarkerType.ArrowClosed, color: '#dc2626' },
  },
];
```

## 6. Serialization / Deserialization

### `toObject()` Method

The `ReactFlowInstance` provides a `toObject()` method that serializes the entire flow state:

```tsx
import { useReactFlow } from '@xyflow/react';

function SaveButton() {
  const { toObject } = useReactFlow();

  const handleSave = () => {
    const flowObject = toObject();
    // flowObject has this structure:
    // {
    //   nodes: Node[],
    //   edges: Edge[],
    //   viewport: { x: number, y: number, zoom: number }
    // }
    localStorage.setItem('flow', JSON.stringify(flowObject));
  };

  return <button onClick={handleSave}>Save</button>;
}
```

### JSON Schema (ReactFlowJsonObject)

```ts
type ReactFlowJsonObject<NodeType, EdgeType> = {
  nodes: NodeType[];     // Array of node objects (with id, type, position, data)
  edges: EdgeType[];     // Array of edge objects (with id, source, target, etc.)
  viewport: {            // Current viewport transform
    x: number;           // pan X offset
    y: number;           // pan Y offset
    zoom: number;        // zoom level
  };
};
```

### Restoring from JSON

```tsx
import { useEffect, useCallback } from 'react';
import { ReactFlow, useNodesState, useEdgesState, ReactFlowProvider, useReactFlow } from '@xyflow/react';

function FlowWithPersistence() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { setViewport, getViewport } = useReactFlow();

  // Restore on mount
  useEffect(() => {
    const saved = localStorage.getItem('flow');
    if (saved) {
      const flow = JSON.parse(saved);
      setNodes(flow.nodes || []);
      setEdges(flow.edges || []);
      if (flow.viewport) {
        setViewport(flow.viewport);  // restore pan/zoom
      }
    }
  }, []);

  // Save on changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      const flow = { nodes, edges, viewport: getViewport() };
      localStorage.setItem('flow', JSON.stringify(flow));
    }, 500);
    return () => clearTimeout(timer);
  }, [nodes, edges]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
    />
  );
}
```

### What's Included/Excluded in Serialization

**Included** (via `toObject()`):
- Node: `id`, `type`, `position`, `data`, `style`, `className`, `parentId`, `sourcePosition`, `targetPosition`
- Edge: `id`, `source`, `target`, `sourceHandle`, `targetHandle`, `type`, `data`, `label`, `animated`, `style`
- Viewport: `x`, `y`, `zoom`

**Excluded** (internal only):
- Node `measured` (width/height calculated by DOM)
- Node `internals` (absolute position, z-index calculations)
- Handle positions (calculated from DOM)
- Any React-specific state (refs, contexts)

## 7. Performance with Many Nodes

### Built-in Optimizations

1. **Selective Re-rendering**: ReactFlow only re-renders nodes that have changed. Each node is wrapped in a `memo`-equivalent internally.

2. **`onlyRenderVisibleElements` Prop**: Set to `true` on `<ReactFlow>` to only render nodes/edges visible in the viewport:
   ```tsx
   <ReactFlow onlyRenderVisibleElements={true} />
   ```

3. **Node Measurement**: Uses `ResizeObserver` internally. Nodes are measured once and cached.

### Manual Optimizations

1. **Memoize nodeTypes and edgeTypes** - define outside component:
   ```tsx
   // GOOD - stable reference
   const nodeTypes = useMemo(() => ({
     condition: ConditionNode,
     action: ActionNode,
   }), []);

   // BAD - new reference every render
   const nodeTypes = { condition: ConditionNode };
   ```

2. **Use `applyNodeChanges` / `applyEdgeChanges`** instead of manual state updates:
   ```tsx
   import { applyNodeChanges, applyEdgeChanges } from '@xyflow/react';

   const onNodesChange = useCallback((changes) => {
     setNodes((nds) => applyNodeChanges(changes, nds));
   }, []);
   ```

3. **Use controlled state** (`useNodesState`/`useEdgesState`) rather than `defaultNodes`/`defaultEdges` for large flows.

4. **Snap to grid** for better visual alignment:
   ```tsx
   <ReactFlow snapToGrid snapGrid={[16, 16]} />
   ```

5. **Node measurement optimization** - set explicit `width`/`height` on nodes to skip measurement:
   ```ts
   { id: '1', type: 'default', position: { x: 0, y: 0 }, data: { label: 'A' }, width: 200, height: 80 }
   ```

### Known Limits

- No built-in virtualization plugin for 1000+ nodes (use `onlyRenderVisibleElements`)
- Zustand store is the bottleneck for very large state updates
- Edge rendering is O(n*m) where n=edges, m=control points
- For 500+ nodes, consider canvas-based alternatives or heavy use of `onlyRenderVisibleElements`

## 8. Complete Working Example: Conditional Flow Editor

```tsx
import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type EdgeProps,
  type NodeProps,
  type NodeTypes,
  type OnConnect,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// ===== Node Types =====

type ConditionNode = Node<{ condition: string }, 'condition'>;
type ActionNode = Node<{ label: string; color: string }, 'action'>;
type StartNode = Node<{ label: string }, 'start'>;
type MyNode = StartNode | ConditionNode | ActionNode;

// Condition Node - has two outputs (true/false)
function ConditionNodeComponent({ data }: NodeProps<ConditionNode>) {
  return (
    <div style={{
      border: '2px solid #666',
      borderRadius: 8,
      background: '#1a1a2e',
      padding: '8px 16px',
      minWidth: 150,
    }}>
      <Handle type="target" position={Position.Left} />
      <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Condition</div>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{data.condition}</div>
      <Handle
        type="source" position={Position.Right} id="true"
        style={{ background: '#16a34a', top: '35%' }}
      />
      <Handle
        type="source" position={Position.Right} id="false"
        style={{ background: '#dc2626', top: '65%' }}
      />
    </div>
  );
}

// Action Node - single output
function ActionNodeComponent({ data }: NodeProps<ActionNode>) {
  return (
    <div style={{
      border: `2px solid ${data.color || '#0088ff'}`,
      borderRadius: 8,
      background: '#1a1a2e',
      padding: '8px 16px',
    }}>
      <Handle type="target" position={Position.Left} />
      <div style={{ fontWeight: 'bold' }}>{data.label}</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

// ===== Custom Edge with Label =====

function LabeledEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, style }: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} />
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              background: '#1a1a2e',
              border: `1px solid ${style?.stroke || '#666'}`,
              color: style?.stroke || '#fff',
              padding: '2px 6px',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 'bold',
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

// ===== Flow Component =====

const initialNodes: MyNode[] = [
  { id: 'start', type: 'start', data: { label: 'Start' }, position: { x: 0, y: 100 } },
  {
    id: 'cond-1', type: 'condition', data: { condition: 'user.isPremium' },
    position: { x: 250, y: 80 },
  },
  {
    id: 'action-yes', type: 'action', data: { label: 'Show Premium Content', color: '#16a34a' },
    position: { x: 550, y: 20 },
  },
  {
    id: 'action-no', type: 'action', data: { label: 'Show Upsell', color: '#dc2626' },
    position: { x: 550, y: 160 },
  },
];

const initialEdges: Edge[] = [
  { id: 'e-start-cond', source: 'start', target: 'cond-1', animated: true },
  {
    id: 'e-true', source: 'cond-1', sourceHandle: 'true', target: 'action-yes',
    label: 'Yes', style: { stroke: '#16a34a' },
    labelStyle: { fill: '#16a34a', fontWeight: 'bold' },
    labelShowBg: true, labelBgStyle: { fill: '#1a1a2e' }, labelBgPadding: [4, 2],
    markerEnd: { type: MarkerType.ArrowClosed, color: '#16a34a' },
  },
  {
    id: 'e-false', source: 'cond-1', sourceHandle: 'false', target: 'action-no',
    label: 'No', style: { stroke: '#dc2626' },
    labelStyle: { fill: '#dc2626', fontWeight: 'bold' },
    labelShowBg: true, labelBgStyle: { fill: '#1a1a2e' }, labelBgPadding: [4, 2],
    markerEnd: { type: MarkerType.ArrowClosed, color: '#dc2626' },
  },
];

const nodeTypes: NodeTypes = {
  condition: ConditionNodeComponent,
  action: ActionNodeComponent,
};

function Flow() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect: OnConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodeTypes={nodeTypes}
      fitView
      snapToGrid
      snapGrid={[16, 16]}
      onlyRenderVisibleElements={false}
    >
      <Background />
      <Controls />
      <MiniMap />
    </ReactFlow>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <div style={{ width: '100%', height: '100vh' }}>
        <Flow />
      </div>
    </ReactFlowProvider>
  );
}
```

## 9. Key API Reference Summary

### Hooks

| Hook | Purpose |
|------|---------|
| `useReactFlow()` | Access ReactFlowInstance for toObject, setNodes, setEdges, fitView, etc. |
| `useNodesState(init)` | Returns [nodes, setNodes, onNodesChange] |
| `useEdgesState(init)` | Returns [edges, setEdges, onEdgesChange] |
| `useNodes()` | Read-only access to current nodes |
| `useEdges()` | Read-only access to current edges |
| `useViewport()` | Returns { x, y, zoom } |
| `useNodeId()` | Returns current node's ID (only works inside a node component) |
| `useNodesInitialized()` | Boolean - true when all nodes have been measured |
| `useHandleConnections()` | Get connections for a specific handle |
| `useNodeConnections()` | Get all connections for a node |
| `useNodesData()` | Access data of specific nodes |
| `useKeyPress(key)` | Track keyboard press state |
| `useOnViewportChange()` | Callback on viewport changes |

### Utilities

| Function | Purpose |
|----------|---------|
| `addEdge(params, edges)` | Add a new edge to the edges array |
| `applyNodeChanges(changes, nodes)` | Apply node changes (drag, select, remove) to state |
| `applyEdgeChanges(changes, edges)` | Apply edge changes (select, remove) to state |
| `getBezierPath(params)` | Calculate bezier path + label position |
| `getSmoothStepPath(params)` | Calculate smooth step path |
| `getStraightPath(params)` | Calculate straight line path |
| `getIncomers(node, nodes, edges)` | Get all nodes that connect TO a given node |
| `getOutgoers(node, nodes, edges)` | Get all nodes that a given node connects TO |
| `getConnectedEdges(node, edges)` | Get all edges connected to a node |

### ReactFlow Component Key Props

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `nodes` | Node[] | - | Required in controlled mode |
| `edges` | Edge[] | - | Required in controlled mode |
| `nodeTypes` | NodeTypes | - | Custom node component registry |
| `edgeTypes` | EdgeTypes | - | Custom edge component registry |
| `onConnect` | OnConnect | - | Called when edge created |
| `onNodesChange` | OnNodesChange | - | State change handler |
| `onEdgesChange` | OnEdgesChange | - | State change handler |
| `fitView` | boolean | false | Auto-fit viewport to nodes |
| `snapToGrid` | boolean | false | Snap nodes to grid |
| `snapGrid` | [number, number] | [16, 16] | Grid size |
| `onlyRenderVisibleElements` | boolean | false | Performance optimization |
| `minZoom` | number | 0.5 | Min zoom level |
| `maxZoom` | number | 2 | Max zoom level |
| `defaultEdgeOptions` | object | - | Default props for new edges |
| `isValidConnection` | (edge) => boolean | - | Validate new connections |
| `deleteKeyCode` | string | 'Backspace' | Key to delete selected |
| `selectionKeyCode` | string | 'Shift' | Key for multi-select |
| `connectionLineType` | ConnectionLineType | Bezier | Visual style of connection being drawn |
| `colorMode` | 'light' \| 'dark' \| 'system' | 'light' | Theme mode |
