import React, { useState, useEffect, useRef } from 'react';
import { useReactFlow } from 'reactflow';
import './App.css'; // Import the CSS file
import { generateSimpleScene, generateComplexScene, generateVariations, generateRandomSingleShape, generateProceduralTerrain } from './ProceduralGeneration';
//import { add } from 'three/webgpu';
//import { add } from 'three/webgpu';

function NodeEditor({ setNodes, isFullscreen }) {
  const [nodeCount, setNodeCount] = useState(3); // Starts at 3 because of initial nodes
  const [availableIds, setAvailableIds] = useState([]);
  const reactFlowInstance = useReactFlow();
  const [showShapeMenu, setShowShapeMenu] = useState(false);
  const [showOperatorMenu, setShowOperatorMenu] = useState(false);
  const shapeMenuRef = useRef(null);
  const operatorMenuRef = useRef(null);

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

  const addTransformNode = () => {
    addNodeToCenter('transformNode', { translateX: 0, translateY: 0, translateZ: 0, rotateX: 0, rotateY: 0, rotateZ: 0 });
  };

  const addMultNode = () => {
    addNodeToCenter('multNode', { scaleX: 1, scaleY: 1, scaleZ: 1 });
  };
  const addGroupNode = () => {
    addNodeToCenter('groupNode', {});
  };

  const toggleShapeMenu = () => {
    setShowShapeMenu(!showShapeMenu);
    setShowOperatorMenu(false);
  };

  const toggleOperatorMenu = () => {
    setShowOperatorMenu(!showOperatorMenu);
    setShowShapeMenu(false);
  };

  const addOperatorNode = (type) => {
    if (type === 'vectorNode') addVectorNode();
    else if (type === 'motorNode') addMotorNode();
    else if (type === 'transformNode') addTransformNode();
    else if (type === 'multNode') addMultNode();
    setShowOperatorMenu(false);
  };

  // Close menus if clicking outside of them
  const handleClickOutside = (event) => {
    if (shapeMenuRef.current && !shapeMenuRef.current.contains(event.target)) {
      setShowShapeMenu(false);
    }
    if (operatorMenuRef.current && !operatorMenuRef.current.contains(event.target)) {
      setShowOperatorMenu(false);
    }
  };

  // History management for undo functionality
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Initialize history with current state
  useEffect(() => {
    if (history.length === 0) {
      const initialState = {
        nodes: reactFlowInstance.getNodes(),
        edges: reactFlowInstance.getEdges()
      };
      setHistory([initialState]);
      setHistoryIndex(0);
    }
  }, [reactFlowInstance]);

  // Save current state to history
  const saveToHistory = () => {
    const currentState = {
      nodes: reactFlowInstance.getNodes(),
      edges: reactFlowInstance.getEdges()
    };
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(currentState);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Undo function
  const undoLastAction = () => {
    if (historyIndex > 0) {
      const previousState = history[historyIndex - 1];
      reactFlowInstance.setNodes(previousState.nodes);
      reactFlowInstance.setEdges(previousState.edges);
      setHistoryIndex(historyIndex - 1);
      setNodeCount(previousState.nodes.length);
    }
  };

  const resetAllNodes = () => {
    // Save current state before reset
    saveToHistory();
    
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

  // Procedural Generation Functions
  const generateSimpleProceduralScene = () => {
    try {
      saveToHistory(); // Save current state before generating
      console.log('Generating simple scene...');
      const { nodes, edges } = generateSimpleScene();
      console.log('Simple scene generated, setting nodes and edges...');
      console.log('Nodes:', nodes);
      console.log('Edges:', edges);
      reactFlowInstance.setNodes(nodes);
      reactFlowInstance.setEdges(edges);
      setNodeCount(nodes.length);
      console.log('Simple scene applied successfully');
    } catch (error) {
      console.error('Error in generateSimpleProceduralScene:', error);
    }
  };

  const generateComplexProceduralScene = () => {
    try {
      saveToHistory(); // Save current state before generating
      console.log('Generating complex scene...');
      const { nodes, edges } = generateComplexScene();
      console.log('Complex scene generated, setting nodes and edges...');
      console.log('Nodes:', nodes);
      console.log('Edges:', edges);
      reactFlowInstance.setNodes(nodes);
      reactFlowInstance.setEdges(edges);
      setNodeCount(nodes.length);
      console.log('Complex scene applied successfully');
    } catch (error) {
      console.error('Error in generateComplexProceduralScene:', error);
    }
  };

  const generateSingleShapeScene = () => {
    try {
      saveToHistory(); // Save current state before generating
      console.log('Generating single random shape...');
      const { nodes, edges } = generateRandomSingleShape();
      console.log('Single shape generated, setting nodes and edges...');
      console.log('Nodes:', nodes);
      console.log('Edges:', edges);
      reactFlowInstance.setNodes(nodes);
      reactFlowInstance.setEdges(edges);
      setNodeCount(nodes.length);
      console.log('Single shape applied successfully');
    } catch (error) {
      console.error('Error in generateSingleShapeScene:', error);
    }
  };

  const handleGenerateTerrain = () => {
    try {
      saveToHistory(); // Save current state before generating
      console.log('Generating procedural terrain...');
      const { nodes, edges } = generateProceduralTerrain();
      console.log('Terrain generated, setting nodes and edges...');
      console.log('Nodes:', nodes);
      console.log('Edges:', edges);
      reactFlowInstance.setNodes(nodes);
      reactFlowInstance.setEdges(edges);
      setNodeCount(nodes.length);
      console.log('Procedural terrain applied successfully');
    } catch (error) {
      console.error('Error in handleGenerateTerrain:', error);
    }
  };

  const generateVariationsFromCurrent = () => {
    const currentNodes = reactFlowInstance.getNodes();
    const currentEdges = reactFlowInstance.getEdges();
    
    if (currentNodes.length === 0) {
      alert('No existing scene to generate variations from. Create a scene first!');
      return;
    }
    
    saveToHistory(); // Save current state before generating variations
    const variatedNodes = generateVariations(currentNodes);
    reactFlowInstance.setNodes(variatedNodes);
    // Keep the same edges
    reactFlowInstance.setEdges(currentEdges);
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div style={{ width: '100%' }}>
      <div className={`node-editor-buttons ${isFullscreen ? 'hidden' : ''}`} style={{ width: 'calc(100% - 320px)', padding: '0px', display: 'flex', justifyContent: 'flex-start', gap: '5px', position: 'relative' }}>
      
      <div ref={shapeMenuRef} style={{ position: 'relative', flex: '1 1 20%' }}>
        <button className={`pshdown2 ${isFullscreen ? 'hidden' : ''}`} onClick={toggleShapeMenu} style={{ width: '100%' }}>Shape ▾</button>
        {showShapeMenu && (
          <div className="shape-menu">
            <button className="pshdown2" onClick={() => addShapeNode('sphereNode')}>Sphere</button>
            <button className="pshdown2" onClick={() => addShapeNode('torusNode')}>Torus</button>
            <button className="pshdown2" onClick={() => addShapeNode('boxNode')}>Box</button>
            <button className="pshdown2" onClick={() => addShapeNode('capsuleNode')}>Capsule</button>
          </div>
        )}
      </div>

      <div ref={operatorMenuRef} style={{ position: 'relative', flex: '1 1 20%' }}>
        <button className={`pshdown2 ${isFullscreen ? 'hidden' : ''}`} onClick={toggleOperatorMenu} style={{ width: '100%' }}>Operators ▾</button>
        {showOperatorMenu && (
          <div className="shape-menu">
            <button className="pshdown2" onClick={() => addOperatorNode('vectorNode')}>Vector</button>
            <button className="pshdown2" onClick={() => addOperatorNode('motorNode')}>Motor</button>
            <button className="pshdown2" onClick={() => addOperatorNode('transformNode')}>Transform</button>
            <button className="pshdown2" onClick={() => addOperatorNode('multNode')}>Mult</button>
            <button className="pshdown2" onClick={addGroupNode}>Group</button>
          </div>
        )}
      </div>
      <button className={`pshdown2 ${isFullscreen ? 'hidden' : ''}`} onClick={addColorNode} style={{ flex: '1 1 16%' }}>Color</button>
      <button className={`pshdown2 ${isFullscreen ? 'hidden' : ''}`} onClick={addModeNode} style={{ flex: '1 1 16%' }}>Mode</button>
      <button className={`pshdown2 ${isFullscreen ? 'hidden' : ''}`} onClick={addRenderNode} style={{ flex: '1 1 16%', marginRight: '4px' }}>Render</button>
      </div>

      {/* Procedural Generation Buttons */}
      <div className={`node-editor-buttons ${isFullscreen ? 'hidden' : ''}`} style={{ width: 'calc(100% - 320px)', padding: '0px', display: 'flex', justifyContent: 'flex-start', gap: '5px', position: 'relative', marginTop: '10px' }}>
        <button 
          className={`glowing ${isFullscreen ? 'hidden' : ''}`} 
          onClick={generateSimpleProceduralScene} 
          style={{ flex: '1 1 18%', fontSize: '12px', padding: '8px 4px' }}
        >
          Generate Simple
        </button>
        <button 
          className={`glowing ${isFullscreen ? 'hidden' : ''}`} 
          onClick={generateComplexProceduralScene} 
          style={{ flex: '1 1 18%', fontSize: '12px', padding: '8px 4px' }}
        >
          Generate Complex
        </button>
        <button 
          className={`glowing ${isFullscreen ? 'hidden' : ''}`} 
          onClick={generateVariationsFromCurrent} 
          style={{ flex: '1 1 18%', fontSize: '12px', padding: '8px 4px' }}
        >
          Generate Variations
        </button>
        <button 
          className={`glowing ${isFullscreen ? 'hidden' : ''}`} 
          onClick={generateSingleShapeScene} 
          style={{ flex: '1 1 15%', fontSize: '12px', padding: '8px 4px' }}
        >
          Random Shape
        </button>
        <button 
          className={`terrain-btn ${isFullscreen ? 'hidden' : ''}`} 
          onClick={handleGenerateTerrain} 
          style={{ flex: '1 1 18%', fontSize: '12px', padding: '8px 4px' }}
        >
          Generate Terrain
        </button>
        <button 
          className={`delete ${isFullscreen ? 'hidden' : ''}`} 
          onClick={resetAllNodes} 
          style={{ flex: '1 1 23%', fontSize: '12px', padding: '8px 4px', width: 'auto', height: 'auto', borderRadius: '10px' }}
        >
          <svg className="svgIcon white-icon" viewBox="0 0 448 512" style={{ fill: '#ffffff !important', color: '#ffffff !important' }}>
            <path d="M135.2 17.7C140.6 6.8 151.7 0 163.8 0H284.2c12.1 0 23.2 6.8 28.6 17.7L320 32h96c17.7 0 32 14.3 32 32s-14.3 32-32 32H32C14.3 96 0 81.7 0 64S14.3 32 32 32h96l7.2-14.3zM32 128H416L394.8 467c-1.6 25.3-22.6 45-47.9 45H101.1c-25.3 0-46.3-19.7-47.9-45L32 128z" fill="#ffffff"></path>
          </svg>
        </button>
      </div>

      {/* Undo button in bottom corner */}
      <div className={`${isFullscreen ? 'hidden' : ''}`} style={{ position: 'fixed', bottom: '14px', left: '50px', zIndex: 1000 }}>
        <button 
          className="button" 
          style={{ 
            width: '55px', 
            height: '35px', 
            zIndex: 1001, 
            opacity: historyIndex > 0 ? 1 : 0.5,
            cursor: historyIndex > 0 ? 'pointer' : 'not-allowed'
          }} 
          onClick={undoLastAction}
          disabled={historyIndex <= 0}
          title="Undo"
        >
          <svg className="svgIcon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" style={{ width: '20px', height: '20px' }}>
            <path d="M142.9 142.9c62.2-62.2 162.7-62.5 225.3-1L327 183c-6.9 6.9-8.9 17.2-5.2 26.2s12.5 14.8 22.2 14.8H463.5c13.3 0 24-10.7 24-24V72c0-9.7-5.8-18.5-14.8-22.2s-19.3-1.7-26.2 5.2L405.8 95.8C317.2 12.2 174.5 8.3 82.7 85.1c-87.5 87.5-87.5 229.3 0 316.8s229.3 87.5 316.8 0c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0c-62.5 62.5-163.8 62.5-226.3 0s-62.5-163.8 0-226.3z"></path>
          </svg>
        </button>
      </div>
    </div>
  );
}

export default NodeEditor;
