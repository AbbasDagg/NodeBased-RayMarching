import React, { useCallback, useRef, useState, useEffect } from 'react';
import { ReactFlowProvider, ReactFlow, addEdge, applyEdgeChanges, applyNodeChanges, MiniMap, Controls, Background } from 'reactflow';
import 'reactflow/dist/style.css';
import NodeEditor from './NodeEditor';
import ThreeScene from './ThreeScene';
import { PositionNode, ShapeNode, ColorNode, SizeNode } from './CustomNodes';

const initialNodes = [
  { id: '1', type: 'positionNode', position: { x: 0, y: 0 }, data: { x: 0, y: 0, z: 0 } },
  { id: '2', type: 'shapeNode', position: { x: 100, y: 100 }, data: { shape: 'sphere' } },
];

const initialEdges = [];

const nodeTypes = {
  positionNode: PositionNode,
  shapeNode: ShapeNode,
  colorNode: ColorNode,
  sizeNode: SizeNode,
};

function App() {
  const threeSceneRef = useRef();
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);

  const handleRenderScene = useCallback(() => {
    if (threeSceneRef.current) {
      threeSceneRef.current.clearScene();

      const updatedNodes = nodes.map(node => {
        if (node.type === 'positionNode') {
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

      updatedNodes.filter(node => node.type === 'shapeNode').forEach(shapeNode => {
        const connectedPositionNode = edges.filter(edge => edge.target === shapeNode.id && edge.targetHandle === 'position')
          .map(edge => updatedNodes.find(n => n.id === edge.source && n.type === 'positionNode'))[0];

        const connectedColorNode = edges.filter(edge => edge.target === shapeNode.id && edge.targetHandle === 'color')
          .map(edge => updatedNodes.find(n => n.id === edge.source && n.type === 'colorNode'))[0];

        const connectedSizeNode = edges.filter(edge => edge.target === shapeNode.id && edge.targetHandle === 'size')
          .map(edge => updatedNodes.find(n => n.id === edge.source && n.type === 'sizeNode'))[0];

        if (connectedPositionNode) {
          const shapeData = {
            shape: shapeNode.data.shape,
            position: {
              x: parseFloat(connectedPositionNode.data.x),
              y: parseFloat(connectedPositionNode.data.y),
              z: parseFloat(connectedPositionNode.data.z)
            },
            color: connectedColorNode ? connectedColorNode.data.color : 0xffffff,  // Default color to white
            rotation: { x: 0, y: 0, z: 0 },
            scale: {
              x: connectedSizeNode ? connectedSizeNode.data.x : 1,
              y: connectedSizeNode ? connectedSizeNode.data.y : 1,
              z: connectedSizeNode ? connectedSizeNode.data.z : 1
            }
          };
          threeSceneRef.current.addShape(shapeData);
        }
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
    const targetHandle = params.targetHandle;
    if (edges.some(edge => edge.target === params.target && edge.targetHandle === targetHandle)) {
      alert('This connection point already has a node connected.');
      return;
    }

    const sourceNode = nodes.find(node => node.id === params.source);
    if ((targetHandle === 'position' && sourceNode.type !== 'positionNode') ||
        (targetHandle === 'color' && sourceNode.type !== 'colorNode') ||
        (targetHandle === 'size' && sourceNode.type !== 'sizeNode')) {
      alert(`You can only connect a ${targetHandle} node to this handle.`);
      return;
    }

    setEdges((eds) => addEdge(params, eds));
    handleRenderScene();
  }, [edges, nodes, handleRenderScene]);

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <ReactFlowProvider>
        <div style={{ width: '50vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
          <NodeEditor setNodes={setNodes} />
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
      </ReactFlowProvider>
      <ThreeScene ref={threeSceneRef} />
    </div>
  );
}

export default App;
