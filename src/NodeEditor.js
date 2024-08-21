import React, { useState, useEffect, useRef } from 'react';
import { useReactFlow } from 'reactflow';
import './App.css'; // Import the CSS file

function NodeEditor({ setNodes, isFullscreen }) {
  const [nodeCount, setNodeCount] = useState(3); // Starts at 3 because of initial nodes
  const reactFlowInstance = useReactFlow();
  const [showShapeMenu, setShowShapeMenu] = useState(false);
  const shapeMenuRef = useRef(null);

  const generateUniqueId = () => {
    let id;
    let exists;
    for (let i = 1; i <= 1000; i++) {
      id = i.toString();
      exists = reactFlowInstance.getNodes().some((node) => node.id === id);
      if (!exists) break;
    }
    return id;
  };

  const addVectorNode = () => {
    const newNode = {
      id: generateUniqueId(),
      type: 'vectorNode',
      data: { x: 0, y: 0, z: 0 },
      position: { x: Math.random() * 250, y: Math.random() * 250 },
    };
    reactFlowInstance.setNodes((nds) => nds.concat(newNode));
    setNodeCount(nodeCount + 1);
  };

  const addShapeNode = (shapeType) => {
    const newNode = {
      id: generateUniqueId(),
      type: shapeType,
      data: { shape: shapeType.replace('Node', '').toLowerCase() },
      position: { x: Math.random() * 250, y: Math.random() * 250 },
    };
    reactFlowInstance.setNodes((nds) => nds.concat(newNode));
    setNodeCount(nodeCount + 1);
    setShowShapeMenu(false); // Close the menu after adding a shape
  };

  const addColorNode = () => {
    const newNode = {
      id: generateUniqueId(),
      type: 'colorNode',
      data: { color: '#ffffff' },
      position: { x: Math.random() * 250, y: Math.random() * 250 },
    };
    reactFlowInstance.setNodes((nds) => nds.concat(newNode));
    setNodeCount(nodeCount + 1);
  };

  const addRenderNode = () => {
    const newNode = {
      id: generateUniqueId(),
      type: 'renderNode',
      data: { label: 'Render', layerId: `layer-${nodeCount + 1}` },
      position: { x: Math.random() * 250, y: Math.random() * 250 },
    };
    reactFlowInstance.setNodes((nds) => nds.concat(newNode));
    setNodeCount(nodeCount + 1);
  };

  const addModeNode = () => {
    const newNode = {
      id: generateUniqueId(),
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

  // Close shape menu if clicking outside of it
  const handleClickOutside = (event) => {
    if (shapeMenuRef.current && !shapeMenuRef.current.contains(event.target)) {
      setShowShapeMenu(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className={`node-editor-buttons ${isFullscreen ? 'hidden' : ''}`} style={{ width: '98%', padding: '0px', display: 'flex', justifyContent: 'space-between' }}>
      <button className={`pshdown2 ${isFullscreen ? 'hidden' : ''}`} onClick={addVectorNode} style={{ flex: '1 1 19%' }}>Vector</button>
      <div ref={shapeMenuRef} style={{ position: 'relative', flex: '1 1 19%' }}>
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
      <button className={`pshdown2 ${isFullscreen ? 'hidden' : ''}`} onClick={addModeNode} style={{ flex: '1 1 19%' }}>Mode</button>
      <button className={`pshdown2 ${isFullscreen ? 'hidden' : ''}`} onClick={addRenderNode} style={{ flex: '1 1 19%' }}>Render</button>
    </div>
  );
}

export default NodeEditor;
