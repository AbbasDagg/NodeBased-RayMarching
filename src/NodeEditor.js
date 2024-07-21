import React, { useState } from 'react';
import { useReactFlow } from 'reactflow';

function NodeEditor({ setNodes }) {
  const [nodeCount, setNodeCount] = useState(2); // Starts at 2 because of initial nodes
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

  const addShapeNode = (shape) => {
    const newNode = {
      id: (nodeCount + 1).toString(),
      type: 'shapeNode',
      data: { shape: shape },
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

  return (
    <div style={{ width: '100%', padding: '10px', display: 'flex', justifyContent: 'space-between' }}>
      <button onClick={addVectorNode}>Add Vector Node</button>
      <button onClick={() => addShapeNode('sphere')}>Add Shape Node</button>
      <button onClick={addColorNode}>Add Color Node</button>
    </div>
  );
}

export default NodeEditor;
