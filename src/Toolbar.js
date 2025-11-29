import React, { useState } from 'react';

const toolbarStyle = {
  display: 'flex',
  gap: '10px',
  padding: '10px',
  background: '#333',
  color: '#fff',
  justifyContent: 'center',
  flexWrap: 'wrap',
};

const toolbarItemStyle = {
  padding: '10px 20px',
  background: '#555',
  borderRadius: '4px',
  cursor: 'pointer',
  userSelect: 'none',
};

const dropdownContainerStyle = {
  position: 'relative',
  display: 'inline-block',
};

const dropdownButtonStyle = {
  padding: '10px 20px',
  background: '#555',
  borderRadius: '4px',
  cursor: 'pointer',
  userSelect: 'none',
  border: 'none',
  color: '#fff',
  fontSize: '14px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const dropdownMenuStyle = {
  position: 'absolute',
  top: '100%',
  left: 0,
  marginTop: '5px',
  background: '#444',
  borderRadius: '4px',
  boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
  zIndex: 1000,
  minWidth: '160px',
};

const dropdownItemStyle = {
  padding: '10px 20px',
  cursor: 'pointer',
  userSelect: 'none',
  borderBottom: '1px solid #555',
  transition: 'background-color 0.2s',
};

const proceduralButtonStyle = {
  padding: '10px 20px',
  background: '#2a9d8f',
  borderRadius: '4px',
  cursor: 'pointer',
  userSelect: 'none',
  border: 'none',
  color: '#fff',
  fontWeight: 'bold',
  transition: 'background-color 0.3s ease',
};

const clearButtonStyle = {
  padding: '10px 20px',
  background: '#e63946',
  borderRadius: '4px',
  cursor: 'pointer',
  userSelect: 'none',
  border: 'none',
  color: '#fff',
  fontWeight: 'bold',
  transition: 'background-color 0.3s ease',
};

function Toolbar({ onGenerateSimple, onGenerateComplex, onGenerateVariations, /* TERRAIN DISABLED onGenerateTerrain, */ onClearScene }) {
  const [isShapesOpen, setIsShapesOpen] = useState(false);
  const [isOperatorsOpen, setIsOperatorsOpen] = useState(false);

  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const shapeNodes = [
    { type: 'sphereNode', label: 'Sphere', color: '#2ecc71' },
    { type: 'torusNode', label: 'Torus', color: '#a970ff' },
    { type: 'boxNode', label: 'Box', color: '#ff4d4d' },
    { type: 'capsuleNode', label: 'Capsule', color: '#f39c12' },
  ];

  const operatorNodes = [
    { type: 'vectorNode', label: 'Vector', color: '#555' },
    { type: 'motorNode', label: 'Motor', color: '#555' },
    { type: 'transformNode', label: 'Transform', color: '#00d4ff' },
    { type: 'multNode', label: 'Mult (Scale)', color: '#ff6b6b' },
    { type: 'groupNode', label: 'Group', color: '#a970ff' },
  ];

  return (
    <div style={toolbarStyle}>
      {/* Shapes Dropdown */}
      <div style={dropdownContainerStyle}>
        <button 
          style={dropdownButtonStyle}
          onClick={() => setIsShapesOpen(!isShapesOpen)}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#666'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#555'}
        >
          Shapes ▾
        </button>
        {isShapesOpen && (
          <div style={dropdownMenuStyle}>
            {shapeNodes.map((node, index) => (
              <div
                key={node.type}
                style={{
                  ...dropdownItemStyle,
                  background: node.color,
                  borderBottom: index === shapeNodes.length - 1 ? 'none' : '1px solid #555',
                }}
                onDragStart={(event) => onDragStart(event, node.type)}
                draggable
                onMouseEnter={(e) => e.target.style.backgroundColor = '#666'}
                onMouseLeave={(e) => e.target.style.backgroundColor = node.color}
              >
                {node.label}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={toolbarItemStyle} onDragStart={(event) => onDragStart(event, 'colorNode')} draggable>
        Color Node
      </div>
      
      {/* Operators Dropdown */}
      <div style={dropdownContainerStyle}>
        <button 
          style={dropdownButtonStyle}
          onClick={() => setIsOperatorsOpen(!isOperatorsOpen)}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#666'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#555'}
        >
          Operators ▾
        </button>
        {isOperatorsOpen && (
          <div style={dropdownMenuStyle}>
            {operatorNodes.map((node, index) => (
              <div
                key={node.type}
                style={{
                  ...dropdownItemStyle,
                  background: node.color,
                  borderBottom: index === operatorNodes.length - 1 ? 'none' : '1px solid #555',
                }}
                onDragStart={(event) => onDragStart(event, node.type)}
                draggable
                onMouseEnter={(e) => e.target.style.backgroundColor = '#666'}
                onMouseLeave={(e) => e.target.style.backgroundColor = node.color}
              >
                {node.label}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* TERRAIN DISABLED
      <div style={{...toolbarItemStyle, background: '#ff9500'}} onDragStart={(event) => onDragStart(event, 'terrainParamsNode')} draggable>
        Terrain Params
      </div>
      */}
      
      {/* Procedural Generation Buttons */}
      <div style={{ borderLeft: '1px solid #666', height: '40px', margin: '5px 10px' }}></div>
      
      <button 
        style={proceduralButtonStyle}
        onClick={onGenerateSimple}
        onMouseEnter={(e) => e.target.style.backgroundColor = '#21867a'}
        onMouseLeave={(e) => e.target.style.backgroundColor = '#2a9d8f'}
      >
        Generate Simple Scene
      </button>
      
      <button 
        style={proceduralButtonStyle}
        onClick={onGenerateComplex}
        onMouseEnter={(e) => e.target.style.backgroundColor = '#21867a'}
        onMouseLeave={(e) => e.target.style.backgroundColor = '#2a9d8f'}
      >
        Generate Complex Scene
      </button>
      
      <button 
        style={proceduralButtonStyle}
        onClick={onGenerateVariations}
        onMouseEnter={(e) => e.target.style.backgroundColor = '#21867a'}
        onMouseLeave={(e) => e.target.style.backgroundColor = '#2a9d8f'}
      >
        Generate Variations
      </button>
      
      {/* TERRAIN DISABLED
      <button 
        style={{...proceduralButtonStyle, background: '#4a9eff'}}
        onClick={onGenerateTerrain}
        onMouseEnter={(e) => e.target.style.backgroundColor = '#3a8eef'}
        onMouseLeave={(e) => e.target.style.backgroundColor = '#4a9eff'}
      >
        Generate Procedural Terrain
      </button>
      */}
      
      <button 
        style={clearButtonStyle}
        onClick={onClearScene}
        onMouseEnter={(e) => e.target.style.backgroundColor = '#d62d3a'}
        onMouseLeave={(e) => e.target.style.backgroundColor = '#e63946'}
      >
        Clear Scene
      </button>
    </div>
  );
}

export default Toolbar;
