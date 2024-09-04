import React from 'react';
import { useReactFlow, EdgeLabelRenderer, getBezierPath } from 'reactflow'; 
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
  
    // Customize stroke color
    const strokeColor = data?.color || '#888';
  
    // Offset values to align circles with the pins
    const offset = -7; // Adjust this value based on your needs
  
    return (
      <>
        {/* Thicker animated path with customizable stroke color */}
        <path
          id={id}
          className="custom-edge-path animated"
          d={edgePath}
          markerEnd={markerEnd}
          style={{
            ...style,
            stroke: strokeColor,
            strokeWidth: 3,
          }}
        />
  
        {/* Circle at the start of the edge */}
        <circle
          cx={sourceX + offset} // Adjusted with offset
          cy={sourceY}
          fill="#fff"
          r={13}
          stroke={strokeColor}
          strokeWidth={4}
        />
  
        {/* Circle at the end of the edge */}
        <circle
          cx={targetX - offset} // Adjusted with offset
          cy={targetY}
          fill="#fff"
          r={13}
          stroke={strokeColor}
          strokeWidth={4}
        />
  
        {/* Delete button (cross) at the center of the edge */}
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
              fontSize: '18px',
            }}
            className="nodrag nopan"
          >
            <button className="edgebutton" onClick={onEdgeClick}>
              ✖
            </button>
          </div>
        </EdgeLabelRenderer>
      </>
    );
  }
  

// Custom connection line for animated dragging behavior
export const CustomConnectionLine = ({ fromX, fromY, toX, toY, fromPosition, toPosition }) => {
  // Use the same Bezier path calculation as in CustomEdge to ensure consistency
  const [edgePath] = getBezierPath({
    sourceX: fromX,
    sourceY: fromY,
    sourcePosition: fromPosition,
    targetX: toX,
    targetY: toY,
    targetPosition: toPosition,
  });

  return (
    <g>
      <path
        className="custom-animated-path"
        d={edgePath}
        style={{
          stroke: '#888',
          strokeWidth: 5,
          fill: 'none',
        }}
      />
      <circle
        cx={toX}
        cy={toY}
        fill="#fff"
        r={5}
        stroke="#888"
        strokeWidth={3}
      />
    </g>
  );
};
