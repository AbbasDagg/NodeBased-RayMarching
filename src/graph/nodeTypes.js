// Compute handlers for each node type.
// Outputs are plain objects; common keys include:
// - matrix: 4x4 (array of 16 numbers, row-major)
// - vector: {x,y,z}
// - color: number
// - shapes: array of shapeData { shape, operation, position, rotation, scale, color, matrix, inverseMatrix, hasMatrix }
// - sdf: Sdf function object (when USE_SDF_PIPELINE is true)

import { astFold, astPrimitive, compileAstToShapes } from './sdfAst';
import { 
  useSdfPipeline, 
  SdfBox, 
  SdfSphere, 
  SdfCapsule, 
  SdfTorus,
  SdfTransform,
  SdfUnion,
  SdfSubtraction,
  SdfIntersection,
  SdfWithColor,
  makeTranslation,
  makeRotation,
  makeScale,
  makePRS
} from './sdfFunction';
import * as THREE from 'three';

const identityMatrix = () => [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
const multiplyMatrix = (a,b) => {
  const r = new Array(16).fill(0);
  for (let row=0; row<4; row++) {
    for (let col=0; col<4; col++) {
      for (let k=0; k<4; k++) {
        r[row*4+col] += a[row*4+k]*b[k*4+col];
      }
    }
  }
  return r;
};
const deg2rad = (d) => d * Math.PI / 180;

// Convert color from various formats to number (0xRRGGBB)
const normalizeColor = (color) => {
  if (typeof color === 'number') return color;
  if (typeof color === 'string') {
    const hex = color.replace('#', '');
    return parseInt(hex, 16);
  }
  if (typeof color === 'object' && color && color.r !== undefined) {
    return (color.r << 16) | (color.g << 8) | color.b;
  }
  return 0xffffff; // default white
};

const invertMatrix4 = (m) => {
  const inv = new Array(16);
  const a = m;
  inv[0] = a[5]*a[10]*a[15]-a[5]*a[11]*a[14]-a[9]*a[6]*a[15]+a[9]*a[7]*a[14]+a[13]*a[6]*a[11]-a[13]*a[7]*a[10];
  inv[4] = -a[4]*a[10]*a[15]+a[4]*a[11]*a[14]+a[8]*a[6]*a[15]-a[8]*a[7]*a[14]-a[12]*a[6]*a[11]+a[12]*a[7]*a[10];
  inv[8] = a[4]*a[9]*a[15]-a[4]*a[11]*a[13]-a[8]*a[5]*a[15]+a[8]*a[7]*a[13]+a[12]*a[5]*a[11]-a[12]*a[7]*a[9];
  inv[12] = -a[4]*a[9]*a[14]+a[4]*a[10]*a[13]+a[8]*a[5]*a[14]-a[8]*a[6]*a[13]-a[12]*a[5]*a[10]+a[12]*a[6]*a[9];
  inv[1] = -a[1]*a[10]*a[15]+a[1]*a[11]*a[14]+a[9]*a[2]*a[15]-a[9]*a[3]*a[14]-a[13]*a[2]*a[11]+a[13]*a[3]*a[10];
  inv[5] = a[0]*a[10]*a[15]-a[0]*a[11]*a[14]-a[8]*a[2]*a[15]+a[8]*a[3]*a[14]+a[12]*a[2]*a[11]-a[12]*a[3]*a[10];
  inv[9] = -a[0]*a[9]*a[15]+a[0]*a[11]*a[13]+a[8]*a[1]*a[15]-a[8]*a[3]*a[13]-a[12]*a[1]*a[11]+a[12]*a[3]*a[9];
  inv[13] = a[0]*a[9]*a[14]-a[0]*a[10]*a[13]-a[8]*a[1]*a[14]+a[8]*a[2]*a[13]+a[12]*a[1]*a[10]-a[12]*a[2]*a[9];
  inv[2] = a[1]*a[6]*a[15]-a[1]*a[7]*a[14]-a[5]*a[2]*a[15]+a[5]*a[3]*a[14]+a[13]*a[2]*a[7]-a[13]*a[3]*a[6];
  inv[6] = -a[0]*a[6]*a[15]+a[0]*a[7]*a[14]+a[4]*a[2]*a[15]-a[4]*a[3]*a[14]-a[12]*a[2]*a[7]+a[12]*a[3]*a[6];
  inv[10] = a[0]*a[5]*a[15]-a[0]*a[7]*a[13]-a[4]*a[1]*a[15]+a[4]*a[3]*a[13]+a[12]*a[1]*a[7]-a[12]*a[3]*a[5];
  inv[14] = -a[0]*a[5]*a[14]+a[0]*a[6]*a[13]+a[4]*a[1]*a[14]-a[4]*a[2]*a[13]-a[12]*a[1]*a[6]+a[12]*a[2]*a[5];
  inv[3] = -a[1]*a[6]*a[11]+a[1]*a[7]*a[10]+a[5]*a[2]*a[11]-a[5]*a[3]*a[10]-a[9]*a[2]*a[7]+a[9]*a[3]*a[6];
  inv[7] = a[0]*a[6]*a[11]-a[0]*a[7]*a[10]-a[4]*a[2]*a[11]+a[4]*a[3]*a[10]+a[8]*a[2]*a[7]-a[8]*a[3]*a[6];
  inv[11] = -a[0]*a[5]*a[11]+a[0]*a[7]*a[9]+a[4]*a[1]*a[11]-a[4]*a[3]*a[9]-a[8]*a[1]*a[7]+a[8]*a[3]*a[5];
  inv[15] = a[0]*a[5]*a[10]-a[0]*a[6]*a[9]-a[4]*a[1]*a[10]+a[4]*a[2]*a[9]+a[8]*a[1]*a[6]-a[8]*a[2]*a[5];
  let det = a[0]*inv[0] + a[1]*inv[4] + a[2]*inv[8] + a[3]*inv[12];
  if (Math.abs(det) < 1e-8) return identityMatrix();
  for (let i=0;i<16;i++) inv[i] /= det;
  return inv;
};

const decomposeMatrix = (m) => {
  // Prefer last column (standard affine) then fallback to legacy bottom-row translation
  let tx = m[3], ty = m[7], tz = m[11];
  if (tx === 0 && ty === 0 && tz === 0 && (m[12] !== 0 || m[13] !== 0 || m[14] !== 0)) {
    tx = m[12]; ty = m[13]; tz = m[14];
  }
  const pos = { x: tx, y: ty, z: tz };
  const sx = Math.hypot(m[0], m[1], m[2]);
  const sy = Math.hypot(m[4], m[5], m[6]);
  const sz = Math.hypot(m[8], m[9], m[10]);
  const r0 = [m[0]/sx, m[1]/sx, m[2]/sx];
  const r1 = [m[4]/sy, m[5]/sy, m[6]/sy];
  const r2 = [m[8]/sz, m[9]/sz, m[10]/sz];
  let rotY = Math.asin(-r2[0]);
  let rotX, rotZ;
  if (Math.cos(rotY) !== 0) {
    rotX = Math.atan2(r2[1], r2[2]);
    rotZ = Math.atan2(r1[0], r0[0]);
  } else {
    rotX = Math.atan2(-r0[2], r1[2]);
    rotZ = 0;
  }
  const rot = { x: rotX*180/Math.PI, y: rotY*180/Math.PI, z: rotZ*180/Math.PI };
  return { position: pos, rotation: rot, scale: { x: sx, y: sy, z: sz } };
};

function createShapeSdf(shapeType, position, rotation, scale, color) {
  const pos = new THREE.Vector3(position.x, position.y, position.z);
  const rot = new THREE.Vector3(rotation.x, rotation.y, rotation.z);
  const scl = new THREE.Vector3(scale.x, scale.y, scale.z);
  
  console.log(`[createShapeSdf] Creating ${shapeType} with color: 0x${color.toString(16).padStart(6, '0')}`);
  
  try {
    // Handle both string and numeric shape types
    const shapeNum = typeof shapeType === 'string' ? 
      { 'box': 0, 'sphere': 1, 'torus': 2, 'capsule': 3 }[shapeType] : shapeType;
    
    switch (shapeNum) {
      case 0: // box
        return new SdfBox({ position: pos, rotation: rot, scale: scl, color });
      case 1: // sphere
        return new SdfSphere({ position: pos, rotation: rot, scale: scl, color });
      case 2: // torus
        return new SdfTorus({ position: pos, majorRadius: 1.0, minorRadius: 0.25, rotation: rot, color });
      case 3: // capsule
        return new SdfCapsule({ position: pos, radius: 0.5, height: 1.5, rotation: rot, color });
      default:
        console.warn('Unknown shape type:', shapeType, '- using sphere');
        return new SdfSphere({ position: pos, rotation: rot, scale: scl, color });
    }
  } catch (err) {
    console.error('Error creating shape SDF:', err, 'shapeType:', shapeType);
    return new SdfSphere({ position: pos, rotation: rot, scale: scl, color });
  }
}

const USE_AST_PIPELINE = true;
const AST_DEBUG = (typeof window !== 'undefined') && !!window.__SDF_AST_DEBUG__;

// Apply a matrix only to modular primitives (matches the legacy behavior where
// group/mode transforms only affect shapes with explicit matrices).
function applyMatrixToModularAst(ast, matrix) {
  if (!ast) return ast;
  if (!matrix) return ast;

  if (ast.kind === 'primitive') {
    if (ast.mode !== 'modular') return ast;
    const baseMat = ast.matrix || identityMatrix();
    return { ...ast, matrix: multiplyMatrix(matrix, baseMat) };
  }
  if (ast.kind === 'fold') {
    return {
      ...ast,
      base: applyMatrixToModularAst(ast.base, matrix),
      ops: (ast.ops || []).map(o => ({ ...o, ast: applyMatrixToModularAst(o.ast, matrix) }))
    };
  }
  if (ast.kind === 'transform') {
    // If transforms are present, keep structure but continue applying into children.
    return { ...ast, child: applyMatrixToModularAst(ast.child, matrix) };
  }
  return ast;
}

function computeMatrixChain(gm, startId) {
  if (!startId) return identityMatrix();
  const node = gm.getNode(startId);
  if (!node || node.type !== 'multNode') return identityMatrix();
  const upstreams = gm.getUpstreams(startId, 'matrix-in');
  const upstreamMat = upstreams.length ? computeMatrixChain(gm, upstreams[0]) : identityMatrix();
  const n = node;
  const local = [
    n.data.m00, n.data.m01, n.data.m02, n.data.m03,
    n.data.m10, n.data.m11, n.data.m12, n.data.m13,
    n.data.m20, n.data.m21, n.data.m22, n.data.m23,
    n.data.m30, n.data.m31, n.data.m32, n.data.m33,
  ];
  return multiplyMatrix(local, upstreamMat);
}

export const nodeRegistry = {
  vectorNode: {
    compute: (node) => ({ vector: { x: node.data.x, y: node.data.y, z: node.data.z } })
  },
  motorNode: {
    compute: (node) => {
      const time = Date.now() / 1000;
      const { xRange, yRange, zRange } = node.data;
      const val = (r) => (r && typeof r.min === 'number' && typeof r.max === 'number')
        ? (r.min + Math.abs(Math.sin(time)) * (r.max - r.min))
        : 0;
      return { vector: { x: val(xRange), y: val(yRange), z: val(zRange) } };
    }
  },
  colorNode: {
    compute: (node, gm) => {
      if (!useSdfPipeline()) {
        return { color: normalizeColor(node.data.color) };
      }
      
      // SDF pipeline: wrap upstream with color override
      const upstreams = gm.getUpstreams(node.id, 'shapes');
      if (upstreams.length) {
        const upstreamOut = gm.computeNode(upstreams[0]);
        if (upstreamOut && upstreamOut.sdf) {
          return { sdf: new SdfWithColor(upstreamOut.sdf, normalizeColor(node.data.color)) };
        }
      }
      
      // Fallback if no upstream
      return { color: normalizeColor(node.data.color) };
    }
  },
  multNode: {
    compute: (node, gm) => {
      const upstreams = gm.getUpstreams(node.id, 'matrix-in');
      const upstreamMat = upstreams.length ? computeMatrixChain(gm, upstreams[0]) : identityMatrix();
      const local = [
        node.data.m00, node.data.m01, node.data.m02, node.data.m03,
        node.data.m10, node.data.m11, node.data.m12, node.data.m13,
        node.data.m20, node.data.m21, node.data.m22, node.data.m23,
        node.data.m30, node.data.m31, node.data.m32, node.data.m33,
      ];
      return { matrix: multiplyMatrix(local, upstreamMat) };
    }
  },
  sphereNode: { compute: shapeCompute },
  torusNode: { compute: shapeCompute },
  boxNode: { compute: shapeCompute },
  capsuleNode: { compute: shapeCompute },
  groupNode: {
    compute: (node, gm) => {
      const childIds = gm.getUpstreams(node.id, 'shapes');
      let shapes = [];
      const childAsts = [];
      const childSdfs = [];
      
      childIds.forEach(cid => {
        const out = gm.computeNode(cid);
        if (out && out.shapes) shapes.push(...out.shapes);
        if (out && out.ast) childAsts.push(out.ast);
        if (out && out.sdf) childSdfs.push(out.sdf);
      });
      
      // Resolve group transform
      const tEdge = gm.getUpstreams(node.id, 'transform');
      const combineMatrix = tEdge.length ? computeMatrixChain(gm, tEdge[0]) : null;
      
      if (combineMatrix) {
        shapes = shapes.map(s => {
          if (!s.matrix) return s; // Only apply group transform to modular shapes with matrices
          const baseMat = s.matrix;
          const finalMat = multiplyMatrix(combineMatrix, baseMat);
          const dec = decomposeMatrix(finalMat);
          const inv = invertMatrix4(finalMat);
          return { ...s, position: dec.position, rotation: dec.rotation, scale: dec.scale, matrix: finalMat, inverseMatrix: inv, hasMatrix: true };
        });
      }

      let ast = null;
      if (childAsts.length) {
        ast = astFold(childAsts[0], childAsts.slice(1).map(a => ({ op: 'union', ast: a })));
        if (combineMatrix) ast = applyMatrixToModularAst(ast, combineMatrix);
      }
      
      // SDF pipeline
      let sdf = null;
      if (useSdfPipeline() && childSdfs.length) {
        sdf = childSdfs.length === 1 ? childSdfs[0] : new SdfUnion(childSdfs, 0.5);
        if (combineMatrix) {
          // Transpose row-major array to column-major for Three.js
          const m = combineMatrix;
          const mat4 = new THREE.Matrix4();
          mat4.set(
            m[0], m[4], m[8], m[12],
            m[1], m[5], m[9], m[13],
            m[2], m[6], m[10], m[14],
            m[3], m[7], m[11], m[15]
          );
          sdf = new SdfTransform(mat4, sdf);
        }
      }

      return { shapes, ast, sdf };
    }
  },
  modeNode: {
    compute: (node, gm) => {
      const groupIds = gm.getUpstreams(node.id, 'group-transform');
      const groupMatrixLocal = groupIds.length ? computeMatrixChain(gm, groupIds[0]) : null;
      const bIds = gm.getUpstreams(node.id, 'shape1');
      const oIds = gm.getUpstreams(node.id, 'shapes');

      const baseShapes = [];
      const opShapes = [];

      const collectShapes = (id) => {
        const out = gm.computeNode(id);
        if (!out) return [];
        return out.shapes || [];
      };
      const collectAst = (id) => {
        const out = gm.computeNode(id);
        if (!out) return null;
        return out.ast || null;
      };
      if (bIds.length) baseShapes.push(...collectShapes(bIds[0]));
      oIds.forEach(id => opShapes.push(...collectShapes(id)));

      const baseAst = bIds.length ? collectAst(bIds[0]) : null;
      const opAsts = [];
      oIds.forEach(id => {
        const a = collectAst(id);
        if (a) opAsts.push(a);
      });

      const applyGroup = (s) => {
        if (!groupMatrixLocal) return s;
        if (!s.matrix) return s; // Only apply to modular shapes with matrices
        const baseMat = s.matrix;
        const finalMat = multiplyMatrix(groupMatrixLocal, baseMat);
        const dec = decomposeMatrix(finalMat);
        const inv = invertMatrix4(finalMat);
        return { ...s, position: dec.position, rotation: dec.rotation, scale: dec.scale, matrix: finalMat, inverseMatrix: inv, hasMatrix: true };
      };

      let shapes = [];
      let ast = null;
      if (node.data.mode === 'subtraction') {
        baseShapes.forEach(b => {
          shapes.push(applyGroup({ ...b, operation: 'union' }));
          opShapes.forEach(o => shapes.push(applyGroup({ ...o, operation: 'subtraction' })));
        });

        if (baseAst) {
          ast = astFold(baseAst, opAsts.map(a => ({ op: 'subtraction', ast: a })));
        }
      } else if (node.data.mode === 'intersection') {
        baseShapes.forEach(b => {
          shapes.push(applyGroup({ ...b, operation: 'union' }));
          opShapes.forEach(o => shapes.push(applyGroup({ ...o, operation: 'intersection' })));
        });

        if (baseAst) {
          ast = astFold(baseAst, opAsts.map(a => ({ op: 'intersection', ast: a })));
        }
      } else {
        baseShapes.forEach(b => shapes.push(applyGroup({ ...b, operation: 'union' })));
        opShapes.forEach(o => shapes.push(applyGroup({ ...o, operation: 'union' })));

        if (baseAst) {
          ast = astFold(baseAst, opAsts.map(a => ({ op: 'union', ast: a })));
        }
      }

      if (ast && groupMatrixLocal) ast = applyMatrixToModularAst(ast, groupMatrixLocal);
      
      // SDF pipeline
      let sdf = null;
      if (useSdfPipeline()) {
        const baseSdf = bIds.length ? gm.computeNode(bIds[0])?.sdf : null;
        const opSdfs = [];
        oIds.forEach(id => {
          const out = gm.computeNode(id);
          if (out && out.sdf) opSdfs.push(out.sdf);
        });
        
        if (baseSdf && opSdfs.length) {
          const blendK = 0.5;
          if (node.data.mode === 'subtraction') {
            // SdfSubtraction(base, subtractedChildren[], blending)
            sdf = new SdfSubtraction(baseSdf, opSdfs, blendK);
          } else if (node.data.mode === 'intersection') {
            // SdfIntersection([children], blending)
            sdf = new SdfIntersection([baseSdf, ...opSdfs], blendK);
          } else {
            // union - SdfUnion([children], blending)
            sdf = new SdfUnion([baseSdf, ...opSdfs], blendK);
          }
          
          if (groupMatrixLocal) {
            // Transpose row-major array to column-major for Three.js
            const m = groupMatrixLocal;
            const mat4 = new THREE.Matrix4();
            mat4.set(
              m[0], m[4], m[8], m[12],
              m[1], m[5], m[9], m[13],
              m[2], m[6], m[10], m[14],
              m[3], m[7], m[11], m[15]
            );
            sdf = new SdfTransform(mat4, sdf);
          }
        } else if (baseSdf) {
          sdf = baseSdf;
          if (groupMatrixLocal) {
            // Transpose row-major array to column-major for Three.js
            const m = groupMatrixLocal;
            const mat4 = new THREE.Matrix4();
            mat4.set(
              m[0], m[4], m[8], m[12],
              m[1], m[5], m[9], m[13],
              m[2], m[6], m[10], m[14],
              m[3], m[7], m[11], m[15]
            );
            sdf = new SdfTransform(mat4, sdf);
          }
        }
      }
      
      return { shapes, ast, sdf };
    }
  },
  renderNode: {
    compute: (node, gm) => {
      // Collect from any upstream feeding 'render'
      const srcIds = gm.getUpstreams(node.id, 'render');
      const shapes = [];
      const asts = [];
      const sdfs = [];
      
      srcIds.forEach(id => {
        const out = gm.computeNode(id);
        if (out && out.shapes) shapes.push(...out.shapes);
        if (out && out.ast) asts.push(out.ast);
        if (out && out.sdf) sdfs.push(out.sdf);
      });

      // SDF pipeline: generate GLSL
      if (useSdfPipeline() && sdfs.length) {
        console.log('=== PROOF: Using Function Objects ===');
        console.log('Number of Sdf objects collected:', sdfs.length);
        sdfs.forEach((sdf, i) => {
          console.log(`  [${i}] Class: ${sdf.constructor.name}`);
          console.log(`      Color: 0x${sdf.color.toString(16).padStart(6, '0')}`);
          console.log(`      Has .evaluate(): ${typeof sdf.evaluate === 'function'}`);
          console.log(`      Has .toGLSL(): ${typeof sdf.toGLSL === 'function'}`);
        });
        
        const rootSdf = sdfs.length === 1 ? sdfs[0] : new SdfUnion(sdfs, 0.5);
        const glslCode = rootSdf.toGLSL('p');
        
        console.log('\n=== Generated GLSL ===');
        console.log(glslCode);
        console.log('======================\n');
        
        // Still return shapes for now (backward compatibility)
        return { shapes, sdf: rootSdf };
      }

      if (USE_AST_PIPELINE && asts.length) {
        // Union all upstream ASTs under a single fold.
        const ast = astFold(asts[0], asts.slice(1).map(a => ({ op: 'union', ast: a })));
        try {
          const shapesCompiled = compileAstToShapes(ast, { debug: AST_DEBUG });
          if (AST_DEBUG) {
            // eslint-disable-next-line no-console
            console.log('[renderNode] compiled order:', shapesCompiled.map(s => `${s.operation}:${s.shape}`));
          }
          return { shapes: shapesCompiled };
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn('AST compile failed; falling back to legacy shapes:', e);
          return { shapes };
        }
      }

      return { shapes };
    }
  }
};

function shapeCompute(node, gm) {
  const isModular = node.data.shapeMode === 'modular';
  // Defaults
  let position = node.data.position || { x: 0, y: 0, z: 0 };
  let rotation = node.data.rotation || { x: 0, y: 0, z: 0 };
  let scale = node.data.scale || { x: 1, y: 1, z: 1 };
  let color = normalizeColor(node.data.color || 0xffffff);

  // Configured pins
  const posSrcs = gm.requireInputs(node.id, 'position-configured');
  const rotSrcs = gm.requireInputs(node.id, 'rotation-configured');
  const sizeSrcs = gm.requireInputs(node.id, 'size-configured');
  const colSrcs = gm.requireInputs(node.id, 'color-configured').concat(gm.requireInputs(node.id, 'color-modular'));
  if (posSrcs.length && posSrcs[0].vector) position = posSrcs[0].vector;
  if (rotSrcs.length && rotSrcs[0].vector) rotation = rotSrcs[0].vector;
  if (sizeSrcs.length && sizeSrcs[0].vector) scale = sizeSrcs[0].vector;
  if (colSrcs.length && colSrcs[0].color !== undefined) color = normalizeColor(colSrcs[0].color);

  let matrix = null;
  if (isModular) {
    // Resolve local transform chain from 'transform-modular'
    const tIds = gm.getUpstreams(node.id, 'transform-modular');
    const localMatrix = tIds.length ? computeMatrixChain(gm, tIds[0]) : identityMatrix();
    matrix = localMatrix;
    const dec = decomposeMatrix(matrix);
    position = dec.position;
    rotation = dec.rotation;
    scale = dec.scale;
  }

  const shapeData = {
    shape: node.data.shape,
    operation: 'union',
    position,
    rotation,
    scale,
    color,
    matrix,
  };
  if (matrix) {
    shapeData.inverseMatrix = invertMatrix4(matrix);
    shapeData.hasMatrix = true;
  }

  const ast = isModular
    ? astPrimitive({ shape: node.data.shape, color, mode: 'modular', matrix })
    : astPrimitive({ shape: node.data.shape, color, mode: 'configured', position, rotation, scale });

  // SDF pipeline
  let sdf = null;
  if (useSdfPipeline()) {
    // For modular mode: create shape at origin with node's base scale, then apply matrix transform
    // For configured mode: create shape with position/rotation/scale directly
    const sdfPosition = isModular ? { x: 0, y: 0, z: 0 } : position;
    const sdfRotation = isModular ? { x: 0, y: 0, z: 0 } : rotation;
    const sdfScale = isModular ? (node.data.scale || { x: 1, y: 1, z: 1 }) : scale;
    
    sdf = createShapeSdf(node.data.shape, sdfPosition, sdfRotation, sdfScale, color);
    
    // Apply modular transform if present
    if (isModular && matrix) {
      // Transpose row-major array to column-major for Three.js
      const m = matrix;
      const mat4 = new THREE.Matrix4();
      mat4.set(
        m[0], m[4], m[8], m[12],
        m[1], m[5], m[9], m[13],
        m[2], m[6], m[10], m[14],
        m[3], m[7], m[11], m[15]
      );
      sdf = new SdfTransform(mat4, sdf);
    }
  }

  return { shapes: [shapeData], ast, sdf };
}
