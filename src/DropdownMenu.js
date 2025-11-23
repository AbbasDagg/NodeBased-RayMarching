import React from 'react';

const dropdownMenuStyle = {
  position: 'absolute',
  background: '#444',
  color: '#fff',
  padding: '10px',
  borderRadius: '8px',
  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
  zIndex: 1000,
  display: 'flex',
  flexDirection: 'column',
  top: '40px',
  right: '30px',
  width: '120px',
};

const itemStyle = {
  padding: '8px 12px',
  cursor: 'pointer',
  borderBottom: '1px solid #555',
};

const shapes = ['Sphere', 'Torus', 'Box', 'Capsule'];
const operators = ['Vector', 'Motor', 'Transform', 'Mult'];

function DropdownMenu({ onSelectShape, onSelectOperator }) {
  return (
    <div style={dropdownMenuStyle}>
      <div style={{ ...itemStyle, fontWeight: 'bold', color: '#ffcc00', textAlign: 'center', borderBottom: '2px solid #ffcc00' }}>
        Shapes
      </div>
      {shapes.map((shape) => (
        <div key={shape} style={itemStyle} onClick={() => onSelectShape(shape)}>
          {shape}
        </div>
      ))}
      <div style={{ ...itemStyle, fontWeight: 'bold', color: '#00d4ff', textAlign: 'center', borderTop: '2px solid #666', marginTop: '5px', borderBottom: '2px solid #00d4ff' }}>
        Operators
      </div>
      {operators.map((op) => (
        <div key={op} style={itemStyle} onClick={() => onSelectOperator(op)}>
          {op}
        </div>
      ))}
    </div>
  );
}

export default DropdownMenu;
