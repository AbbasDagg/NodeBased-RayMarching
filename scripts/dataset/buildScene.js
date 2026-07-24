// Random scene generator for the dataset-automation pipeline (scripts/dataset/capture.js).
//
// Building blocks: sphere and box ONLY, each with a random size, random color,
// and a random position confined to a 10x10 window in front of the default
// camera so every generated shape stays on-screen. Rotation is randomized
// unless `randomizeRotation: false` is passed (capture.js exposes this as
// --rotation off, writing to a separate data/scenes|images/no-rotation folder
// so the two variants don't mix). Shapes are combined with UNION ONLY (no
// subtraction/intersection). (Sphere rotation is visually a no-op —
// rotationally symmetric — but the ground-truth JSON still records it, same
// as it would for a real object.)
//
// Each shape node carries its position/rotation/scale/color directly in
// `data` (configured mode). shapeCompute (src/graph/nodeTypes.js) only reads
// upstream Vector/Color-node values from the `*-configured` pins when an edge
// actually targets them — with no such edges, it falls back to node.data
// as-is, so this is a fully-supported path, not a hack. This also sidesteps
// a real bug in src/ProceduralGeneration.js, which wires vector/color nodes to
// targetHandle 'position'/'size'/'color' — but shape nodes only listen on
// 'position-configured'/'size-configured'/'color-configured', so those edges
// are silently dead and every procedurally-generated shape there actually
// renders at the origin with default scale/color regardless of the vector/
// color nodes. Verified directly against CustomNodes.js Handle ids before
// writing this, specifically to avoid inheriting that bug here.
//
// Multiple shapes are combined via a chain of modeNode(mode:'union') exactly
// like the shipped "Generate Complex Scene" button (mode1(shape0,shape1),
// mode2(mode1,shape2), ...) rather than fanning multiple edges into one
// modeNode's `shapes` handle — GraphManager supports the latter too, but the
// chained form is the one already exercised by a shipped, user-facing feature.

'use strict';

function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Saturated-but-visible random color (HSL avoids near-black/near-white so
// shapes stay legible against the app's dark background and env-lit surfaces).
function randomColorHex() {
  const h = randomRange(0, 360);
  const s = randomRange(55, 95);
  const l = randomRange(45, 70);
  return hslToHex(h, s, l);
}

function hslToHex(h, s, l) {
  const sN = s / 100;
  const lN = l / 100;
  const c = (1 - Math.abs(2 * lN - 1)) * sN;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lN - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  const toHex = (v) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// 10x10 window in XY (the visible plane facing the default camera); Z kept
// shallow so shapes stay in front of the camera and don't stack too deep.
const POSITION_HALF = { x: 5, y: 5, z: 2 };
// Bumped up from the original 0.6-2.2: at the default camera distance, shapes
// in that range rendered as small, pixelated dots relative to the frame.
const SCALE_RANGE = { min: 1.2, max: 3.2 };

function randomPosition() {
  return {
    x: randomRange(-POSITION_HALF.x, POSITION_HALF.x),
    y: randomRange(-POSITION_HALF.y, POSITION_HALF.y),
    z: randomRange(-POSITION_HALF.z, POSITION_HALF.z),
  };
}

function randomScale() {
  return {
    x: randomRange(SCALE_RANGE.min, SCALE_RANGE.max),
    y: randomRange(SCALE_RANGE.min, SCALE_RANGE.max),
    z: randomRange(SCALE_RANGE.min, SCALE_RANGE.max),
  };
}

// Degrees, matching composePRS's expectation and the app's own rotation UI
// convention (Motor node rotation ranges are also 0-360 degrees).
function randomRotation() {
  return {
    x: randomRange(0, 360),
    y: randomRange(0, 360),
    z: randomRange(0, 360),
  };
}

const SHAPE_TYPES = ['sphere', 'box'];

function randomShapeType() {
  return SHAPE_TYPES[randomInt(0, SHAPE_TYPES.length - 1)];
}

// One shape node, fully self-contained (no Vector/Color/Motor nodes needed).
function makeShapeNode(id, layoutPosition, randomizeRotation) {
  const shape = randomShapeType();
  return {
    id,
    type: `${shape}Node`,
    position: layoutPosition, // ReactFlow canvas layout position — cosmetic only
    data: {
      shape,
      position: randomPosition(),
      rotation: randomizeRotation ? randomRotation() : { x: 0, y: 0, z: 0 },
      scale: randomScale(),
      color: randomColorHex(),
    },
  };
}

// Generates one random scene of `count` sphere/box primitives combined with
// union only. Returns { nodes, edges, primitives } — nodes/edges import
// directly into the app (matches its own export format); `primitives` is the
// same per-shape ground truth flattened out for convenience (position,
// rotation, scale, color per shape) so a training script doesn't need to
// re-parse the graph to recover labels.
function generateRandomUnionScene({ minShapes = 2, maxShapes = 6, randomizeRotation = true } = {}) {
  const count = randomInt(minShapes, maxShapes);
  const nodes = [];
  const edges = [];
  let nodeIdCounter = 1;
  let edgeIdCounter = 1;
  const nextNodeId = () => String(nodeIdCounter++);
  const nextEdgeId = () => `e${edgeIdCounter++}`;

  const shapeIds = [];
  for (let i = 0; i < count; i++) {
    const id = nextNodeId();
    nodes.push(makeShapeNode(id, { x: 200, y: i * 300 }, randomizeRotation));
    shapeIds.push(id);
  }

  // Chain shapes together: mode1(shape0, shape1), mode2(mode1, shape2), ...
  let currentOutputId = shapeIds[0];
  for (let i = 1; i < count; i++) {
    const modeId = nextNodeId();
    nodes.push({
      id: modeId,
      type: 'modeNode',
      position: { x: 900, y: (i - 1) * 250 },
      data: { mode: 'union' },
    });
    edges.push({ id: nextEdgeId(), source: currentOutputId, target: modeId, sourceHandle: 'render', targetHandle: 'shape1' });
    edges.push({ id: nextEdgeId(), source: shapeIds[i], target: modeId, sourceHandle: 'render', targetHandle: 'shapes' });
    currentOutputId = modeId;
  }

  // A lone shape still routes through one modeNode(union) — mirrors
  // generateRandomSingleShape()'s "some renderers require this" handling.
  if (count === 1) {
    const modeId = nextNodeId();
    nodes.push({ id: modeId, type: 'modeNode', position: { x: 900, y: 0 }, data: { mode: 'union' } });
    edges.push({ id: nextEdgeId(), source: shapeIds[0], target: modeId, sourceHandle: 'render', targetHandle: 'shape1' });
    currentOutputId = modeId;
  }

  const renderId = nextNodeId();
  nodes.push({
    id: renderId,
    type: 'renderNode',
    position: { x: 1500, y: 0 },
    data: { label: 'Render', layerId: 'dataset-layer' },
  });
  edges.push({ id: nextEdgeId(), source: currentOutputId, target: renderId, sourceHandle: 'render', targetHandle: 'render' });

  const primitives = nodes
    .filter((n) => n.type === 'sphereNode' || n.type === 'boxNode')
    .map((n) => ({
      shape: n.data.shape,
      position: n.data.position,
      rotation: n.data.rotation,
      scale: n.data.scale,
      color: n.data.color,
    }));

  return { nodes, edges, primitives, shapeCount: count };
}

module.exports = {
  generateRandomUnionScene,
  randomColorHex,
  randomPosition,
  randomScale,
  POSITION_HALF,
  SCALE_RANGE,
};
