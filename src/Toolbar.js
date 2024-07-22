import React from 'react';

const toolbarStyle = {
  display: 'flex',
  gap: '10px',
  padding: '10px',
  background: '#333',
  color: '#fff',
  justifyContent: 'center',
};

const toolbarItemStyle = {
  padding: '10px 20px',
  background: '#555',
  borderRadius: '4px',
  cursor: 'pointer',
  userSelect: 'none',
};

function Toolbar() {
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div style={toolbarStyle}>
      <div style={toolbarItemStyle} onDragStart={(event) => onDragStart(event, 'vectorNode')} draggable>
        Vector Node
      </div>
      <div style={toolbarItemStyle} onDragStart={(event) => onDragStart(event, 'shapeNode')} draggable>
        Shape Node
      </div>
      <div style={toolbarItemStyle} onDragStart={(event) => onDragStart(event, 'colorNode')} draggable>
        Color Node
      </div>
    </div>
  );
}

export default Toolbar;
