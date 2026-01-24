// Minimal SDF AST + compiler to the current shader descriptor format.
// This keeps the shader unchanged and lets the graph represent real structure
// (base + ops + transforms) instead of “array hacks”.

// NOTE: Matrices are row-major 4x4 arrays of 16 numbers.

export const identityMatrix = () => [
  1,0,0,0,
  0,1,0,0,
  0,0,1,0,
  0,0,0,1,
];

export const multiplyMatrix = (a, b) => {
  const r = new Array(16).fill(0);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      for (let k = 0; k < 4; k++) {
        r[row * 4 + col] += a[row * 4 + k] * b[k * 4 + col];
      }
    }
  }
  return r;
};

const deg2rad = (d) => (d * Math.PI) / 180;

const isIdentityMatrix = (m) => {
  if (!m) return true;
  const id = identityMatrix();
  for (let i = 0; i < 16; i++) {
    if (Math.abs(m[i] - id[i]) > 1e-9) return false;
  }
  return true;
};

const composePRS = ({ position, rotation, scale }) => {
  const p = position || { x: 0, y: 0, z: 0 };
  const r = rotation || { x: 0, y: 0, z: 0 };
  const s = scale || { x: 1, y: 1, z: 1 };

  const cx = Math.cos(deg2rad(r.x || 0));
  const sx = Math.sin(deg2rad(r.x || 0));
  const cy = Math.cos(deg2rad(r.y || 0));
  const sy = Math.sin(deg2rad(r.y || 0));
  const cz = Math.cos(deg2rad(r.z || 0));
  const sz = Math.sin(deg2rad(r.z || 0));

  // Row-major 4x4 matrices; intended for column-vector multiplication.
  const Rx = [
    1, 0, 0, 0,
    0, cx, -sx, 0,
    0, sx, cx, 0,
    0, 0, 0, 1,
  ];
  const Ry = [
    cy, 0, sy, 0,
    0, 1, 0, 0,
    -sy, 0, cy, 0,
    0, 0, 0, 1,
  ];
  const Rz = [
    cz, -sz, 0, 0,
    sz, cz, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ];

  // three.js Euler default is 'XYZ' => matrix = Rz * Ry * Rx
  const R = multiplyMatrix(multiplyMatrix(Rz, Ry), Rx);
  const S = [
    s.x ?? 1, 0, 0, 0,
    0, s.y ?? 1, 0, 0,
    0, 0, s.z ?? 1, 0,
    0, 0, 0, 1,
  ];
  const RS = multiplyMatrix(R, S);
  const T = [
    1, 0, 0, p.x ?? 0,
    0, 1, 0, p.y ?? 0,
    0, 0, 1, p.z ?? 0,
    0, 0, 0, 1,
  ];
  return multiplyMatrix(T, RS);
};

export const invertMatrix4 = (m) => {
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

export const decomposeMatrix = (m) => {
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

// ===== AST constructors =====

export const astPrimitive = ({ shape, color, position, rotation, scale, mode, matrix }) => ({
  kind: 'primitive',
  shape,
  color,
  // mode: 'configured' | 'modular'
  mode: mode || 'configured',
  // configured payload
  position,
  rotation,
  scale,
  // modular payload
  matrix,
});

export const astTransform = (matrix, child) => ({ kind: 'transform', matrix, child });

// Fold matches your current shader backend: base first, then ops applied sequentially.
// ops: [{ op: 'union'|'subtraction'|'intersection', ast }]
export const astFold = (base, ops) => ({ kind: 'fold', base, ops: ops || [] });

// ===== Compiler to shader descriptors =====

export const compileAstToShapes = (ast, { debug = false } = {}) => {
  const out = [];

  const emitPrimitive = (prim, operation) => {
    if (prim.mode === 'modular') {
      const matrix = prim.matrix || identityMatrix();
      const inv = invertMatrix4(matrix);
      // Keep PRS filled for debugging/legacy UI; shader ignores when hasMatrix==1.
      const dec = decomposeMatrix(matrix);
      out.push({
        shape: prim.shape,
        operation,
        color: prim.color,
        position: dec.position,
        rotation: dec.rotation,
        scale: dec.scale,
        matrix,
        inverseMatrix: inv,
        hasMatrix: true,
      });
    } else {
      out.push({
        shape: prim.shape,
        operation,
        color: prim.color,
        position: prim.position,
        rotation: prim.rotation,
        scale: prim.scale,
        matrix: null,
      });
    }
  };

  const walk = (node, opForThisNode, accumulatedMatrix) => {
    if (!node) return;
    if (node.kind === 'transform') {
      const m = multiplyMatrix(accumulatedMatrix, node.matrix || identityMatrix());
      walk(node.child, opForThisNode, m);
      return;
    }
    if (node.kind === 'primitive') {
      if (node.mode === 'modular') {
        const baseMat = node.matrix || identityMatrix();
        const finalMat = multiplyMatrix(accumulatedMatrix, baseMat);
        emitPrimitive({ ...node, matrix: finalMat }, opForThisNode);
      } else {
        // configured primitives must preserve their explicit PRS.
        // If a transform wrapper exists, apply it by composing PRS -> matrix, then decompose.
        if (!isIdentityMatrix(accumulatedMatrix)) {
          const localMat = composePRS(node);
          const finalMat = multiplyMatrix(accumulatedMatrix, localMat);
          const dec = decomposeMatrix(finalMat);
          emitPrimitive({
            ...node,
            position: dec.position,
            rotation: dec.rotation,
            scale: dec.scale,
          }, opForThisNode);
        } else {
          emitPrimitive(node, opForThisNode);
        }
      }
      return;
    }
    if (node.kind === 'fold') {
      // IMPORTANT: our shader backend is a *flat* fold over a descriptor list.
      // If a fold expression is used as an operand of (subtraction/intersection),
      // we must propagate the parent op into the fold's emitted primitives.
      //
      // For union-only subexpressions this matches distributive behavior:
      //   A - (B ∪ C)  ==  A - B - C
      //
      // If a nested fold contains non-union ops and is used as an operand, the
      // flat backend can't represent full nesting; we approximate by pushing the
      // parent op into all emitted primitives.
      const parentOp = opForThisNode || 'union';
      const baseOp = parentOp;
      const mapOp = (childOp) => (parentOp === 'union' ? (childOp || 'union') : parentOp);

      walk(node.base, baseOp, accumulatedMatrix);
      for (const o of node.ops || []) {
        walk(o.ast, mapOp(o.op), accumulatedMatrix);
      }
      return;
    }
    // unknown kind
  };

  walk(ast, 'union', identityMatrix());

  if (debug) {
    // eslint-disable-next-line no-console
    console.log('[AST compile] shapes:', out.map(s => ({ op: s.operation, shape: s.shape, hasMatrix: !!s.hasMatrix })));
  }

  return out;
};
