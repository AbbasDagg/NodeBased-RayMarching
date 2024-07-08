// NOT USED YET !!!


import React from 'react';
import { Handle, Position } from 'reactflow';

function ShapeNode({ data }) {
  return (
    <div>
      <div>{data.label}</div>
      <Handle type="target" position={Position.Left} id="x" style={{ top: '33%' }} />
      <Handle type="target" position={Position.Left} id="y" style={{ top: '66%' }} />
      <Handle type="target" position={Position.Left} id="z" style={{ top: '100%' }} />
    </div>
  );
}

export default ShapeNode;
