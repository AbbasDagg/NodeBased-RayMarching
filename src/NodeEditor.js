import React, { useState } from 'react';
import { useReactFlow } from 'reactflow';
import './App.css'; // Import the CSS file

function NodeEditor({ setNodes, isFullscreen }) {
  const [nodeCount, setNodeCount] = useState(3); // Starts at 3 because of initial nodes
  const reactFlowInstance = useReactFlow();
  const [showShapeMenu, setShowShapeMenu] = useState(false);

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

  const addShapeNode = (shapeType) => {
    const newNode = {
      id: (nodeCount + 1).toString(),
      type: shapeType,
      data: { shape: shapeType.replace('Node', '').toLowerCase() },
      position: { x: Math.random() * 250, y: Math.random() * 250 },
    };
    reactFlowInstance.setNodes((nds) => nds.concat(newNode));
    setNodeCount(nodeCount + 1);
    setShowShapeMenu(false);
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

  const addModeNode = () => {
    const newNode = {
      id: (nodeCount + 1).toString(),
      type: 'modeNode',
      data: { mode: 'union' },
      position: { x: Math.random() * 250, y: Math.random() * 250 },
    };
    reactFlowInstance.setNodes((nds) => nds.concat(newNode));
    setNodeCount(nodeCount + 1);
  };

  const toggleShapeMenu = () => {
    setShowShapeMenu(!showShapeMenu);
  };

  return (
    <div className={`node-editor-buttons ${isFullscreen ? 'hidden' : ''}`} style={{ width: '98%', padding: '0px', display: 'flex', justifyContent: 'space-between' }}>
      <button className={`pshdown2 ${isFullscreen ? 'hidden' : ''}`} onClick={addVectorNode} style={{ flex: '1 1 19%' }}>Vector</button>
      <div style={{ position: 'relative', flex: '1 1 19%' }}>
        <button className={`pshdown2 ${isFullscreen ? 'hidden' : ''}`} onClick={toggleShapeMenu} style={{ width: '100%' }}>Shape</button>
        {showShapeMenu && (
          <div className="shape-menu">
            <button className="pshdown2" onClick={() => addShapeNode('sphereNode')}>Sphere</button>
            <button className="pshdown2" onClick={() => addShapeNode('torusNode')}>Torus</button>
            <button className="pshdown2" onClick={() => addShapeNode('boxNode')}>Box</button>
            <button className="pshdown2" onClick={() => addShapeNode('capsuleNode')}>Capsule</button>
          </div>
        )}
      </div>
      <button className={`pshdown2 ${isFullscreen ? 'hidden' : ''}`} onClick={addColorNode} style={{ flex: '1 1 19%' }}>Color</button>
      <button className={`pshdown2 ${isFullscreen ? 'hidden' : ''}`} onClick={addRenderNode} style={{ flex: '1 1 19%' }}>Render</button>
      <button className={`pshdown2 ${isFullscreen ? 'hidden' : ''}`} onClick={addModeNode} style={{ flex: '1 1 19%' }}>Mode</button>
    </div>
  );
}

export default NodeEditor;
