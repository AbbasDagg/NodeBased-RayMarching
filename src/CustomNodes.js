import React, { useState, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { SketchPicker } from 'react-color';

const handleStyleRight = { right: '5%', backgroundColor: 'lightgray'};
const handleStyleLeft = { left: '5%', backgroundColor: 'lightgray' };
const specialRight = { right: '2%', backgroundColor: 'lightgray' };

export function ModeNode({ data }) {
  const [mode, setMode] = useState(data.mode || 'union');

  useEffect(() => {
    data.mode = mode;
  }, [mode, data]);

  const handleSelectMode = (selectedMode) => {
    setMode(selectedMode.toLowerCase());
  };

  return (
    <div className="card" style={{ width: '120px', height: 'auto', border: '2px solid #fff' }}>
      <div style={{ padding: '10px', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ marginBottom: '10px', fontWeight: 'bold', fontSize: '14px' }}>Mode</div>
        <select value={mode} onChange={(e) => handleSelectMode(e.target.value)} style={{ width: '90px' ,marginBottom: '10px', padding: '5px', borderRadius: '4px', background: '#fff', color: '#000' }}>
          <option value="union">Union</option>
          <option value="subtraction">Subtraction</option>
          <option value="intersection">Intersection</option>
        </select>
        <Handle type="target" position={Position.Left} id="shape1" style={{ top: '34%', ...handleStyleLeft }} />
        <Handle type="target" position={Position.Left} id="shape2" style={{ top: '85%', ...handleStyleLeft }} />
        <Handle type="source" position={Position.Right} id="render" style={{ top: '60%' ,...handleStyleRight }} />
      </div>
    </div>
  );
}

export function VectorNode({ data }) {
  const [inputData, setInputData] = useState({
    x: data.x || 0,
    y: data.y || 0,
    z: data.z || 0,
  });

  useEffect(() => {
    data.x = inputData.x;
    data.y = inputData.y;
    data.z = inputData.z;
  }, [inputData, data]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setInputData((prevData) => ({
      ...prevData,
      [name]: parseFloat(value) || 0,
    }));
  };

  return (
    <div className="card" style={{ width: '80px', height: 'auto', border: '2px solid #fff' }}>
      <div style={{ padding: '10px', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ marginBottom: '10px', fontWeight: 'bold', fontSize: '14px' }}>Vector</div>
        <input type="number" name="x" value={inputData.x} onChange={handleChange} style={{ width: '45px', marginBottom: '5px', padding: '5px', borderRadius: '4px', border: '1px solid #777', background: '#fff', color: '#000' }} />
        <input type="number" name="y" value={inputData.y} onChange={handleChange} style={{ width: '45px', marginBottom: '5px', padding: '5px', borderRadius: '4px', border: '1px solid #777', background: '#fff', color: '#000' }} />
        <input type="number" name="z" value={inputData.z} onChange={handleChange} style={{ width: '45px', marginBottom: '5px', padding: '5px', borderRadius: '4px', border: '1px solid #777', background: '#fff', color: '#000' }} />
        <Handle type="source" position={Position.Right} id="vector" style={{ ...handleStyleRight }} />
      </div>
    </div>
  );
}

export function SphereNode({ data }) {
  return (
    <div className="card" style={{ width: '220px', height: '220px', border: '2px solid #fff' }}>
      <div style={{ padding: '20px', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
        <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '16px' ,marginBottom: '140px' }}>Shape: Sphere</div>
        <Handle type="target" position={Position.Left} id="position" style={{ ...handleStyleLeft, top: '30%' }} />
        <span style={{ position: 'absolute', left: '40px', top: '30%', color: 'white', fontSize: '15px', transform: 'translateY(-50%)' }}>Position</span>
        <Handle type="target" position={Position.Left} id="size" style={{ ...handleStyleLeft, top: '50%' }} />
        <span style={{ position: 'absolute', left: '40px', top: '50%', color: '#fff', fontSize: '15px', transform: 'translateY(-50%)' }}>Size</span>
        <Handle type="target" position={Position.Left} id="color" style={{ ...handleStyleLeft, top: '70%' }} />
        <span style={{ position: 'absolute', left: '40px', top: '70%', color: '#fff', fontSize: '15px', transform: 'translateY(-50%)' }}>Color</span>
        
        {/* New Handle for Rotation */}
        <Handle type="target" position={Position.Left} id="rotation" style={{ ...handleStyleLeft, top: '90%' }} />
        <span style={{ position: 'absolute', left: '40px', top: '90%', color: '#fff', fontSize: '15px', transform: 'translateY(-50%)' }}>Rotation</span>
        
        <Handle type="source" position={Position.Right} id="render" style={{ ...handleStyleRight, top: '50%' }} />
      </div>
    </div>
  );
}


export function TorusNode({ data }) {
  return (
    <div className="card" style={{ width: '220px', height: '220px', border: '2px solid #fff' }}>
      <div style={{ padding: '20px', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
        <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '16px' ,marginBottom: '140px' }}>Shape: Torus</div>
        <Handle type="target" position={Position.Left} id="position" style={{ ...handleStyleLeft, top: '30%' }} />
        <span style={{ position: 'absolute', left: '40px', top: '30%', color: 'white', fontSize: '15px', transform: 'translateY(-50%)' }}>Position</span>
        <Handle type="target" position={Position.Left} id="size" style={{ ...handleStyleLeft, top: '50%' }} />
        <span style={{ position: 'absolute', left: '40px', top: '50%', color: '#fff', fontSize: '15px', transform: 'translateY(-50%)' }}>Size</span>
        <Handle type="target" position={Position.Left} id="color" style={{ ...handleStyleLeft, top: '70%' }} />
        <span style={{ position: 'absolute', left: '40px', top: '70%', color: '#fff', fontSize: '15px', transform: 'translateY(-50%)' }}>Color</span>
        
        {/* New Handle for Rotation */}
        <Handle type="target" position={Position.Left} id="rotation" style={{ ...handleStyleLeft, top: '90%' }} />
        <span style={{ position: 'absolute', left: '40px', top: '90%', color: '#fff', fontSize: '15px', transform: 'translateY(-50%)' }}>Rotation</span>
        
        <Handle type="source" position={Position.Right} id="render" style={{ ...handleStyleRight, top: '50%' }} />
      </div>
    </div>
  );
}


export function BoxNode({ data }) {
  return (
    <div className="card" style={{ width: '220px', height: '220px', border: '2px solid #fff' }}>
      <div style={{ padding: '20px', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
        <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '16px' ,marginBottom: '140px' }}>Shape: Box</div>
        <Handle type="target" position={Position.Left} id="position" style={{ ...handleStyleLeft, top: '30%' }} />
        <span style={{ position: 'absolute', left: '40px', top: '30%', color: 'white', fontSize: '15px', transform: 'translateY(-50%)' }}>Position</span>
        <Handle type="target" position={Position.Left} id="size" style={{ ...handleStyleLeft, top: '50%' }} />
        <span style={{ position: 'absolute', left: '40px', top: '50%', color: '#fff', fontSize: '15px', transform: 'translateY(-50%)' }}>Size</span>
        <Handle type="target" position={Position.Left} id="color" style={{ ...handleStyleLeft, top: '70%' }} />
        <span style={{ position: 'absolute', left: '40px', top: '70%', color: '#fff', fontSize: '15px', transform: 'translateY(-50%)' }}>Color</span>
        
        {/* New Handle for Rotation */}
        <Handle type="target" position={Position.Left} id="rotation" style={{ ...handleStyleLeft, top: '90%' }} />
        <span style={{ position: 'absolute', left: '40px', top: '90%', color: '#fff', fontSize: '15px', transform: 'translateY(-50%)' }}>Rotation</span>
        
        <Handle type="source" position={Position.Right} id="render" style={{ ...handleStyleRight, top: '50%' }} />
      </div>
    </div>
  );
}

export function CapsuleNode({ data }) {
  return (
    <div className="card" style={{ width: '220px', height: '220px', border: '2px solid #fff' }}>
      <div style={{ padding: '20px', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
        <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '16px' ,marginBottom: '140px' }}>Shape: Capsule</div>
        <Handle type="target" position={Position.Left} id="position" style={{ ...handleStyleLeft, top: '30%' }} />
        <span style={{ position: 'absolute', left: '40px', top: '30%', color: 'white', fontSize: '15px', transform: 'translateY(-50%)' }}>Position</span>
        <Handle type="target" position={Position.Left} id="size" style={{ ...handleStyleLeft, top: '50%' }} />
        <span style={{ position: 'absolute', left: '40px', top: '50%', color: '#fff', fontSize: '15px', transform: 'translateY(-50%)' }}>Size</span>
        <Handle type="target" position={Position.Left} id="color" style={{ ...handleStyleLeft, top: '70%' }} />
        <span style={{ position: 'absolute', left: '40px', top: '70%', color: '#fff', fontSize: '15px', transform: 'translateY(-50%)' }}>Color</span>
        
        {/* New Handle for Rotation */}
        <Handle type="target" position={Position.Left} id="rotation" style={{ ...handleStyleLeft, top: '90%' }} />
        <span style={{ position: 'absolute', left: '40px', top: '90%', color: '#fff', fontSize: '15px', transform: 'translateY(-50%)' }}>Rotation</span>
        
        <Handle type="source" position={Position.Right} id="render" style={{ ...handleStyleRight, top: '50%' }} />
      </div>
    </div>
  );
}

export function ColorNode({ data }) {
  const [color, setColor] = useState(data.color);

  const handleChange = (color) => {
    setColor(color.hex);
    data.color = color.hex;
  };

  useEffect(() => {
    data.color = color;
  }, [color, data]);

  return (
    <div className="card" style={{ width: '180px', height: 'auto', border: '2px solid #fff' }}>
      <div style={{ padding: '10px', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
    </div>
  );
}

export function RenderNode({ data }) {
  return (
    <div className="card" style={{ width: '120px', height: 'auto', border: '2px solid #fff' }}>
      <div style={{ padding: '10px', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ marginBottom: '10px', fontWeight: 'bold', fontSize: '14px' }}>Render Node</div>
        <Handle type="target" position={Position.Left} id="render" style={{ ...handleStyleLeft, top: '50%' }} />
      </div>
    </div>
  );
}
