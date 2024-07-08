// NOT USED YET !!!


import React from 'react';
import { Handle, Position } from 'reactflow';

const handleStyle = { right: 10 };

function PositionNode({ data }) {
  const handleChange = (event) => {
    const { name, value } = event.target;
    data[name] = parseFloat(value);
  };

  return (
    <div style={{ padding: '10px', border: '1px solid #777', borderRadius: '4px', background: '#444', color: '#fff', width: '80px' }}>
      <div style={{ marginBottom: '10px', textAlign: 'center' }}>Position Node</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <input type="number" name="x" placeholder="X" defaultValue={data.x} onChange={handleChange} style={{ width: '50px' }} />
        <input type="number" name="y" placeholder="Y" defaultValue={data.y} onChange={handleChange} style={{ width: '50px' }} />
        <input type="number" name="z" placeholder="Z" defaultValue={data.z} onChange={handleChange} style={{ width: '50px' }} />
      </div>
      <Handle type="source" position={Position.Right} id="position" style={handleStyle} />
    </div>
  );
}

export default PositionNode;
