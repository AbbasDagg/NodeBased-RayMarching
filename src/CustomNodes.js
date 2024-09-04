import React, { useState, useEffect } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import { SketchPicker } from 'react-color';

const handleStyleRight = { right: '-10px', backgroundColor: 'black' };
const handleStyleLeft = { left: '-10px', backgroundColor: 'black',};

export function ModeNode({ data }) {
  const [mode, setMode] = useState(data.mode || 'union');
  const reactFlowInstance = useReactFlow();

  const handleModeChange = (e) => {
    const newMode = e.target.value.toLowerCase();
    setMode(newMode);
    data.mode = newMode;

    reactFlowInstance.setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === data.id) {
          return { ...node, data: { ...node.data, mode: newMode } };
        }
        return node;
      })
    );
  };

  return (
    <div className="card modeNode" style={{ width: '160px', height: 'auto', border: '2px solid #fff' }}>
      <div style={{ padding: '10px', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ marginBottom: '10px', fontWeight: 'bold', fontSize: '14px' }}>Mode</div>
        <select
          value={mode}
          onChange={handleModeChange}
          style={{ width: '110px', marginBottom: '10px', padding: '5px', borderRadius: '4px', background: '#fff', color: '#000' }}
        >
          <option value="union">Union</option>
          <option value="subtraction">Subtraction</option>
          <option value="intersection">Intersection</option>
        </select>
        <Handle type="target" position={Position.Left} id="shape1" style={{ top: '34%', ...handleStyleLeft  }} />
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
  const [range, setRange] = useState({
    min: -100,
    max: 100,
    step: 1,
  });
  const reactFlowInstance = useReactFlow();

  const adjustRangeForRotation = () => {
    const connectedEdges = reactFlowInstance.getEdges().filter(
      (edge) => edge.source === data.id && edge.targetHandle === 'rotation'
    );
    if (connectedEdges.length > 0) {
      setRange({ min: -360, max: 360, step: 5 });
    } else {
      setRange({ min: -100, max: 100, step: 1 });
    }
  };

  const handleChange = (name, value) => {
    setInputData((prevData) => {
      const newData = { ...prevData, [name]: value };
      data[name] = value;

      reactFlowInstance.setNodes((nodes) => {
        return nodes.map((node) => {
          // Update nodes based on the connection type
          const relevantEdges = reactFlowInstance
            .getEdges()
            .filter((edge) => edge.source === data.id);

          const isConnectedToCurrentNode = relevantEdges.some(
            (edge) =>
              edge.target === node.id &&
              edge.targetHandle === name &&
              edge.sourceHandle === 'vector'
          );

          if (isConnectedToCurrentNode) {
            return { ...node, data: { ...node.data, [name]: value } };
          }

          return node;
        });
      });

      return newData;
    });
  };

  useEffect(() => {
    adjustRangeForRotation();
    const intervalId = setInterval(adjustRangeForRotation, 100); // Check periodically
    return () => clearInterval(intervalId); // Cleanup on unmount
  }, [reactFlowInstance]);

  return (
    <div className="card vectorNode" style={{ width: '200px', height: '200px', border: '2px solid #fff' }}>
      <div style={{ padding: '10px', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>Vector</div>
        <input
          type="number"
          name="x"
          value={inputData.x}
          onChange={(e) => handleChange('x', parseFloat(e.target.value))}
          className="nodrag"
          style={{
            width: '35%',
            marginBottom: '5px',
            padding: '3px',
            borderRadius: '4px',
            border: '1px solid #777',
            background: '#fff',
            color: '#000',
          }}
        />
        <input
          type="range"
          min={range.min}
          max={range.max}
          step={range.step}
          value={inputData.x}
          onChange={(e) => handleChange('x', parseFloat(e.target.value))}
          className="nodrag"
          style={{ width: '80%', marginBottom: '5px' }}
        />
        <input
          type="number"
          name="y"
          value={inputData.y}
          onChange={(e) => handleChange('y', parseFloat(e.target.value))}
          className="nodrag"
          style={{
            width: '35%',
            marginBottom: '5px',
            padding: '3px',
            borderRadius: '4px',
            border: '1px solid #777',
            background: '#fff',
            color: '#000',
          }}
        />
        <input
          type="range"
          min={range.min}
          max={range.max}
          step={range.step}
          value={inputData.y}
          onChange={(e) => handleChange('y', parseFloat(e.target.value))}
          className="nodrag"
          style={{ width: '80%', marginBottom: '5px' }}
        />
        <input
          type="number"
          name="z"
          value={inputData.z}
          onChange={(e) => handleChange('z', parseFloat(e.target.value))}
          className="nodrag"
          style={{
            width: '35%',
            marginBottom: '5px',
            padding: '3px',
            borderRadius: '4px',
            border: '1px solid #777',
            background: '#fff',
            color: '#000',
          }}
        />
        <input
          type="range"
          min={range.min}
          max={range.max}
          step={range.step}
          value={inputData.z}
          onChange={(e) => handleChange('z', parseFloat(e.target.value))}
          className="nodrag"
          style={{ width: '80%', marginBottom: '5px' }}
        />
        <Handle type="source" position={Position.Right} id="vector" style={handleStyleRight} isConnectable={isConnectable} />
      </div>
    </div>
  );
}


export function MotorNode({ data, isConnectable }) {
  const [xRange, setXRange] = useState({
    min: data.xRange?.min || 0,
    max: data.xRange?.max || 10,
    step: data.xRange?.step || 1,
  });
  const [yRange, setYRange] = useState({
    min: data.yRange?.min || 0,
    max: data.yRange?.max || 10,
    step: data.yRange?.step || 1,
  });
  const [zRange, setZRange] = useState({
    min: data.zRange?.min || 0,
    max: data.zRange?.max || 10,
    step: data.zRange?.step || 1,
  });

  const handleChange = (axis, name, value) => {
    const newValue = parseFloat(value);
    if (axis === 'xRange') setXRange((prev) => ({ ...prev, [name]: newValue }));
    if (axis === 'yRange') setYRange((prev) => ({ ...prev, [name]: newValue }));
    if (axis === 'zRange') setZRange((prev) => ({ ...prev, [name]: newValue }));
    data[axis] = { ...data[axis], [name]: newValue };
  };

  return (
    <div className="card motorNode" style={{ width: '175px', height: '170px', border: '2px solid #fff', padding: '10px' }}>
      <div style={{ padding: '10px', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ fontWeight: 'bold', color: 'white', fontSize: '16px', marginBottom: '20px', marginTop: '5px' }}>Motor Node</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '57%', marginBottom: '5px', paddingLeft: '18px', paddingRight: '15px', fontSize: '14px' }}>
          <span>From</span>
          <span>To</span>
        </div>
        {['X', 'Y', 'Z'].map(axis => (
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px', marginRight: '10px', paddingLeft: ' 0px' }} key={axis}>
            <span style={{ marginRight: '5px' }}>{axis}:</span> {/* Adjusted margin to move the label left */}
            <input type="number" value={eval(`${axis.toLowerCase()}Range`).min} onChange={(e) => handleChange(`${axis.toLowerCase()}Range`, 'min', e.target.value)} className="nodrag" style={{ width: '40%', marginLeft: '0px', right: '5px', padding: '3px', borderRadius: '4px', border: '1px solid #777', background: '#fff', color: '#000' }} />
            <input type="number" value={eval(`${axis.toLowerCase()}Range`).max} onChange={(e) => handleChange(`${axis.toLowerCase()}Range`, 'max', e.target.value)} className="nodrag" style={{ width: '40%', marginLeft: '10px', padding: '3px', borderRadius: '4px', border: '1px solid #777', background: '#fff', color: '#000' }} />
          </div>
        ))}
        <Handle type="source" position={Position.Right} id="vector" style={handleStyleRight} isConnectable={isConnectable} />
      </div>
    </div>
  );
}



export function SphereNode({ data }) {
  const outlineColor = 'white'; // Default to black

  return (
    <div className="card shapeNode" style={{ width: '220px', height: '220px', border: '2px solid #fff' }}>
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
    <div className="card shapeNode" style={{ width: '220px', height: '220px', border: '2px solid #fff' }}>
      <div style={{ padding: '20px', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
        <div style={{ fontWeight: 'bold', color: 'white', fontSize: '16px', marginBottom: '140px' , WebkitTextStroke: `0.1px ${outlineColor}`  }}>Shape: Torus</div>
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
export function BoxNode({ data }) {
  const outlineColor = 'white'; // Default to black

  return (
    <div className="card shapeNode" style={{ width: '220px', height: '220px', border: '2px solid #fff' }}>
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
    <div className="card shapeNode" style={{ width: '220px', height: '220px', border: '2px solid #fff' }}>
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
    <div className="card colorNode" style={{ width: '120px', height: '90px', border: '2px solid #fff' }}>
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
    <div className="card renderNode" style={{ width: '120px', height: 'auto', border: '2px solid #fff' }}>
      <div style={{ padding: '10px', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ marginBottom: '10px', fontWeight: 'bold', fontSize: '14px' }}>Render Node</div>
        <Handle type="target" position={Position.Left} id="render" style={{ ...handleStyleLeft, top: '50%' }} />
      </div>
    </div>
  );
}