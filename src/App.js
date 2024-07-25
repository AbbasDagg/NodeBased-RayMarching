import React, { useCallback, useRef, useState, useEffect } from 'react';
import { ReactFlowProvider, ReactFlow, addEdge, applyEdgeChanges, applyNodeChanges, MiniMap, Controls, Background } from 'reactflow';
import 'reactflow/dist/style.css';
import './App.css'; // Import the CSS file
import NodeEditor from './NodeEditor';
import ThreeScene from './ThreeScene';
import { VectorNode, ShapeNode, ColorNode, RenderNode, ModeNode } from './CustomNodes';

const initialNodes = [
  { id: '1', type: 'vectorNode', position: { x: 0, y: 0 }, data: { x: 0, y: 0, z: 0 } },
  { id: '2', type: 'shapeNode', position: { x: 100, y: 100 }, data: { shape: 'sphere' } },
  { id: '3', type: 'renderNode', position: { x: 200, y: 200 }, data: { label: 'Render' } },
];

const initialEdges = [];

const nodeTypes = {
  vectorNode: VectorNode,
  shapeNode: ShapeNode,
  colorNode: ColorNode,
  renderNode: RenderNode,
  modeNode: ModeNode,
};

function App() {
  const threeSceneRef = useRef();
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [leftPaneWidth, setLeftPaneWidth] = useState('50vw');

  const handleRenderScene = useCallback(() => {
    if (threeSceneRef.current) {
      threeSceneRef.current.clearScene();

      const updatedNodes = nodes.map(node => {
        if (node.type === 'vectorNode') {
          return {
            ...node,
            data: {
              x: node.data.x || 0,
              y: node.data.y || 0,
              z: node.data.z || 0
            }
          };
        }
        return node;
      });

      const renderNodes = updatedNodes.filter(node => node.type === 'renderNode');
      renderNodes.forEach((renderNode, layerIndex) => {
        const shapes = [];

        const traverse = (nodeId, operation) => {
          const node = updatedNodes.find(n => n.id === nodeId);

          if (node.type === 'shapeNode') {
            const connectedPositionNode = edges
              .filter(edge => edge.target === node.id && edge.targetHandle === 'position')
              .map(edge => updatedNodes.find(n => n.id === edge.source && n.type === 'vectorNode'))
              .filter(Boolean)[0];

            const connectedColorNode = edges
              .filter(edge => edge.target === node.id && edge.targetHandle === 'color')
              .map(edge => updatedNodes.find(n => n.id === edge.source && n.type === 'colorNode'))
              .filter(Boolean)[0];

            const connectedSizeNode = edges
              .filter(edge => edge.target === node.id && edge.targetHandle === 'size')
              .map(edge => updatedNodes.find(n => n.id === edge.source && n.type === 'vectorNode'))
              .filter(Boolean)[0];

            shapes.push({
              shape: node.data.shape,
              operation: operation || 'union', // Use provided operation or default to union
              position: {
                x: connectedPositionNode ? parseFloat(connectedPositionNode.data.x) : 0,
                y: connectedPositionNode ? parseFloat(connectedPositionNode.data.y) : 0,
                z: connectedPositionNode ? parseFloat(connectedPositionNode.data.z) : 0,
              },
              color: connectedColorNode ? connectedColorNode.data.color : 0xffffff,
              rotation: { x: 0, y: 0, z: 0 },
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
          .map(edge => updatedNodes.find(n => n.id === edge.source && n.type === 'modeNode'))
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

          shapes.forEach(shapeData => {
            threeSceneRef.current.addShape(shapeData, layerIndex);
          });
        });
      });
    }
  }, [nodes, edges]);

  useEffect(() => {
    handleRenderScene();
  }, [nodes, edges, handleRenderScene]);

  const onNodesChange = useCallback((changes) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
    handleRenderScene();
  }, [handleRenderScene]);

  const onEdgesChange = useCallback((changes) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
    handleRenderScene();
  }, [handleRenderScene]);

  const onConnect = useCallback((params) => {
    const { source, sourceHandle, target, targetHandle } = params;

    const validConnections = {
      vectorNode: ['position', 'size'],
      colorNode: ['color'],
      shapeNode: ['shape1', 'shape2'],
      modeNode: ['shape1', 'shape2', 'render'],
    };

    const sourceNode = nodes.find(node => node.id === source);
    const targetNode = nodes.find(node => node.id === target);

    if (sourceNode && targetNode) {
      const validSourceHandles = validConnections[sourceNode.type];
      if (validSourceHandles && validSourceHandles.includes(targetHandle)) {
        // Check for existing connections to the same targetHandle
        const existingConnection = edges.find(edge => edge.target === target && edge.targetHandle === targetHandle);
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
  }, [nodes, edges, handleRenderScene]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleWindowResize = () => {
    if (threeSceneRef.current) {
      threeSceneRef.current.resizeRenderer(window.innerWidth / (isFullscreen ? 1 : 2), window.innerHeight);
    }
    // Ensure the left pane resizing
    const leftPane = document.getElementById('left-pane');
    if (leftPane) {
      leftPane.style.width = isFullscreen ? '0' : leftPaneWidth;
    }
  };

  useEffect(() => {
    window.addEventListener('resize', handleWindowResize);
    return () => {
      window.removeEventListener('resize', handleWindowResize);
    };
  }, [isFullscreen, leftPaneWidth]);

  useEffect(() => {
    if (threeSceneRef.current) {
      threeSceneRef.current.resizeRenderer(window.innerWidth / (isFullscreen ? 1 : 2), window.innerHeight);
    }
    const leftPane = document.getElementById('left-pane');
    const threeSceneContainer = document.getElementById('three-scene-container');

    if (isFullscreen) {
      leftPane.style.transition = 'width 0.5s ease';
      threeSceneContainer.style.transition = 'width 0.5s ease';
      leftPane.style.width = '0';
      threeSceneContainer.style.width = '100vw';
    } else {
      leftPane.style.transition = 'width 0.5s ease';
      threeSceneContainer.style.transition = 'width 0.5s ease';
      leftPane.style.width = leftPaneWidth;
      threeSceneContainer.style.width = `calc(100vw - ${leftPaneWidth})`;
    }
  }, [isFullscreen, leftPaneWidth]);

  const startResizing = (e) => {
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResizing);
  };

  const resize = (e) => {
    const minLeftPaneWidth = window.innerWidth * 0.2; // 20% of the window width
    const maxLeftPaneWidth = window.innerWidth * 0.8; // 80% of the window width
    const newWidth = Math.max(Math.min(e.clientX, maxLeftPaneWidth), minLeftPaneWidth) + 'px';
    setLeftPaneWidth(newWidth);
    const leftPane = document.getElementById('left-pane');
    const threeSceneContainer = document.getElementById('three-scene-container');
    if (leftPane && threeSceneContainer) {
      leftPane.style.transition = 'none'; // Remove transition for instant resizing
      threeSceneContainer.style.transition = 'none'; // Remove transition for instant resizing
      leftPane.style.width = newWidth;
      threeSceneContainer.style.width = `calc(100vw - ${newWidth})`;
      threeSceneRef.current.resizeRenderer(window.innerWidth - parseInt(newWidth), window.innerHeight);
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
    <div style={{ display: 'flex', height: '100vh' }}>
      <ReactFlowProvider>
        <div id="left-pane" style={{
          width: isFullscreen ? '0' : leftPaneWidth,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.5s ease'
        }} className={isFullscreen ? 'hidden' : ''}>
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
            left: leftPaneWidth,
            display: isFullscreen ? 'none' : 'block'
          }}
        />
      </ReactFlowProvider>
      <div id="three-scene-container" style={{
        width: isFullscreen ? '100vw' : `calc(100vw - ${leftPaneWidth})`,
        height: '100%',
        position: 'relative',
        transition: 'width 0.5s ease'
      }}>
        <ThreeScene ref={threeSceneRef} />
        <div className={`fullscreen-button-container`} onClick={toggleFullscreen} style={{
          position: 'absolute',
          bottom: '5px',
          right: '5px',
          zIndex: 1
        }}>
          <input type="checkbox" checked={isFullscreen} onChange={toggleFullscreen} />
          <img className="expand" src="/svg/expand.svg" alt="expand" />
          <img className="compress" src="/svg/collapse.svg" alt="compress" />
        </div>
      </div>
    </div>
  );
}

export default App;
