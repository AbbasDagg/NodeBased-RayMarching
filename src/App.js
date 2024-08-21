import React, { useCallback, useRef, useState, useEffect } from 'react';
import { ReactFlowProvider, ReactFlow, addEdge, applyEdgeChanges, applyNodeChanges, MiniMap, Controls, Background } from 'reactflow';
import 'reactflow/dist/style.css';
import './App.css'; // Import the CSS file
import NodeEditor from './NodeEditor';
import ThreeScene from './ThreeScene';
import { VectorNode, SphereNode, TorusNode, BoxNode, CapsuleNode, ColorNode, RenderNode, ModeNode, MotorNode } from './CustomNodes';

const initialNodes = [
  { id: '1', type: 'vectorNode', position: { x: 0, y: 0 }, data: { x: 0, y: 0, z: 0 } },
  { id: '2', type: 'sphereNode', position: { x: 100, y: 100 }, data: { shape: 'sphere' } },
  { id: '3', type: 'renderNode', position: { x: 200, y: 200 }, data: { label: 'Render', layerId: 'layer-1' } },
  { id: '4', type: 'motorNode', position: { x: 300, y: 300 }, data: { xRange: { min: 0, max: 10, step: 1 }, yRange: { min: 0, max: 10, step: 1 }, zRange: { min: 0, max: 10, step: 1 } } }, // New MotorNode
];


const initialEdges = [];

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
        let newId;
        for (let i = 1; i <= 1000; i++) {
          if (!nodes.find((node) => node.id === i.toString())) {
            newId = i.toString();
            break;
          }
        }
        const newNode = {
          ...nodeToCopy,
          id: newId,
          position: { x: nodeToCopy.position.x + 20, y: nodeToCopy.position.y + 20 },
        };
        setNodes((nds) => nds.concat(newNode));
        setContextMenu({ ...contextMenu, visible: false });
      }
    }
  };

  const handleDeleteNode = () => {
    if (contextMenu.nodeId) {
      setNodes((nds) => nds.filter((node) => node.id !== contextMenu.nodeId));
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
            const connectedPositionNode = edges
              .filter(edge => edge.target === node.id && edge.targetHandle === 'position')
              .map(edge => nodes.find(n => n.id === edge.source && n.type === 'vectorNode'))
              .filter(Boolean)[0];
  
            const connectedColorNode = edges
              .filter(edge => edge.target === node.id && edge.targetHandle === 'color')
              .map(edge => nodes.find(n => n.id === edge.source && n.type === 'colorNode'))
              .filter(Boolean)[0];
  
            const connectedSizeNode = edges
              .filter(edge => edge.target === node.id && edge.targetHandle === 'size')
              .map(edge => nodes.find(n => n.id === edge.source && n.type === 'vectorNode'))
              .filter(Boolean)[0];
  
            const connectedRotationNode = edges
              .filter(edge => edge.target === node.id && edge.targetHandle === 'rotation')
              .map(edge => nodes.find(n => n.id === edge.source && n.type === 'vectorNode'))
              .filter(Boolean)[0];
  
            const rotation = connectedRotationNode
              ? {
                  x: (connectedRotationNode.data.x % 360) || 0,
                  y: (connectedRotationNode.data.y % 360) || 0,
                  z: (connectedRotationNode.data.z % 360) || 0,
                }
              : { x: 0, y: 0, z: 0 };
  
            shapes.push({
              shape: node.data.shape,
              operation: operation || 'union', // Use provided operation or default to union
              position: {
                x: connectedPositionNode ? parseFloat(connectedPositionNode.data.x) : 0,
                y: connectedPositionNode ? parseFloat(connectedPositionNode.data.y) : 0,
                z: connectedPositionNode ? parseFloat(connectedPositionNode.data.z) : 0,
              },
              color: connectedColorNode ? connectedColorNode.data.color : 0xffffff,
              rotation: rotation,
              scale: {
                x: connectedSizeNode ? connectedSizeNode.data.x : 1,
                y: connectedSizeNode ? connectedSizeNode.data.y : 1,
                z: connectedSizeNode ? connectedSizeNode.data.z : 1,
              }
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
  
        // Add shapes to the layer corresponding to the render node
        shapes.forEach(shapeData => {
          threeSceneRef.current.addShape(shapeData, layerIndex);
        });
      });
    }
  }, [nodes, edges]);
  

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
      };

      const sourceNode = nodes.find((node) => node.id === source);
      const targetNode = nodes.find((node) => node.id === target);

      if (sourceNode && targetNode) {
        const validSourceHandles = validConnections[sourceNode.type];
        if (validSourceHandles && validSourceHandles.includes(targetHandle)) {
          // Check for existing connections to the same targetHandle
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
