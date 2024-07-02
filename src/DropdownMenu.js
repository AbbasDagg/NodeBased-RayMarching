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

function DropdownMenu({ onSelectShape }) {
  return (
    <div style={dropdownMenuStyle}>
      {shapes.map((shape) => (
        <div key={shape} style={itemStyle} onClick={() => onSelectShape(shape)}>
          {shape}
        </div>
      ))}
    </div>
  );
}

export default DropdownMenu;
