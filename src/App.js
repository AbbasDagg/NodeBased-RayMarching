import React, { useCallback, useRef, useState, useEffect } from 'react';
import { ReactFlowProvider, ReactFlow, addEdge, applyEdgeChanges, applyNodeChanges, MiniMap, Controls, Background } from 'reactflow';
import 'reactflow/dist/style.css';
import './App.css'; // Import the CSS file
import NodeEditor from './NodeEditor';
import ThreeScene from './ThreeScene';
import { VectorNode, SphereNode, TorusNode, BoxNode, CapsuleNode, ColorNode, RenderNode, ModeNode, MotorNode, /* TERRAIN DISABLED TerrainNode, TerrainParamsNode, */ MultNode } from './CustomNodes';
import { reconnectEdge } from 'reactflow';
import CustomEdge, { CustomConnectionLine } from './CustomEdge'; // Import the custom edge and connection line


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
  // TERRAIN DISABLED terrainNode: TerrainNode,
  // TERRAIN DISABLED terrainParamsNode: TerrainParamsNode,
  multNode: MultNode,
};

const edgeTypes = {
  default: CustomEdge, // Use CustomEdge for default edge
};

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
  const fullscreenTimeoutRef = useRef(null);


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
          return cleanedEdges;
        });
        
        // Add the new node to the list of nodes after a small delay to ensure edge cleanup completes
        setTimeout(() => {
          setNodes((nds) => [...nds, newNode]);
          console.log(`Added copied node with ID: ${newId}`);
        }, 10);
  
        setContextMenu({ ...contextMenu, visible: false });
      }
    }
  };
  
  


  const handleDeleteNode = () => {
    if (contextMenu.nodeId) {
      const nodeIdToDelete = contextMenu.nodeId;
      // Remove the node
      setNodes((nds) => nds.filter((node) => node.id !== nodeIdToDelete));
      // Remove associated edges
      setEdges((eds) => eds.filter((edge) => edge.source !== nodeIdToDelete && edge.target !== nodeIdToDelete));
      setContextMenu({ ...contextMenu, visible: false });
    }
  };

  const handleRenderScene = useCallback(() => {
    if (threeSceneRef.current) {
      threeSceneRef.current.clearScene();
  
      const renderNodes = nodes.filter(node => node.type === 'renderNode');
      // Throttle modular shape debug logging
      const now = Date.now();
      if (!window.__lastShapeMatrixDebug) window.__lastShapeMatrixDebug = 0;
  
      renderNodes.forEach((renderNode, layerIndex) => {
        const shapes = [];
  
        const traverse = (nodeId, operation) => {
          const node = nodes.find(n => n.id === nodeId);
  
          if (['sphereNode', 'torusNode', 'boxNode', 'capsuleNode', 'terrainNode'].includes(node.type)) {
            const isModular = node.data.shapeMode === 'modular';
            let position = node.data.position || { x: 0, y: 0, z: 0 };
            let rotation = node.data.rotation || { x: 0, y: 0, z: 0 };
            let scale = node.data.scale || { x: 1, y: 1, z: 1 };
            let color = node.data.color || 0xffffff;
            // TERRAIN DISABLED let terrainParams = null; // Only populated for terrain nodes
  
            // Find all connected edges for position, rotation, size, color, /* TERRAIN DISABLED terrainParams, */ transform, and mult
            edges.forEach(edge => {
              const sourceNode = nodes.find(n => n.id === edge.source);
              if (sourceNode) {
                const time = Date.now() / 1000;
                const { xRange, yRange, zRange } = sourceNode.data;
  
                if (sourceNode.type === 'vectorNode') {
                  if (edge.target === node.id && edge.targetHandle === 'position-configured') {
                    position = {
                      x: sourceNode.data.x,
                      y: sourceNode.data.y,
                      z: sourceNode.data.z,
                    };
                  } else if (edge.target === node.id && edge.targetHandle === 'rotation-configured') {
                    rotation = {
                      x: sourceNode.data.x,
                      y: sourceNode.data.y,
                      z: sourceNode.data.z,
                    };
                  } else if (edge.target === node.id && edge.targetHandle === 'size-configured') {
                    scale = {
                      x: sourceNode.data.x,
                      y: sourceNode.data.y,
                      z: sourceNode.data.z,
                    };
                  }
                } else if (sourceNode.type === 'colorNode' && edge.target === node.id && (edge.targetHandle === 'color-configured' || edge.targetHandle === 'color-modular')) {
                  color = sourceNode.data.color;
                }
                /* TERRAIN DISABLED
                else if (sourceNode.type === 'terrainParamsNode' && edge.target === node.id && (edge.targetHandle === 'terrainParams-configured' || edge.targetHandle === 'terrainParams-modular')) {
                  // Read terrainParams for ANY shape node - turns it into terrain!
                  terrainParams = {
                    octaves: sourceNode.data.octaves,
                    amplitude: sourceNode.data.amplitude,
                    clampYMin: sourceNode.data.clampYMin,
                    clampYMax: sourceNode.data.clampYMax,
                    offsetX: sourceNode.data.offsetX,
                    offsetZ: sourceNode.data.offsetZ,
                    seed: sourceNode.data.seed,
                    dispClampMin: sourceNode.data.dispClampMin,
                    dispClampMax: sourceNode.data.dispClampMax,
                    peakGain: sourceNode.data.peakGain,
                    valleyGain: sourceNode.data.valleyGain,
                    smoothingStrength: sourceNode.data.smoothingStrength,
                    useColorRamp: sourceNode.data.useColorRamp,
                    dispApplyMinY: sourceNode.data.dispApplyMinY,
                    dispApplyMaxY: sourceNode.data.dispApplyMaxY,
                    dispFeather: sourceNode.data.dispFeather,
                  };
                } // END TERRAIN DISABLED */
                else if (sourceNode.type === 'multNode' && edge.target === node.id && edge.targetHandle === 'transform-modular' && isModular) {
                  // Defer matrix application to chain resolution below.
                } else if (sourceNode.type === 'motorNode') {
                  // Apply motor influence to the corresponding target pin
                  if (edge.target === node.id && edge.targetHandle === 'position-configured') {
                    position = {
                      x: xRange.min + Math.abs(Math.sin(time)) * (xRange.max - xRange.min),
                      y: yRange.min + Math.abs(Math.sin(time)) * (yRange.max - yRange.min),
                      z: zRange.min + Math.abs(Math.sin(time)) * (zRange.max - zRange.min),
                    };
                  } else if (edge.target === node.id && edge.targetHandle === 'rotation-configured') {
                    rotation = {
                      x: xRange.min + Math.abs(Math.sin(time)) * (xRange.max - xRange.min),
                      y: yRange.min + Math.abs(Math.sin(time)) * (yRange.max - yRange.min),
                      z: zRange.min + Math.abs(Math.sin(time)) * (zRange.max - zRange.min),
                    };
                  } else if (edge.target === node.id && edge.targetHandle === 'size-configured') {
                    scale = {
                      x: xRange.min + Math.abs(Math.sin(time)) * (xRange.max - xRange.min),
                      y: yRange.min + Math.abs(Math.sin(time)) * (yRange.max - yRange.min),
                      z: zRange.min + Math.abs(Math.sin(time)) * (zRange.max - zRange.min),
                    };
                  }
                }
              }
            });
  
            let matrix = null;
            if (isModular) {
              // Debug early: verify data.shapeMode flag
              if (!window.__modularFlagOnce) {
                console.log('[ModularCheck]', 'node', node.id, 'shapeMode', node.data.shapeMode);
                window.__modularFlagOnce = true;
              }
              const identityMatrix = () => [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
              const deg2rad = (d) => d * Math.PI / 180;
              const multiplyMatrix = (a,b) => {
                const r = new Array(16).fill(0);
                for (let row=0; row<4; row++) {
                  for (let col=0; col<4; col++) {
                    for (let k=0; k<4; k++) {
                      r[row*4+col] += a[row*4+k]*b[k*4+col];
                    }
                  }
                }
                return r;
              };
              const buildTransformMatrix = (d) => {
                const tx=d.translateX||0, ty=d.translateY||0, tz=d.translateZ||0;
                const rx=deg2rad(d.rotateX||0), ry=deg2rad(d.rotateY||0), rz=deg2rad(d.rotateZ||0);
                const cosX=Math.cos(rx), sinX=Math.sin(rx);
                const cosY=Math.cos(ry), sinY=Math.sin(ry);
                const cosZ=Math.cos(rz), sinZ=Math.sin(rz);
                // Row-major rotation matrices
                const rotX=[1,0,0,0, 0,cosX,-sinX,0, 0,sinX,cosX,0, 0,0,0,1];
                const rotY=[cosY,0,sinY,0, 0,1,0,0, -sinY,0,cosY,0, 0,0,0,1];
                const rotZ=[cosZ,-sinZ,0,0, sinZ,cosZ,0,0, 0,0,1,0, 0,0,0,1];
                // Translation now placed in last column (row-major form of standard affine matrix)
                const translation=[1,0,0,tx, 0,1,0,ty, 0,0,1,tz, 0,0,0,1];
                // Combined: T * Rz * Ry * Rx
                return multiplyMatrix(translation, multiplyMatrix(rotZ, multiplyMatrix(rotY, rotX)));
              };
              const decomposeMatrix = (m) => {
                // Prefer last column (standard affine) then fallback to legacy bottom-row translation
                let tx = m[3], ty = m[7], tz = m[11];
                if (tx === 0 && ty === 0 && tz === 0 && (m[12] !== 0 || m[13] !== 0 || m[14] !== 0)) {
                  tx = m[12]; ty = m[13]; tz = m[14];
                }
                const pos = { x: tx, y: ty, z: tz };
                // Approximate scale from column lengths
                const sx = Math.hypot(m[0], m[1], m[2]);
                const sy = Math.hypot(m[4], m[5], m[6]);
                const sz = Math.hypot(m[8], m[9], m[10]);
                // Remove scale for rotation extraction
                const r0 = [m[0]/sx, m[1]/sx, m[2]/sx];
                const r1 = [m[4]/sy, m[5]/sy, m[6]/sy];
                const r2 = [m[8]/sz, m[9]/sz, m[10]/sz];
                let rotY = Math.asin(-r2[0]);
                let rotX, rotZ;
                if (Math.cos(rotY) !== 0) {
                  rotX = Math.atan2(r2[1], r2[2]);
                  rotZ = Math.atan2(r1[0], r0[0]);
                } else {
                  rotX = Math.atan2(-r0[2], r1[2]);
                  rotZ = 0;
                }
                const rot = { x: rotX*180/Math.PI, y: rotY*180/Math.PI, z: rotZ*180/Math.PI };
                return { position: pos, rotation: rot, scale: { x: sx, y: sy, z: sz } };
              };
              const resolveMatrix = (startId, visited=new Set()) => {
                if (!startId || visited.has(startId)) return identityMatrix();
                visited.add(startId);
                const n = nodes.find(nn => nn.id === startId);
                if (!n) return identityMatrix();
                if (n.type === 'multNode') {
                  const upstreamEdge = edges.find(e => e.target === startId && e.targetHandle === 'matrix-in');
                  const upstream = upstreamEdge ? resolveMatrix(upstreamEdge.source, visited) : identityMatrix();
                  const local = [
                    n.data.m00, n.data.m01, n.data.m02, n.data.m03,
                    n.data.m10, n.data.m11, n.data.m12, n.data.m13,
                    n.data.m20, n.data.m21, n.data.m22, n.data.m23,
                    n.data.m30, n.data.m31, n.data.m32, n.data.m33,
                  ];
                  return multiplyMatrix(local, upstream); // Local * Upstream (earlier upstream first)
                }
                return identityMatrix();
              };
              const tEdge = edges.find(e => e.target === node.id && e.targetHandle === 'transform-modular');
              if (tEdge) {
                matrix = resolveMatrix(tEdge.source);
                // Decompose forward matrix for bounding (collider) data while still using inverse matrix in shader.
                const dec = decomposeMatrix(matrix);
                position = dec.position; // used solely for bounds/collider
                rotation = dec.rotation; // not currently consumed by shader when hasMatrix==1 but collider may use it
                scale = dec.scale;       // collider size; shader will still treat unit size for hasMatrix path
              }
              if (tEdge && now - window.__lastShapeMatrixDebug > 1000) {
                console.log('[ShapeMatrixRaw]', 'node', node.id, 'matrix', matrix);
                window.__lastShapeMatrixDebug = now;
              }
            }
            const shapeData = {
              shape: node.data.shape,
              operation: operation || 'union',
              position: position,
              color: color,
              rotation: rotation,
              scale: scale,
              matrix: matrix,
            };
            // Attach inverse matrix for modular shapes
            if (matrix) {
              const invertMatrix4 = (m) => {
                const inv = new Array(16);
                const a = m;
                inv[0] = a[5]*a[10]*a[15]-a[5]*a[11]*a[14]-a[9]*a[6]*a[15]+a[9]*a[7]*a[14]+a[13]*a[6]*a[11]-a[13]*a[7]*a[10];
                inv[4] = -a[4]*a[10]*a[15]+a[4]*a[11]*a[14]+a[8]*a[6]*a[15]-a[8]*a[7]*a[14]-a[12]*a[6]*a[11]+a[12]*a[7]*a[10];
                inv[8] = a[4]*a[9]*a[15]-a[4]*a[11]*a[13]-a[8]*a[5]*a[15]+a[8]*a[7]*a[13]+a[12]*a[5]*a[11]-a[12]*a[7]*a[9];
                inv[12] = -a[4]*a[9]*a[14]+a[4]*a[10]*a[13]+a[8]*a[5]*a[14]-a[8]*a[6]*a[13]-a[12]*a[5]*a[10]+a[12]*a[6]*a[9];
                inv[1] = -a[1]*a[10]*a[15]+a[1]*a[11]*a[14]+a[9]*a[2]*a[15]-a[9]*a[3]*a[14]-a[13]*a[2]*a[11]+a[13]*a[3]*a[10];
                inv[5] = a[0]*a[10]*a[15]-a[0]*a[11]*a[14]-a[8]*a[2]*a[15]+a[8]*a[3]*a[14]+a[12]*a[2]*a[11]-a[12]*a[3]*a[10];
                inv[9] = -a[0]*a[9]*a[15]+a[0]*a[11]*a[13]+a[8]*a[1]*a[15]-a[8]*a[3]*a[13]-a[12]*a[1]*a[11]+a[12]*a[3]*a[9];
                inv[13] = a[0]*a[9]*a[14]-a[0]*a[10]*a[13]-a[8]*a[1]*a[14]+a[8]*a[2]*a[13]+a[12]*a[1]*a[10]-a[12]*a[2]*a[9];
                inv[2] = a[1]*a[6]*a[15]-a[1]*a[7]*a[14]-a[5]*a[2]*a[15]+a[5]*a[3]*a[14]+a[13]*a[2]*a[7]-a[13]*a[3]*a[6];
                inv[6] = -a[0]*a[6]*a[15]+a[0]*a[7]*a[14]+a[4]*a[2]*a[15]-a[4]*a[3]*a[14]-a[12]*a[2]*a[7]+a[12]*a[3]*a[6];
                inv[10] = a[0]*a[5]*a[15]-a[0]*a[7]*a[13]-a[4]*a[1]*a[15]+a[4]*a[3]*a[13]+a[12]*a[1]*a[7]-a[12]*a[3]*a[5];
                inv[14] = -a[0]*a[5]*a[14]+a[0]*a[6]*a[13]+a[4]*a[1]*a[14]-a[4]*a[2]*a[13]-a[12]*a[1]*a[6]+a[12]*a[2]*a[5];
                inv[3] = -a[1]*a[6]*a[11]+a[1]*a[7]*a[10]+a[5]*a[2]*a[11]-a[5]*a[3]*a[10]-a[9]*a[2]*a[7]+a[9]*a[3]*a[6];
                inv[7] = a[0]*a[6]*a[11]-a[0]*a[7]*a[10]-a[4]*a[2]*a[11]+a[4]*a[3]*a[10]+a[8]*a[2]*a[7]-a[8]*a[3]*a[6];
                inv[11] = -a[0]*a[5]*a[11]+a[0]*a[7]*a[9]+a[4]*a[1]*a[11]-a[4]*a[3]*a[9]-a[8]*a[1]*a[7]+a[8]*a[3]*a[5];
                inv[15] = a[0]*a[5]*a[10]-a[0]*a[6]*a[9]-a[4]*a[1]*a[10]+a[4]*a[2]*a[9]+a[8]*a[1]*a[6]-a[8]*a[2]*a[5];
                let det = a[0]*inv[0] + a[1]*inv[4] + a[2]*inv[8] + a[3]*inv[12];
                if (Math.abs(det) < 1e-8) return [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
                for (let i=0;i<16;i++) inv[i] /= det;
                return inv;
              };
              shapeData.inverseMatrix = invertMatrix4(matrix);
              shapeData.hasMatrix = true;
            }
            
            /* TERRAIN DISABLED
            // Add terrainParams if ANY shape has it connected - turns shape into terrain!
            if (terrainParams) {
              shapeData.terrainParams = terrainParams;
            }
            */
            
            shapes.push(shapeData);
          } else if (node.type === 'modeNode') {
            const shape1NodeId = edges
              .filter(edge => edge.target === node.id && edge.targetHandle === 'shape1')
              .map(edge => edge.source)[0];
  
            const shapesNodeIds = edges
              .filter(edge => edge.target === node.id && edge.targetHandle === 'shapes')
              .map(edge => edge.source);

            if (shape1NodeId) traverse(shape1NodeId, node.data.mode);
            shapesNodeIds.forEach(shapeNodeId => {
              if (shapeNodeId) traverse(shapeNodeId, node.data.mode);
            });
          }
        };
  
        const modeNodes = edges
          .filter(edge => edge.target === renderNode.id && edge.targetHandle === 'render')
          .map(edge => nodes.find(n => n.id === edge.source && n.type === 'modeNode'))
          .filter(Boolean);
  
        modeNodes.forEach(modeNode => {
          const shape1NodeId = edges
            .filter(edge => edge.target === modeNode.id && edge.targetHandle === 'shape1')
            .map(edge => edge.source)[0];

          const shapesNodeIds = edges
            .filter(edge => edge.target === modeNode.id && edge.targetHandle === 'shapes')
            .map(edge => edge.source);

          if (shape1NodeId) traverse(shape1NodeId, modeNode.data.mode);
          
          // Process all shapes connected to the "shapes" handle
          shapesNodeIds.forEach(shapeNodeId => {
            if (shapeNodeId) traverse(shapeNodeId, modeNode.data.mode);
          });
        });        shapes.forEach(shapeData => {
          threeSceneRef.current.addShape(shapeData, layerIndex);
        });
      });
    }
  }, [nodes, edges]);
  
  
  useEffect(() => {
    const intervalId = setInterval(handleRenderScene, 16); // 16ms for ~60fps updates
    return () => clearInterval(intervalId); // Cleanup on unmount
  }, [handleRenderScene]);
  
  
  

  useEffect(() => {
    handleRenderScene();
  }, [nodes, edges, handleRenderScene]);

  const onNodesChange = useCallback(
    (changes) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
      handleRenderScene();
    },
    [handleRenderScene]
  );

  const onEdgesChange = useCallback(
    (changes) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
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
        sphereNode: ['shape1', 'shapes'],
        torusNode: ['shape1', 'shapes'],
        boxNode: ['shape1', 'shapes'],
        capsuleNode: ['shape1', 'shapes'],
        modeNode: ['shape1', 'shapes', 'render'],
        motorNode: ['position-configured', 'size-configured', 'rotation-configured'],
        // TERRAIN DISABLED terrainParamsNode: ['terrainParams-configured', 'terrainParams-modular'],
        multNode: ['transform-modular', 'matrix-in'],
      };
  
      const sourceNode = nodes.find((node) => node.id === source);
      const targetNode = nodes.find((node) => node.id === target);
  
      if (sourceNode && targetNode) {
        const validSourceHandles = validConnections[sourceNode.type];
        if (validSourceHandles && validSourceHandles.includes(targetHandle)) {
          // Check if multiple connections are allowed for this specific handle
          const allowMultipleConnections = targetNode.type === 'modeNode' && targetHandle === 'shapes';
          
          const existingConnection = edges.find((edge) => edge.target === target && edge.targetHandle === targetHandle);
          
          if (!existingConnection || allowMultipleConnections) {
            setEdges((eds) => addEdge(params, eds));
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
    sphereNode: ['shape1', 'shapes'],
    torusNode: ['shape1', 'shapes'],
    boxNode: ['shape1', 'shapes'],
    capsuleNode: ['shape1', 'shapes'],
    modeNode: ['shape1', 'shapes', 'render'],
    motorNode: ['position-configured', 'size-configured', 'rotation-configured'],
    // TERRAIN DISABLED terrainParamsNode: ['terrainParams-configured', 'terrainParams-modular'],
    multNode: ['transform-modular', 'matrix-in'],
  };

  // Ensure validation before reconnecting
  const validSourceHandles = validConnections[sourceNode.type];
  if (sourceNode && targetNode && validSourceHandles && validSourceHandles.includes(newConnection.targetHandle)) {
    // Allow multiple outgoing but only one incoming edge
    const existingIncomingConnection = edges.find(
      (edge) => edge.target === newConnection.target && edge.targetHandle === newConnection.targetHandle
    );

    // If an incoming connection already exists, prevent reconnection
    if (!existingIncomingConnection || oldEdge.id === existingIncomingConnection.id) {
      setEdges((els) => reconnectEdge(oldEdge, newConnection, els));
      handleRenderScene(); // Call your existing render function
    } else {
      console.warn('Only one connection allowed per target pin');
    }
  } else {
    console.warn('Invalid connection');
  }
}, [nodes, edges, handleRenderScene]);


const onReconnectEnd = useCallback((_, edge) => {
  if (!edgeReconnectSuccessful.current) {
    setEdges((eds) => eds.filter((e) => e.id !== edge.id));
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
