import React, { useCallback, useRef, useState, useEffect } from 'react';
import { ReactFlowProvider, ReactFlow, addEdge, applyEdgeChanges, applyNodeChanges, MiniMap, Controls, Background } from 'reactflow';
import 'reactflow/dist/style.css';
import './App.css'; // Import the CSS file
import NodeEditor from './NodeEditor';
import ThreeScene from './ThreeScene';
import { VectorNode, SphereNode, TorusNode, BoxNode, CapsuleNode, ColorNode, RenderNode, ModeNode, MotorNode, /* TERRAIN DISABLED TerrainNode, TerrainParamsNode, */ MultNode, GroupNode } from './CustomNodes';
import { reconnectEdge } from 'reactflow';
import CustomEdge, { CustomConnectionLine } from './CustomEdge'; // Import the custom edge and connection line
import { GraphManager } from './graph/GraphManager';
import { runSdfTests } from './graph/testSdfFunction';
import { buildSdfRuntimePacket } from './graph/sdfRuntime';

// Make test function available in console
if (typeof window !== 'undefined') {
  window.testSdf = runSdfTests;
}


const initialNodes = [
  // Color Node for Box (left side)
  { id: '1', type: 'colorNode', position: { x: 582, y: -144 }, data: { color: '#cc0f0f' } },
  
  // Color Node for Capsule (left side)
  { id: '2', type: 'colorNode', position: { x: 582, y: 684 }, data: { color: '#37d42b' } },
  
  // Motor Node for Box scale (left side)
  { id: '3', type: 'motorNode', position: { x: 578, y: -362 }, data: { 
    xRange: { min: 2 * 1.5, max: 1.2, step: 0 }, 
    yRange: { min: 2 * 1.5, max: 1.2, step: 0 }, 
    zRange: { min: 2 * 1.5, max: 1.2, step: 0 }
  }},
  
  // Motor Node for Capsule scale (left side)
  { id: '4', type: 'motorNode', position: { x: 574, y: 468 }, data: { 
    xRange: { min: 1.4 * 1.65, max: 1, step: 0 }, 
    yRange: { min: 1.4 * 1.65, max: 1, step: 0 }, 
    zRange: { min: 1.4 * 1.65, max: 1, step: 0 }
  }},
  
  // Motor Node for Box rotation (left side)
  { id: '5', type: 'motorNode', position: { x: 584, y: -10 }, data: { 
    xRange: { min: 0, max: 1*180, step: 1 }, 
    yRange: { min: 0, max: 1*180, step: 1 }, 
    zRange: { min: 0, max: 0, step: 1 }
  }},

  // Motor Node for Capsule rotation (Reverse of Box rotation, left side)
  { id: '6', type: 'motorNode', position: { x: 576, y: 814 }, data: { 
    xRange: { min: 180/2, max: 0, step: 1 }, 
    yRange: { min: 180/2, max: 0, step: 1 }, 
    zRange: { min: 0, max: 0, step: 1 }
  }},
  
  // Vector Node for Position (left side)
  { id: '7', type: 'vectorNode', position: { x: 934, y: 202 }, data: { x: -2, y: 0, z: 0 } },

  // Box Node (Shape 1, left side)
  { id: '8', type: 'boxNode', position: { x: 1392, y: -242 }, data: { shape: 'box' } },
  
  // Capsule Node (Shape 2, left side)
  { id: '9', type: 'boxNode', position: { x: 1388, y: 588 }, data: { shape: 'box' } },
  
  // Mode Node for operation (Union or Subtraction, left side)
  { id: '10', type: 'modeNode', position: { x:2034, y: 248 }, data: { mode: 'subtraction' } },
  
  // Render Node (left side)
  { id: '11', type: 'renderNode', position: { x: 2454, y: 272 }, data: { label: 'Render', layerId: 'layer-1' } },

  // Color Node for Sphere (right side)
  { id: '12', type: 'colorNode', position: { x: 628, y: 1540 }, data: { color: '#000000' } },

  // Color Node for Torus (right side)
  { id: '13', type: 'colorNode', position: { x: 626, y:2288 }, data: { color: '#430070' } },

  // Motor Node for Sphere scale (right side)
  { id: '14', type: 'motorNode', position: { x: 626, y: 1310 }, data: { 
    xRange: { min: 2 * 1.5, max: 2 * 1, step: 0 }, 
    yRange: { min: 2 * 1.5, max: 2 * 1, step: 0 }, 
    zRange: { min: 2 * 1.5, max: 2 * 1, step: 0 }
  }},

  // Motor Node for Torus scale (right side)
  { id: '15', type: 'motorNode', position: { x: 624, y: 2054 }, data: { 
    xRange: { min: 2 * 2, max: 2 * 0, step: 0 }, 
    yRange: { min: 2 * 1.7, max: 2 * 0.5, step: 0 }, 
    zRange: { min: 2 * 1.7, max: 2 * 0.5, step: 0 }
  }},

  // Motor Node for Sphere rotation (right side)
  { id: '16', type: 'motorNode', position: { x:618, y: 1684 }, data: { 
    xRange: { min: 0, max: 360, step: 1 }, 
    yRange: { min: 0, max: 360, step: 1 }, 
    zRange: { min: 0, max: 0, step: 1 }
  }},
  
  // Vector Node for Position (right side)
  { id: '17', type: 'vectorNode', position: { x: 966, y: 1834 }, data: { x: 2, y: 0, z: 0 } },

  // Sphere Node (Shape 3, right side)
  { id: '18', type: 'sphereNode', position: { x: 1446, y: 1448 }, data: { shape: 'sphere' } },
  
  // Torus Node (Shape 4, right side)
  { id: '19', type: 'torusNode', position: { x: 1446, y: 2190 }, data: { shape: 'torus' } },
  
  // Mode Node for operation (Union or Subtraction, right side)
  { id: '20', type: 'modeNode', position: { x: 2004, y: 1872 }, data: { mode: 'subtraction' } },
  
  // Render Node (right side)
  { id: '21', type: 'renderNode', position: { x: 2482, y: 1902 }, data: { label: 'Render', layerId: 'layer-2' } }
];


const initialEdges = [
  // Left side connections
  { id: 'e1', source: '1', target: '8', sourceHandle: 'color', targetHandle: 'color-configured' },
  { id: 'e2', source: '2', target: '9', sourceHandle: 'color', targetHandle: 'color-configured' },
  { id: 'e3', source: '3', target: '8', sourceHandle: 'vector', targetHandle: 'size-configured' },
  { id: 'e4', source: '4', target: '9', sourceHandle: 'vector', targetHandle: 'size-configured' },
  { id: 'e5', source: '5', target: '8', sourceHandle: 'vector', targetHandle: 'rotation-configured' },
  { id: 'e6', source: '6', target: '9', sourceHandle: 'vector', targetHandle: 'rotation-configured' },
  { id: 'e7', source: '7', target: '8', sourceHandle: 'vector', targetHandle: 'position-configured' },
  { id: 'e8', source: '7', target: '9', sourceHandle: 'vector', targetHandle: 'position-configured' },
  { id: 'e9', source: '8', target: '10', sourceHandle: 'render', targetHandle: 'shape1' },
  { id: 'e10', source: '9', target: '10', sourceHandle: 'render', targetHandle: 'shapes' },
  { id: 'e11', source: '10', target: '11', sourceHandle: 'render', targetHandle: 'render' },

  // Right side connections
  { id: 'e12', source: '12', target: '18', sourceHandle: 'color', targetHandle: 'color-configured' },
  { id: 'e13', source: '13', target: '19', sourceHandle: 'color', targetHandle: 'color-configured' },
  { id: 'e14', source: '14', target: '18', sourceHandle: 'vector', targetHandle: 'size-configured' },
  { id: 'e15', source: '15', target: '19', sourceHandle: 'vector', targetHandle: 'size-configured' },
  { id: 'e16', source: '16', target: '18', sourceHandle: 'vector', targetHandle: 'rotation-configured' },
  { id: 'e17', source: '17', target: '18', sourceHandle: 'vector', targetHandle: 'position-configured' },
  { id: 'e18', source: '17', target: '19', sourceHandle: 'vector', targetHandle: 'position-configured' },
  { id: 'e19', source: '18', target: '20', sourceHandle: 'render', targetHandle: 'shape1' },
  { id: 'e20', source: '19', target: '20', sourceHandle: 'render', targetHandle: 'shapes' },
  { id: 'e21', source: '20', target: '21', sourceHandle: 'render', targetHandle: 'render' }
];



const nodeTypes = {
  vectorNode: VectorNode,
  sphereNode: SphereNode,
  torusNode: TorusNode,
  boxNode: BoxNode,
  capsuleNode: CapsuleNode,
  colorNode: ColorNode,
  renderNode: RenderNode,
  modeNode: ModeNode,
  motorNode: MotorNode,
    groupNode: GroupNode,
  // TERRAIN DISABLED terrainNode: TerrainNode,
  // TERRAIN DISABLED terrainParamsNode: TerrainParamsNode,
  multNode: MultNode,
};

const edgeTypes = {
  default: CustomEdge, // Use CustomEdge for default edge
};

function safeLiteral(value, depth = 0) {
  if (depth > 3) return '[MaxDepth]';
  if (value === null) return null;
  if (value === undefined) return '[Undefined]';
  if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'function') return `[Function ${value.name || 'anonymous'}]`;
  if (Array.isArray(value)) return value.map(v => safeLiteral(v, depth + 1));
  if (value && typeof value.toArray === 'function') {
    try {
      return { __type: value.constructor?.name || 'ArrayLike', values: value.toArray() };
    } catch {
      return `[${value.constructor?.name || 'Object'} toArray() failed]`;
    }
  }
  if (typeof value === 'object') {
    const out = { __type: value.constructor?.name || 'Object' };
    Object.keys(value).forEach((k) => {
      try {
        out[k] = safeLiteral(value[k], depth + 1);
      } catch {
        out[k] = '[Unreadable]';
      }
    });
    return out;
  }
  return String(value);
}

function detectSdfPrimitiveName(sdf) {
  if (!sdf) return null;
  const className = String(sdf.constructor?.name || '');
  const classChecks = [
    ['box', /Box/i],
    ['sphere', /Sphere/i],
    ['torus', /Torus/i],
    ['capsule', /Capsule/i],
    ['cylinder', /Cylinder/i],
    ['plane', /Plane/i],
  ];
  for (const [label, pattern] of classChecks) {
    if (pattern.test(className)) return label;
  }

  if (typeof sdf.toGLSL === 'function') {
    try {
      const code = String(sdf.toGLSL('p'));
      if (/sdBox\s*\(/.test(code)) return 'box';
      if (/sdSphere\s*\(/.test(code)) return 'sphere';
      if (/sdTorus\s*\(/.test(code)) return 'torus';
      if (/sdCapsule\s*\(/.test(code)) return 'capsule';
      if (/sdCylinder\s*\(/.test(code)) return 'cylinder';
      if (/sdPlane\s*\(/.test(code)) return 'plane';
    } catch {
      return null;
    }
  }

  return null;
}

function buildLiteralNodeOutput(node, output, mode = 'full', options = {}) {
  const nodeId = node?.id ?? '?';
  const nodeType = node?.type ?? 'unknown';
  const isFull = mode === 'full';
  const preferSdf = !!options.preferSdf;

  if (output == null) {
    return `Node ${nodeId} (${nodeType})\nno output`;
  }

  const f = (n) => (typeof n === 'number' && Number.isFinite(n) ? Number(n).toFixed(4) : String(n));
  const lines = [];
  lines.push(`Node ${nodeId} (${nodeType})`);
  lines.push(`keys: ${Object.keys(output).join(', ') || '(none)'}`);

  if (output.vector) {
    lines.push('');
    lines.push('vector');
    lines.push(`x: ${f(output.vector.x)}`);
    lines.push(`y: ${f(output.vector.y)}`);
    lines.push(`z: ${f(output.vector.z)}`);
  }

  if (output.color !== undefined) {
    const colorNum = Number(output.color);
    const colorHex = Number.isFinite(colorNum)
      ? `0x${Math.max(0, colorNum).toString(16).padStart(6, '0')}`
      : String(output.color);
    lines.push('');
    lines.push(`color: ${colorHex}`);
  }

  if (Array.isArray(output.matrix)) {
    lines.push('');
    lines.push('matrix (row-major)');
    for (let r = 0; r < 4; r += 1) {
      const row = output.matrix.slice(r * 4, r * 4 + 4).map(f).join(', ');
      lines.push(`[${row}]`);
    }
  }

  if (Array.isArray(output.shapes) && !(preferSdf && output.sdf)) {
    lines.push('');
    if (output.shapes.length === 1) {
      const s = output.shapes[0] || {};
      lines.push(`shape: ${s.shape || '?'}`);
      lines.push(`operation: ${s.operation || '?'}`);
      lines.push(`color: ${s.color !== undefined ? `0x${Number(s.color).toString(16).padStart(6, '0')}` : 'n/a'}`);
    } else {
      lines.push(`shapes: ${output.shapes.length}`);
      output.shapes.slice(0, 4).forEach((s, i) => {
        lines.push(`#${i} ${s.shape || '?'} op=${s.operation || '?'} color=${s.color !== undefined ? `0x${Number(s.color).toString(16).padStart(6, '0')}` : 'n/a'}`);
      });
    }
    if (output.shapes.length > 4) lines.push(`... +${output.shapes.length - 4} more shapes`);
  }

  if (output.sdf) {
    const sdfType = output.sdf.constructor?.name || typeof output.sdf;
    const primitiveName = detectSdfPrimitiveName(output.sdf);
    lines.push('');
    lines.push(`SDF type: ${sdfType}`);
    if (primitiveName) {
      lines.push(`primitive: ${primitiveName}`);
    }
    lines.push(`evaluate(point): ${typeof output.sdf.evaluate === 'function' ? 'yes' : 'no'}`);
    lines.push(`toGLSL(point): ${typeof output.sdf.toGLSL === 'function' ? 'yes' : 'no'}`);
    if (isFull && typeof output.sdf.toGLSL === 'function') {
      try {
        lines.push('');
        lines.push("sdf.toGLSL('p'):");
        lines.push(String(output.sdf.toGLSL('p')));
      } catch (e) {
        lines.push(`toGLSL error: ${e?.message || String(e)}`);
      }
    }
  }

  if (output.ast && !(preferSdf && output.sdf)) {
    lines.push('');
    lines.push(`ast kind: ${output.ast.kind || 'unknown'}`);
  }

  if (lines.length <= 2) {
    lines.push('');
    lines.push(JSON.stringify(safeLiteral(output), null, 2));
  }

  return lines.join('\n');
}

function fmtNumber(n) {
  return Number.isFinite(Number(n)) ? Number(n).toFixed(4) : String(n);
}

function readPathFromRoot(root, path) {
  let cur = root;
  for (let i = 0; i < path.length; i += 1) {
    if (cur == null) return null;
    cur = cur[path[i]];
  }
  return cur;
}

function formatShaderOutput(node, runtimePacket, mode = 'full') {
  const nodeId = node?.id ?? '?';
  const nodeType = node?.type ?? 'unknown';

  const isFull = mode === 'full';
  const lines = [];
  lines.push(`Node ${nodeId} (${nodeType})`);
  lines.push('channel: shader');

  if (!runtimePacket || !runtimePacket.expression || !runtimePacket.declarations) {
    lines.push('');
    lines.push('no runtime packet yet');
    return lines.join('\n');
  }

  const declarations = String(runtimePacket.declarations || '').trim();
  const expression = String(runtimePacket.expression || '').trim();
  const wrappedMap = `SDF map(const in vec3 p) {\n  return ${expression};\n}`;

  const addBlockTitle = (title) => {
    lines.push('');
    lines.push(title);
  };

  lines.push('');
  lines.push('uniform declarations');
  lines.push(declarations || '(none)');

  lines.push('');
  lines.push('generated map function');
  lines.push(wrappedMap);

  if (isFull && runtimePacket.topologyHash) {
    lines.push('');
    lines.push(`topology hash: ${runtimePacket.topologyHash}`);
  }

  return lines.join('\n');
}

function App() {
  const threeSceneRef = useRef();
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // TERRAIN DISABLED const [debugTerrain, setDebugTerrain] = useState(false);
  const edgeReconnectSuccessful = useRef(true);

  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, nodeId: null });
  const [renderSquareSize, setRenderSquareSize] = useState({ width: 300, height: 300 });
  const [isResizing, setIsResizing] = useState(false);
  const [sdfDebugStats, setSdfDebugStats] = useState(null);
  const [sdfPipelineEnabled, setSdfPipelineEnabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !!window.USE_SDF_PIPELINE;
  });
  const [sdfRuntimeOverlayEnabled, setSdfRuntimeOverlayEnabled] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.__SDF_RUNTIME_OVERLAY__ !== false;
  });
  const [sdfVerboseDebugEnabled, setSdfVerboseDebugEnabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !!window.__SDF_DEBUG_VERBOSE__;
  });
  const [nodeOutputDebugEnabled, setNodeOutputDebugEnabled] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.__NODE_OUTPUT_DEBUG__ !== false;
  });
  const [nodeOutputDebugMode, setNodeOutputDebugMode] = useState(() => {
    if (typeof window === 'undefined') return 'full';
    const mode = window.__NODE_OUTPUT_DEBUG_MODE__;
    return mode === 'compact' || mode === 'full' ? mode : 'full';
  });
  const [nodeOutputChannel, setNodeOutputChannel] = useState(() => {
    if (typeof window === 'undefined') return 'values';
    return window.__NODE_OUTPUT_CHANNEL__ === 'shader' ? 'shader' : 'values';
  });
  const debugCaptureLastAtRef = useRef(0);
  const fullscreenTimeoutRef = useRef(null);
  const gmRef = useRef(null);
  const sdfRuntimeCacheRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.USE_SDF_PIPELINE = !!sdfPipelineEnabled;
    window.__SDF_RUNTIME_OVERLAY__ = !!sdfRuntimeOverlayEnabled;
    window.__SDF_DEBUG_VERBOSE__ = !!sdfVerboseDebugEnabled;

    window.setSdfPipelineEnabled = (enabled) => {
      const next = !!enabled;
      window.USE_SDF_PIPELINE = next;
      setSdfPipelineEnabled(next);
      return next;
    };
    window.toggleSdfPipeline = () => {
      const next = !window.USE_SDF_PIPELINE;
      window.USE_SDF_PIPELINE = next;
      setSdfPipelineEnabled(next);
      return next;
    };

    window.setSdfRuntimeOverlayEnabled = (enabled) => {
      const next = !!enabled;
      window.__SDF_RUNTIME_OVERLAY__ = next;
      setSdfRuntimeOverlayEnabled(next);
      return next;
    };
    window.toggleSdfRuntimeOverlay = () => {
      const next = !window.__SDF_RUNTIME_OVERLAY__;
      window.__SDF_RUNTIME_OVERLAY__ = next;
      setSdfRuntimeOverlayEnabled(next);
      return next;
    };

    window.setSdfVerboseDebug = (enabled) => {
      const next = !!enabled;
      window.__SDF_DEBUG_VERBOSE__ = next;
      setSdfVerboseDebugEnabled(next);
      return next;
    };
    window.toggleSdfVerboseDebug = () => {
      const next = !window.__SDF_DEBUG_VERBOSE__;
      window.__SDF_DEBUG_VERBOSE__ = next;
      setSdfVerboseDebugEnabled(next);
      return next;
    };
  }, [sdfPipelineEnabled, sdfRuntimeOverlayEnabled, sdfVerboseDebugEnabled]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.__NODE_OUTPUT_DEBUG__ = !!nodeOutputDebugEnabled;
    window.__NODE_OUTPUT_DEBUG_MODE__ = nodeOutputDebugMode;
    window.__NODE_OUTPUT_CHANNEL__ = nodeOutputChannel;
    if (!window.__NODE_OUTPUT_DEBUG_MAP__) {
      window.__NODE_OUTPUT_DEBUG_MAP__ = {};
    }
    window.setNodeOutputDebug = (enabled) => {
      const next = !!enabled;
      window.__NODE_OUTPUT_DEBUG__ = next;
      setNodeOutputDebugEnabled(next);
      return next;
    };
    window.toggleNodeOutputDebug = () => {
      const next = !window.__NODE_OUTPUT_DEBUG__;
      window.__NODE_OUTPUT_DEBUG__ = next;
      setNodeOutputDebugEnabled(next);
      return next;
    };
    // Simple one-shot commands for direct console usage.
    // Usage:
    //   nodeOutputs()            -> logs all node outputs
    //   nodeOutputs('10')        -> logs only node id "10"
    //   nodeOutputsOn()          -> turn on floating bubbles
    //   nodeOutputsOff()         -> turn off floating bubbles
    window.nodeOutputs = (nodeId) => {
      window.__NODE_OUTPUT_DEBUG__ = true;
      setNodeOutputDebugEnabled(true);
      const map = window.__NODE_OUTPUT_DEBUG_MAP__ || {};
      if (nodeId !== undefined && nodeId !== null) {
        const key = String(nodeId);
        const val = map[key];
        console.log(`[nodeOutputs] node ${key}:`);
        console.log(val || '(no computed output yet)');
        return val;
      }
      console.log('[nodeOutputs] all nodes:');
      console.log(map);
      return map;
    };
    window.nodeOutputsOn = () => {
      window.__NODE_OUTPUT_DEBUG__ = true;
      setNodeOutputDebugEnabled(true);
      return true;
    };
    window.nodeOutputsOff = () => {
      window.__NODE_OUTPUT_DEBUG__ = false;
      setNodeOutputDebugEnabled(false);
      return false;
    };
    window.nodeOutputsMode = (mode) => {
      const next = mode === 'compact' ? 'compact' : 'full';
      window.__NODE_OUTPUT_DEBUG_MODE__ = next;
      setNodeOutputDebugMode(next);
      return next;
    };
    window.nodeOutputsCompact = () => {
      window.__NODE_OUTPUT_DEBUG_MODE__ = 'compact';
      setNodeOutputDebugMode('compact');
      return 'compact';
    };
    window.nodeOutputsFull = () => {
      window.__NODE_OUTPUT_DEBUG_MODE__ = 'full';
      setNodeOutputDebugMode('full');
      return 'full';
    };
    window.nodeOutputsChannel = (channel) => {
      const next = channel === 'shader' ? 'shader' : 'values';
      window.__NODE_OUTPUT_CHANNEL__ = next;
      setNodeOutputChannel(next);
      return next;
    };
    window.nodeOutputsShader = () => {
      window.__NODE_OUTPUT_CHANNEL__ = 'shader';
      setNodeOutputChannel('shader');
      return 'shader';
    };
    window.nodeOutputsValues = () => {
      window.__NODE_OUTPUT_CHANNEL__ = 'values';
      setNodeOutputChannel('values');
      return 'values';
    };
  }, [nodeOutputDebugEnabled, nodeOutputDebugMode, nodeOutputChannel]);

  // Initialize GraphManager once with initial graph; future updates are incremental
  useEffect(() => {
    gmRef.current = new GraphManager(nodes, edges);
  }, []);


  const printPos = false
  const printNodePositions = useCallback(() => {
    if (!printPos)
      return;
    console.clear();
    nodes.forEach(node => {
      console.log(`Node ${node.id}: (${node.position.x}, ${node.position.y})`);
    });
  }, [nodes]);

  // Automatically print node positions on every node update
  useEffect(() => {
    printNodePositions();
  }, [nodes, printNodePositions]);

  

  
  const handleContextMenu = (event, node) => {
    event.preventDefault(); // Prevent the default right-click menu from showing
    if (node) {
      setContextMenu({
        visible: true,
        x: event.clientX,
        y: event.clientY,
        nodeId: node.id,
      });
    }
  };

  const closeContextMenu = () => setContextMenu({ ...contextMenu, visible: false });

  const handleCopyNode = () => {
    if (contextMenu.nodeId) {
      const nodeToCopy = nodes.find((node) => node.id === contextMenu.nodeId);
      if (nodeToCopy) {
        // Generate a new unique ID for the copied node
        let newId;
        for (let i = 1; i <= 1000; i++) {
          if (!nodes.find((node) => node.id === i.toString())) {
            newId = i.toString();
            break;
          }
        }
  
        console.log(`Copying node ID: ${nodeToCopy.id}`);
        console.log(`Generated new ID: ${newId}`);
  
        // Create a completely new node object with deep copied data
        const newNode = {
          id: newId,
          type: nodeToCopy.type,
          position: { 
            x: nodeToCopy.position.x + 20, 
            y: nodeToCopy.position.y + 20 
          },
          data: JSON.parse(JSON.stringify(nodeToCopy.data)), // Deep copy to avoid any reference issues
          selected: false, // Ensure it's not selected
          dragging: false, // Ensure it's not dragging
        };
  
        console.log(`New node created with ID: ${newNode.id}, position: (${newNode.position.x}, ${newNode.position.y})`);
  
        // First, ensure no edges exist for this ID (clean up any potential stale references)
        setEdges((eds) => {
          const cleanedEdges = eds.filter((edge) => edge.source !== newId && edge.target !== newId);
          console.log(`Cleaned edges before adding copied node:`, cleanedEdges);
          if (gmRef.current) gmRef.current.setEdges(cleanedEdges);
          return cleanedEdges;
        });
        
        // Add the new node to the list of nodes after a small delay to ensure edge cleanup completes
        setTimeout(() => {
          setNodes((nds) => {
            const next = [...nds, newNode];
            if (gmRef.current) gmRef.current.setNodes(next);
            return next;
          });
          console.log(`Added copied node with ID: ${newId}`);
        }, 10);
  
        setContextMenu({ ...contextMenu, visible: false });
      }
    }
  };
  
  


  const handleDeleteNode = () => {
    if (contextMenu.nodeId) {
      const nodeIdToDelete = contextMenu.nodeId;
      // Compute next state
      const nextNodes = nodes.filter((node) => node.id !== nodeIdToDelete);
      const nextEdges = edges.filter((edge) => edge.source !== nodeIdToDelete && edge.target !== nodeIdToDelete);
      // Apply and update GraphManager incrementally
      setNodes(nextNodes);
      if (gmRef.current) gmRef.current.setNodes(nextNodes);
      setEdges(nextEdges);
      if (gmRef.current) gmRef.current.setEdges(nextEdges);
      setContextMenu({ ...contextMenu, visible: false });
    }
  };

  const handleRenderScene = useCallback(() => {
    if (threeSceneRef.current) {
      threeSceneRef.current.clearScene();
      // New DAG-based evaluation using GraphManager (cached per nodes/edges change)
      const gm = gmRef.current;
      if (!gm) return;
      // Start a new frame to refresh time-dependent nodes (motors)
      gm.beginFrame();
      const renderNodes = nodes.filter(n => n.type === 'renderNode');
      
      // Collect all SDFs from all render nodes first
      const allSdfs = [];
      renderNodes.forEach(renderNode => {
        const renderOutput = gm.computeNode(renderNode.id);
        if (renderOutput && renderOutput.sdf) {
          allSdfs.push(renderOutput.sdf);
        }
      });

      let runtimePacket = null;
      if (allSdfs.length > 0 && sdfPipelineEnabled) {
        const { SdfUnion } = require('./graph/sdfFunction');
        const combinedSdf = allSdfs.length === 1 ? allSdfs[0] : new SdfUnion(allSdfs, 0.5);
        runtimePacket = buildSdfRuntimePacket(combinedSdf, sdfRuntimeCacheRef.current);
        if (runtimePacket) {
          runtimePacket.rootSdf = combinedSdf;
        }
      }

      if (typeof window !== 'undefined') {
        const now = Date.now();
        if (now - debugCaptureLastAtRef.current > 180) {
          const snap = gm.getOutputsSnapshot();
          const out = {};
          nodes.forEach((n) => {
            out[n.id] = buildLiteralNodeOutput(n, snap.get(n.id), nodeOutputDebugMode, {
              preferSdf: sdfPipelineEnabled,
            });
          });
          window.__NODE_OUTPUT_DEBUG_MAP__ = out;
          window.dispatchEvent(new CustomEvent('node-output-debug-updated', { detail: { at: now } }));
          debugCaptureLastAtRef.current = now;
        }
      }
      
      // If we have SDFs, combine them and set once
      if (allSdfs.length > 0 && sdfPipelineEnabled) {
        const nextPacket = runtimePacket;
        if (!nextPacket) return;
        sdfRuntimeCacheRef.current = nextPacket;
        threeSceneRef.current.setCustomSdfMap(nextPacket);
        
        // Add one dummy bounding sphere for all SDFs
        threeSceneRef.current.addShape({
          shape: 'sphere',
          operation: 'union',
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 100, y: 100, z: 100 },
          color: 0xffffff,
        }, 0);
        
        return; // Skip legacy rendering
      } else {
        sdfRuntimeCacheRef.current = null;
        threeSceneRef.current.setCustomSdfMap(null);
      }
      
      // Legacy descriptor path
      renderNodes.forEach((renderNode, layerIndex) => {
        const renderOutput = gm.computeNode(renderNode.id);
        
        const shapes = gm.computeRenderShapes(renderNode.id);
        shapes.forEach(shapeData => {
          threeSceneRef.current.addShape(shapeData, layerIndex);
        });
      });
    }
  }, [nodes, edges, nodeOutputDebugMode, nodeOutputChannel, sdfPipelineEnabled]);
  
  
  useEffect(() => {
    const intervalId = setInterval(handleRenderScene, 16); // 16ms for ~60fps updates
    return () => clearInterval(intervalId); // Cleanup on unmount
  }, [handleRenderScene]);
  
  
  

  useEffect(() => {
    handleRenderScene();
  }, [nodes, edges, handleRenderScene]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!threeSceneRef.current || typeof threeSceneRef.current.getSdfRuntimeStats !== 'function') return;
      const stats = threeSceneRef.current.getSdfRuntimeStats();
      if (stats) setSdfDebugStats(stats);
    }, 250);
    return () => clearInterval(timer);
  }, []);

  const onNodesChange = useCallback(
    (changes) => {
      setNodes((nds) => {
        const next = applyNodeChanges(changes, nds);
        if (gmRef.current) gmRef.current.setNodes(next);
        return next;
      });
      handleRenderScene();
    },
    [handleRenderScene]
  );

  const onEdgesChange = useCallback(
    (changes) => {
      setEdges((eds) => {
        const next = applyEdgeChanges(changes, eds);
        if (gmRef.current) gmRef.current.setEdges(next);
        return next;
      });
      handleRenderScene();
    },
    [handleRenderScene]
  );

  const onConnect = useCallback(
    (params) => {
      const { source, sourceHandle, target, targetHandle } = params;
  
      const validConnections = {
        vectorNode: ['position-configured', 'size-configured', 'rotation-configured'],
        colorNode: ['color-configured', 'color-modular'],
        sphereNode: ['shape1', 'shapes', 'render'],
        torusNode: ['shape1', 'shapes', 'render'],
        boxNode: ['shape1', 'shapes', 'render'],
        capsuleNode: ['shape1', 'shapes', 'render'],
        modeNode: ['shape1', 'shapes', 'render', 'group-transform'],
        motorNode: ['position-configured', 'size-configured', 'rotation-configured'],
        // TERRAIN DISABLED terrainParamsNode: ['terrainParams-configured', 'terrainParams-modular'],
        multNode: ['transform-modular', 'matrix-in', 'group-transform', 'transform'],
        groupNode: ['shape1', 'shapes', 'render', 'transform'],
      };
  
      const sourceNode = nodes.find((node) => node.id === source);
      const targetNode = nodes.find((node) => node.id === target);
  
      if (sourceNode && targetNode) {
        const validSourceHandles = validConnections[sourceNode.type];
        if (validSourceHandles && validSourceHandles.includes(targetHandle)) {
          // Check if multiple connections are allowed for this specific handle
          const allowMultipleConnections =
            (targetNode.type === 'groupNode' && targetHandle === 'shapes') ||
            (targetNode.type === 'renderNode' && targetHandle === 'render');
          
          const existingConnection = edges.find((edge) => edge.target === target && edge.targetHandle === targetHandle);
          
          if (!existingConnection || allowMultipleConnections) {
            setEdges((eds) => {
              const next = addEdge(params, eds);
              if (gmRef.current) gmRef.current.setEdges(next);
              return next;
            });
            handleRenderScene();
          } else {
            console.warn('Only one connection allowed per pin');
          }
        } else {
          console.warn('Invalid connection');
        }
      }
    },
    [nodes, edges, handleRenderScene]
  );
  


  const onReconnectStart = useCallback(() => {
  edgeReconnectSuccessful.current = false;
}, []);

const onReconnect = useCallback((oldEdge, newConnection) => {
  edgeReconnectSuccessful.current = true;

  const sourceNode = nodes.find((node) => node.id === newConnection.source);
  const targetNode = nodes.find((node) => node.id === newConnection.target);

  const validConnections = {
    vectorNode: ['position-configured', 'size-configured', 'rotation-configured'],
    colorNode: ['color-configured', 'color-modular'],
    sphereNode: ['shape1', 'shapes', 'render'],
    torusNode: ['shape1', 'shapes', 'render'],
    boxNode: ['shape1', 'shapes', 'render'],
    capsuleNode: ['shape1', 'shapes', 'render'],
    modeNode: ['shape1', 'shapes', 'render', 'group-transform'],
    motorNode: ['position-configured', 'size-configured', 'rotation-configured'],
    // TERRAIN DISABLED terrainParamsNode: ['terrainParams-configured', 'terrainParams-modular'],
    multNode: ['transform-modular', 'matrix-in', 'group-transform', 'transform'],
    groupNode: ['shape1', 'shapes', 'render', 'transform'],
  };

  // Ensure validation before reconnecting
  const validSourceHandles = validConnections[sourceNode.type];
  if (sourceNode && targetNode && validSourceHandles && validSourceHandles.includes(newConnection.targetHandle)) {
    const allowMultiple =
      (targetNode.type === 'groupNode' && newConnection.targetHandle === 'shapes') ||
      (targetNode.type === 'renderNode' && newConnection.targetHandle === 'render');
    // Allow multiple outgoing but only one incoming edge unless multi is allowed
    const existingIncomingConnection = allowMultiple ? null : edges.find(
      (edge) => edge.target === newConnection.target && edge.targetHandle === newConnection.targetHandle
    );

    // If an incoming connection already exists, prevent reconnection (unless allowed)
    if (allowMultiple || !existingIncomingConnection || oldEdge.id === existingIncomingConnection.id) {
      setEdges((els) => {
        const next = reconnectEdge(oldEdge, newConnection, els);
        if (gmRef.current) gmRef.current.setEdges(next);
        return next;
      });
      handleRenderScene();
    } else {
      console.warn('Only one connection allowed per target pin');
    }
  } else {
    console.warn('Invalid connection');
  }
}, [nodes, edges, handleRenderScene]);


const onReconnectEnd = useCallback((_, edge) => {
  if (!edgeReconnectSuccessful.current) {
    setEdges((eds) => {
      const next = eds.filter((e) => e.id !== edge.id);
      if (gmRef.current) gmRef.current.setEdges(next);
      return next;
    });
  }
  edgeReconnectSuccessful.current = true;
}, []);


  const toggleFullscreen = () => {
    const container = document.getElementById('three-scene-container');
    
    if (!isFullscreen) {
      // Going TO fullscreen - remove transition for instant change
      if (container) {
        container.style.transition = 'none';
      }
      setIsFullscreen(true);
      
      // Resize renderer immediately
      setTimeout(() => {
        if (threeSceneRef.current) {
          threeSceneRef.current.resizeRenderer(window.innerWidth, window.innerHeight);
        }
      }, 10);
    } else {
      // Going OUT of fullscreen - add transition for smooth animation
      if (container) {
        container.style.transition = 'all 0.3s ease';
      }
      setIsFullscreen(false);
      
      // Resize renderer after animation and remove transition
      setTimeout(() => {
        if (threeSceneRef.current) {
          threeSceneRef.current.resizeRenderer(renderSquareSize.width, renderSquareSize.height);
        }
        // Remove transition after animation completes so resizing works normally
        if (container) {
          container.style.transition = 'none';
        }
      }, 350); // Slightly longer than animation to ensure it completes
    }
  };

  // Initialize ThreeScene with proper size
  useEffect(() => {
    if (threeSceneRef.current) {
      const initialWidth = isFullscreen ? window.innerWidth : renderSquareSize.width;
      const initialHeight = isFullscreen ? window.innerHeight : renderSquareSize.height;
      threeSceneRef.current.resizeRenderer(initialWidth, initialHeight);
    }
  }, [renderSquareSize, isFullscreen]);
  
  // Resize functionality
  const handleResizeStart = (e, direction) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    document.body.classList.add('resizing');
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = renderSquareSize.width;
    const startHeight = renderSquareSize.height;
    
    const handleMouseMove = (e) => {
      const deltaX = startX - e.clientX; // Negative because we're moving from right edge
      const deltaY = e.clientY - startY;
      
      let newWidth = startWidth;
      let newHeight = startHeight;
      
      // Get window dimensions for maximum constraints
      const maxWidth = window.innerWidth * 0.985; // Max 98.5% of screen width
      const maxHeight = window.innerHeight * 0.985; // Max 98.5% of screen height

      if (direction === 'corner') {
        newWidth = Math.max(200, Math.min(maxWidth, startWidth + deltaX));
        newHeight = Math.max(150, Math.min(maxHeight, startHeight + deltaY));
      } else if (direction === 'left') {
        newWidth = Math.max(200, Math.min(maxWidth, startWidth + deltaX));
      } else if (direction === 'bottom') {
        newHeight = Math.max(150, Math.min(maxHeight, startHeight + deltaY));
      }
      
      setRenderSquareSize({ width: newWidth, height: newHeight });
      
      // Update renderer size in real-time
      if (threeSceneRef.current) {
        threeSceneRef.current.resizeRenderer(newWidth, newHeight);
      }
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.classList.remove('resizing');
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }} onClick={closeContextMenu}>
      <ReactFlowProvider>
        {/* Main Node Editor Area - Full Screen */}
        <div
          id="node-editor-area"
          style={{
            width: '100vw',
            height: '100vh',
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 1,
          }}
        >
          <NodeEditor setNodes={setNodes} isFullscreen={isFullscreen} />
          <div style={{ width: '100%', height: '100%' }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              connectionLineComponent={CustomConnectionLine}
              attributionPosition={null}
              attributionComponent={null}
              edgeTypes={edgeTypes}
              onReconnectStart={onReconnectStart}  
              onReconnect={onReconnect}            
              onReconnectEnd={onReconnectEnd}      
              nodeTypes={nodeTypes}
              fitView
              onPaneContextMenu={(event) => event.preventDefault()}
              onNodeContextMenu={(event, node) => handleContextMenu(event, node)}
            >
              <Controls style={{ bottom: 100 }} />
              <MiniMap 
                pannable
                zoomable
                style={{ 
                  width: 200, 
                  height: 180, 
                  right: 10, 
                  bottom: 100, 
                  border: '0px solid black', 
                  borderRadius: '0px'
                }}
                offsetScale={10}
                nodeStrokeWidth={6}
                nodeColor={(node) => {
                  if (node.type === 'vectorNode' || node.type === 'motorNode') {
                    return '#FFD700';
                  } else if (['sphereNode', 'torusNode', 'boxNode', 'capsuleNode'].includes(node.type)) {
                    return '#ADD8E6';
                  } else if (node.type === 'modeNode') {
                    return '#FFB6C1';
                  } else if (node.type === 'colorNode') {
                    return '#9370DB';
                  } else if (node.type === 'renderNode') {
                    return '#90EE90';
                  }
                  return '#000000';
                }}
                nodeStrokeColor={'rgba(0, 0, 0, 0.25)'}
                maskColor={'rgba(0, 0, 0, 0.1)'}
              />
              <Background variant="" gap={40} size={2} />
            </ReactFlow>
          </div>
        </div>
      </ReactFlowProvider>
      
      {/* Rendering Area - Top Right Square */}
      <div
        id="three-scene-container"
        style={{
          width: isFullscreen ? '100vw' : `${renderSquareSize.width}px`,
          height: isFullscreen ? '100vh' : `${renderSquareSize.height}px`,
          position: 'absolute',
          top: isFullscreen ? 0 : '10px',
          right: isFullscreen ? 0 : '10px',
          zIndex: isFullscreen ? 50 : 5,
          border: isFullscreen ? 'none' : '2px solid #333',
          borderRadius: isFullscreen ? '0' : '8px',
          overflow: 'hidden',
        }}
      >
        {/* TERRAIN DISABLED - Debug Toggle Button (hidden)
        {false && !isFullscreen && (
          <button
            className="nodrag"
            onClick={(e) => {
              e.stopPropagation();
              const next = !debugTerrain;
              setDebugTerrain(next);
              if (threeSceneRef.current) {
                threeSceneRef.current.setDebugTerrain(next);
              }
            }}
            title="Force terrain displacement on all shapes"
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              zIndex: 100,
              background: debugTerrain ? '#2a9d8f' : '#555',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              padding: '6px 10px',
              cursor: 'pointer',
              fontSize: '12px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.25)'
            }}
          >
            {debugTerrain ? 'Terrain: ON' : 'Terrain: OFF'}
          </button>
        )}
        */}
        
        {/* Resize handles */}
        {!isFullscreen && (
          <>
            {/* Corner resize handle */}
            <div
              className="resize-handle corner"
              style={{
                position: 'absolute',
                bottom: '-2px',
                left: '-2px',
                width: '15px',
                height: '15px',
                cursor: 'ne-resize',
                backgroundColor: 'rgba(0, 123, 255, 0.7)',
                border: '1px solid #007bff',
                borderRadius: '3px',
                zIndex: 10
              }}
              onMouseDown={(e) => handleResizeStart(e, 'corner')}
            />
            
            {/* Left edge resize handle */}
            <div
              className="resize-handle left"
              style={{
                position: 'absolute',
                top: '50%',
                left: '-4px',
                width: '8px',
                height: '30px',
                cursor: 'w-resize',
                backgroundColor: 'rgba(0, 123, 255, 0.5)',
                borderRadius: '4px',
                transform: 'translateY(-50%)',
                zIndex: 10
              }}
              onMouseDown={(e) => handleResizeStart(e, 'left')}
            />
            
            {/* Bottom edge resize handle */}
            <div
              className="resize-handle bottom"
              style={{
                position: 'absolute',
                bottom: '-4px',
                left: '50%',
                width: '30px',
                height: '8px',
                cursor: 'ns-resize',
                backgroundColor: 'rgba(0, 123, 255, 0.5)',
                borderRadius: '4px',
                transform: 'translateX(-50%)',
                zIndex: 10
              }}
              onMouseDown={(e) => handleResizeStart(e, 'bottom')}
            />
          </>
        )}

        {/* ThreeScene Component */}
        <ThreeScene ref={threeSceneRef} />

        {/* SDF runtime debug overlay */}
        {sdfPipelineEnabled && sdfRuntimeOverlayEnabled && sdfDebugStats && (
          <div
            style={{
              position: 'absolute',
              top: '150px',
              left: '10px',
              zIndex: 25,
              background: 'rgba(8, 12, 16, 0.82)',
              color: '#d8fbe4',
              border: '1px solid rgba(95, 220, 150, 0.45)',
              borderRadius: '8px',
              padding: '8px 10px',
              fontSize: '11px',
              lineHeight: 1.35,
              pointerEvents: 'none',
              minWidth: '220px',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace',
            }}
          >
            <div><strong>SDF Runtime</strong></div>
            <div>mode: {sdfDebugStats.mode}</div>
            <div>recompiles: {sdfDebugStats.recompiles}</div>
            <div>uniform updates: {sdfDebugStats.uniformUpdates}</div>
            <div>map updates: {sdfDebugStats.mapUpdates}</div>
            <div>
              slots: f={sdfDebugStats.uniformCounts?.floats || 0}, v3={sdfDebugStats.uniformCounts?.vec3 || 0}, v4={sdfDebugStats.uniformCounts?.vec4 || 0}, m4={sdfDebugStats.uniformCounts?.mat4 || 0}
            </div>
            <div>hash: {(sdfDebugStats.topologyHash || 'n/a').slice(0, 40)}</div>
          </div>
        )}

        {/* SDF pipeline toggle */}
        <button
          className="nodrag"
          onClick={(e) => {
            e.stopPropagation();
            const next = !sdfPipelineEnabled;
            if (typeof window !== 'undefined') {
              window.USE_SDF_PIPELINE = next;
            }
            setSdfPipelineEnabled(next);
          }}
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            zIndex: 30,
            background: sdfPipelineEnabled ? 'rgba(35, 125, 85, 0.9)' : 'rgba(80, 80, 80, 0.9)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.35)',
            borderRadius: '6px',
            padding: '6px 10px',
            fontSize: '12px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
          title="Toggle SDF pipeline backend"
        >
          SDF Pipeline: {sdfPipelineEnabled ? 'ON' : 'OFF'}
        </button>

        {/* SDF runtime overlay toggle */}
        <button
          className="nodrag"
          onClick={(e) => {
            e.stopPropagation();
            const next = !sdfRuntimeOverlayEnabled;
            if (typeof window !== 'undefined') {
              window.__SDF_RUNTIME_OVERLAY__ = next;
            }
            setSdfRuntimeOverlayEnabled(next);
          }}
          style={{
            position: 'absolute',
            top: '44px',
            left: '10px',
            zIndex: 30,
            background: sdfRuntimeOverlayEnabled ? 'rgba(110, 75, 35, 0.9)' : 'rgba(80, 80, 80, 0.9)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.35)',
            borderRadius: '6px',
            padding: '6px 10px',
            fontSize: '12px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
          title="Toggle SDF runtime debug panel in render view"
        >
          SDF Runtime Panel: {sdfRuntimeOverlayEnabled ? 'ON' : 'OFF'}
        </button>

        {/* Node output panel toggle */}
        <button
          className="nodrag"
          onClick={(e) => {
            e.stopPropagation();
            const next = !nodeOutputDebugEnabled;
            if (typeof window !== 'undefined') {
              window.__NODE_OUTPUT_DEBUG__ = next;
            }
            setNodeOutputDebugEnabled(next);
          }}
          style={{
            position: 'absolute',
            top: '78px',
            left: '10px',
            zIndex: 30,
            background: nodeOutputDebugEnabled ? 'rgba(35, 125, 85, 0.9)' : 'rgba(80, 80, 80, 0.9)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.35)',
            borderRadius: '6px',
            padding: '6px 10px',
            fontSize: '12px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
          title="Toggle per-node output panels"
        >
          Node Outputs: {nodeOutputDebugEnabled ? 'ON' : 'OFF'}
        </button>

        <button
          className="nodrag"
          onClick={(e) => {
            e.stopPropagation();
            const next = nodeOutputDebugMode === 'full' ? 'compact' : 'full';
            if (typeof window !== 'undefined') {
              window.__NODE_OUTPUT_DEBUG_MODE__ = next;
            }
            setNodeOutputDebugMode(next);
          }}
          style={{
            position: 'absolute',
            top: '112px',
            left: '10px',
            zIndex: 30,
            background: nodeOutputDebugMode === 'full' ? 'rgba(35, 85, 125, 0.9)' : 'rgba(80, 80, 80, 0.9)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.35)',
            borderRadius: '6px',
            padding: '6px 10px',
            fontSize: '12px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
          title="Switch node output detail level"
        >
          Output Mode: {nodeOutputDebugMode === 'full' ? 'FULL' : 'COMPACT'}
        </button>

        {/* Fullscreen Toggle Button for Rendering Area */}
        <div
          onClick={toggleFullscreen}
          style={{
            position: 'absolute',
            bottom: '10px',
            right: '10px',
            zIndex: 20,
            cursor: 'pointer',
          }}
        >
          <div style={{ 
            width: '35px', 
            height: '35px', 
            backgroundColor: 'white', 
            borderRadius: '8px', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
            transition: 'all 0.3s ease',
          }}>
            <img 
              src={isFullscreen ? "/svg/collapse.svg" : "/svg/expand.svg"}
              alt={isFullscreen ? "minimize" : "expand"}
              style={{ width: '20px', height: '20px' }}
            />
          </div>
        </div>
      </div>


      {/* Render the context menu */}
      {contextMenu.visible && contextMenu.nodeId && (
        <div
          className="context-menu"
          style={{
            top: contextMenu.y,
            left: contextMenu.x,
            padding: '10px',
            background: 'white',
            border: '1px solid black',
            zIndex: 1000,
          }}
        >
          <button style={{ display: 'block', marginBottom: '5px' }} onClick={handleCopyNode}>
            Copy
          </button>
          <button style={{ display: 'block' }} onClick={handleDeleteNode}>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default App;