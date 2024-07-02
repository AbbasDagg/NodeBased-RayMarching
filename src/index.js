import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ReactFlowProvider } from 'reactflow';
import PositionNode from './PositionNode';
import ShapeNode from './ShapeNode';

const nodeTypes = {
  positionNode: PositionNode,
  shapeNode: ShapeNode,
};

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
  <ReactFlowProvider nodeTypes={nodeTypes}>
    <App />
  </ReactFlowProvider>
);
