import React, { useState, useEffect, useLayoutEffect } from 'react';
import { Handle, Position, useReactFlow, useUpdateNodeInternals } from 'reactflow';
import { SketchPicker } from 'react-color';

//const handleStyleRight = { right: '-1.5px', backgroundColor: 'black', margin: 0, padding: 0, width: '10px', height: '10px' };
//const handleStyleLeft = { left: '-1px', backgroundColor: 'black', margin: 0, padding: 0 , width: '10px', height: '10px' };

const r = '15px'
const offset = "-5px"
const handleStyleRight = { right: offset, backgroundColor: 'black', margin: 0, padding: 0, width: r, height: r };
const handleStyleLeft = { left: offset, backgroundColor: 'black', margin: 0, padding: 0 , width: r, height: r };

// Mode node specific handle styles with more offset
const modeHandleOffset = "-14px"
const modeHandleStyleRight = { right: modeHandleOffset, backgroundColor: 'black', margin: 0, padding: 0, width: r, height: r };
const modeHandleStyleLeft = { left: modeHandleOffset, backgroundColor: 'black', margin: 0, padding: 0 , width: r, height: r };



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
    <div className="card modeNode" style={{ width: '190px', height: '175px', background: 'linear-gradient(135deg, #2d3436 0%, #1e272e 100%)', border: '2px solid #a970ff', borderRadius: '8px' }}>
      <div style={{ padding: '10px', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', height: '100%' }}>
        <div style={{ marginBottom: '8px', fontWeight: 'bold', fontSize: '14px', color: '#a970ff', textTransform: 'uppercase', letterSpacing: '1px' }}>Mode</div>
        <select
          value={mode}
          onChange={handleModeChange}
          style={{ width: '130px', marginBottom: '8px', padding: '5px', borderRadius: '4px', background: '#1b1f22', color: '#a970ff', border: '1px solid #a970ff' }}
        >
          <option value="union">Union</option>
          <option value="substraction">Substraction</option>
          <option value="intersection">Intersection</option>
        </select>
        {/* Left side handles with consistent labels placed lower */}
        <div style={{ position: 'absolute', left: '8px', top: '48%', fontSize: '14px', color: '#fff', fontWeight: 'bold' }}>Base</div>
        <Handle key="shape1" type="target" position={Position.Left} id="shape1" style={{ top: '50%', ...modeHandleStyleLeft }} />
        <div style={{ position: 'absolute', left: '8px', top: '63%', fontSize: '14px', color: '#fff', fontWeight: 'bold' }}>Transform</div>
        <Handle key="group-transform" type="target" position={Position.Left} id="group-transform" style={{ top: '68%', ...modeHandleStyleLeft }} />
        <div style={{ position: 'absolute', left: '8px', top: '81%', fontSize: '14px', color: '#fff', fontWeight: 'bold' }}>Operations</div>
        <Handle key="shapes" type="target" position={Position.Left} id="shapes" style={{ top: '85%', ...modeHandleStyleLeft }} />
        {/* Render output mid-right aligned with transform */}
        <div style={{ position: 'absolute', right: '18px', top: '63%', fontSize: '14px', color: '#fff', fontWeight: 'bold' }}>Render</div>
        <Handle key="render" type="source" position={Position.Right} id="render" style={{ top: '68%', ...modeHandleStyleRight }} />
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
  const [range, setRange] = useState({ min: -100, max: 100, step: 1 });
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
    setInputData((prev) => {
      const next = { ...prev, [name]: value };
      data[name] = value;
      reactFlowInstance.setNodes(nodes => nodes.map(node => {
        const relevantEdges = reactFlowInstance.getEdges().filter(e => e.source === data.id);
        const isConnected = relevantEdges.some(e => e.target === node.id && e.targetHandle === name && e.sourceHandle === 'vector');
        if (isConnected) return { ...node, data: { ...node.data, [name]: value } };
        return node;
      }));
      return next;
    });
  };

  useEffect(() => {
    adjustRangeForRotation();
    const intervalId = setInterval(adjustRangeForRotation, 100);
    return () => clearInterval(intervalId);
  }, [reactFlowInstance]);

  return (
    <div className="card vectorNode" style={{ width: '200px', height: '200px', background: 'linear-gradient(135deg, #2d3436 0%, #1e272e 100%)', border: '2px solid #ffcc00', borderRadius: '8px' }}>
      <div style={{ padding: '10px', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ marginBottom: '5px', fontWeight: 'bold', fontSize: '14px', color: '#ffcc00', textTransform: 'uppercase', letterSpacing: '1px' }}>Vector</div>
        {['x','y','z'].map(axis => (
          <React.Fragment key={axis}>
            <input
              type="number"
              name={axis}
              value={inputData[axis]}
              onChange={(e) => handleChange(axis, parseFloat(e.target.value))}
              className="nodrag"
              style={{ width: '35%', marginBottom: '5px', padding: '3px', borderRadius: '4px', border: '1px solid #ffcc00', background: '#1b1f22', color: '#ffcc00' }}
            />
            <input
              type="range"
              min={range.min}
              max={range.max}
              step={range.step}
              value={inputData[axis]}
              onChange={(e) => handleChange(axis, parseFloat(e.target.value))}
              className="nodrag"
              style={{ width: '80%', marginBottom: '5px', accentColor: '#ffcc00' }}
            />
          </React.Fragment>
        ))}
        <Handle key="vector" type="source" position={Position.Right} id="vector" style={handleStyleRight} isConnectable={isConnectable} />
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
    <div className="card motorNode" style={{ width: '175px', height: '170px', background: 'linear-gradient(135deg, #2d3436 0%, #1e272e 100%)', border: '2px solid #ffcc00', borderRadius: '8px', padding: '10px' }}>
      <div style={{ padding: '10px', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ fontWeight: 'bold', color: '#ffcc00', fontSize: '16px', marginBottom: '20px', marginTop: '5px', textTransform: 'uppercase', letterSpacing: '1px' }}>Motor</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '57%', marginBottom: '5px', paddingLeft: '18px', paddingRight: '15px', fontSize: '14px', color: '#ffcc00' }}>
          <span>From</span>
          <span>To</span>
        </div>
        {['X', 'Y', 'Z'].map(axis => (
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px', marginRight: '10px', paddingLeft: ' 0px' }} key={axis}>
            <span style={{ marginRight: '5px' }}>{axis}:</span> {/* Adjusted margin to move the label left */}
            <input type="number" value={eval(`${axis.toLowerCase()}Range`).min} onChange={(e) => handleChange(`${axis.toLowerCase()}Range`, 'min', e.target.value)} className="nodrag" style={{ width: '40%', marginLeft: '0px', right: '5px', padding: '3px', borderRadius: '4px', border: '1px solid #ffcc00', background: '#1b1f22', color: '#ffcc00' }} />
            <input type="number" value={eval(`${axis.toLowerCase()}Range`).max} onChange={(e) => handleChange(`${axis.toLowerCase()}Range`, 'max', e.target.value)} className="nodrag" style={{ width: '40%', marginLeft: '10px', padding: '3px', borderRadius: '4px', border: '1px solid #ffcc00', background: '#1b1f22', color: '#ffcc00' }} />
          </div>
        ))}
        <Handle key="vector" type="source" position={Position.Right} id="vector" style={handleStyleRight} isConnectable={isConnectable} />
      </div>
    </div>
  );
}


export function MultNode({ id, data }) {
  const accent = '#ff6b6b';
  const { setNodes } = useReactFlow();
  // Initialize matrix cells
  const initial = {};
  for (let r=0;r<4;r++) for (let c=0;c<4;c++) {
    const k = `m${r}${c}`; if (data[k] === undefined) initial[k] = (r===c?1:0);
  }
  if (Object.keys(initial).length) Object.assign(data, initial);
  const [matrixState, setMatrixState] = useState(() => {
    const o={}; for (let r=0;r<4;r++) for (let c=0;c<4;c++) o[`m${r}${c}`]=data[`m${r}${c}`]; return o;
  });
  const commit = next => {
    Object.assign(data, next);
    setNodes(ns => ns.map(n => n.id===id? { ...n, data: { ...n.data, ...next } } : n));
  };
  const handleCellChange = (key,val) => {
    const num = parseFloat(val);
    setMatrixState(prev => { const next={...prev,[key]:isNaN(num)?0:num}; commit(next); console.log('[MatrixNode]',id,next); return next; });
  };
  const applyMatrixPreset = preset => {
    const next={}; for (let r=0;r<4;r++) for (let c=0;c<4;c++) next[`m${r}${c}`]=(r===c?1:0);
    if (preset==='RotX90'){next.m11=0;next.m12=-1;next.m21=1;next.m22=0;}
    else if (preset==='RotY90'){next.m00=0;next.m02=1;next.m20=-1;next.m22=0;}
    else if (preset==='RotZ90'){next.m00=0;next.m01=-1;next.m10=1;next.m11=0;}
    else if (preset==='TranslateX1'){next.m03=1;}
    else if (preset==='UniformScale2'){next.m00=2;next.m11=2;next.m22=2;}
    // ResetIdentity already identity
    setMatrixState(next); commit(next); console.log('[MatrixNodePreset]',id,preset,next);
  };
  return (
    <div className="card multNode" style={{ width: '240px', height: '260px', background: 'linear-gradient(135deg, #2d3436 0%, #1e272e 100%)', border: `2px solid ${accent}`, borderRadius: '8px', position: 'relative' }}>
      <div style={{ padding: '8px 10px 6px', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ fontWeight: 'bold', color: accent, fontSize: '14px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>Matrix</div>
        <div style={{ fontSize: '10px', color: '#aaa', marginBottom: '8px', textAlign: 'center', lineHeight: '1.2' }}>Chain left→right: final = Local * Upstream.</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, auto)', gap: '6px', marginBottom: '8px' }}>
          <button className="nodrag" onClick={()=>applyMatrixPreset('RotX90')} style={{ fontSize:'10px', padding:'4px 6px', borderRadius:'4px', border:`1px solid ${accent}`, background:'#1b1f22', color:accent }}>RotX 90°</button>
          <button className="nodrag" onClick={()=>applyMatrixPreset('RotY90')} style={{ fontSize:'10px', padding:'4px 6px', borderRadius:'4px', border:`1px solid ${accent}`, background:'#1b1f22', color:accent }}>RotY 90°</button>
          <button className="nodrag" onClick={()=>applyMatrixPreset('RotZ90')} style={{ fontSize:'10px', padding:'4px 6px', borderRadius:'4px', border:`1px solid ${accent}`, background:'#1b1f22', color:accent }}>RotZ 90°</button>
          <button className="nodrag" onClick={()=>applyMatrixPreset('TranslateX1')} style={{ fontSize:'10px', padding:'4px 6px', borderRadius:'4px', border:`1px solid ${accent}`, background:'#1b1f22', color:accent }}>+X Translate 1</button>
          <button className="nodrag" onClick={()=>applyMatrixPreset('UniformScale2')} style={{ fontSize:'10px', padding:'4px 6px', borderRadius:'4px', border:`1px solid ${accent}`, background:'#1b1f22', color:accent }}>Uniform Scale 2×</button>
          <button className="nodrag" onClick={()=>applyMatrixPreset('ResetIdentity')} style={{ fontSize:'10px', padding:'4px 6px', borderRadius:'4px', border:`1px solid ${accent}`, background:'#1b1f22', color:accent }}>Reset Identity</button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'3px', width:'100%', marginBottom:'6px' }}>
          {Array.from({length:4}).map((_,r)=>Array.from({length:4}).map((__,c)=>{
            const key=`m${r}${c}`;
            return <input key={key} type="number" step="0.01" value={matrixState[key]} onChange={e=>handleCellChange(key,e.target.value)} className="nodrag" style={{ width:'100%', padding:'2px', fontSize:'11px', borderRadius:'3px', border:`1px solid ${accent}`, background:'#1b1f22', color:accent }} />;
          }))}
        </div>
      </div>
      <Handle type="target" position={Position.Left} id="matrix-in" style={{ ...handleStyleLeft, top: '50%' }} />
      <Handle type="source" position={Position.Right} id="matrix" style={{ ...handleStyleRight, top: '50%' }} />
    </div>
  );
}
// TransformNode removed per new matrix-only workflow.


export function SphereNode({ id, data }) {
  const outlineColor = '#2ecc71';
  const accent = '#2ecc71';
  const [mode, setMode] = useState(data.shapeMode || 'configured');
  const reactFlowInstance = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();

  // Force update handle positions whenever mode changes
  // Force handle hitbox re-measure when mode changes
  useEffect(() => {
    const immediate = updateNodeInternals(id);
    const raf = requestAnimationFrame(() => updateNodeInternals(id));
    const timeout = setTimeout(() => updateNodeInternals(id), 50);
    return () => { cancelAnimationFrame(raf); clearTimeout(timeout); };
  }, [mode, id, updateNodeInternals]);

  const handleModeToggle = () => {
    const newMode = mode === 'configured' ? 'modular' : 'configured';
    reactFlowInstance.setEdges((edges) =>
      edges.filter((edge) => {
        if (edge.source === id && edge.sourceHandle === 'render') return true;
        if (edge.target === id) {
          if (newMode === 'configured' && edge.targetHandle === 'color-configured') return true;
          if (newMode === 'modular' && edge.targetHandle === 'color-modular') return true;
          return false; // drop other incoming edges on toggle
        }
        if (edge.source === id) return false; // drop outgoing edges from old mode
        return true;
      })
    );
    setMode(newMode);
    data.shapeMode = newMode;
    reactFlowInstance.setNodes(ns => ns.map(n => n.id === id ? { ...n, data: { ...n.data, shapeMode: newMode } } : n));
    setTimeout(() => updateNodeInternals(id), 0);
  };

  return (
  <div className="card shapeNode" style={{ width: '240px', height: '300px', background: 'linear-gradient(135deg, #2d3436 0%, #1e272e 100%)', border: `2px solid ${accent}`, borderRadius: '8px', padding: 0, margin: 0 }}>
      <div style={{ padding: '10px 0 0 0', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
        <div style={{ fontWeight: 'bold', color: accent, fontSize: '16px', marginBottom: '8px', WebkitTextStroke: `0.1px ${outlineColor}`, textTransform: 'uppercase', letterSpacing: '1px' }}>
          Shape: Sphere
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '145px' }}>
          <span style={{ fontSize: '12px', color: mode === 'configured' ? accent : '#666' }}>Configured</span>
          <button 
            className="nodrag"
            onClick={handleModeToggle}
            style={{
              width: '44px',
              height: '22px',
              borderRadius: '11px',
              background: mode === 'modular' ? accent : '#555',
              border: 'none',
              position: 'relative',
              cursor: 'pointer',
              transition: 'background 0.3s'
            }}
          >
            <div style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: '#fff',
              position: 'absolute',
              top: '2px',
              left: mode === 'modular' ? '24px' : '2px',
              transition: 'left 0.3s'
            }} />
          </button>
          <span style={{ fontSize: '12px', color: mode === 'modular' ? accent : '#666' }}>Modular</span>
        </div>
        {mode === 'configured' ? (
          <>
            <Handle type="target" position={Position.Left} id="position-configured" isConnectable={true} style={{ ...handleStyleLeft, top: '38%' }} />
            <span style={{ position: 'absolute', left: '40px', top: '38%', color: 'white', fontSize: '15px', transform: 'translateY(-50%)', WebkitTextStroke: `0.1px ${outlineColor}` }}>Position</span>
            <Handle type="target" position={Position.Left} id="size-configured" isConnectable={true} style={{ ...handleStyleLeft, top: '52%' }} />
            <span style={{ position: 'absolute', left: '40px', top: '52%', color: 'white', fontSize: '15px', transform: 'translateY(-50%)', WebkitTextStroke: `0.1px ${outlineColor}` }}>Size</span>
            <Handle type="target" position={Position.Left} id="color-configured" isConnectable={true} style={{ ...handleStyleLeft, top: '66%' }} />
            <span style={{ position: 'absolute', left: '40px', top: '66%', color: 'white', fontSize: '15px', transform: 'translateY(-50%)', WebkitTextStroke: `0.1px ${outlineColor}` }}>Color</span>
            <Handle type="target" position={Position.Left} id="rotation-configured" isConnectable={true} style={{ ...handleStyleLeft, top: '80%' }} />
            <span style={{ position: 'absolute', left: '40px', top: '80%', color: 'white', fontSize: '15px', transform: 'translateY(-50%)', WebkitTextStroke: `0.1px ${outlineColor}` }}>Rotation</span>
            {/* TERRAIN DISABLED
            <Handle type="target" position={Position.Left} id="terrainParams-configured" isConnectable={true} style={{ ...handleStyleLeft, top: '94%', backgroundColor: '#ff9500' }} />
            <span style={{ position: 'absolute', left: '40px', top: '94%', color: '#ff9500', fontSize: '15px', transform: 'translateY(-50%)', WebkitTextStroke: `0.1px ${outlineColor}` }}>Terrain</span>
            */}
          </>
        ) : (
          <>
            <Handle type="target" position={Position.Left} id="transform-modular" isConnectable={true} style={{ ...handleStyleLeft, top: '55%' }} />
            <span style={{ position: 'absolute', left: '40px', top: '55%', color: 'white', fontSize: '15px', transform: 'translateY(-50%)', WebkitTextStroke: `0.1px ${outlineColor}` }}>Transform</span>
            <Handle type="target" position={Position.Left} id="color-modular" isConnectable={true} style={{ ...handleStyleLeft, top: '75%' }} />
            <span style={{ position: 'absolute', left: '40px', top: '75%', color: 'white', fontSize: '15px', transform: 'translateY(-50%)', WebkitTextStroke: `0.1px ${outlineColor}` }}>Color</span>
            {/* TERRAIN DISABLED
            <Handle type="target" position={Position.Left} id="terrainParams-modular" isConnectable={true} style={{ ...handleStyleLeft, top: '90%', backgroundColor: '#ff9500' }} />
            <span style={{ position: 'absolute', left: '40px', top: '90%', color: '#ff9500', fontSize: '15px', transform: 'translateY(-50%)', WebkitTextStroke: `0.1px ${outlineColor}` }}>Terrain</span>
            */}
          </>
        )}
        <Handle type="source" position={Position.Right} id="render" isConnectable={true} style={{ ...handleStyleRight, top: '65%' }} />
      </div>
    </div>
  );
}


export function TorusNode({ id, data }) {
  const outlineColor = '#a970ff';
  const accent = '#a970ff';
  const [mode, setMode] = useState(data.shapeMode || 'configured');
  const reactFlowInstance = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();

  useEffect(() => {
    updateNodeInternals(id);
    const raf = requestAnimationFrame(() => updateNodeInternals(id));
    const timeout = setTimeout(() => updateNodeInternals(id), 50);
    return () => { cancelAnimationFrame(raf); clearTimeout(timeout); };
  }, [mode, id, updateNodeInternals]);

  const handleModeToggle = () => {
    const newMode = mode === 'configured' ? 'modular' : 'configured';
    reactFlowInstance.setEdges((edges) =>
      edges.filter((edge) => {
        if (edge.source === id && edge.sourceHandle === 'render') return true;
        if (edge.target === id) {
          if (newMode === 'configured' && edge.targetHandle === 'color-configured') return true;
          if (newMode === 'modular' && edge.targetHandle === 'color-modular') return true;
          return false;
        }
        if (edge.source === id) return false;
        return true;
      })
    );
    setMode(newMode);
    data.shapeMode = newMode;
    reactFlowInstance.setNodes(ns => ns.map(n => n.id === id ? { ...n, data: { ...n.data, shapeMode: newMode } } : n));
    setTimeout(() => updateNodeInternals(id), 0);
  };

  return (
  <div className="card shapeNode" style={{ width: '240px', height: '300px', background: 'linear-gradient(135deg, #2d3436 0%, #1e272e 100%)', border: `2px solid ${accent}`, borderRadius: '8px', padding: 0, margin: 0 }}>
      <div style={{ padding: '10px 0 0 0', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
        <div style={{ fontWeight: 'bold', color: accent, fontSize: '16px', marginBottom: '8px', WebkitTextStroke: `0.1px ${outlineColor}`, textTransform: 'uppercase', letterSpacing: '1px' }}>
          Shape: Torus
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '145px' }}>
          <span style={{ fontSize: '12px', color: mode === 'configured' ? accent : '#666' }}>Configured</span>
          <button 
            className="nodrag"
            onClick={(e) => {
              e.stopPropagation();
              handleModeToggle();
            }}
            style={{
              width: '44px',
              height: '22px',
              borderRadius: '11px',
              background: mode === 'modular' ? accent : '#555',
              border: 'none',
              position: 'relative',
              cursor: 'pointer',
              transition: 'background 0.3s'
            }}
          >
            <div style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: '#fff',
              position: 'absolute',
              top: '2px',
              left: mode === 'modular' ? '24px' : '2px',
              transition: 'left 0.3s'
            }} />
          </button>
          <span style={{ fontSize: '12px', color: mode === 'modular' ? accent : '#666' }}>Modular</span>
        </div>
        {mode === 'configured' ? (
          <>
            <Handle type="target" position={Position.Left} id="position-configured" isConnectable={true} style={{ ...handleStyleLeft, top: '38%' }} />
            <span style={{ position: 'absolute', left: '40px', top: '38%', color: 'white', fontSize: '15px', transform: 'translateY(-50%)', WebkitTextStroke: `0.1px ${outlineColor}` }}>Position</span>
            <Handle type="target" position={Position.Left} id="size-configured" isConnectable={true} style={{ ...handleStyleLeft, top: '52%' }} />
            <span style={{ position: 'absolute', left: '40px', top: '52%', color: 'white', fontSize: '15px', transform: 'translateY(-50%)', WebkitTextStroke: `0.1px ${outlineColor}` }}>Size</span>
            <Handle type="target" position={Position.Left} id="color-configured" isConnectable={true} style={{ ...handleStyleLeft, top: '66%' }} />
            <span style={{ position: 'absolute', left: '40px', top: '66%', color: 'white', fontSize: '15px', transform: 'translateY(-50%)', WebkitTextStroke: `0.1px ${outlineColor}` }}>Color</span>
            <Handle type="target" position={Position.Left} id="rotation-configured" isConnectable={true} style={{ ...handleStyleLeft, top: '80%' }} />
            <span style={{ position: 'absolute', left: '40px', top: '80%', color: 'white', fontSize: '15px', transform: 'translateY(-50%)', WebkitTextStroke: `0.1px ${outlineColor}` }}>Rotation</span>
            {/* TERRAIN DISABLED
            <Handle type="target" position={Position.Left} id="terrainParams-configured" isConnectable={true} style={{ ...handleStyleLeft, top: '94%', backgroundColor: '#ff9500' }} />
            <span style={{ position: 'absolute', left: '40px', top: '94%', color: '#ff9500', fontSize: '15px', transform: 'translateY(-50%)', WebkitTextStroke: `0.1px ${outlineColor}` }}>Terrain</span>
            */}
          </>
        ) : (
          <>
            <Handle type="target" position={Position.Left} id="transform-modular" isConnectable={true} style={{ ...handleStyleLeft, top: '55%' }} />
            <span style={{ position: 'absolute', left: '40px', top: '55%', color: 'white', fontSize: '15px', transform: 'translateY(-50%)', WebkitTextStroke: `0.1px ${outlineColor}` }}>Transform</span>
            <Handle type="target" position={Position.Left} id="color-modular" isConnectable={true} style={{ ...handleStyleLeft, top: '75%' }} />
            <span style={{ position: 'absolute', left: '40px', top: '75%', color: 'white', fontSize: '15px', transform: 'translateY(-50%)', WebkitTextStroke: `0.1px ${outlineColor}` }}>Color</span>
            {/* TERRAIN DISABLED
            <Handle type="target" position={Position.Left} id="terrainParams-modular" isConnectable={true} style={{ ...handleStyleLeft, top: '90%', backgroundColor: '#ff9500' }} />
            <span style={{ position: 'absolute', left: '40px', top: '90%', color: '#ff9500', fontSize: '15px', transform: 'translateY(-50%)', WebkitTextStroke: `0.1px ${outlineColor}` }}>Terrain</span>
            */}
          </>
        )}
        <Handle type="source" position={Position.Right} id="render" isConnectable={true} style={{ ...handleStyleRight, top: '65%' }} />
      </div>
    </div>
  );
}
export function BoxNode({ id, data }) {
  const outlineColor = '#ff4d4d';
  const accent = '#ff4d4d';
  const [mode, setMode] = useState(data.shapeMode || 'configured');
  const reactFlowInstance = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();

  useEffect(() => {
    updateNodeInternals(id);
    const raf = requestAnimationFrame(() => updateNodeInternals(id));
    const timeout = setTimeout(() => updateNodeInternals(id), 50);
    return () => { cancelAnimationFrame(raf); clearTimeout(timeout); };
  }, [mode, id, updateNodeInternals]);

  const handleModeToggle = () => {
    const newMode = mode === 'configured' ? 'modular' : 'configured';
    reactFlowInstance.setEdges((edges) =>
      edges.filter((edge) => {
        if (edge.source === id && edge.sourceHandle === 'render') return true;
        if (edge.target === id) {
          if (newMode === 'configured' && edge.targetHandle === 'color-configured') return true;
          if (newMode === 'modular' && edge.targetHandle === 'color-modular') return true;
          return false;
        }
        if (edge.source === id) return false;
        return true;
      })
    );
    setMode(newMode);
    data.shapeMode = newMode;
    reactFlowInstance.setNodes(ns => ns.map(n => n.id === id ? { ...n, data: { ...n.data, shapeMode: newMode } } : n));
    setTimeout(() => updateNodeInternals(id), 0);
  };

  return (
  <div className="card shapeNode" style={{ width: '240px', height: '300px', background: 'linear-gradient(135deg, #2d3436 0%, #1e272e 100%)', border: `2px solid ${accent}`, borderRadius: '8px', padding: 0, margin: 0 }}>
      <div style={{ padding: '10px 0 0 0', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
        <div style={{ fontWeight: 'bold', color: accent, fontSize: '16px', marginBottom: '8px', WebkitTextStroke: `0.1px ${outlineColor}`, textTransform: 'uppercase', letterSpacing: '1px' }}>
          Shape: Box
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '145px' }}>
          <span style={{ fontSize: '12px', color: mode === 'configured' ? accent : '#666' }}>Configured</span>
          <button 
            className="nodrag"
            onClick={(e) => {
              e.stopPropagation();
              handleModeToggle();
            }}
            style={{
              width: '44px',
              height: '22px',
              borderRadius: '11px',
              background: mode === 'modular' ? accent : '#555',
              border: 'none',
              position: 'relative',
              cursor: 'pointer',
              transition: 'background 0.3s'
            }}
          >
            <div style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: '#fff',
              position: 'absolute',
              top: '2px',
              left: mode === 'modular' ? '24px' : '2px',
              transition: 'left 0.3s'
            }} />
          </button>
          <span style={{ fontSize: '12px', color: mode === 'modular' ? accent : '#666' }}>Modular</span>
        </div>
        {mode === 'configured' ? (
          <>
            <Handle type="target" position={Position.Left} id="position-configured" isConnectable={true} style={{ ...handleStyleLeft, top: '38%' }} />
            <span style={{ position: 'absolute', left: '40px', top: '38%', color: 'white', fontSize: '15px', transform: 'translateY(-50%)', WebkitTextStroke: `0.1px ${outlineColor}` }}>Position</span>
            <Handle type="target" position={Position.Left} id="size-configured" isConnectable={true} style={{ ...handleStyleLeft, top: '52%' }} />
            <span style={{ position: 'absolute', left: '40px', top: '52%', color: 'white', fontSize: '15px', transform: 'translateY(-50%)', WebkitTextStroke: `0.1px ${outlineColor}` }}>Size</span>
            <Handle type="target" position={Position.Left} id="color-configured" isConnectable={true} style={{ ...handleStyleLeft, top: '66%' }} />
            <span style={{ position: 'absolute', left: '40px', top: '66%', color: 'white', fontSize: '15px', transform: 'translateY(-50%)', WebkitTextStroke: `0.1px ${outlineColor}` }}>Color</span>
            <Handle type="target" position={Position.Left} id="rotation-configured" isConnectable={true} style={{ ...handleStyleLeft, top: '80%' }} />
            <span style={{ position: 'absolute', left: '40px', top: '80%', color: 'white', fontSize: '15px', transform: 'translateY(-50%)', WebkitTextStroke: `0.1px ${outlineColor}` }}>Rotation</span>
            {/* TERRAIN DISABLED
            <Handle type="target" position={Position.Left} id="terrainParams-configured" isConnectable={true} style={{ ...handleStyleLeft, top: '94%', backgroundColor: '#ff9500' }} />
            <span style={{ position: 'absolute', left: '40px', top: '94%', color: '#ff9500', fontSize: '15px', transform: 'translateY(-50%)', WebkitTextStroke: `0.1px ${outlineColor}` }}>Terrain</span>
            */}
          </>
        ) : (
          <>
            <Handle type="target" position={Position.Left} id="transform-modular" isConnectable={true} style={{ ...handleStyleLeft, top: '55%' }} />
            <span style={{ position: 'absolute', left: '40px', top: '55%', color: 'white', fontSize: '15px', transform: 'translateY(-50%)', WebkitTextStroke: `0.1px ${outlineColor}` }}>Transform</span>
            <Handle type="target" position={Position.Left} id="color-modular" isConnectable={true} style={{ ...handleStyleLeft, top: '75%' }} />
            <span style={{ position: 'absolute', left: '40px', top: '75%', color: 'white', fontSize: '15px', transform: 'translateY(-50%)', WebkitTextStroke: `0.1px ${outlineColor}` }}>Color</span>
            {/* TERRAIN DISABLED
            <Handle type="target" position={Position.Left} id="terrainParams-modular" isConnectable={true} style={{ ...handleStyleLeft, top: '90%', backgroundColor: '#ff9500' }} />
            <span style={{ position: 'absolute', left: '40px', top: '90%', color: '#ff9500', fontSize: '15px', transform: 'translateY(-50%)', WebkitTextStroke: `0.1px ${outlineColor}` }}>Terrain</span>
            */}
          </>
        )}
        <Handle type="source" position={Position.Right} id="render" isConnectable={true} style={{ ...handleStyleRight, top: '65%' }} />
      </div>
    </div>
  );
}
export function CapsuleNode({ id, data }) {
  const outlineColor = '#f39c12';
  const accent = '#f39c12';
  const [mode, setMode] = useState(data.shapeMode || 'configured');
  const reactFlowInstance = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();

  useEffect(() => {
    updateNodeInternals(id);
    const raf = requestAnimationFrame(() => updateNodeInternals(id));
    const timeout = setTimeout(() => updateNodeInternals(id), 50);
    return () => { cancelAnimationFrame(raf); clearTimeout(timeout); };
  }, [mode, id, updateNodeInternals]);

  const handleModeToggle = () => {
    const newMode = mode === 'configured' ? 'modular' : 'configured';
    reactFlowInstance.setEdges((edges) =>
      edges.filter((edge) => {
        if (edge.source === id && edge.sourceHandle === 'render') return true;
        if (edge.target === id) {
          if (newMode === 'configured' && edge.targetHandle === 'color-configured') return true;
          if (newMode === 'modular' && edge.targetHandle === 'color-modular') return true;
          return false;
        }
        if (edge.source === id) return false;
        return true;
      })
    );
    setMode(newMode);
    data.shapeMode = newMode;
    reactFlowInstance.setNodes(ns => ns.map(n => n.id === id ? { ...n, data: { ...n.data, shapeMode: newMode } } : n));
    setTimeout(() => updateNodeInternals(id), 0);
  };

  return (
  <div className="card shapeNode" style={{ width: '240px', height: '300px', background: 'linear-gradient(135deg, #2d3436 0%, #1e272e 100%)', border: `2px solid ${accent}`, borderRadius: '8px', padding: 0, margin: 0 }}>
      <div style={{ padding: '10px 0 0 0', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
        <div style={{ fontWeight: 'bold', color: accent, fontSize: '16px', marginBottom: '8px', WebkitTextStroke: `0.1px ${outlineColor}`, textTransform: 'uppercase', letterSpacing: '1px' }}>
          Shape: Capsule
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '145px' }}>
          <span style={{ fontSize: '12px', color: mode === 'configured' ? accent : '#666' }}>Configured</span>
          <button 
            className="nodrag"
            onClick={(e) => {
              e.stopPropagation();
              handleModeToggle();
            }}
            style={{
              width: '44px',
              height: '22px',
              borderRadius: '11px',
              background: mode === 'modular' ? accent : '#555',
              border: 'none',
              position: 'relative',
              cursor: 'pointer',
              transition: 'background 0.3s'
            }}
          >
            <div style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: '#fff',
              position: 'absolute',
              top: '2px',
              left: mode === 'modular' ? '24px' : '2px',
              transition: 'left 0.3s'
            }} />
          </button>
          <span style={{ fontSize: '12px', color: mode === 'modular' ? accent : '#666' }}>Modular</span>
        </div>
        {mode === 'configured' ? (
          <>
            <Handle type="target" position={Position.Left} id="position-configured" isConnectable={true} style={{ ...handleStyleLeft, top: '38%' }} />
            <span style={{ position: 'absolute', left: '40px', top: '38%', color: 'white', fontSize: '15px', transform: 'translateY(-50%)', WebkitTextStroke: `0.1px ${outlineColor}` }}>Position</span>
            <Handle type="target" position={Position.Left} id="size-configured" isConnectable={true} style={{ ...handleStyleLeft, top: '52%' }} />
            <span style={{ position: 'absolute', left: '40px', top: '52%', color: 'white', fontSize: '15px', transform: 'translateY(-50%)', WebkitTextStroke: `0.1px ${outlineColor}` }}>Size</span>
            <Handle type="target" position={Position.Left} id="color-configured" isConnectable={true} style={{ ...handleStyleLeft, top: '66%' }} />
            <span style={{ position: 'absolute', left: '40px', top: '66%', color: 'white', fontSize: '15px', transform: 'translateY(-50%)', WebkitTextStroke: `0.1px ${outlineColor}` }}>Color</span>
            <Handle type="target" position={Position.Left} id="rotation-configured" isConnectable={true} style={{ ...handleStyleLeft, top: '80%' }} />
            <span style={{ position: 'absolute', left: '40px', top: '80%', color: 'white', fontSize: '15px', transform: 'translateY(-50%)', WebkitTextStroke: `0.1px ${outlineColor}` }}>Rotation</span>
            {/* TERRAIN DISABLED
            <Handle type="target" position={Position.Left} id="terrainParams-configured" isConnectable={true} style={{ ...handleStyleLeft, top: '94%', backgroundColor: '#ff9500' }} />
            <span style={{ position: 'absolute', left: '40px', top: '94%', color: '#ff9500', fontSize: '15px', transform: 'translateY(-50%)', WebkitTextStroke: `0.1px ${outlineColor}` }}>Terrain</span>
            */}
          </>
        ) : (
          <>
            <Handle type="target" position={Position.Left} id="transform-modular" isConnectable={true} style={{ ...handleStyleLeft, top: '55%' }} />
            <span style={{ position: 'absolute', left: '40px', top: '55%', color: 'white', fontSize: '15px', transform: 'translateY(-50%)', WebkitTextStroke: `0.1px ${outlineColor}` }}>Transform</span>
            <Handle type="target" position={Position.Left} id="color-modular" isConnectable={true} style={{ ...handleStyleLeft, top: '75%' }} />
            <span style={{ position: 'absolute', left: '40px', top: '75%', color: 'white', fontSize: '15px', transform: 'translateY(-50%)', WebkitTextStroke: `0.1px ${outlineColor}` }}>Color</span>
            {/* TERRAIN DISABLED
            <Handle type="target" position={Position.Left} id="terrainParams-modular" isConnectable={true} style={{ ...handleStyleLeft, top: '90%', backgroundColor: '#ff9500' }} />
            <span style={{ position: 'absolute', left: '40px', top: '90%', color: '#ff9500', fontSize: '15px', transform: 'translateY(-50%)', WebkitTextStroke: `0.1px ${outlineColor}` }}>Terrain</span>
            */}
          </>
        )}
        <Handle type="source" position={Position.Right} id="render" isConnectable={true} style={{ ...handleStyleRight, top: '65%' }} />
      </div>
    </div>
  );
}

/* TERRAIN DISABLED - TerrainNode component
export function TerrainNode({ data }) {
  const outlineColor = 'white';

  return (
    <div className="card shapeNode" style={{ width: '280px', height: '280px', background: 'linear-gradient(135deg, #2d3436 0%, #1e272e 100%)', border: '2px solid #4a9eff', borderRadius: '8px', padding: 0, margin: 0 }}>
      <div style={{ padding: '0', top:'20px', bottom:'20px', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
        <div style={{ fontWeight: 'bold', color: '#4a9eff', fontSize: '16px', marginBottom: '10px', WebkitTextStroke: `0.1px #4a9eff`, textTransform: 'uppercase', letterSpacing: '1px' }}>
          Procedural Terrain
        </div>
        <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '120px', textAlign: 'center' }}>
          SDF + Perlin Noise
        </div>
        
        <Handle key="position" type="target" position={Position.Left} id="position" style={{ ...handleStyleLeft, top: '25%' }} />
        <span style={{ position: 'absolute', left: '40px', top: '25%', color: 'white', fontSize: '14px', transform: 'translateY(-50%)', WebkitTextStroke: `0.1px ${outlineColor}` }}>Position</span>
        
        <Handle key="size" type="target" position={Position.Left} id="size" style={{ ...handleStyleLeft, top: '40%' }} />
        <span style={{ position: 'absolute', left: '40px', top: '40%', color: 'white', fontSize: '14px', transform: 'translateY(-50%)', WebkitTextStroke: `0.1px ${outlineColor}` }}>Size</span>
        
        <Handle key="color" type="target" position={Position.Left} id="color" style={{ ...handleStyleLeft, top: '55%' }} />
        <span style={{ position: 'absolute', left: '40px', top: '55%', color: 'white', fontSize: '14px', transform: 'translateY(-50%)', WebkitTextStroke: `0.1px ${outlineColor}` }}>Color</span>
        
        <Handle key="noise" type="target" position={Position.Left} id="noise" style={{ ...handleStyleLeft, top: '70%' }} />
        <span style={{ position: 'absolute', left: '40px', top: '70%', color: '#4a9eff', fontSize: '14px', transform: 'translateY(-50%)', WebkitTextStroke: `0.1px ${outlineColor}` }}>Noise</span>
        
        <Handle key="displacement" type="target" position={Position.Left} id="displacement" style={{ ...handleStyleLeft, top: '85%' }} />
        <span style={{ position: 'absolute', left: '40px', top: '85%', color: '#4a9eff', fontSize: '14px', transform: 'translateY(-50%)', WebkitTextStroke: `0.1px ${outlineColor}` }}>Displacement</span>
        
        <Handle key="render" type="source" position={Position.Right} id="render" style={{ ...handleStyleRight, top: '55%' }} />
      </div>
    </div>
  );
}
*/

// TERRAIN DISABLED - TerrainParamsNode component
/*
export function TerrainParamsNode({ data }) {
  const [octaves, setOctaves] = useState(data.octaves || 5);
  const [amplitude, setAmplitude] = useState(data.amplitude || 1.35);
  const [clampYMin, setClampYMin] = useState(data.clampYMin || -12);
  const [clampYMax, setClampYMax] = useState(data.clampYMax || 24);
  const [offsetX, setOffsetX] = useState(data.offsetX || 0);
  const [offsetZ, setOffsetZ] = useState(data.offsetZ || 0);
  const [seed, setSeed] = useState(data.seed || Math.floor(Math.random() * 1000000));
  const [dispClampMin, setDispClampMin] = useState(data.dispClampMin ?? -2);
  const [dispClampMax, setDispClampMax] = useState(data.dispClampMax ?? 2);
  const [peakGain, setPeakGain] = useState(data.peakGain ?? 1.0);
  const [valleyGain, setValleyGain] = useState(data.valleyGain ?? 1.0);
  const [smoothingStrength, setSmoothingStrength] = useState(data.smoothingStrength ?? 0.0);
  const [useColorRamp, setUseColorRamp] = useState(data.useColorRamp ?? true);
  const [dispApplyMinY, setDispApplyMinY] = useState(data.dispApplyMinY ?? -9999);
  const [dispApplyMaxY, setDispApplyMaxY] = useState(data.dispApplyMaxY ?? 9999);
  const [dispFeather, setDispFeather] = useState(data.dispFeather ?? 0);
  const reactFlowInstance = useReactFlow();

  // Initialize data object with default values on first render
  useEffect(() => {
    if (!data.octaves) {
      Object.assign(data, {
        octaves: octaves,
        amplitude: amplitude,
        clampYMin: clampYMin,
        clampYMax: clampYMax,
        offsetX: offsetX,
        offsetZ: offsetZ,
        seed: seed,
        dispClampMin: dispClampMin,
        dispClampMax: dispClampMax,
        peakGain: peakGain,
        valleyGain: valleyGain,
  smoothingStrength: smoothingStrength,
        useColorRamp: useColorRamp,
        dispApplyMinY: dispApplyMinY,
        dispApplyMaxY: dispApplyMaxY,
        dispFeather: dispFeather,
      });
      
    }
  }, []);

  const updateNodeData = (updates) => {
    Object.assign(data, updates);
    reactFlowInstance.setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === data.id) {
          return { ...node, data: { ...node.data, ...updates } };
        }
        return node;
      })
    );
  };

  const handleRandomizeSeed = () => {
    const newSeed = Math.floor(Math.random() * 1000000);
    setSeed(newSeed);
    updateNodeData({ seed: newSeed });
  };

  return (
    <div className="card" style={{ 
      width: '220px', 
      minHeight: '380px', 
      background: 'linear-gradient(135deg, #2d3436 0%, #1e272e 100%)',
      border: '2px solid #3aafa9',
      borderRadius: '8px',
      padding: '15px',
      boxShadow: '0 4px 15px rgba(58, 175, 169, 0.3)'
    }}>
      <div style={{ color: '#fff', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ 
          fontWeight: 'bold', 
          color: '#3aafa9', 
          fontSize: '16px', 
          textAlign: 'center',
          marginBottom: '5px',
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}>
          Terrain Control
        </div>

        <div style={{ width: '100%' }}>
          <label style={{ fontSize: '11px', color: '#95afc0', fontWeight: '600' }}>
            Apply Min Y: <span style={{ color: '#3aafa9' }}>{dispApplyMinY}</span>
          </label>
          <input
            type="range"
            min="-50"
            max="50"
            step="1"
            value={dispApplyMinY}
            onChange={(e) => { const v = parseInt(e.target.value); setDispApplyMinY(v); updateNodeData({ dispApplyMinY: v }); }}
            className="nodrag"
            style={{ width: '100%', cursor: 'pointer', accentColor: '#3aafa9' }}
          />
        </div>

        <div style={{ width: '100%' }}>
          <label style={{ fontSize: '11px', color: '#95afc0', fontWeight: '600' }}>
            Apply Max Y: <span style={{ color: '#3aafa9' }}>{dispApplyMaxY}</span>
          </label>
          <input
            type="range"
            min="-50"
            max="50"
            step="1"
            value={dispApplyMaxY}
            onChange={(e) => { const v = parseInt(e.target.value); setDispApplyMaxY(v); updateNodeData({ dispApplyMaxY: v }); }}
            className="nodrag"
            style={{ width: '100%', cursor: 'pointer', accentColor: '#3aafa9' }}
          />
        </div>

        <div style={{ width: '100%' }}>
          <label style={{ fontSize: '11px', color: '#95afc0', fontWeight: '600' }}>
            Feather: <span style={{ color: '#3aafa9' }}>{dispFeather.toFixed(2)}</span>
          </label>
          <input
            type="range"
            min="0"
            max="5"
            step="0.1"
            value={dispFeather}
            onChange={(e) => { const v = parseFloat(e.target.value); setDispFeather(v); updateNodeData({ dispFeather: v }); }}
            className="nodrag"
            style={{ width: '100%', cursor: 'pointer', accentColor: '#3aafa9' }}
          />
        </div>
        <div style={{ width: '100%' }}>
          <label style={{ fontSize: '11px', color: '#95afc0', fontWeight: '600' }}>
            Peak Gain (mountains): <span style={{ color: '#3aafa9' }}>{peakGain.toFixed(2)}</span>
          </label>
          <input
            type="range"
            min="0.1"
            max="4"
            step="0.1"
            value={peakGain}
            onChange={(e) => { const v = parseFloat(e.target.value); setPeakGain(v); updateNodeData({ peakGain: v }); }}
            className="nodrag"
            style={{ width: '100%', cursor: 'pointer', accentColor: '#3aafa9' }}
          />
        </div>

        <div style={{ width: '100%' }}>
          <label style={{ fontSize: '11px', color: '#95afc0', fontWeight: '600' }}>
            Valley Gain (seas): <span style={{ color: '#3aafa9' }}>{valleyGain.toFixed(2)}</span>
          </label>
          <input
            type="range"
            min="0.1"
            max="4"
            step="0.1"
            value={valleyGain}
            onChange={(e) => { const v = parseFloat(e.target.value); setValleyGain(v); updateNodeData({ valleyGain: v }); }}
            className="nodrag"
            style={{ width: '100%', cursor: 'pointer', accentColor: '#3aafa9' }}
          />
        </div>

        <div style={{ width: '100%' }}>
          <label style={{ fontSize: '11px', color: '#95afc0', fontWeight: '600' }}>
            Smoothing: <span style={{ color: '#3aafa9' }}>{smoothingStrength.toFixed(2)}</span>
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={smoothingStrength}
            onChange={(e) => { const v = parseFloat(e.target.value); setSmoothingStrength(v); updateNodeData({ smoothingStrength: v }); }}
            className="nodrag"
            style={{ width: '100%', cursor: 'pointer', accentColor: '#3aafa9' }}
          />
        </div>

        

        <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            id="useColorRamp"
            type="checkbox"
            checked={!!useColorRamp}
            onChange={(e) => { const v = e.target.checked; setUseColorRamp(v); updateNodeData({ useColorRamp: v }); }}
            className="nodrag"
            style={{ cursor: 'pointer', accentColor: '#3aafa9' }}
          />
          <label htmlFor="useColorRamp" style={{ fontSize: '11px', color: '#95afc0', fontWeight: '600' }}>
            Use Color Mapping
          </label>
        </div>

        <div style={{ width: '100%' }}>
          <label style={{ fontSize: '11px', color: '#95afc0', fontWeight: '600' }}>
            Displacement Min: <span style={{ color: '#3aafa9' }}>{dispClampMin.toFixed(2)}</span>
          </label>
          <input
            type="range"
            min="-10"
            max="0"
            step="0.1"
            value={dispClampMin}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setDispClampMin(val);
              updateNodeData({ dispClampMin: val });
            }}
            className="nodrag"
            style={{ width: '100%', cursor: 'pointer', accentColor: '#3aafa9' }}
          />
        </div>

        <div style={{ width: '100%' }}>
          <label style={{ fontSize: '11px', color: '#95afc0', fontWeight: '600' }}>
            Displacement Max: <span style={{ color: '#3aafa9' }}>{dispClampMax.toFixed(2)}</span>
          </label>
          <input
            type="range"
            min="0"
            max="10"
            step="0.1"
            value={dispClampMax}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setDispClampMax(val);
              updateNodeData({ dispClampMax: val });
            }}
            className="nodrag"
            style={{ width: '100%', cursor: 'pointer', accentColor: '#3aafa9' }}
          />
        </div>

        <div style={{ width: '100%' }}>
          <label style={{ fontSize: '11px', color: '#95afc0', fontWeight: '600' }}>
            Octaves: <span style={{ color: '#3aafa9' }}>{octaves}</span>
          </label>
          <input
            type="range"
            min="1"
            max="8"
            step="1"
            value={octaves}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              setOctaves(val);
              updateNodeData({ octaves: val });
            }}
            className="nodrag"
            style={{ width: '100%', cursor: 'pointer', accentColor: '#3aafa9' }}
          />
        </div>

        <div style={{ width: '100%' }}>
          <label style={{ fontSize: '11px', color: '#95afc0', fontWeight: '600' }}>
            Amplitude: <span style={{ color: '#3aafa9' }}>{amplitude.toFixed(2)}</span>
          </label>
          <input
            type="range"
            min="0"
            max="3"
            step="0.05"
            value={amplitude}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setAmplitude(val);
              updateNodeData({ amplitude: val });
            }}
            className="nodrag"
            style={{ width: '100%', cursor: 'pointer', accentColor: '#3aafa9' }}
          />
        </div>

        <div style={{ width: '100%' }}>
          <label style={{ fontSize: '11px', color: '#95afc0', fontWeight: '600' }}>
            Min Height: <span style={{ color: '#3aafa9' }}>{clampYMin}</span>
          </label>
          <input
            type="range"
            min="-50"
            max="0"
            step="1"
            value={clampYMin}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              setClampYMin(val);
              updateNodeData({ clampYMin: val });
            }}
            className="nodrag"
            style={{ width: '100%', cursor: 'pointer', accentColor: '#3aafa9' }}
          />
        </div>

        <div style={{ width: '100%' }}>
          <label style={{ fontSize: '11px', color: '#95afc0', fontWeight: '600' }}>
            Max Height: <span style={{ color: '#3aafa9' }}>{clampYMax}</span>
          </label>
          <input
            type="range"
            min="0"
            max="50"
            step="1"
            value={clampYMax}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              setClampYMax(val);
              updateNodeData({ clampYMax: val });
            }}
            className="nodrag"
            style={{ width: '100%', cursor: 'pointer', accentColor: '#3aafa9' }}
          />
        </div>

        <div style={{ width: '100%' }}>
          <label style={{ fontSize: '11px', color: '#95afc0', fontWeight: '600' }}>
            Offset X: <span style={{ color: '#3aafa9' }}>{offsetX}</span>
          </label>
          <input
            type="range"
            min="-100"
            max="100"
            step="1"
            value={offsetX}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              setOffsetX(val);
              updateNodeData({ offsetX: val });
            }}
            className="nodrag"
            style={{ width: '100%', cursor: 'pointer', accentColor: '#3aafa9' }}
          />
        </div>

        <div style={{ width: '100%' }}>
          <label style={{ fontSize: '11px', color: '#95afc0', fontWeight: '600' }}>
            Offset Z: <span style={{ color: '#3aafa9' }}>{offsetZ}</span>
          </label>
          <input
            type="range"
            min="-100"
            max="100"
            step="1"
            value={offsetZ}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              setOffsetZ(val);
              updateNodeData({ offsetZ: val });
            }}
            className="nodrag"
            style={{ width: '100%', cursor: 'pointer', accentColor: '#3aafa9' }}
          />
        </div>

        <div style={{ 
          width: '100%', 
          marginTop: '10px',
          padding: '10px',
          background: 'rgba(58, 175, 169, 0.1)',
          borderRadius: '5px',
          border: '1px solid rgba(58, 175, 169, 0.3)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#95afc0', fontWeight: '600' }}>
              Seed: <span style={{ color: '#3aafa9' }}>{seed}</span>
            </span>
            <button
              onClick={handleRandomizeSeed}
              className="nodrag"
              style={{
                padding: '5px 12px',
                fontSize: '11px',
                cursor: 'pointer',
                background: '#3aafa9',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 'bold',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => e.target.style.background = '#2d8b84'}
              onMouseLeave={(e) => e.target.style.background = '#3aafa9'}
            >
              🎲 Roll
            </button>
          </div>
        </div>

        <Handle 
          key="terrainParams"
          type="source" 
          position={Position.Right} 
          id="terrainParams" 
          style={{ 
            ...handleStyleRight, 
            top: '50%',
            background: '#3aafa9',
            border: '2px solid #2d8b84'
          }}
        />
      </div>
    </div>
  );
}
// END TERRAIN DISABLED
*/

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
    <div className="card colorNode" style={{ width: '120px', height: '90px', background: 'linear-gradient(135deg, #2d3436 0%, #1e272e 100%)', border: '2px solid #3aafa9', borderRadius: '8px' }}>
      <div style={{ padding: '12px', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ marginBottom: '10px', fontWeight: 'bold', fontSize: '16px', color: '#3aafa9', textTransform: 'uppercase', letterSpacing: '1px' }}>Color</div>
        <input type="color" value={color} onChange={handleChange} className="nodrag" style={{ cursor: 'pointer', width: '60%', height: '30px', border: '1px solid #3aafa9', padding: '0' }} />
        <Handle key="color" type="source" position={Position.Right} id="color" style={{ ...handleStyleRight, backgroundColor: '#3aafa9' }} isConnectable={isConnectable} />
      </div>
    </div>
  );
}

export function RenderNode({ data }) {
  return (
    <div className="card renderNode" style={{ width: '120px', height: 'auto', background: 'linear-gradient(135deg, #2d3436 0%, #1e272e 100%)', border: '2px solid #ff4d4d', borderRadius: '8px' }}>
      <div style={{ padding: '10px', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ marginBottom: '10px', fontWeight: 'bold', fontSize: '14px', color: '#ff4d4d', textTransform: 'uppercase', letterSpacing: '1px' }}>Render</div>
        <Handle key="render" type="target" position={Position.Left} id="render" style={{ ...handleStyleLeft, top: '50%', backgroundColor: '#ff4d4d' }} />
      </div>
    </div>
  );
}

export function GroupNode({ data }) {
  const accent = '#4a9eff';
  return (
    <div className="card groupNode" style={{ width: '210px', height: '170px', background: 'linear-gradient(135deg, #2d3436 0%, #1e272e 100%)', border: `2px solid ${accent}`, borderRadius: '8px' }}>
      <div style={{ padding: '10px', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', height: '100%' }}>
        <div style={{ marginBottom: '6px', fontWeight: 'bold', fontSize: '14px', color: accent, textTransform: 'uppercase', letterSpacing: '1px' }}>Group</div>
        {/* Left handles: transform and shapes (multi) */}
        <div style={{ position: 'absolute', left: '8px', top: '40%', fontSize: '13px', color: '#fff', fontWeight: 'bold' }}>Transform</div>
        <Handle key="transform" type="target" position={Position.Left} id="transform" style={{ top: '45%', ...handleStyleLeft }} />
        <div style={{ position: 'absolute', left: '8px', top: '68%', fontSize: '13px', color: '#fff', fontWeight: 'bold' }}>Shapes</div>
        <Handle key="shapes" type="target" position={Position.Left} id="shapes" style={{ top: '73%', ...handleStyleLeft }} />
        {/* Right handle: render out */}
        <div style={{ position: 'absolute', right: '18px', top: '68%', fontSize: '13px', color: '#fff', fontWeight: 'bold' }}>Render</div>
        <Handle key="render" type="source" position={Position.Right} id="render" style={{ top: '73%', ...handleStyleRight }} />
      </div>
    </div>
  );
}