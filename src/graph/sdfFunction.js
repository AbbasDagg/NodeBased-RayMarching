// Algebraic SDF system: each node returns a composable function object.
// This replaces descriptor arrays with real function composition (Blender-style).

import { Vector3, Quaternion, Euler, Matrix4 } from 'three';

// ===== Mode Switch =====

/**
 * Global flag to toggle between old descriptor backend and new SDF pipeline.
 * Set window.USE_SDF_PIPELINE = true to use new system (generates GLSL dynamically).
 * Set window.USE_SDF_PIPELINE = false to use old descriptor arrays (default for compatibility).
 */
if (typeof window !== 'undefined') {
  window.USE_SDF_PIPELINE = window.USE_SDF_PIPELINE !== undefined ? window.USE_SDF_PIPELINE : false;
}

export function useSdfPipeline() {
  return typeof window !== 'undefined' && window.USE_SDF_PIPELINE === true;
}

// ===== Base SDF Class =====

/**
 * Abstract base class for all SDF function objects.
 * Each SDF can:
 * - .evaluate(point): return signed distance at a 3D point (for CPU validation/testing)
 * - .toDescriptor(): convert to shader entity descriptor (backward compatibility)
 */
export class Sdf {z
  constructor() {
    this.color = 0xffffff;
  }

  /**
   * Evaluate signed distance at a point.
   * @param {Vector3} point - World-space point
   * @returns {number} - Signed distance (negative = inside)
   */
  evaluate(point) {
    throw new Error('evaluate() must be implemented by subclass');
  }

  /**
   * Convert to shader descriptor format (for current backend).
   * @returns {Object} - Shape descriptor for MyRaymarcher
   */
  toDescriptor() {
    throw new Error('toDescriptor() must be implemented by subclass');
  }
}

// ===== Primitive SDFs =====

/**
 * Box SDF (rounded corners)
 */
export class SdfBox extends Sdf {
  constructor({ position, rotation, scale, color = 0xffffff }) {
    super();
    this.position = position ? new Vector3(position.x, position.y, position.z) : new Vector3();
    this.rotation = rotation ? new Vector3(rotation.x, rotation.y, rotation.z) : new Vector3();
    this.scale = scale ? new Vector3(scale.x, scale.y, scale.z) : new Vector3(1, 1, 1);
    this.color = color;
    this.shape = 0; // box enum
    this._updateTransform();
  }

  _updateTransform() {
    // Build quaternion from Euler angles (degrees)
    const euler = new Euler(
      this.rotation.x * Math.PI / 180,
      this.rotation.y * Math.PI / 180,
      this.rotation.z * Math.PI / 180,
      'XYZ'
    );
    this.quaternion = new Quaternion().setFromEuler(euler);
  }

  evaluate(point) {
    // Transform point to local space
    const localPoint = point.clone().sub(this.position);
    localPoint.applyQuaternion(this.quaternion.clone().invert());
    
    // Box SDF with rounding (matches shader: sdBox with 0.1 rounding)
    const halfSize = this.scale.clone().multiplyScalar(0.5).sub(new Vector3(0.1, 0.1, 0.1));
    const q = new Vector3(
      Math.abs(localPoint.x) - halfSize.x,
      Math.abs(localPoint.y) - halfSize.y,
      Math.abs(localPoint.z) - halfSize.z
    );
    const outsideDist = new Vector3(
      Math.max(q.x, 0),
      Math.max(q.y, 0),
      Math.max(q.z, 0)
    ).length();
    const insideDist = Math.min(Math.max(q.x, Math.max(q.y, q.z)), 0);
    return outsideDist + insideDist - 0.1; // 0.1 rounding
  }

  toDescriptor() {
    return {
      shape: this.shape,
      operation: 'union', // default, can be overridden by combinators
      color: this.color,
      position: this.position,
      rotation: this.quaternion, // shader expects quaternion
      scale: this.scale,
      matrix: null,
    };
  }

  toGLSL(varName = 'p') {
    const halfSize = this.scale.clone().multiplyScalar(0.5).sub(new Vector3(0.1, 0.1, 0.1));
    const q = this.quaternion;
    const transformedP = `applyQuaternion(${varName} - vec3(${this.position.x}, ${this.position.y}, ${this.position.z}), normalize(vec4(${q.x}, ${q.y}, ${q.z}, ${q.w})))`;
    const dist = `sdBox(${transformedP}, vec3(${halfSize.x}, ${halfSize.y}, ${halfSize.z})) - 0.1`;
    
    // Convert color to RGB
    const r = ((this.color >> 16) & 255) / 255;
    const g = ((this.color >> 8) & 255) / 255;
    const b = (this.color & 255) / 255;
    
    return `SDF(${dist}, vec3(${r.toFixed(4)}, ${g.toFixed(4)}, ${b.toFixed(4)}))`;
  }
}

/**
 * Sphere/Ellipsoid SDF
 */
export class SdfSphere extends Sdf {
  constructor({ position, rotation, scale, color = 0xffffff }) {
    super();
    this.position = position ? new Vector3(position.x, position.y, position.z) : new Vector3();
    this.rotation = rotation ? new Vector3(rotation.x, rotation.y, rotation.z) : new Vector3();
    this.scale = scale ? new Vector3(scale.x, scale.y, scale.z) : new Vector3(1, 1, 1);
    this.color = color;
    this.shape = 2; // sphere/ellipsoid enum
    this._updateTransform();
  }

  _updateTransform() {
    const euler = new Euler(
      this.rotation.x * Math.PI / 180,
      this.rotation.y * Math.PI / 180,
      this.rotation.z * Math.PI / 180,
      'XYZ'
    );
    this.quaternion = new Quaternion().setFromEuler(euler);
  }

  evaluate(point) {
    // Transform to local space
    const localPoint = point.clone().sub(this.position);
    localPoint.applyQuaternion(this.quaternion.clone().invert());
    
    // Ellipsoid SDF (matches shader: sdEllipsoid)
    const r = this.scale.clone().multiplyScalar(0.5);
    const k0 = new Vector3(
      localPoint.x / r.x,
      localPoint.y / r.y,
      localPoint.z / r.z
    ).length();
    const k1 = new Vector3(
      localPoint.x / (r.x * r.x),
      localPoint.y / (r.y * r.y),
      localPoint.z / (r.z * r.z)
    ).length();
    
    // Handle singularity at origin (when k1 ≈ 0)
    if (k1 < 1e-8) {
      // At origin, distance is -radius (inside the sphere)
      return -Math.min(r.x, Math.min(r.y, r.z));
    }
    
    return k0 * (k0 - 1.0) / k1;
  }

  toDescriptor() {
    return {
      shape: this.shape,
      operation: 'union',
      color: this.color,
      position: this.position,
      rotation: this.quaternion,
      scale: this.scale,
      matrix: null,
    };
  }

  toGLSL(varName = 'p') {
    const r = this.scale.clone().multiplyScalar(0.5);
    const q = this.quaternion;
    const transformedP = `applyQuaternion(${varName} - vec3(${this.position.x}, ${this.position.y}, ${this.position.z}), normalize(vec4(${q.x}, ${q.y}, ${q.z}, ${q.w})))`;
    const dist = `sdEllipsoid(${transformedP}, vec3(${r.x}, ${r.y}, ${r.z}))`;
    
    // Convert color to RGB
    const rCol = ((this.color >> 16) & 255) / 255;
    const gCol = ((this.color >> 8) & 255) / 255;
    const bCol = (this.color & 255) / 255;
    
    return `SDF(${dist}, vec3(${rCol.toFixed(4)}, ${gCol.toFixed(4)}, ${bCol.toFixed(4)}))`;
  }
}

/**
 * Capsule SDF
 */
export class SdfCapsule extends Sdf {
  constructor({ position, rotation, scale, color = 0xffffff }) {
    super();
    this.position = position ? new Vector3(position.x, position.y, position.z) : new Vector3();
    this.rotation = rotation ? new Vector3(rotation.x, rotation.y, rotation.z) : new Vector3();
    this.scale = scale ? new Vector3(scale.x, scale.y, scale.z) : new Vector3(1, 1, 1);
    this.color = color;
    this.shape = 1; // capsule enum
    this._updateTransform();
  }

  _updateTransform() {
    const euler = new Euler(
      this.rotation.x * Math.PI / 180,
      this.rotation.y * Math.PI / 180,
      this.rotation.z * Math.PI / 180,
      'XYZ'
    );
    this.quaternion = new Quaternion().setFromEuler(euler);
  }

  evaluate(point) {
    // Transform to local space
    const localPoint = point.clone().sub(this.position);
    localPoint.applyQuaternion(this.quaternion.clone().invert());
    
    // Capsule SDF (matches shader: sdCapsule)
    const r = this.scale.clone().multiplyScalar(0.5);
    const radius = r.x;
    const height = r.y;
    
    // Clamp y to capsule segment
    const py = Math.max(-height + radius, Math.min(localPoint.y, height - radius));
    const p = new Vector3(localPoint.x, localPoint.y - py, localPoint.z);
    return p.length() - radius;
  }

  toDescriptor() {
    return {
      shape: this.shape,
      operation: 'union',
      color: this.color,
      position: this.position,
      rotation: this.quaternion,
      scale: this.scale,
      matrix: null,
    };
  }

  toGLSL(varName = 'p') {
    const r = this.scale.clone().multiplyScalar(0.5);
    const q = this.quaternion;
    const transformedP = `applyQuaternion(${varName} - vec3(${this.position.x}, ${this.position.y}, ${this.position.z}), normalize(vec4(${q.x}, ${q.y}, ${q.z}, ${q.w})))`;
    
    // Convert color to RGB
    const rCol = ((this.color >> 16) & 255) / 255;
    const gCol = ((this.color >> 8) & 255) / 255;
    const bCol = (this.color & 255) / 255;
    
    return `SDF(sdCapsule(${transformedP}, vec3(${r.x}, ${r.y}, ${r.z})), vec3(${rCol.toFixed(4)}, ${gCol.toFixed(4)}, ${bCol.toFixed(4)}))`;
  }
}

/**
 * Torus SDF
 */
export class SdfTorus extends Sdf {
  constructor({ position, rotation, scale, color = 0xffffff }) {
    super();
    this.position = position ? new Vector3(position.x, position.y, position.z) : new Vector3();
    this.rotation = rotation ? new Vector3(rotation.x, rotation.y, rotation.z) : new Vector3();
    this.scale = scale ? new Vector3(scale.x, scale.y, scale.z) : new Vector3(1, 1, 1);
    this.color = color;
    this.shape = 3; // torus enum
    this._updateTransform();
  }

  _updateTransform() {
    const euler = new Euler(
      this.rotation.x * Math.PI / 180,
      this.rotation.y * Math.PI / 180,
      this.rotation.z * Math.PI / 180,
      'XYZ'
    );
    this.quaternion = new Quaternion().setFromEuler(euler);
  }

  evaluate(point) {
    // Transform to local space
    const localPoint = point.clone().sub(this.position);
    localPoint.applyQuaternion(this.quaternion.clone().invert());
    
    // Torus SDF (matches shader: sdTorus)
    const t = this.scale.clone().multiplyScalar(0.5);
    const majorRadius = t.x;
    const minorRadius = t.y;
    
    const qx = Math.sqrt(localPoint.x * localPoint.x + localPoint.z * localPoint.z) - majorRadius;
    const q = new Vector3(qx, localPoint.y, 0);
    return q.length() - minorRadius;
  }

  toDescriptor() {
    return {
      shape: this.shape,
      operation: 'union',
      color: this.color,
      position: this.position,
      rotation: this.quaternion,
      scale: this.scale,
      matrix: null,
    };
  }

  toGLSL(varName = 'p') {
    const t = this.scale.clone().multiplyScalar(0.5);
    const q = this.quaternion;
    const transformedP = `applyQuaternion(${varName} - vec3(${this.position.x}, ${this.position.y}, ${this.position.z}), normalize(vec4(${q.x}, ${q.y}, ${q.z}, ${q.w})))`;
    const dist = `sdTorus(${transformedP}, vec2(${t.x}, ${t.y}))`;
    
    // Convert color to RGB
    const rCol = ((this.color >> 16) & 255) / 255;
    const gCol = ((this.color >> 8) & 255) / 255;
    const bCol = (this.color & 255) / 255;
    
    return `SDF(${dist}, vec3(${rCol.toFixed(4)}, ${gCol.toFixed(4)}, ${bCol.toFixed(4)}))`;
  }
}

// ===== Transform Combinator =====

/**
 * SdfTransform wraps a child SDF with a matrix transformation.
 * Transforms compose naturally: Transform(M2, Transform(M1, shape)) → uses M2*M1.
 * 
 * The transform is applied in local space: we transform the query point by the
 * inverse matrix before evaluating the child SDF.
 */
export class SdfTransform extends Sdf {
  constructor(matrix, childSdf) {
    super();
    if (!childSdf || !(childSdf instanceof Sdf)) {
      throw new Error('SdfTransform requires a valid child SDF');
    }
    
    this.matrix = matrix || new Matrix4();
    this.child = childSdf;
    this.inverseMatrix = new Matrix4().copy(this.matrix).invert();
    
    // Inherit color from child
    this.color = childSdf.color;
  }

  evaluate(point) {
    // Transform point to local space using inverse matrix
    const localPoint = point.clone().applyMatrix4(this.inverseMatrix);
    return this.child.evaluate(localPoint);
  }

  toDescriptor() {
    // Flatten the transform chain: if child is also a transform, compose matrices
    let finalMatrix = this.matrix.clone();
    let baseChild = this.child;
    
    // Collapse nested transforms into a single matrix
    while (baseChild instanceof SdfTransform) {
      finalMatrix.multiply(baseChild.matrix);
      baseChild = baseChild.child;
    }
    
    // Get the base primitive's descriptor
    const baseDescriptor = baseChild.toDescriptor();
    
    // Convert matrix to the format expected by shader (16-element array)
    const matrixArray = finalMatrix.toArray(); // column-major
    
    // Convert to row-major for our shader (which expects row-major)
    const rowMajorMatrix = [
      matrixArray[0], matrixArray[4], matrixArray[8], matrixArray[12],
      matrixArray[1], matrixArray[5], matrixArray[9], matrixArray[13],
      matrixArray[2], matrixArray[6], matrixArray[10], matrixArray[14],
      matrixArray[3], matrixArray[7], matrixArray[11], matrixArray[15],
    ];
    
    // Compute inverse for shader
    const invMatrix = new Matrix4().copy(finalMatrix).invert();
    const invArray = invMatrix.toArray();
    const rowMajorInverse = [
      invArray[0], invArray[4], invArray[8], invArray[12],
      invArray[1], invArray[5], invArray[9], invArray[13],
      invArray[2], invArray[6], invArray[10], invArray[14],
      invArray[3], invArray[7], invArray[11], invArray[15],
    ];
    
    return {
      ...baseDescriptor,
      matrix: rowMajorMatrix,
      inverseMatrix: rowMajorInverse,
      hasMatrix: true,
    };
  }

  toGLSL(varName = 'p') {
    // Simply transform the point and pass to child
    // No variable declaration - just inline the transformation
    
    // Flatten matrix chain
    let finalMatrix = this.matrix.clone();
    let baseChild = this.child;
    while (baseChild instanceof SdfTransform) {
      finalMatrix.multiply(baseChild.matrix);
      baseChild = baseChild.child;
    }
    
    const inv = new Matrix4().copy(finalMatrix).invert();
    const m = inv.toArray();
    
    // Generate inline matrix multiplication expression
    const transformedPoint = `(mat4(${m[0]}, ${m[4]}, ${m[8]}, ${m[12]}, ${m[1]}, ${m[5]}, ${m[9]}, ${m[13]}, ${m[2]}, ${m[6]}, ${m[10]}, ${m[14]}, ${m[3]}, ${m[7]}, ${m[11]}, ${m[15]}) * vec4(${varName}, 1.0)).xyz`;
    
    // Get child's GLSL using the transformed point expression directly
    return baseChild.toGLSL(transformedPoint);
  }
}

// ===== Boolean Operation Combinators =====

/**
 * SdfUnion combines multiple SDFs using smooth minimum (union operation).
 * In CSG: A ∪ B = min(A, B)
 */
export class SdfUnion extends Sdf {
  constructor(children, blending = 0.5) {
    super();
    if (!Array.isArray(children) || children.length === 0) {
      throw new Error('SdfUnion requires at least one child SDF');
    }
    this.children = children;
    this.blending = blending;
    // Inherit color from first child (can be overridden with SdfWithColor)
    this.color = children[0].color;
  }

  evaluate(point) {
    if (this.children.length === 1) {
      return this.children[0].evaluate(point);
    }
    
    // Smooth minimum for all children
    let result = this.children[0].evaluate(point);
    for (let i = 1; i < this.children.length; i++) {
      const d = this.children[i].evaluate(point);
      if (this.blending > 0) {
        // Smooth min
        const h = Math.max(0.5 + 0.5 * (d - result) / this.blending, 0.0);
        result = d * (1 - h) + result * h - this.blending * h * (1 - h);
      } else {
        // Hard min
        result = Math.min(result, d);
      }
    }
    return result;
  }

  toGLSL(varName = 'p') {
    if (this.children.length === 1) {
      return this.children[0].toGLSL(varName);
    }
    
    // Build nested expression without intermediate variables
    let result = this.children[0].toGLSL(varName);
    for (let i = 1; i < this.children.length; i++) {
      const childExpr = this.children[i].toGLSL(varName);
      if (this.blending > 0) {
        result = `opSmoothUnion(${result}, ${childExpr}, ${this.blending})`;
      } else {
        result = `min(${result}, ${childExpr})`;
      }
    }
    
    return result;
  }
}

/**
 * SdfSubtraction subtracts child SDFs from the base.
 * In CSG: A - B = max(A, -B)
 */
export class SdfSubtraction extends Sdf {
  constructor(base, subtractedChildren, blending = 0.5) {
    super();
    if (!base || !(base instanceof Sdf)) {
      throw new Error('SdfSubtraction requires a base SDF');
    }
    this.base = base;
    this.subtractedChildren = Array.isArray(subtractedChildren) ? subtractedChildren : [subtractedChildren];
    this.blending = blending;
    this.color = base.color;
  }

  evaluate(point) {
    let result = this.base.evaluate(point);
    
    for (const child of this.subtractedChildren) {
      const d = child.evaluate(point);
      if (this.blending > 0) {
        // Smooth subtraction
        const h = Math.max(0.5 - 0.5 * (result + d) / this.blending, 0.0);
        result = result * (1 - h) + (-d) * h + this.blending * h * (1 - h);
      } else {
        // Hard subtraction
        result = Math.max(result, -d);
      }
    }
    return result;
  }

  toGLSL(varName = 'p') {
    // Build nested expression without intermediate variables
    let result = this.base.toGLSL(varName);
    
    for (let i = 0; i < this.subtractedChildren.length; i++) {
      const childExpr = this.subtractedChildren[i].toGLSL(varName);
      if (this.blending > 0) {
        result = `opSmoothSubtraction(${result}, ${childExpr}, ${this.blending})`;
      } else {
        result = `max(${result}, -(${childExpr}))`;
      }
    }
    
    return result;
  }
}

/**
 * SdfIntersection computes the intersection of multiple SDFs.
 * In CSG: A ∩ B = max(A, B)
 */
export class SdfIntersection extends Sdf {
  constructor(children, blending = 0.5) {
    super();
    if (!Array.isArray(children) || children.length === 0) {
      throw new Error('SdfIntersection requires at least one child SDF');
    }
    this.children = children;
    this.blending = blending;
    this.color = children[0].color;
  }

  evaluate(point) {
    if (this.children.length === 1) {
      return this.children[0].evaluate(point);
    }
    
    let result = this.children[0].evaluate(point);
    for (let i = 1; i < this.children.length; i++) {
      const d = this.children[i].evaluate(point);
      if (this.blending > 0) {
        // Smooth max
        const h = Math.max(0.5 + 0.5 * (d - result) / this.blending, 0.0);
        result = d * h + result * (1 - h) + this.blending * h * (1 - h);
      } else {
        // Hard max
        result = Math.max(result, d);
      }
    }
    return result;
  }

  toGLSL(varName = 'p') {
    if (this.children.length === 1) {
      return this.children[0].toGLSL(varName);
    }
    
    // Build nested expression without intermediate variables
    let result = this.children[0].toGLSL(varName);
    for (let i = 1; i < this.children.length; i++) {
      const childExpr = this.children[i].toGLSL(varName);
      if (this.blending > 0) {
        result = `opSmoothIntersection(${result}, ${childExpr}, ${this.blending})`;
      } else {
        result = `max(${result}, ${childExpr})`;
      }
    }
    
    return result;
  }
}

/**
 * SdfWithColor wraps an SDF and associates a color with it.
 * This allows color to propagate through boolean operations.
 */
export class SdfWithColor extends Sdf {
  constructor(sdf, color) {
    super();
    if (!sdf || !(sdf instanceof Sdf)) {
      throw new Error('SdfWithColor requires a valid SDF');
    }
    this.sdf = sdf;
    this.color = color;
  }

  evaluate(point) {
    return this.sdf.evaluate(point);
  }

  toDescriptor() {
    const desc = this.sdf.toDescriptor();
    return {
      ...desc,
      color: this.color,
    };
  }

  toGLSL(varName = 'p') {
    // Get child's GLSL expression which returns SDF(dist, childColor)
    // We need to extract the distance and combine with our color
    const childGlsl = this.sdf.toGLSL(varName);
    
    // Convert our color to RGB components
    const r = ((this.color >> 16) & 255) / 255;
    const g = ((this.color >> 8) & 255) / 255;
    const b = (this.color & 255) / 255;
    
    // Wrap child SDF: extract distance, apply our color
    // child returns SDF(dist, color), we want SDF(dist, ourColor)
    // Use a temporary variable to get child result, then reconstruct with our color
    return `SDF((${childGlsl}).distance, vec3(${r.toFixed(4)}, ${g.toFixed(4)}, ${b.toFixed(4)}))`;
  }
}

// ===== Test Utilities =====

/**
 * Test an SDF at a given point and compare to expected distance.
 * @param {Sdf} sdf - SDF to test
 * @param {Vector3} point - Test point
 * @param {number} expectedDistance - Expected signed distance
 * @param {number} tolerance - Acceptable error
 * @returns {boolean} - True if test passes
 */
export function testSdfAtPoint(sdf, point, expectedDistance, tolerance = 0.01) {
  const actualDistance = sdf.evaluate(point);
  const error = Math.abs(actualDistance - expectedDistance);
  const pass = error < tolerance;
  
  if (!pass) {
    console.warn(
      `SDF test failed at point (${point.x}, ${point.y}, ${point.z}):`,
      `expected ${expectedDistance}, got ${actualDistance}, error ${error}`
    );
  }
  
  return pass;
}

/**
 * Run a suite of basic tests for a primitive SDF.
 * @param {Sdf} sdf - SDF to test
 * @param {string} name - Name for logging
 */
export function testPrimitive(sdf, name) {
  console.log(`Testing ${name}...`);
  
  // Test at origin (should be inside for unit shapes)
  const atOrigin = sdf.evaluate(new Vector3(0, 0, 0));
  console.log(`  Distance at origin: ${atOrigin.toFixed(4)}`);
  
  // Test at surface (approximate)
  const onSurface = sdf.evaluate(new Vector3(0.5, 0, 0));
  console.log(`  Distance at (0.5, 0, 0): ${onSurface.toFixed(4)}`);
  
  // Test far away
  const farAway = sdf.evaluate(new Vector3(10, 10, 10));
  console.log(`  Distance at (10, 10, 10): ${farAway.toFixed(4)}`);
  
  console.log(`${name} tests complete.\n`);
}

// ===== Transform Helper Functions =====

/**
 * Create a translation matrix
 */
export function makeTranslation(x, y, z) {
  return new Matrix4().makeTranslation(x, y, z);
}

/**
 * Create a rotation matrix from Euler angles (degrees)
 */
export function makeRotation(x, y, z) {
  const euler = new Euler(
    x * Math.PI / 180,
    y * Math.PI / 180,
    z * Math.PI / 180,
    'XYZ'
  );
  return new Matrix4().makeRotationFromEuler(euler);
}

/**
 * Create a scale matrix
 */
export function makeScale(x, y, z) {
  return new Matrix4().makeScale(x, y, z);
}

/**
 * Compose position, rotation, scale into a single transform matrix
 */
export function makePRS(position, rotation, scale) {
  const T = makeTranslation(position.x, position.y, position.z);
  const R = makeRotation(rotation.x, rotation.y, rotation.z);
  const S = makeScale(scale.x, scale.y, scale.z);
  return new Matrix4().multiplyMatrices(T, new Matrix4().multiplyMatrices(R, S));
}

