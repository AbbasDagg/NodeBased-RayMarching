import React, { useState, useEffect } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import { SketchPicker } from 'react-color';

const handleStyleRight = { right: '5%', backgroundColor: 'black' };
const handleStyleLeft = { left: '5%', backgroundColor: 'black',};

export function ModeNode({ data }) {
  const [mode, setMode] = useState(data.mode || 'union');

  useEffect(() => {
    data.mode = mode;
  }, [mode, data]);

  return (
    <div className="card" style={{ width: '120px', height: 'auto', border: '2px solid #fff' }}>
      <div style={{ padding: '10px', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ marginBottom: '10px', fontWeight: 'bold', fontSize: '14px' }}>Mode</div>
        <select value={mode} onChange={(e) => setMode(e.target.value.toLowerCase())} style={{ width: '90px', marginBottom: '10px', padding: '5px', borderRadius: '4px', background: '#fff', color: '#000' }}>
          <option value="union">Union</option>
          <option value="subtraction">Subtraction</option>
          <option value="intersection">Intersection</option>
        </select>
        <Handle type="target" position={Position.Left} id="shape1" style={{ top: '34%', ...handleStyleLeft }} />
        <Handle type="target" position={Position.Left} id="shape2" style={{ top: '85%', ...handleStyleLeft }} />
        <Handle type="source" position={Position.Right} id="render" style={{ top: '60%', ...handleStyleRight }} />
      </div>
    </div>
  );
}


export function VectorNode({ data, isConnectable }) {
  const [inputData, setInputData] = useState({
    x: data.x || 0,
    y: data.y || 0,
    z: data.z || 0,
  });
  const reactFlowInstance = useReactFlow();

  const handleChange = (name, value) => {
    setInputData(prevData => {
      const newData = { ...prevData, [name]: value };
      data[name] = value;

      reactFlowInstance.setNodes(nodes =>
        nodes.map(node => {
          if (node.id === data.id) {
            return { ...node, data: { ...node.data, ...newData } };
          }
          return node;
        })
      );

      return newData;
    });
  };

  return (
    <div className="card" style={{ width: '200px',height :'200px' , border: '2px solid #fff' }}>
      <div style={{ padding: '10px', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>Vector</div>
        <input type="number" name="x" value={inputData.x} onChange={e => handleChange('x', parseFloat(e.target.value))} className="nodrag" style={{ width: '35%', marginBottom: '5px', padding: '3px', borderRadius: '4px', border: '1px solid #777', background: '#fff', color: '#000' }} />
        <input type="range" min="-100" max="100" value={inputData.x} onChange={e => handleChange('x', parseFloat(e.target.value))} className="nodrag" style={{ width: '80%', marginBottom: '5px' }} />
        <input type="number" name="y" value={inputData.y} onChange={e => handleChange('y', parseFloat(e.target.value))} className="nodrag" style={{ width: '35%', marginBottom: '5px', padding: '3px', borderRadius: '4px', border: '1px solid #777', background: '#fff', color: '#000' }} />
        <input type="range" min="-100" max="100" value={inputData.y} onChange={e => handleChange('y', parseFloat(e.target.value))} className="nodrag" style={{ width: '80%', marginBottom: '5px' }} />
        <input type="number" name="z" value={inputData.z} onChange={e => handleChange('z', parseFloat(e.target.value))} className="nodrag" style={{ width: '35%', marginBottom: '5px', padding: '3px', borderRadius: '4px', border: '1px solid #777', background: '#fff', color: '#000' }} />
        <input type="range" min="-100" max="100" value={inputData.z} onChange={e => handleChange('z', parseFloat(e.target.value))} className="nodrag" style={{ width: '80%', marginBottom: '5px' }} />
        <Handle type="source" position={Position.Right} id="vector" style={handleStyleRight} isConnectable={isConnectable} />
      </div>
    </div>
  );
}

export function SphereNode({ data }) {
  const outlineColor = 'white'; // Default to black

  return (
    <div className="card" style={{ width: '220px', height: '220px', border: '2px solid #fff' }}>
      <div style={{ padding: '20px', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
        <div style={{ fontWeight: 'bold', color: 'white', fontSize: '16px', marginBottom: '140px' , WebkitTextStroke: `0.1px ${outlineColor}`  }}>Shape: Sphere</div>
        <Handle type="target" position={Position.Left} id="position" style={{ ...handleStyleLeft, top: '30%' }} />
        <span style={{ position: 'absolute', left: '40px', top: '30%', color: 'white', fontSize: '15px', transform: 'translateY(-50%)', WebkitTextStroke: `0.1px ${outlineColor}` }}>Position</span>
        <Handle type="target" position={Position.Left} id="size" style={{ ...handleStyleLeft, top: '50%' }} />
        <span style={{ position: 'absolute', left: '40px', top: '50%', color: 'white', fontSize: '15px', transform: 'translateY(-50%)', WebkitTextStroke: `0.1px ${outlineColor}` }}>Size</span>
        <Handle type="target" position={Position.Left} id="color" style={{ ...handleStyleLeft, top: '70%' }} />
        <span style={{ position: 'absolute', left: '40px', top: '70%', color: 'white', fontSize: '15px', transform: 'translateY(-50%)', WebkitTextStroke: `0.1px ${outlineColor}` }}>Color</span>
        
        <Handle type="target" position={Position.Left} id="rotation" style={{ ...handleStyleLeft, top: '90%' }} />
        <span style={{ position: 'absolute', left: '40px', top: '90%', color: 'white', fontSize: '15px', transform: 'translateY(-50%)', WebkitTextStroke: `0.1px ${outlineColor}` }}>Rotation</span>
        
        <Handle type="source" position={Position.Right} id="render" style={{ ...handleStyleRight, top: '50%' }} />
      </div>
    </div>
  );
}

export function TorusNode({ data }) {
  const outlineColor = 'white'; // Default to black

  return (
    <div className="card" style={{ width: '220px', height: '220px', border: '2px solid #fff' }}>
      <div style={{ padding: '20px', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
        <div style={{ fontWeight: 'bold', color: 'white', fontSize: '16px', marginBottom: '140px' , WebkitTextStroke: `0.1px ${outlineColor}`  }}>Shape: Sphere</div>
        <Handle type="target" position={Position.Left} id="position" style={{ ...handleStyleLeft, top: '30%' }} />Torus
        <span style={{ position: 'absolute', left: '40px', top: '30%', color: 'white', fontSize: '15px', transform: 'translateY(-50%)', WebkitTextStroke: `0.1px ${outlineColor}` }}>Position</span>
        <Handle type="target" position={Position.Left} id="size" style={{ ...handleStyleLeft, top: '50%' }} />
        <span style={{ position: 'absolute', left: '40px', top: '50%', color: 'white', fontSize: '15px', transform: 'translateY(-50%)', WebkitTextStroke: `0.1px ${outlineColor}` }}>Size</span>
        <Handle type="target" position={Position.Left} id="color" style={{ ...handleStyleLeft, top: '70%' }} />
        <span style={{ position: 'absolute', left: '40px', top: '70%', color: 'white', fontSize: '15px', transform: 'translateY(-50%)', WebkitTextStroke: `0.1px ${outlineColor}` }}>Color</span>
        
        <Handle type="target" position={Position.Left} id="rotation" style={{ ...handleStyleLeft, top: '90%' }} />
        <span style={{ position: 'absolute', left: '40px', top: '90%', color: 'white', fontSize: '15px', transform: 'translateY(-50%)', WebkitTextStroke: `0.1px ${outlineColor}` }}>Rotation</span>
        
        <Handle type="source" position={Position.Right} id="render" style={{ ...handleStyleRight, top: '50%' }} />
      </div>
    </div>
  );
}
export function BoxNode({ data }) {
  const outlineColor = 'white'; // Default to black

  return (
    <div className="card" style={{ width: '220px', height: '220px', border: '2px solid #fff' }}>
      <div style={{ padding: '20px', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
        <div style={{ fontWeight: 'bold', color: 'white', fontSize: '16px', marginBottom: '140px' , WebkitTextStroke: `0.1px ${outlineColor}`  }}>Shape: Box</div>
        <Handle type="target" position={Position.Left} id="position" style={{ ...handleStyleLeft, top: '30%' }} />
        <span style={{ position: 'absolute', left: '40px', top: '30%', color: 'white', fontSize: '15px', transform: 'translateY(-50%)', WebkitTextStroke: `0.1px ${outlineColor}` }}>Position</span>
        <Handle type="target" position={Position.Left} id="size" style={{ ...handleStyleLeft, top: '50%' }} />
        <span style={{ position: 'absolute', left: '40px', top: '50%', color: 'white', fontSize: '15px', transform: 'translateY(-50%)', WebkitTextStroke: `0.1px ${outlineColor}` }}>Size</span>
        <Handle type="target" position={Position.Left} id="color" style={{ ...handleStyleLeft, top: '70%' }} />
        <span style={{ position: 'absolute', left: '40px', top: '70%', color: 'white', fontSize: '15px', transform: 'translateY(-50%)', WebkitTextStroke: `0.1px ${outlineColor}` }}>Color</span>
        
        <Handle type="target" position={Position.Left} id="rotation" style={{ ...handleStyleLeft, top: '90%' }} />
        <span style={{ position: 'absolute', left: '40px', top: '90%', color: 'white', fontSize: '15px', transform: 'translateY(-50%)', WebkitTextStroke: `0.1px ${outlineColor}` }}>Rotation</span>
        
        <Handle type="source" position={Position.Right} id="render" style={{ ...handleStyleRight, top: '50%' }} />
      </div>
    </div>
  );
}
export function CapsuleNode({ data }) {
  const outlineColor = 'white'; // Default to black

  return (
    <div className="card" style={{ width: '220px', height: '220px', border: '2px solid #fff' }}>
      <div style={{ padding: '20px', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
        <div style={{ fontWeight: 'bold', color: 'white', fontSize: '16px', marginBottom: '140px' , WebkitTextStroke: `0.1px ${outlineColor}`  }}>Shape: Capsule</div>
        <Handle type="target" position={Position.Left} id="position" style={{ ...handleStyleLeft, top: '30%' }} />
        <span style={{ position: 'absolute', left: '40px', top: '30%', color: 'white', fontSize: '15px', transform: 'translateY(-50%)', WebkitTextStroke: `0.1px ${outlineColor}` }}>Position</span>
        <Handle type="target" position={Position.Left} id="size" style={{ ...handleStyleLeft, top: '50%' }} />
        <span style={{ position: 'absolute', left: '40px', top: '50%', color: 'white', fontSize: '15px', transform: 'translateY(-50%)', WebkitTextStroke: `0.1px ${outlineColor}` }}>Size</span>
        <Handle type="target" position={Position.Left} id="color" style={{ ...handleStyleLeft, top: '70%' }} />
        <span style={{ position: 'absolute', left: '40px', top: '70%', color: 'white', fontSize: '15px', transform: 'translateY(-50%)', WebkitTextStroke: `0.1px ${outlineColor}` }}>Color</span>
        
        <Handle type="target" position={Position.Left} id="rotation" style={{ ...handleStyleLeft, top: '90%' }} />
        <span style={{ position: 'absolute', left: '40px', top: '90%', color: 'white', fontSize: '15px', transform: 'translateY(-50%)', WebkitTextStroke: `0.1px ${outlineColor}` }}>Rotation</span>
        
        <Handle type="source" position={Position.Right} id="render" style={{ ...handleStyleRight, top: '50%' }} />
      </div>
    </div>
  );
}
export function ColorNode({ data, isConnectable }) {
  const [color, setColor] = useState(data.color || '#ffffff');
  const reactFlowInstance = useReactFlow();

  const handleChange = event => {
    const newColor = event.target.value;
    setColor(newColor);
    data.color = newColor;

    reactFlowInstance.setNodes(nodes =>
      nodes.map(node => {
        if (node.id === data.id) {
          return { ...node, data: { ...node.data, color: newColor } };
        }
        return node;
      })
    );
  };

  return (
    <div className="card" style={{ width: '120px', height: '90px', border: '2px solid #fff' }}>
      <div style={{ padding: '12px', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ marginBottom: '10px', fontWeight: 'bold', fontSize: '16px' }}>Color Node</div>
        <input type="color" value={color} onChange={handleChange} className="nodrag" style={{ cursor: 'pointer', width: '60%', height: '30px', border: 'none', padding: '0' }} />
        <Handle type="source" position={Position.Right} id="color" style={handleStyleRight} isConnectable={isConnectable} />
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
