import React, { useCallback, useRef, useState, useEffect } from 'react';
import { ReactFlowProvider, ReactFlow, addEdge, applyEdgeChanges, applyNodeChanges, MiniMap, Controls, Background } from 'reactflow';
import 'reactflow/dist/style.css';
import './App.css'; // Import the CSS file
import NodeEditor from './NodeEditor';
import ThreeScene from './ThreeScene';
import { VectorNode, SphereNode, TorusNode, BoxNode, CapsuleNode, ColorNode, RenderNode, ModeNode, MotorNode } from './CustomNodes';

const initialNodes = [
  // Color Node for Box (left side)
  { id: '1', type: 'colorNode', position: { x: 0, y: 0 }, data: { color: '#cc0f0f' } },
  
  // Color Node for Capsule (left side)
  { id: '2', type: 'colorNode', position: { x: 0, y: 3*100 }, data: { color: '#37d42b' } },
  
  // Motor Node for Box scale (left side)
  { id: '3', type: 'motorNode', position: { x: 3*150, y: 0 }, data: { 
    xRange: { min: 2 * 1.5, max: 1.2, step: 0 }, 
    yRange: { min: 2 * 1.5, max: 1.2, step: 0 }, 
    zRange: { min: 2 * 1.5, max: 1.2, step: 0 }
  }},
  
  // Motor Node for Capsule scale (left side)
  { id: '4', type: 'motorNode', position: { x: 3*150, y: 3*100 }, data: { 
    xRange: { min: 1.4 * 1.65, max: 1, step: 0 }, 
    yRange: { min: 1.4 * 1.65, max: 1, step: 0 }, 
    zRange: { min: 1.4 * 1.65, max: 1, step: 0 }
  }},
  
  // Motor Node for Box rotation (left side)
  { id: '5', type: 'motorNode', position: { x: 3*150, y: 3*200 }, data: { 
    xRange: { min: 0, max: 1*180, step: 1 }, 
    yRange: { min: 0, max: 1*180, step: 1 }, 
    zRange: { min: 0, max: 0, step: 1 }
  }},

  // Motor Node for Capsule rotation (Reverse of Box rotation, left side)
  { id: '6', type: 'motorNode', position: { x: 3*150, y: 3*300 }, data: { 
    xRange: { min: 180/2, max: 0, step: 1 }, 
    yRange: { min: 180/2, max: 0, step: 1 }, 
    zRange: { min: 0, max: 0, step: 1 }
  }},
  
  // Vector Node for Position (left side)
  { id: '7', type: 'vectorNode', position: { x: 3*300, y: 0 }, data: { x: -2, y: 0, z: 0 } },

  // Box Node (Shape 1, left side)
  { id: '8', type: 'boxNode', position: { x: 3*450, y: 0 }, data: { shape: 'box' } },
  
  // Capsule Node (Shape 2, left side)
  { id: '9', type: 'boxNode', position: { x: 3*450, y: 3*100 }, data: { shape: 'box' } },
  
  // Mode Node for operation (Union or Subtraction, left side)
  { id: '10', type: 'modeNode', position: { x:3* 600, y: 3*50 }, data: { mode: 'subtraction' } },
  
  // Render Node (left side)
  { id: '11', type: 'renderNode', position: { x: 3*750, y: 3*50 }, data: { label: 'Render', layerId: 'layer-1' } },

  // Color Node for Sphere (right side)
  { id: '12', type: 'colorNode', position: { x: 0, y: 3*400 }, data: { color: '#000000' } },

  // Color Node for Torus (right side)
  { id: '13', type: 'colorNode', position: { x: 0, y:3* 500 }, data: { color: '#430070' } },

  // Motor Node for Sphere scale (right side)
  { id: '14', type: 'motorNode', position: { x: 3*150, y: 3*400 }, data: { 
    xRange: { min: 2 * 1.5, max: 2 * 1, step: 0 }, 
    yRange: { min: 2 * 1.5, max: 2 * 1, step: 0 }, 
    zRange: { min: 2 * 1.5, max: 2 * 1, step: 0 }
  }},

  // Motor Node for Torus scale (right side)
  { id: '15', type: 'motorNode', position: { x: 3*150, y: 3*500 }, data: { 
    xRange: { min: 2 * 2, max: 2 * 0, step: 0 }, 
    yRange: { min: 2 * 1.7, max: 2 * 0.5, step: 0 }, 
    zRange: { min: 2 * 1.7, max: 2 * 0.5, step: 0 }
  }},

  // Motor Node for Sphere rotation (right side)
  { id: '16', type: 'motorNode', position: { x:3* 150, y: 3*600 }, data: { 
    xRange: { min: 0, max: 360, step: 1 }, 
    yRange: { min: 0, max: 360, step: 1 }, 
    zRange: { min: 0, max: 0, step: 1 }
  }},
  
  // Vector Node for Position (right side)
  { id: '17', type: 'vectorNode', position: { x: 3*300, y: 3*400 }, data: { x: 2, y: 0, z: 0 } },

  // Sphere Node (Shape 3, right side)
  { id: '18', type: 'sphereNode', position: { x: 3*450, y: 3*400 }, data: { shape: 'sphere' } },
  
  // Torus Node (Shape 4, right side)
  { id: '19', type: 'torusNode', position: { x: 3*450, y: 3*500 }, data: { shape: 'torus' } },
  
  // Mode Node for operation (Union or Subtraction, right side)
  { id: '20', type: 'modeNode', position: { x: 3*600, y: 3*450 }, data: { mode: 'subtraction' } },
  
  // Render Node (right side)
  { id: '21', type: 'renderNode', position: { x: 3*750, y: 3*450 }, data: { label: 'Render', layerId: 'layer-2' } }
];


const initialEdges = [
  // Left side connections
  { id: 'e1', source: '1', target: '8', sourceHandle: 'color', targetHandle: 'color' },
  { id: 'e2', source: '2', target: '9', sourceHandle: 'color', targetHandle: 'color' },
  { id: 'e3', source: '3', target: '8', sourceHandle: 'vector', targetHandle: 'size' },
  { id: 'e4', source: '4', target: '9', sourceHandle: 'vector', targetHandle: 'size' },
  { id: 'e5', source: '5', target: '8', sourceHandle: 'vector', targetHandle: 'rotation' },
  { id: 'e6', source: '6', target: '9', sourceHandle: 'vector', targetHandle: 'rotation' },
  { id: 'e7', source: '7', target: '8', sourceHandle: 'vector', targetHandle: 'position' },
  { id: 'e8', source: '7', target: '9', sourceHandle: 'vector', targetHandle: 'position' },
  { id: 'e9', source: '8', target: '10', sourceHandle: 'render', targetHandle: 'shape1' },
  { id: 'e10', source: '9', target: '10', sourceHandle: 'render', targetHandle: 'shape2' },
  { id: 'e11', source: '10', target: '11', sourceHandle: 'render', targetHandle: 'render' },

  // Right side connections
  { id: 'e12', source: '12', target: '18', sourceHandle: 'color', targetHandle: 'color' },
  { id: 'e13', source: '13', target: '19', sourceHandle: 'color', targetHandle: 'color' },
  { id: 'e14', source: '14', target: '18', sourceHandle: 'vector', targetHandle: 'size' },
  { id: 'e15', source: '15', target: '19', sourceHandle: 'vector', targetHandle: 'size' },
  { id: 'e16', source: '16', target: '18', sourceHandle: 'vector', targetHandle: 'rotation' },
  { id: 'e17', source: '17', target: '18', sourceHandle: 'vector', targetHandle: 'position' },
  { id: 'e18', source: '17', target: '19', sourceHandle: 'vector', targetHandle: 'position' },
  { id: 'e19', source: '18', target: '20', sourceHandle: 'render', targetHandle: 'shape1' },
  { id: 'e20', source: '19', target: '20', sourceHandle: 'render', targetHandle: 'shape2' },
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
};

function App() {
  const threeSceneRef = useRef();
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [leftPaneWidth, setLeftPaneWidth] = useState(window.innerWidth / 2);

  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, nodeId: null });

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
  
        const newNode = {
          ...nodeToCopy,
          id: newId,
          position: { x: nodeToCopy.position.x + 20, y: nodeToCopy.position.y + 20 },
          data: { ...nodeToCopy.data }, // Copy node data without connections
        };
  
        console.log(`New node created with ID: ${newNode.id}, position: (${newNode.position.x}, ${newNode.position.y})`);
  
        // Add the new node to the list of nodes
        setNodes((nds) => nds.concat(newNode));
        
        // Do not copy any edges, the new node should have no connections
        // Remove any existing connections for the new node, just in case
        setEdges((eds) => {
          const newEdges = eds.filter((edge) => edge.source !== newNode.id && edge.target !== newNode.id);
          console.log(`New edges after removing connections for copied node:`, newEdges);
          return newEdges;
        });
  
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
  
      renderNodes.forEach((renderNode, layerIndex) => {
        const shapes = [];
  
        const traverse = (nodeId, operation) => {
          const node = nodes.find(n => n.id === nodeId);
  
          if (['sphereNode', 'torusNode', 'boxNode', 'capsuleNode'].includes(node.type)) {
            let position = { x: 0, y: 0, z: 0 };
            let rotation = { x: 0, y: 0, z: 0 };
            let scale = { x: 1, y: 1, z: 1 };
            let color = 0xffffff;
  
            // Find all connected edges for position, rotation, and size
            edges.forEach(edge => {
              const sourceNode = nodes.find(n => n.id === edge.source);
              if (sourceNode) {
                const time = Date.now() / 1000;
                const { xRange, yRange, zRange } = sourceNode.data;
  
                if (sourceNode.type === 'vectorNode') {
                  if (edge.target === node.id && edge.targetHandle === 'position') {
                    position = {
                      x: sourceNode.data.x,
                      y: sourceNode.data.y,
                      z: sourceNode.data.z,
                    };
                  } else if (edge.target === node.id && edge.targetHandle === 'rotation') {
                    rotation = {
                      x: sourceNode.data.x,
                      y: sourceNode.data.y,
                      z: sourceNode.data.z,
                    };
                  } else if (edge.target === node.id && edge.targetHandle === 'size') {
                    scale = {
                      x: sourceNode.data.x,
                      y: sourceNode.data.y,
                      z: sourceNode.data.z,
                    };
                  }
                } else if (sourceNode.type === 'colorNode' && edge.target === node.id && edge.targetHandle === 'color') {
                  color = sourceNode.data.color;
                } else if (sourceNode.type === 'motorNode') {
                  // Apply motor influence to the corresponding target pin
                  if (edge.target === node.id && edge.targetHandle === 'position') {
                    position = {
                      x: xRange.min + Math.abs(Math.sin(time)) * (xRange.max - xRange.min),
                      y: yRange.min + Math.abs(Math.sin(time)) * (yRange.max - yRange.min),
                      z: zRange.min + Math.abs(Math.sin(time)) * (zRange.max - zRange.min),
                    };
                  } else if (edge.target === node.id && edge.targetHandle === 'rotation') {
                    rotation = {
                      x: xRange.min + Math.abs(Math.sin(time)) * (xRange.max - xRange.min),
                      y: yRange.min + Math.abs(Math.sin(time)) * (yRange.max - yRange.min),
                      z: zRange.min + Math.abs(Math.sin(time)) * (zRange.max - zRange.min),
                    };
                  } else if (edge.target === node.id && edge.targetHandle === 'size') {
                    scale = {
                      x: xRange.min + Math.abs(Math.sin(time)) * (xRange.max - xRange.min),
                      y: yRange.min + Math.abs(Math.sin(time)) * (yRange.max - yRange.min),
                      z: zRange.min + Math.abs(Math.sin(time)) * (zRange.max - zRange.min),
                    };
                  }
                }
              }
            });
  
            shapes.push({
              shape: node.data.shape,
              operation: operation || 'union',
              position: position,
              color: color,
              rotation: rotation,
              scale: scale,
            });
          } else if (node.type === 'modeNode') {
            const shape1NodeId = edges
              .filter(edge => edge.target === node.id && edge.targetHandle === 'shape1')
              .map(edge => edge.source)[0];
  
            const shape2NodeId = edges
              .filter(edge => edge.target === node.id && edge.targetHandle === 'shape2')
              .map(edge => edge.source)[0];
  
            if (shape1NodeId) traverse(shape1NodeId, node.data.mode);
            if (shape2NodeId) traverse(shape2NodeId, node.data.mode);
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
  
          const shape2NodeId = edges
            .filter(edge => edge.target === modeNode.id && edge.targetHandle === 'shape2')
            .map(edge => edge.source)[0];
  
          if (shape1NodeId) traverse(shape1NodeId, modeNode.data.mode);
          if (shape2NodeId) traverse(shape2NodeId, modeNode.data.mode);
        });
  
        shapes.forEach(shapeData => {
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
        vectorNode: ['position', 'size', 'rotation'],
        colorNode: ['color'],
        sphereNode: ['shape1', 'shape2'],
        torusNode: ['shape1', 'shape2'],
        boxNode: ['shape1', 'shape2'],
        capsuleNode: ['shape1', 'shape2'],
        modeNode: ['shape1', 'shape2', 'render'],
        motorNode: ['position', 'size', 'rotation'],
      };
  
      const sourceNode = nodes.find((node) => node.id === source);
      const targetNode = nodes.find((node) => node.id === target);
  
      if (sourceNode && targetNode) {
        const validSourceHandles = validConnections[sourceNode.type];
        if (validSourceHandles && validSourceHandles.includes(targetHandle)) {
          const existingConnection = edges.find((edge) => edge.target === target && edge.targetHandle === targetHandle);
          if (!existingConnection) {
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
  
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    const leftPane = document.getElementById('left-pane');
    const threeSceneContainer = document.getElementById('three-scene-container');
    const divider = document.querySelector('.divider');

    if (leftPane && threeSceneContainer && divider) {
      leftPane.style.transition = 'width 0.5s ease'; // Add transition for fullscreen toggle
      threeSceneContainer.style.transition = 'width 0.5s ease'; // Add transition for fullscreen toggle

      if (!isFullscreen) {
        leftPane.style.width = '0';
        threeSceneContainer.style.width = '100vw';
        divider.style.display = 'none'; // Hide the divider in fullscreen mode
      } else {
        leftPane.style.width = `${leftPaneWidth}px`;
        threeSceneContainer.style.width = `calc(100vw - ${leftPaneWidth}px)`;
        divider.style.display = 'block'; // Show the divider when exiting fullscreen
      }
    }

    setTimeout(() => {
      if (threeSceneRef.current) {
        threeSceneRef.current.resizeRenderer(window.innerWidth - (isFullscreen ? leftPaneWidth : 0), window.innerHeight);
      }
    }, 500); // Match the duration of the transition
  };

  const handleWindowResize = () => {
    const leftPane = document.getElementById('left-pane');
    const threeSceneContainer = document.getElementById('three-scene-container');
    const newLeftPaneWidth = Math.min(Math.max(leftPaneWidth, window.innerWidth * 0.2), window.innerWidth * 0.8);
    setLeftPaneWidth(newLeftPaneWidth);

    if (leftPane && threeSceneContainer) {
      leftPane.style.width = isFullscreen ? '0' : `${newLeftPaneWidth}px`;
      threeSceneContainer.style.width = isFullscreen ? '100vw' : `calc(100vw - ${newLeftPaneWidth}px)`;
    }

    if (threeSceneRef.current) {
      threeSceneRef.current.resizeRenderer(window.innerWidth - (isFullscreen ? 0 : newLeftPaneWidth), window.innerHeight);
    }
  };

  useEffect(() => {
    window.addEventListener('resize', handleWindowResize);
    return () => {
      window.removeEventListener('resize', handleWindowResize);
    };
  }, [isFullscreen, leftPaneWidth]);

  useEffect(() => {
    handleWindowResize();
  }, [isFullscreen]);

  const startResizing = (e) => {
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResizing);
  };

  const resize = (e) => {
    const minLeftPaneWidth = window.innerWidth * 0.2; // 20% of the window width
    const maxLeftPaneWidth = window.innerWidth * 0.8; // 80% of the window width
    const newWidth = Math.max(Math.min(e.clientX, maxLeftPaneWidth), minLeftPaneWidth);
    setLeftPaneWidth(newWidth);
    const leftPane = document.getElementById('left-pane');
    const threeSceneContainer = document.getElementById('three-scene-container');
    if (leftPane && threeSceneContainer) {
      leftPane.style.transition = 'none'; // Remove transition for instant resizing
      threeSceneContainer.style.transition = 'none'; // Remove transition for instant resizing
      leftPane.style.width = `${newWidth}px`;
      threeSceneContainer.style.width = `calc(100vw - ${newWidth}px)`;
      threeSceneRef.current.resizeRenderer(window.innerWidth - newWidth, window.innerHeight);
    }
  };

  const stopResizing = () => {
    document.removeEventListener('mousemove', resize);
    document.removeEventListener('mouseup', stopResizing);
    const leftPane = document.getElementById('left-pane');
    const threeSceneContainer = document.getElementById('three-scene-container');
    if (leftPane && threeSceneContainer) {
      leftPane.style.transition = 'width 0.5s ease'; // Restore transition for other operations
      threeSceneContainer.style.transition = 'width 0.5s ease'; // Restore transition for other operations
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }} onClick={closeContextMenu}>
      <ReactFlowProvider>
        <div
          id="left-pane"
          style={{
            width: isFullscreen ? '0' : `${leftPaneWidth}px`,
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            transition: 'width 0.5s ease',
          }}
          className={isFullscreen ? 'hidden' : ''}
        >
          <NodeEditor setNodes={setNodes} isFullscreen={isFullscreen} />
          <div style={{ flex: 1 }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              fitView
              onPaneContextMenu={(event) => event.preventDefault()} // Prevents right-click on the empty canvas
              onNodeContextMenu={(event, node) => handleContextMenu(event, node)} // Right-click on a node
            >
              <Controls />
              <MiniMap />
              <Background variant="dots" gap={12} size={1} />
            </ReactFlow>
          </div>
        </div>
        <div
          className="divider"
          onMouseDown={startResizing}
          style={{
            left: `${leftPaneWidth}px`,
            display: isFullscreen ? 'none' : 'block',
          }}
        />
      </ReactFlowProvider>
      <div
        id="three-scene-container"
        style={{
          width: isFullscreen ? '100vw' : `calc(100vw - ${leftPaneWidth}px)`,
          height: '100%',
          position: 'relative',
          transition: 'width 0.5s ease',
        }}
      >
        <ThreeScene ref={threeSceneRef} />
        <div
          className={`fullscreen-button-container`}
          onClick={toggleFullscreen}
          style={{
            position: 'absolute',
            bottom: '5px',
            right: '5px',
            zIndex: 1,
          }}
        >
          <input type="checkbox" checked={isFullscreen} onChange={toggleFullscreen} />
          <img className="expand" src="/svg/expand.svg" alt="expand" />
          <img className="compress" src="/svg/collapse.svg" alt="compress" />
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
