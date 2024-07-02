import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { SketchPicker } from 'react-color';
import DropdownMenu from './DropdownMenu';

const handleStyleRight = { right: '10px' };
const handleStyleLeft = { left: '10px' };

export function PositionNode({ data }) {
  const [inputData, setInputData] = useState({
    x: data.x || 0,
    y: data.y || 0,
    z: data.z || 0,
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setInputData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
    data[name] = parseFloat(value) || 0;
  };

  return (
    <div style={{ padding: '10px', border: '1px solid #777', borderRadius: '4px', background: '#444', color: '#fff', width: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ marginBottom: '10px', fontWeight: 'bold', fontSize: '14px' }}>Position Node</div>
      <input type="number" name="x" value={inputData.x} onChange={handleChange} style={{ width: '60px', marginBottom: '5px', padding: '5px', borderRadius: '4px', border: '1px solid #777', background: '#2b2b2b', color: '#fff' }} />
      <input type="number" name="y" value={inputData.y} onChange={handleChange} style={{ width: '60px', marginBottom: '5px', padding: '5px', borderRadius: '4px', border: '1px solid #777', background: '#2b2b2b', color: '#fff' }} />
      <input type="number" name="z" value={inputData.z} onChange={handleChange} style={{ width: '60px', marginBottom: '5px', padding: '5px', borderRadius: '4px', border: '1px solid #777', background: '#2b2b2b', color: '#fff' }} />
      <Handle type="source" position={Position.Right} id="position" style={handleStyleRight} />
    </div>
  );
}

export function ShapeNode({ data }) {
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSelectShape = (shape) => {
    data.shape = shape.toLowerCase();
    setShowDropdown(false);
  };

  const handleToggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  return (
    <div
      style={{
        padding: '20px',
        background: 'linear-gradient(135deg, #546e7a, #37474f)',
        borderRadius: '10px',
        width: '220px',
        height: '220px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
      }}
    >
      <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '16px', marginBottom: '20px' }}>
        Shape: {data.shape.charAt(0).toUpperCase() + data.shape.slice(1)}
        <button onClick={handleToggleDropdown} style={{ marginLeft: '10px', padding: '5px', cursor: 'pointer', borderRadius: '4px', background: '#455a64', color: '#fff', border: 'none' }}>
          ▼
        </button>
      </div>
      {showDropdown && <DropdownMenu onSelectShape={handleSelectShape} />}
      <Handle
        type="target"
        position={Position.Left}
        id="position"
        style={{ ...handleStyleLeft, top: '20%', backgroundColor: 'yellow', borderRadius: '50%' }}
      />
      <span style={{ position: 'absolute', left: '50px', top: '20%', color: '#fff', fontSize: '12px', transform: 'translateY(-50%)' }}>Position</span>
      <Handle
        type="target"
        position={Position.Left}
        id="size"
        style={{ ...handleStyleLeft, top: '50%', backgroundColor: 'green', borderRadius: '50%' }}
      />
      <span style={{ position: 'absolute', left: '50px', top: '50%', color: '#fff', fontSize: '12px', transform: 'translateY(-50%)' }}>Size</span>
      <Handle
        type="target"
        position={Position.Left}
        id="color"
        style={{ ...handleStyleLeft, top: '80%', backgroundColor: 'orange', borderRadius: '50%' }}
      />
      <span style={{ position: 'absolute', left: '50px', top: '80%', color: '#fff', fontSize: '12px', transform: 'translateY(-50%)' }}>Color</span>
    </div>
  );
}

export function ColorNode({ data }) {
  const [color, setColor] = useState(data.color);

  const handleChange = (color) => {
    setColor(color.hex);
    data.color = color.hex;
  };

  return (
    <div style={{ padding: '10px', border: '2px solid #333', borderRadius: '8px', background: 'linear-gradient(135deg, #3b3b3b, #1e1e1e)', color: '#fff', width: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ marginBottom: '10px', fontWeight: 'bold', fontSize: '14px' }}>Color Node</div>
      <SketchPicker
        color={color}
        onChange={handleChange}
        disableAlpha
        presetColors={[]}
        styles={{ default: { picker: { width: '120px' } } }}
      />
      <Handle type="source" position={Position.Right} id="color" style={handleStyleRight} />
    </div>
  );
}

export function SizeNode({ data }) {
  const [inputData, setInputData] = useState({
    x: data.x || 1,
    y: data.y || 1,
    z: data.z || 1,
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setInputData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
    data[name] = parseFloat(value) || 1;
  };

  return (
    <div style={{ padding: '10px', border: '1px solid #777', borderRadius: '4px', background: '#444', color: '#fff', width: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ marginBottom: '10px', fontWeight: 'bold', fontSize: '14px' }}>Size Node</div>
      <input type="number" name="x" value={inputData.x} onChange={handleChange} style={{ width: '60px', marginBottom: '5px', padding: '5px', borderRadius: '4px', border: '1px solid #777', background: '#2b2b2b', color: '#fff' }} />
      <input type="number" name="y" value={inputData.y} onChange={handleChange} style={{ width: '60px', marginBottom: '5px', padding: '5px', borderRadius: '4px', border: '1px solid #777', background: '#2b2b2b', color: '#fff' }} />
      <input type="number" name="z" value={inputData.z} onChange={handleChange} style={{ width: '60px', marginBottom: '5px', padding: '5px', borderRadius: '4px', border: '1px solid #777', background: '#2b2b2b', color: '#fff' }} />
      <Handle type="source" position={Position.Right} id="size" style={handleStyleRight} />
    </div>
  );
}
