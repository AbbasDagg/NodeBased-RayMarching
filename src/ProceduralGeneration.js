// ProceduralGeneration.js - Basic procedural generation for raymarching scenes

/**
 * Generates a random number between min and max
 */
function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Generates a random integer between min and max (inclusive)
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generates a random color in hex format
 */
function randomColor() {
  const colors = [
    '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff',
    '#ff8000', '#8000ff', '#ff0080', '#80ff00', '#0080ff', '#ff8080',
    '#80ff80', '#8080ff', '#ffffff', '#000000', '#808080'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Generates random motor node data
 */
function generateRandomMotorData() {
  const baseScale = randomRange(0.5, 3.0);
  const scaleVariation = randomRange(0.1, 1.0);
  
  return {
    xRange: { 
      min: baseScale + scaleVariation, 
      max: baseScale - scaleVariation, 
      step: 0 
    },
    yRange: { 
      min: baseScale + scaleVariation, 
      max: baseScale - scaleVariation, 
      step: 0 
    },
    zRange: { 
      min: baseScale + scaleVariation, 
      max: baseScale - scaleVariation, 
      step: 0 
    }
  };
}

/**
 * Generates random rotation motor data
 */
function generateRandomRotationData() {
  return {
    xRange: { min: 0, max: randomInt(0, 360), step: 1 },
    yRange: { min: 0, max: randomInt(0, 360), step: 1 },
    zRange: { min: 0, max: randomInt(0, 360), step: 1 }
  };
}

/**
 * Generates random vector position data
 */
function generateRandomVectorData() {
  return {
    x: randomRange(-5, 5),
    y: randomRange(-3, 3),
    z: randomRange(-3, 3)
  };
}

/**
 * Generates a simple procedural scene using the exact structure of working nodes
 */
export function generateSimpleScene() {
  // Create a very simple scene based on your working initial nodes
  const nodes = [
    // Color Node for Box
    { 
      id: '1', 
      type: 'colorNode', 
      position: { x: 582, y: -144 }, 
      data: { color: randomColor() } 
    },
    
    // Color Node for Sphere  
    { 
      id: '2', 
      type: 'colorNode', 
      position: { x: 582, y: 684 }, 
      data: { color: randomColor() } 
    },
    
    // Motor Node for Box scale
    { 
      id: '3', 
      type: 'motorNode', 
      position: { x: 578, y: -362 }, 
      data: generateRandomMotorData()
    },
    
    // Motor Node for Sphere scale
    { 
      id: '4', 
      type: 'motorNode', 
      position: { x: 574, y: 468 }, 
      data: generateRandomMotorData()
    },
    
    // Motor Node for Box rotation
    { 
      id: '5', 
      type: 'motorNode', 
      position: { x: 584, y: -10 }, 
      data: generateRandomRotationData()
    },

    // Motor Node for Sphere rotation
    { 
      id: '6', 
      type: 'motorNode', 
      position: { x: 576, y: 814 }, 
      data: generateRandomRotationData()
    },
    
    // Vector Node for Position
    { 
      id: '7', 
      type: 'vectorNode', 
      position: { x: 934, y: 202 }, 
      data: generateRandomVectorData()
    },

    // Box Node (Shape 1)
    { 
      id: '8', 
      type: 'boxNode', 
      position: { x: 1392, y: -242 }, 
      data: { shape: 'box' } 
    },
    
    // Sphere Node (Shape 2)
    { 
      id: '9', 
      type: 'sphereNode', 
      position: { x: 1388, y: 588 }, 
      data: { shape: 'sphere' } 
    },
    
    // Mode Node for operation
    { 
      id: '10', 
      type: 'modeNode', 
      position: { x: 2034, y: 248 }, 
      data: { mode: 'subtraction' } 
    },
    
    // Render Node
    { 
      id: '11', 
      type: 'renderNode', 
      position: { x: 2454, y: 272 }, 
      data: { label: 'Render', layerId: 'procedural-layer' } 
    }
  ];

  const edges = [
    // Box connections
    { id: 'e1', source: '1', target: '8', sourceHandle: 'color', targetHandle: 'color' },
    { id: 'e3', source: '3', target: '8', sourceHandle: 'vector', targetHandle: 'size' },
    { id: 'e5', source: '5', target: '8', sourceHandle: 'vector', targetHandle: 'rotation' },
    { id: 'e7', source: '7', target: '8', sourceHandle: 'vector', targetHandle: 'position' },
    
    // Sphere connections
    { id: 'e2', source: '2', target: '9', sourceHandle: 'color', targetHandle: 'color' },
    { id: 'e4', source: '4', target: '9', sourceHandle: 'vector', targetHandle: 'size' },
    { id: 'e6', source: '6', target: '9', sourceHandle: 'vector', targetHandle: 'rotation' },
    { id: 'e8', source: '7', target: '9', sourceHandle: 'vector', targetHandle: 'position' },
    
    // Mode and render connections
    { id: 'e9', source: '8', target: '10', sourceHandle: 'render', targetHandle: 'shape1' },
    { id: 'e10', source: '9', target: '10', sourceHandle: 'render', targetHandle: 'shape2' },
    { id: 'e11', source: '10', target: '11', sourceHandle: 'render', targetHandle: 'render' }
  ];
  
  console.log(`Generated simple scene: ${nodes.length} nodes, ${edges.length} edges`);
  return { nodes, edges };
}

/**
 * Generates a more complex scene by extending the simple scene
 */
export function generateComplexScene() {
  // Start with the simple scene and add more shapes
  const { nodes: simpleNodes, edges: simpleEdges } = generateSimpleScene();
  
  // Add additional shapes to make it more complex
  const additionalNodes = [
    // Color Node for Torus
    { 
      id: '12', 
      type: 'colorNode', 
      position: { x: 628, y: 1540 }, 
      data: { color: randomColor() } 
    },

    // Motor Node for Torus scale
    { 
      id: '13', 
      type: 'motorNode', 
      position: { x: 626, y: 1310 }, 
      data: generateRandomMotorData()
    },

    // Motor Node for Torus rotation
    { 
      id: '14', 
      type: 'motorNode', 
      position: { x: 618, y: 1684 }, 
      data: generateRandomRotationData()
    },
    
    // Vector Node for Position
    { 
      id: '15', 
      type: 'vectorNode', 
      position: { x: 966, y: 1534 }, 
      data: generateRandomVectorData()
    },

    // Torus Node (Shape 3)
    { 
      id: '16', 
      type: 'torusNode', 
      position: { x: 1446, y: 1448 }, 
      data: { shape: 'torus' } 
    },
    
    // Mode Node for second operation
    { 
      id: '17', 
      type: 'modeNode', 
      position: { x: 2004, y: 1072 }, 
      data: { mode: 'union' } 
    },
    
    // Final Render Node
    { 
      id: '18', 
      type: 'renderNode', 
      position: { x: 2482, y: 1102 }, 
      data: { label: 'Render', layerId: 'procedural-complex-layer' } 
    }
  ];

  const additionalEdges = [
    // Torus connections
    { id: 'e12', source: '12', target: '16', sourceHandle: 'color', targetHandle: 'color' },
    { id: 'e13', source: '13', target: '16', sourceHandle: 'vector', targetHandle: 'size' },
    { id: 'e14', source: '14', target: '16', sourceHandle: 'vector', targetHandle: 'rotation' },
    { id: 'e15', source: '15', target: '16', sourceHandle: 'vector', targetHandle: 'position' },
    
    // Connect first mode result and torus to second mode
    { id: 'e16', source: '10', target: '17', sourceHandle: 'render', targetHandle: 'shape1' },
    { id: 'e17', source: '16', target: '17', sourceHandle: 'render', targetHandle: 'shape2' },
    { id: 'e18', source: '17', target: '18', sourceHandle: 'render', targetHandle: 'render' }
  ];
  
  // Combine simple and additional nodes/edges
  const nodes = [...simpleNodes.slice(0, -1), ...additionalNodes]; // Remove the simple render node
  const edges = [...simpleEdges.slice(0, -1), ...additionalEdges]; // Remove the simple render edge
  
  console.log(`Generated complex scene: ${nodes.length} nodes, ${edges.length} edges`);
  return { nodes, edges };
}

/**
 * Generates random variations of existing scene
 */
export function generateVariations(existingNodes) {
  const variations = [];
  
  existingNodes.forEach(node => {
    if (node.type === 'colorNode') {
      variations.push({
        ...node,
        data: { ...node.data, color: randomColor() }
      });
    } else if (node.type === 'motorNode') {
      variations.push({
        ...node,
        data: generateRandomMotorData()
      });
    } else if (node.type === 'vectorNode') {
      variations.push({
        ...node,
        data: generateRandomVectorData()
      });
    } else {
      variations.push(node);
    }
  });
  
  return variations;
}