import React, { useCallback, useRef, useState, useEffect } from 'react';
import { ReactFlowProvider, ReactFlow, addEdge, applyEdgeChanges, applyNodeChanges, MiniMap, Controls, Background } from 'reactflow';
import 'reactflow/dist/style.css';
import NodeEditor from './NodeEditor';
import ThreeScene from './ThreeScene';
import { VectorNode, ShapeNode, ColorNode, RenderNode } from './CustomNodes';

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
};

function App() {
  const threeSceneRef = useRef();
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);

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
      renderNodes.forEach(renderNode => {
        const connectedShapeNodes = edges
          .filter(edge => edge.target === renderNode.id && edge.targetHandle === 'render')
          .map(edge => updatedNodes.find(n => n.id === edge.source && n.type === 'shapeNode'));

        connectedShapeNodes.forEach(shapeNode => {
          const connectedPositionNode = edges.filter(edge => edge.target === shapeNode.id && edge.targetHandle === 'position')
            .map(edge => updatedNodes.find(n => n.id === edge.source && n.type === 'vectorNode'))[0];

          const connectedColorNode = edges.filter(edge => edge.target === shapeNode.id && edge.targetHandle === 'color')
            .map(edge => updatedNodes.find(n => n.id === edge.source && n.type === 'colorNode'))[0];

          const connectedSizeNode = edges.filter(edge => edge.target === shapeNode.id && edge.targetHandle === 'size')
            .map(edge => updatedNodes.find(n => n.id === edge.source && n.type === 'vectorNode'))[0];

          const shapeData = {
            shape: shapeNode.data.shape,
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
          };
          threeSceneRef.current.addShape(shapeData);
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
