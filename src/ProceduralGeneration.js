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
 * Gets a random shape type and creates the corresponding node data
 */
function getRandomShape() {
  const shapes = [
    { type: 'sphereNode', data: { shape: 'sphere' } },
    { type: 'boxNode', data: { shape: 'box' } },
    { type: 'torusNode', data: { shape: 'torus' } },
    { type: 'capsuleNode', data: { shape: 'capsule' } }
  ];
  return shapes[Math.floor(Math.random() * shapes.length)];
}

/**
 * Gets a random operation mode
 */
function getRandomMode() {
  const modes = ['union', 'subtraction', 'intersection'];
  return modes[Math.floor(Math.random() * modes.length)];
}

/**
 * Decides whether to add a motor (70% chance)
 */
function shouldAddMotor() {
  return Math.random() < 0.7;
}

/**
 * Simple Perlin-like noise function for terrain generation
 */
function simpleNoise(x, z, seed = 12345) {
  // Simple pseudo-random noise based on coordinates
  let value = Math.sin(x * 0.1 + seed) * Math.cos(z * 0.1 + seed * 2);
  value += Math.sin(x * 0.05 + seed * 3) * Math.cos(z * 0.05 + seed * 4) * 0.5;
  value += Math.sin(x * 0.2 + seed * 5) * Math.cos(z * 0.2 + seed * 6) * 0.25;
  return value;
}

/**
 * Get color based on height (terrain-like coloring)
 */
function getTerrainColor(height, isAboveGround) {
  if (isAboveGround) {
    // Above ground - white/snow-like for bumps going up
    if (height > 0.5) {
      return '#f0f8ff'; // Alice blue (subtle snow-like)
    } else {
      return '#e6f3ff'; // Very light blue-white (light snow)
    }
  } else {
    // Below ground - blue tones for areas going down
    if (height < -0.5) {
      return '#4169e1'; // Royal blue for deeper areas
    } else {
      return '#6495ed'; // Cornflower blue for shallow areas
    }
  }
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
 * Generates a simple procedural scene with random shapes and optional motors
 */
export function generateSimpleScene() {
  let nodeId = 1;
  const nodes = [];
  const edges = [];

  // Get two random shapes
  const shape1 = getRandomShape();
  const shape2 = getRandomShape();

  // Generate Shape 1 with its components
  const color1Id = nodeId++;
  const shape1Id = nodeId++;
  let position1Id = nodeId++;

  // Color for shape 1
  nodes.push({
    id: color1Id.toString(),
    type: 'colorNode',
    position: { x: 582, y: -144 },
    data: { color: randomColor() }
  });

  // Position vector for shape 1
  nodes.push({
    id: position1Id.toString(),
    type: 'vectorNode',
    position: { x: 934, y: -144 },
    data: generateRandomVectorData()
  });

  // Shape 1 node
  nodes.push({
    id: shape1Id.toString(),
    type: shape1.type,
    position: { x: 1392, y: -242 },
    data: shape1.data
  });

  // Connect color and position to shape 1
  edges.push({
    id: `e${edges.length + 1}`,
    source: color1Id.toString(),
    target: shape1Id.toString(),
    sourceHandle: 'color',
    targetHandle: 'color'
  });
  edges.push({
    id: `e${edges.length + 1}`,
    source: position1Id.toString(),
    target: shape1Id.toString(),
    sourceHandle: 'vector',
    targetHandle: 'position'
  });

  // Optionally add motors for shape 1
  if (shouldAddMotor()) {
    const sizeMotorId = nodeId++;
    nodes.push({
      id: sizeMotorId.toString(),
      type: 'motorNode',
      position: { x: 578, y: -362 },
      data: generateRandomMotorData()
    });
    edges.push({
      id: `e${edges.length + 1}`,
      source: sizeMotorId.toString(),
      target: shape1Id.toString(),
      sourceHandle: 'vector',
      targetHandle: 'size'
    });
  }

  if (shouldAddMotor()) {
    const rotationMotorId = nodeId++;
    nodes.push({
      id: rotationMotorId.toString(),
      type: 'motorNode',
      position: { x: 584, y: -10 },
      data: generateRandomRotationData()
    });
    edges.push({
      id: `e${edges.length + 1}`,
      source: rotationMotorId.toString(),
      target: shape1Id.toString(),
      sourceHandle: 'vector',
      targetHandle: 'rotation'
    });
  }

  // Generate Shape 2 with its components
  const color2Id = nodeId++;
  const shape2Id = nodeId++;
  const position2Id = nodeId++;

  // Color for shape 2
  nodes.push({
    id: color2Id.toString(),
    type: 'colorNode',
    position: { x: 582, y: 684 },
    data: { color: randomColor() }
  });

  // Position vector for shape 2 (can share position with shape 1 sometimes)
  const sharePosition = Math.random() < 0.3; // 30% chance to share position
  if (!sharePosition) {
    nodes.push({
      id: position2Id.toString(),
      type: 'vectorNode',
      position: { x: 934, y: 684 },
      data: generateRandomVectorData()
    });
  }

  // Shape 2 node
  nodes.push({
    id: shape2Id.toString(),
    type: shape2.type,
    position: { x: 1388, y: 588 },
    data: shape2.data
  });

  // Connect color and position to shape 2
  edges.push({
    id: `e${edges.length + 1}`,
    source: color2Id.toString(),
    target: shape2Id.toString(),
    sourceHandle: 'color',
    targetHandle: 'color'
  });
  edges.push({
    id: `e${edges.length + 1}`,
    source: sharePosition ? position1Id.toString() : position2Id.toString(),
    target: shape2Id.toString(),
    sourceHandle: 'vector',
    targetHandle: 'position'
  });

  // Optionally add motors for shape 2
  if (shouldAddMotor()) {
    const sizeMotorId = nodeId++;
    nodes.push({
      id: sizeMotorId.toString(),
      type: 'motorNode',
      position: { x: 574, y: 468 },
      data: generateRandomMotorData()
    });
    edges.push({
      id: `e${edges.length + 1}`,
      source: sizeMotorId.toString(),
      target: shape2Id.toString(),
      sourceHandle: 'vector',
      targetHandle: 'size'
    });
  }

  if (shouldAddMotor()) {
    const rotationMotorId = nodeId++;
    nodes.push({
      id: rotationMotorId.toString(),
      type: 'motorNode',
      position: { x: 576, y: 814 },
      data: generateRandomRotationData()
    });
    edges.push({
      id: `e${edges.length + 1}`,
      source: rotationMotorId.toString(),
      target: shape2Id.toString(),
      sourceHandle: 'vector',
      targetHandle: 'rotation'
    });
  }

  // Mode node to combine shapes
  const modeId = nodeId++;
  nodes.push({
    id: modeId.toString(),
    type: 'modeNode',
    position: { x: 2034, y: 248 },
    data: { mode: getRandomMode() }
  });

  // Render node
  const renderId = nodeId++;
  nodes.push({
    id: renderId.toString(),
    type: 'renderNode',
    position: { x: 2454, y: 272 },
    data: { label: 'Render', layerId: 'procedural-layer' }
  });

  // Connect shapes to mode and mode to render
  edges.push({
    id: `e${edges.length + 1}`,
    source: shape1Id.toString(),
    target: modeId.toString(),
    sourceHandle: 'render',
    targetHandle: 'shape1'
  });
  edges.push({
    id: `e${edges.length + 1}`,
    source: shape2Id.toString(),
    target: modeId.toString(),
    sourceHandle: 'render',
    targetHandle: 'shapes'
  });
  edges.push({
    id: `e${edges.length + 1}`,
    source: modeId.toString(),
    target: renderId.toString(),
    sourceHandle: 'render',
    targetHandle: 'render'
  });

  console.log(`Generated simple scene: ${nodes.length} nodes, ${edges.length} edges`);
  return { nodes, edges };
}

/**
 * Generates the original simple procedural scene for comparison
 */
export function generateOriginalSimpleScene() {
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
    { id: 'e10', source: '9', target: '10', sourceHandle: 'render', targetHandle: 'shapes' },
    { id: 'e11', source: '10', target: '11', sourceHandle: 'render', targetHandle: 'render' }
  ];
  
  console.log(`Generated simple scene: ${nodes.length} nodes, ${edges.length} edges`);
  return { nodes, edges };
}

/**
 * Generates a more complex scene with 3-4 random shapes and varied motors
 */
export function generateComplexScene() {
  let nodeId = 1;
  const nodes = [];
  const edges = [];
  
  // Generate 3-4 shapes
  const numShapes = randomInt(3, 4);
  const shapes = [];
  const shapeIds = [];
  
  for (let i = 0; i < numShapes; i++) {
    const shape = getRandomShape();
    const shapeId = nodeId++;
    const colorId = nodeId++;
    const positionId = nodeId++;
    
    // Color node
    nodes.push({
      id: colorId.toString(),
      type: 'colorNode',
      position: { x: 582, y: -144 + (i * 400) },
      data: { color: randomColor() }
    });
    
    // Position node (sometimes shared)
    const sharePosition = i > 0 && Math.random() < 0.4; // 40% chance to share position
    let actualPositionId = positionId;
    
    if (!sharePosition) {
      nodes.push({
        id: positionId.toString(),
        type: 'vectorNode',
        position: { x: 934, y: -144 + (i * 400) },
        data: generateRandomVectorData()
      });
    } else {
      // Use a previous position node
      actualPositionId = Math.floor(Math.random() * i) * 3 + 3; // Rough estimate
    }
    
    // Shape node
    nodes.push({
      id: shapeId.toString(),
      type: shape.type,
      position: { x: 1392, y: -242 + (i * 400) },
      data: shape.data
    });
    
    // Connect color and position
    edges.push({
      id: `e${edges.length + 1}`,
      source: colorId.toString(),
      target: shapeId.toString(),
      sourceHandle: 'color',
      targetHandle: 'color'
    });
    edges.push({
      id: `e${edges.length + 1}`,
      source: actualPositionId.toString(),
      target: shapeId.toString(),
      sourceHandle: 'vector',
      targetHandle: 'position'
    });
    
    // Randomly add motors (higher chance for complex scene)
    if (Math.random() < 0.8) { // 80% chance for size motor
      const sizeMotorId = nodeId++;
      nodes.push({
        id: sizeMotorId.toString(),
        type: 'motorNode',
        position: { x: 578, y: -362 + (i * 400) },
        data: generateRandomMotorData()
      });
      edges.push({
        id: `e${edges.length + 1}`,
        source: sizeMotorId.toString(),
        target: shapeId.toString(),
        sourceHandle: 'vector',
        targetHandle: 'size'
      });
    }
    
    if (Math.random() < 0.6) { // 60% chance for rotation motor
      const rotationMotorId = nodeId++;
      nodes.push({
        id: rotationMotorId.toString(),
        type: 'motorNode',
        position: { x: 584, y: -10 + (i * 400) },
        data: generateRandomRotationData()
      });
      edges.push({
        id: `e${edges.length + 1}`,
        source: rotationMotorId.toString(),
        target: shapeId.toString(),
        sourceHandle: 'vector',
        targetHandle: 'rotation'
      });
    }
    
    shapes.push(shape);
    shapeIds.push(shapeId);
  }
  
  // Create mode nodes to combine shapes progressively
  let currentOutputId = shapeIds[0];
  
  for (let i = 1; i < numShapes; i++) {
    const modeId = nodeId++;
    nodes.push({
      id: modeId.toString(),
      type: 'modeNode',
      position: { x: 2034, y: 248 + ((i-1) * 200) },
      data: { mode: getRandomMode() }
    });
    
    // Connect current result and next shape to mode
    edges.push({
      id: `e${edges.length + 1}`,
      source: currentOutputId.toString(),
      target: modeId.toString(),
      sourceHandle: 'render',
      targetHandle: 'shape1'
    });
    edges.push({
      id: `e${edges.length + 1}`,
      source: shapeIds[i].toString(),
      target: modeId.toString(),
      sourceHandle: 'render',
      targetHandle: 'shapes'
    });
    
    currentOutputId = modeId;
  }
  
  // Final render node
  const renderId = nodeId++;
  nodes.push({
    id: renderId.toString(),
    type: 'renderNode',
    position: { x: 2454, y: 272 + ((numShapes-2) * 100) },
    data: { label: 'Render', layerId: 'procedural-complex-layer' }
  });
  
  edges.push({
    id: `e${edges.length + 1}`,
    source: currentOutputId.toString(),
    target: renderId.toString(),
    sourceHandle: 'render',
    targetHandle: 'render'
  });
  
  console.log(`Generated complex scene: ${nodes.length} nodes, ${edges.length} edges, ${numShapes} shapes`);
  return { nodes, edges };
}

/**
 * Generates the original complex scene for comparison
 */
export function generateOriginalComplexScene() {
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
    { id: 'e17', source: '16', target: '17', sourceHandle: 'render', targetHandle: 'shapes' },
    { id: 'e18', source: '17', target: '18', sourceHandle: 'render', targetHandle: 'render' }
  ];
  
  // Combine simple and additional nodes/edges
  const nodes = [...simpleNodes.slice(0, -1), ...additionalNodes]; // Remove the simple render node
  const edges = [...simpleEdges.slice(0, -1), ...additionalEdges]; // Remove the simple render edge
  
  console.log(`Generated complex scene: ${nodes.length} nodes, ${edges.length} edges`);
  return { nodes, edges };
}

/**
 * Generates a single random shape with optional motors - great for quick testing
 */
export function generateRandomSingleShape() {
  let nodeId = 1;
  const nodes = [];
  const edges = [];

  const shape = getRandomShape();
  const shapeId = nodeId++;
  const colorId = nodeId++;
  const positionId = nodeId++;

  // Color node
  nodes.push({
    id: colorId.toString(),
    type: 'colorNode',
    position: { x: 582, y: 200 },
    data: { color: randomColor() }
  });

  // Position node
  nodes.push({
    id: positionId.toString(),
    type: 'vectorNode',
    position: { x: 934, y: 200 },
    data: generateRandomVectorData()
  });

  // Shape node
  nodes.push({
    id: shapeId.toString(),
    type: shape.type,
    position: { x: 1392, y: 200 },
    data: shape.data
  });

  // Basic connections
  edges.push({
    id: `e${edges.length + 1}`,
    source: colorId.toString(),
    target: shapeId.toString(),
    sourceHandle: 'color',
    targetHandle: 'color'
  });
  edges.push({
    id: `e${edges.length + 1}`,
    source: positionId.toString(),
    target: shapeId.toString(),
    sourceHandle: 'vector',
    targetHandle: 'position'
  });

  // Always add at least one motor for single shapes to make them interesting
  const sizeMotorId = nodeId++;
  nodes.push({
    id: sizeMotorId.toString(),
    type: 'motorNode',
    position: { x: 578, y: 50 },
    data: generateRandomMotorData()
  });
  edges.push({
    id: `e${edges.length + 1}`,
    source: sizeMotorId.toString(),
    target: shapeId.toString(),
    sourceHandle: 'vector',
    targetHandle: 'size'
  });

  // 70% chance for rotation motor too
  if (Math.random() < 0.7) {
    const rotationMotorId = nodeId++;
    nodes.push({
      id: rotationMotorId.toString(),
      type: 'motorNode',
      position: { x: 584, y: 350 },
      data: generateRandomRotationData()
    });
    edges.push({
      id: `e${edges.length + 1}`,
      source: rotationMotorId.toString(),
      target: shapeId.toString(),
      sourceHandle: 'vector',
      targetHandle: 'rotation'
    });
  }

  // Mode node (union for single shape - some renderers require this)
  const modeId = nodeId++;
  nodes.push({
    id: modeId.toString(),
    type: 'modeNode',
    position: { x: 1600, y: 200 },
    data: { mode: 'union' }
  });

  // Render node
  const renderId = nodeId++;
  nodes.push({
    id: renderId.toString(),
    type: 'renderNode',
    position: { x: 1900, y: 200 },
    data: { label: 'Render', layerId: 'single-shape-layer' }
  });

  // Connect shape to mode, then mode to render
  edges.push({
    id: `e${edges.length + 1}`,
    source: shapeId.toString(),
    target: modeId.toString(),
    sourceHandle: 'render',
    targetHandle: 'shape1'
  });
  edges.push({
    id: `e${edges.length + 1}`,
    source: modeId.toString(),
    target: renderId.toString(),
    sourceHandle: 'render',
    targetHandle: 'render'
  });

  console.log(`Generated single ${shape.type}: ${nodes.length} nodes, ${edges.length} edges`);
  return { nodes, edges };
}

/**
 * Generates a procedural terrain using Perlin noise
 */
export function generateProceduralTerrain() {
  let nodeId = 1;
  const nodes = [];
  const edges = [];
  
  // Base plane (20x8x20, brown ground - 2x bigger on all axes)
  const basePlaneId = nodeId++;
  const basePlaneColorId = nodeId++;
  const basePlaneVectorId = nodeId++;
  const basePlaneSizeId = nodeId++;
  
  // Base plane components - positioned above the shape grid
  
  // Base plane size (20x1x20 - much thinner)
  nodes.push({
    id: basePlaneSizeId.toString(),
    type: 'vectorNode',
    position: { x: 700, y: -600 },
    data: { x: 20, y: 1, z: 20 }
  });
  
  // Base plane position
  nodes.push({
    id: basePlaneVectorId.toString(),
    type: 'vectorNode',
    position: { x: 950, y: -600 },
    data: { x: 0, y: 0, z: 0 }
  });
  
  // Base plane color (green ground)
  nodes.push({
    id: basePlaneColorId.toString(),
    type: 'colorNode',
    position: { x: 1200, y: -600 },
    data: { color: '#228b22' } // Forest green
  });
  
  // Base plane (box) - positioned to connect easily
  nodes.push({
    id: basePlaneId.toString(),
    type: 'boxNode',
    position: { x: 1450, y: -600 },
    data: { shape: 'box' }
  });
  
  // Connect base plane components
  edges.push({
    id: `e${edges.length + 1}`,
    source: basePlaneColorId.toString(),
    target: basePlaneId.toString(),
    sourceHandle: 'color',
    targetHandle: 'color'
  });
  edges.push({
    id: `e${edges.length + 1}`,
    source: basePlaneVectorId.toString(),
    target: basePlaneId.toString(),
    sourceHandle: 'vector',
    targetHandle: 'position'
  });
  edges.push({
    id: `e${edges.length + 1}`,
    source: basePlaneSizeId.toString(),
    target: basePlaneId.toString(),
    sourceHandle: 'vector',
    targetHandle: 'size'
  });
  
  // Generate 9 shapes in 3x3 grid with Perlin noise heights
  const gridSize = 3;
  const spacing = 8; // Distance between shapes (adjusted for 20x20 plane)
  const maxHeight = 1; // Small bumps: max 1 unit above/below surface
  const seed = Math.random() * 10000;
  
  const aboveGroundShapes = [];
  const belowGroundShapes = [];
  
  for (let x = 0; x < gridSize; x++) {
    for (let z = 0; z < gridSize; z++) {
      const worldX = (x - 1) * spacing; // Center around 0, fits within -8 to +8 (20 wide)
      const worldZ = (z - 1) * spacing; // Center around 0, fits within -8 to +8 (20 deep)
      
      // Get noise height - small bumps only
      const noiseHeight = simpleNoise(worldX, worldZ, seed);
      const clampedHeight = Math.max(-maxHeight, Math.min(maxHeight, noiseHeight * 1.5));
      
      const isAboveGround = clampedHeight > 0;
      const shapeType = getRandomShape();
      
      // Create shape components
      const shapeId = nodeId++;
      const colorId = nodeId++;
      const positionId = nodeId++;
      const sizeId = nodeId++;
      
      // Color based on terrain
      const terrainColor = getTerrainColor(clampedHeight, isAboveGround);
      
      // Organize each shape group in a clean 2x2 grid layout
      const baseX = 700 + x * 600; // 600px horizontal spacing between shape groups
      const baseY = 50 + z * 550;  // 550px vertical spacing between rows
      
      // Size vector (top-left) - 1x1x1 cubes
      nodes.push({
        id: sizeId.toString(),
        type: 'vectorNode',
        position: { x: baseX, y: baseY },
        data: { x: 1, y: 1, z: 1 } // Small 1x1x1 bumps
      });
      
      // Color node (bottom-left) 
      nodes.push({
        id: colorId.toString(),
        type: 'colorNode',
        position: { x: baseX, y: baseY + 230 },
        data: { color: terrainColor }
      });
      
      // Position vector (top-right)
      nodes.push({
        id: positionId.toString(),
        type: 'vectorNode',
        position: { x: baseX + 250, y: baseY },
        data: { x: worldX, y: clampedHeight, z: worldZ }
      });
      
      // Shape node (bottom-right, larger)
      nodes.push({
        id: shapeId.toString(),
        type: shapeType.type,
        position: { x: baseX + 250, y: baseY + 140 },
        data: shapeType.data
      });
      
      // Connect shape components
      edges.push({
        id: `e${edges.length + 1}`,
        source: colorId.toString(),
        target: shapeId.toString(),
        sourceHandle: 'color',
        targetHandle: 'color'
      });
      edges.push({
        id: `e${edges.length + 1}`,
        source: positionId.toString(),
        target: shapeId.toString(),
        sourceHandle: 'vector',
        targetHandle: 'position'
      });
      edges.push({
        id: `e${edges.length + 1}`,
        source: sizeId.toString(),
        target: shapeId.toString(),
        sourceHandle: 'vector',
        targetHandle: 'size'
      });
      
      // Categorize shapes
      if (isAboveGround) {
        aboveGroundShapes.push(shapeId);
      } else {
        belowGroundShapes.push(shapeId);
      }
    }
  }
  
  // Create subtraction mode node for below-ground shapes
  const subtractionModeId = nodeId++;
  nodes.push({
    id: subtractionModeId.toString(),
    type: 'modeNode',
    position: { x: 2600, y: 300 },
    data: { mode: 'subtraction' }
  });
  
  // Connect base plane to subtraction mode (Base handle)
  edges.push({
    id: `e${edges.length + 1}`,
    source: basePlaneId.toString(),
    target: subtractionModeId.toString(),
    sourceHandle: 'render',
    targetHandle: 'shape1'
  });
  
  // Connect below-ground shapes to subtraction mode (Operations handle)
  belowGroundShapes.forEach(shapeId => {
    edges.push({
      id: `e${edges.length + 1}`,
      source: shapeId.toString(),
      target: subtractionModeId.toString(),
      sourceHandle: 'render',
      targetHandle: 'shapes'
    });
  });
  
  // Create union mode node for above-ground shapes (chained after subtraction)
  let finalOutputId = subtractionModeId;
  
  if (aboveGroundShapes.length > 0) {
    const unionModeId = nodeId++;
    nodes.push({
      id: unionModeId.toString(),
      type: 'modeNode',
      position: { x: 2850, y: 300 },
      data: { mode: 'union' }
    });
    
    // Connect subtraction result to union mode (Base handle)
    edges.push({
      id: `e${edges.length + 1}`,
      source: subtractionModeId.toString(),
      target: unionModeId.toString(),
      sourceHandle: 'render',
      targetHandle: 'shape1'
    });
    
    // Connect above-ground shapes to union mode (Operations handle)
    aboveGroundShapes.forEach(shapeId => {
      edges.push({
        id: `e${edges.length + 1}`,
        source: shapeId.toString(),
        target: unionModeId.toString(),
        sourceHandle: 'render',
        targetHandle: 'shapes'
      });
    });
    
    finalOutputId = unionModeId;
  }
  
  // Final render node
  const renderId = nodeId++;
  nodes.push({
    id: renderId.toString(),
    type: 'renderNode',
    position: { x: 3100, y: 300 },
    data: { label: 'Render', layerId: 'terrain-layer' }
  });
  
  edges.push({
    id: `e${edges.length + 1}`,
    source: finalOutputId.toString(),
    target: renderId.toString(),
    sourceHandle: 'render',
    targetHandle: 'render'
  });
  
  console.log(`Generated procedural terrain: ${nodes.length} nodes, ${edges.length} edges`);
  console.log(`Above ground shapes: ${aboveGroundShapes.length}, Below ground: ${belowGroundShapes.length}`);
  return { nodes, edges };
}

/**
 * Generates random variations of existing scene with shape changes
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
    } else if (['sphereNode', 'boxNode', 'torusNode', 'capsuleNode'].includes(node.type)) {
      // Sometimes change the shape type entirely
      if (Math.random() < 0.4) { // 40% chance to change shape
        const newShape = getRandomShape();
        variations.push({
          ...node,
          type: newShape.type,
          data: newShape.data
        });
      } else {
        variations.push(node);
      }
    } else if (node.type === 'modeNode') {
      // Sometimes change the operation mode
      if (Math.random() < 0.4) { // 40% chance to change mode
        variations.push({
          ...node,
          data: { ...node.data, mode: getRandomMode() }
        });
      } else {
        variations.push(node);
      }
    } else {
      variations.push(node);
    }
  });
  
  return variations;
}