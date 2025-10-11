import React from 'react';

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

function Toolbar({ onGenerateSimple, onGenerateComplex, onGenerateVariations, onGenerateTerrain, onClearScene }) {
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div style={toolbarStyle}>
      {/* Draggable Nodes */}
      <div style={toolbarItemStyle} onDragStart={(event) => onDragStart(event, 'vectorNode')} draggable>
        Vector Node
      </div>
      <div style={toolbarItemStyle} onDragStart={(event) => onDragStart(event, 'shapeNode')} draggable>
        Shape Node
      </div>
      <div style={toolbarItemStyle} onDragStart={(event) => onDragStart(event, 'colorNode')} draggable>
        Color Node
      </div>
      
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
      
      <button 
        style={{...proceduralButtonStyle, background: '#4a9eff'}}
        onClick={onGenerateTerrain}
        onMouseEnter={(e) => e.target.style.backgroundColor = '#3a8eef'}
        onMouseLeave={(e) => e.target.style.backgroundColor = '#4a9eff'}
      >
        Generate Procedural Terrain
      </button>
      
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
