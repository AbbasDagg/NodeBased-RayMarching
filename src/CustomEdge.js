import React from 'react';
import { useReactFlow, EdgeLabelRenderer, getBezierPath } from 'reactflow'; // Assuming you're using ReactFlow
import './App.css'; // Assuming you have this for styling

export default function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}) {
  const { setEdges } = useReactFlow();

  // Get the Bezier path coordinates for a smooth curve between the nodes
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Function to delete the edge when the button is clicked
  const onEdgeClick = () => {
    setEdges((edges) => edges.filter((edge) => edge.id !== id));
  };

  // Easily customizable stroke color
  const strokeColor = data?.color || '#ffffff'; // Default to #888 if no color is provided

  return (
    <>
      {/* Thicker animated path with customizable stroke color */}
      <path
        id={id}
        className="custom-edge-path animated" // Add "animated" for animation
        d={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: strokeColor, // Easily change color via `data.color`
          strokeWidth: 3, // Increase stroke width for a thicker line
        }}
      />
      
      {/* Circle at the start of the edge */}
      <circle
        cx={sourceX}
        cy={sourceY}
        fill="#fff"
        r={8} // Adjust the size of the circle
        stroke={strokeColor}
        strokeWidth={4} // Thicker circle border
      />
      
      {/* Circle at the end of the edge */}
      <circle
        cx={targetX}
        cy={targetY}
        fill="#fff"
        r={8} // Adjust the size of the circle
        stroke={strokeColor}
        strokeWidth={4} // Thicker circle border
      />
      
      {/* Delete button (cross) at the center of the edge */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all', // Ensures the button can be clicked
            fontSize: '14px',
          }}
          className="nodrag nopan"
        >
          <button className="edgebutton" onClick={onEdgeClick}>
            ×
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
