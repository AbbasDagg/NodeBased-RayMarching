import React, { useState, useEffect, useRef } from 'react';
import { useReactFlow } from 'reactflow';
import './App.css'; // Import the CSS file
//import { add } from 'three/webgpu';
//import { add } from 'three/webgpu';

function NodeEditor({ setNodes, isFullscreen }) {
  const [nodeCount, setNodeCount] = useState(3); // Starts at 3 because of initial nodes
  const [availableIds, setAvailableIds] = useState([]);
  const reactFlowInstance = useReactFlow();
  const [showShapeMenu, setShowShapeMenu] = useState(false);
  const shapeMenuRef = useRef(null);

  const generateUniqueId = () => {
    if (availableIds.length > 0) {
      return availableIds.pop();
    }
    let id;
    let exists;
    for (let i = 1; i <= 1000; i++) {
      id = i.toString();
      exists = reactFlowInstance.getNodes().some((node) => node.id === id);
      if (!exists) break;
    }
    return id;
  };


  const addNodeToCenter = (nodeType, data = {}) => {
    try {
      // Get the current viewport transformation (pan and zoom) from the reactFlowInstance
      const { x: viewportX, y: viewportY, zoom } = reactFlowInstance.getViewport();
  
      // Get the width of the left pane (divider) element
      const leftPane = document.getElementById('left-pane');
      const leftPaneWidth = leftPane && !isFullscreen ? leftPane.offsetWidth : 0; // Only consider leftPaneWidth if not in fullscreen
  
      // Calculate the center position of the visible viewport
      const centerX = (window.innerWidth - leftPaneWidth) / 2 / zoom - viewportX / zoom;
      const centerY = (window.innerHeight / 2) / zoom - viewportY / zoom;
  
      //console.log(`Adding node at center: (${centerX}, ${centerY}) with viewport offset: (${viewportX}, ${viewportY})`);
  
      const newNode = {
        id: (Math.random() * 1000).toString(), // Generate a unique ID
        type: nodeType,
        data: data,
        position: { x: centerX + (Math.random() * 500 - 350) , y: centerY + (Math.random() * 500 - 350)}, // Position the node at the calculated center
      };
  
      // Add the new node to the flow
      reactFlowInstance.setNodes((nds) => nds.concat(newNode));
      setNodeCount((prev) => prev + 1);
  
    } catch (error) {
      console.error("Error in addNodeToCenter:", error);
    }
  };
  
  
  
  
  
  const addVectorNode = () => {
    addNodeToCenter('vectorNode', { x: 0, y: 0, z: 0 });
  };
  

  const addShapeNode = (shapeType) => {
    addNodeToCenter(shapeType, { shape: shapeType.replace('Node', '').toLowerCase() });
    setShowShapeMenu(false); // Close the menu after adding a shape
  };

  const addColorNode = () => {
    addNodeToCenter('colorNode', { color: '#ffffff' });
  };

  const addRenderNode = () => {
    addNodeToCenter('renderNode', { label: 'Render', layerId: `layer-${nodeCount + 1}` });
  };

  const addModeNode = () => {
    addNodeToCenter('modeNode', { mode: 'normal' });
  };

  const addMotorNode = () => {
    addNodeToCenter('motorNode', { xRange: { min: 0, max: 10, step: 1 }, yRange: { min: 0, max: 10, step: 1 }, zRange: { min: 0, max: 10, step: 1 } });
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

  const resetAllNodes = () => {
    // Get IDs of existing nodes
    const currentIds = reactFlowInstance.getNodes().map(node => node.id);

    // Clear nodes
    reactFlowInstance.setNodes([]);

    // Reset node count
    setNodeCount(0);

    // Add all IDs back to the available list
    setAvailableIds((prev) => [...prev, ...currentIds]);
    
    // Reset edges
    reactFlowInstance.setEdges([]);
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
<div className={`node-editor-buttons ${isFullscreen ? 'hidden' : ''}`} style={{ width: '98%', padding: '0px', display: 'flex', justifyContent: 'flex-start', gap: '0px', position: 'relative' }}>
<button className={`pshdown2 ${isFullscreen ? 'hidden' : ''}`} onClick={addVectorNode} style={{ flex: '1 1 16%' }}>Vector</button>
      <button className={`pshdown2 ${isFullscreen ? 'hidden' : ''}`} onClick={addMotorNode} style={{ flex: '1 1 16%' }}>Motor</button>

      <div ref={shapeMenuRef} style={{ position: 'relative', flex: '1 1 15%' }}>
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
      <button className={`pshdown2 ${isFullscreen ? 'hidden' : ''}`} onClick={addColorNode} style={{ flex: '1 1 16%' }}>Color</button>
      <button className={`pshdown2 ${isFullscreen ? 'hidden' : ''}`} onClick={addModeNode} style={{ flex: '1 1 16%' }}>Mode</button>
      <button className={`pshdown2 ${isFullscreen ? 'hidden' : ''}`} onClick={addRenderNode} style={{ flex: '1 1 16%' , marginRight: '4px' }}>Render</button>

      <div className={`${isFullscreen ? 'hidden' : ''}`} style={{ position: 'fixed', bottom: '14px', left: '48px' }}>
      <button className="button" style={{ width: '55px', height: '35px' }} onClick={resetAllNodes}>
        <svg className="svgIcon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '70px' }}>
          <path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"></path>
          </svg>
        </button>
      </div>
    </div>
  );
}

export default NodeEditor;
