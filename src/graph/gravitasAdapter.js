import { composePRS, invertMatrix4 } from './sdfAst';

// Extended gravitas adapter with full matrix support: pack shape type, color, scale, and inverse matrix per object.
// Each object uses 6 texels:
//   Texel [6*i]:     [pos.x, pos.y, pos.z, shape_type]
//   Texel [6*i + 1]: [color.r, color.g, color.b, radius]
//   Texel [6*i + 2]: [m[0], m[1], m[2], m[3]] (inverse matrix row 0)
//   Texel [6*i + 3]: [m[4], m[5], m[6], m[7]] (inverse matrix row 1)
//   Texel [6*i + 4]: [m[8], m[9], m[10], m[11]] (inverse matrix row 2)
//   Texel [6*i + 5]: [m[12], m[13], m[14], m[15]] (inverse matrix row 3)

const SHAPE_TYPE_BOX = 0.0;
const SHAPE_TYPE_CAPSULE = 1.0;
const SHAPE_TYPE_SPHERE = 2.0;
const SHAPE_TYPE_TORUS = 3.0;

const OP_UNION = 0;
const OP_SUBTRACTION = 1;
const OP_INTERSECTION = 2;

const IDENTITY_MATRIX = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];

function getShapeTypeCode(shapeStr) {
  if (typeof shapeStr === 'number' && Number.isFinite(shapeStr)) {
    return shapeStr;
  }
  switch (shapeStr) {
    case 'box': return SHAPE_TYPE_BOX;
    case 'capsule': return SHAPE_TYPE_CAPSULE;
    case 'sphere': return SHAPE_TYPE_SPHERE;
    case 'torus': return SHAPE_TYPE_TORUS;
    default: return SHAPE_TYPE_SPHERE;
  }
}

function encodeColor(colorNum) {
  // Convert 0xRRGGBB to normalized [r, g, b]
  const r = ((colorNum >> 16) & 0xff) / 255.0;
  const g = ((colorNum >> 8) & 0xff) / 255.0;
  const b = (colorNum & 0xff) / 255.0;
  return [r, g, b];
}

function getOperationCode(opStr) {
  switch (opStr) {
    case 'subtraction': return OP_SUBTRACTION;
    case 'intersection': return OP_INTERSECTION;
    case 'union':
    default:
      return OP_UNION;
  }
}

function buildLayout(nodes) {
  // Each node uses 6 texels; layout maps object id to texel offset
  const layout = new Map();
  for (let i = 0; i < nodes.length; i++) {
    layout.set(nodes[i].id, { texelOffset: i * 6, materialId: i });
  }
  return layout;
}

function encodeScene(nodes, layout) {
  // 6 texels per object = 24 floats per object
  const count = nodes.length * 24;
  const arr = new Float32Array(count);
  
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const texelOffset = i * 6;
    
    // Texel [6*i]: position + shape type
    const base0 = texelOffset * 4;
    const pos = n.position || { x: 0, y: 0, z: 0 };
    const shapeType = getShapeTypeCode(n.type);
    arr[base0 + 0] = pos.x || 0;
    arr[base0 + 1] = pos.y || 0;
    arr[base0 + 2] = pos.z || 0;
    arr[base0 + 3] = shapeType;
    
    // Texel [6*i + 1]: color + radius
    const base1 = (texelOffset + 1) * 4;
    const [r, g, b] = encodeColor(n.color || 0xffffff);
    const radius = n.radius !== undefined ? n.radius : (n.scale ? Math.max(n.scale.x, n.scale.y, n.scale.z) * 0.5 : 1.0);
    arr[base1 + 0] = r;
    arr[base1 + 1] = g;
    arr[base1 + 2] = b;
    arr[base1 + 3] = radius;
    
    // Texels [6*i + 2] through [6*i + 5]: inverse matrix (4 rows).
    // AST-compiled configured shapes can lack inverseMatrix; in that case we
    // synthesize full PRS inverse so rotation and scale still affect Gravitas.
    const synthesizedInv = invertMatrix4(composePRS({
      position: n.position || { x: 0, y: 0, z: 0 },
      rotation: n.rotation || { x: 0, y: 0, z: 0 },
      scale: n.scale || { x: 1, y: 1, z: 1 },
    }));
    const invMat = n.inverseMatrix || synthesizedInv || IDENTITY_MATRIX;
    for (let row = 0; row < 4; row++) {
      const baseRow = (texelOffset + 2 + row) * 4;
      for (let col = 0; col < 4; col++) {
        arr[baseRow + col] = invMat[row * 4 + col];
      }
    }
  }
  return arr;
}

function generateMapGLSL(nodes, layout) {
  // Generate grav_map(vec3 p) with unrolled object blocks.
  // Some drivers are flaky with dynamic texelFetch indexing in loops.
  // Using compile-time texel coordinates keeps this path robust.
  const lines = [];
  lines.push('// Generated mapGLSL (gravitas-adapter with matrix support)');
  lines.push('// Returns: vec2(distance, material_index_as_float)');
  lines.push('float gravOpUnion(float a, float b, float k) {');
  lines.push('  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);');
  lines.push('  return mix(b, a, h) - k * h * (1.0 - h);');
  lines.push('}');
  lines.push('float gravOpSub(float a, float b, float k) {');
  lines.push('  float h = clamp(0.5 - 0.5 * (a + b) / k, 0.0, 1.0);');
  lines.push('  return mix(a, -b, h) + k * h * (1.0 - h);');
  lines.push('}');
  lines.push('float gravOpInter(float a, float b, float k) {');
  lines.push('  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);');
  lines.push('  return mix(a, b, h) + k * h * (1.0 - h);');
  lines.push('}');
  lines.push('vec2 grav_map(vec3 p) {');
  lines.push('  vec2 res = vec2(1e10, 0.0);');
  lines.push('  float blendK = 0.5;');
  nodes.forEach((n, i) => {
    const baseTexel = i * 6;
    const op = getOperationCode(n.operation);
    lines.push(`  // Object ${i}`);
    lines.push(`  vec4 posAndShape_${i} = texelFetch(uSceneData, ivec2(${baseTexel}, 0), 0);`);
    lines.push(`  vec4 colorAndRadius_${i} = texelFetch(uSceneData, ivec2(${baseTexel + 1}, 0), 0);`);
    lines.push(`  vec4 r0_${i} = texelFetch(uSceneData, ivec2(${baseTexel + 2}, 0), 0);`);
    lines.push(`  vec4 r1_${i} = texelFetch(uSceneData, ivec2(${baseTexel + 3}, 0), 0);`);
    lines.push(`  vec4 r2_${i} = texelFetch(uSceneData, ivec2(${baseTexel + 4}, 0), 0);`);
    lines.push(`  vec4 r3_${i} = texelFetch(uSceneData, ivec2(${baseTexel + 5}, 0), 0);`);
    lines.push(`  vec4 hp_${i} = vec4(p, 1.0);`);
    // Support both row-major (translation in r0.w/r1.w/r2.w) and
    // column-major-like packing (translation in r3.xyz).
    lines.push(`  vec3 p_local_row_${i} = vec3(dot(r0_${i}, hp_${i}), dot(r1_${i}, hp_${i}), dot(r2_${i}, hp_${i}));`);
    lines.push(`  vec3 p_local_col_${i} = vec3(`);
    lines.push(`    r0_${i}.x * p.x + r1_${i}.x * p.y + r2_${i}.x * p.z + r3_${i}.x,`);
    lines.push(`    r0_${i}.y * p.x + r1_${i}.y * p.y + r2_${i}.y * p.z + r3_${i}.y,`);
    lines.push(`    r0_${i}.z * p.x + r1_${i}.z * p.y + r2_${i}.z * p.z + r3_${i}.z`);
    lines.push(`  );`);
    lines.push(`  float t_row_${i} = abs(r0_${i}.w) + abs(r1_${i}.w) + abs(r2_${i}.w);`);
    lines.push(`  float t_col_${i} = abs(r3_${i}.x) + abs(r3_${i}.y) + abs(r3_${i}.z);`);
    lines.push(`  vec3 p_local_${i} = (t_col_${i} > t_row_${i}) ? p_local_col_${i} : p_local_row_${i};`);
    lines.push(`  int shapeType_${i} = int(round(posAndShape_${i}.w));`);
    lines.push(`  float radius_${i} = max(colorAndRadius_${i}.w, 0.001);`);
    lines.push(`  float dist_${i} = 1e10;`);
    lines.push(`  if (shapeType_${i} == 0) {`);
    lines.push(`    dist_${i} = sdBox(p_local_${i}, vec3(0.5) - vec3(0.1)) - 0.1;`);
    lines.push(`  } else if (shapeType_${i} == 1) {`);
    lines.push(`    dist_${i} = sdCapsule(p_local_${i}, vec3(0.5));`);
    lines.push(`  } else if (shapeType_${i} == 2) {`);
    lines.push(`    dist_${i} = sdEllipsoid(p_local_${i}, vec3(0.5));`);
    lines.push(`  } else if (shapeType_${i} == 3) {`);
    lines.push(`    dist_${i} = sdTorus(p_local_${i}, vec2(0.5));`);
    lines.push('  } else {');
    lines.push(`    dist_${i} = sdSphere(p_local_${i}, radius_${i});`);
    lines.push('  }');
    if (i === 0) {
      lines.push(`  res = vec2(dist_${i}, 0.0);`);
    } else {
      lines.push(`  float before_${i} = res.x;`);
      if (op === OP_SUBTRACTION) {
        lines.push(`  res.x = gravOpSub(res.x, dist_${i}, blendK);`);
      } else if (op === OP_INTERSECTION) {
        lines.push(`  res.x = gravOpInter(res.x, dist_${i}, blendK);`);
      } else {
        lines.push(`  res.x = gravOpUnion(res.x, dist_${i}, blendK);`);
      }
      lines.push(`  if (abs(dist_${i}) <= abs(before_${i})) res.y = ${i}.0;`);
    }
  });
  lines.push('  return res;');
  lines.push('}');
  return lines.join('\n');
}

export function buildGravitasRuntimePacketFromShapes(shapes, previousPacket = null) {
  if (!shapes || shapes.length === 0) return null;
  
  // Convert shapes to extended node format with full metadata
  const nodes = shapes.map((s, i) => ({
    id: s.id || `obj${i}`,
    type: s.shape ?? 'sphere',
    position: s.position || { x: 0, y: 0, z: 0 },
    rotation: s.rotation || { x: 0, y: 0, z: 0 },
    scale: s.scale || { x: 1, y: 1, z: 1 },
    radius: s.radius !== undefined ? s.radius : (s.scale ? Math.max(s.scale.x, s.scale.y, s.scale.z) * 0.5 : 1.0),
    color: s.color ?? 0xffffff,
    operation: s.operation ?? 'union',
    inverseMatrix: s.inverseMatrix || null,
  }));

  const layout = buildLayout(nodes);
  const sceneData = encodeScene(nodes, layout);
  const mapGLSL = generateMapGLSL(nodes, layout);

  return {
    mapGLSL,
    sceneData,
    layout,
    nodeCount: nodes.length,
    objectCenters: nodes.map((n) => [n.position.x, n.position.y, n.position.z]),
    objectRadii: nodes.map((n) => n.radius),
    objectColors: nodes.map((n) => n.color),
    objectShapes: nodes.map((n) => n.type),
    // Keep the shader key stable across parameter and motor updates.
    // The texture already carries shape, transform, and color data.
    // Only structural changes should force a recompilation.
    topologyHash: nodes.map((n, index) => `${index}:${n.id}:${n.type}:${n.operation}`).join('|'),
  };
}

export default {
  buildGravitasRuntimePacketFromShapes,
};
