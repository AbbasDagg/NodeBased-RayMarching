import React, { useState } from 'react';
import { useReactFlow } from 'reactflow';

function NodeEditor({ setNodes }) {
  const [nodeCount, setNodeCount] = useState(3); // Starts at 3 because of initial nodes
  const reactFlowInstance = useReactFlow();

  const addVectorNode = () => {
    const newNode = {
      id: (nodeCount + 1).toString(),
      type: 'vectorNode',
      data: { x: 0, y: 0, z: 0 },
      position: { x: Math.random() * 250, y: Math.random() * 250 },
    };
    reactFlowInstance.setNodes((nds) => nds.concat(newNode));
    setNodeCount(nodeCount + 1);
  };

  const addShapeNode = () => {
    const newNode = {
      id: (nodeCount + 1).toString(),
      type: 'shapeNode',
      data: { shape: 'sphere' },
      position: { x: Math.random() * 250, y: Math.random() * 250 },
    };
    reactFlowInstance.setNodes((nds) => nds.concat(newNode));
    setNodeCount(nodeCount + 1);
  };

  const addColorNode = () => {
    const newNode = {
      id: (nodeCount + 1).toString(),
      type: 'colorNode',
      data: { color: '#ffffff' },
      position: { x: Math.random() * 250, y: Math.random() * 250 },
    };
    reactFlowInstance.setNodes((nds) => nds.concat(newNode));
    setNodeCount(nodeCount + 1);
  };

  const addRenderNode = () => {
    const newNode = {
      id: (nodeCount + 1).toString(),
      type: 'renderNode',
      data: { label: 'Render' },
      position: { x: Math.random() * 250, y: Math.random() * 250 },
    };
    reactFlowInstance.setNodes((nds) => nds.concat(newNode));
    setNodeCount(nodeCount + 1);
  };

  return (
    <div style={{ width: '100%', padding: '10px', display: 'flex', justifyContent: 'space-between' }}>
      <button onClick={addVectorNode}>Add Vector Node</button>
      <button onClick={addShapeNode}>Add Shape Node</button>
      <button onClick={addColorNode}>Add Color Node</button>
      <button onClick={addRenderNode}>Add Render Node</button>
    </div>
  );
}

export default NodeEditor;
