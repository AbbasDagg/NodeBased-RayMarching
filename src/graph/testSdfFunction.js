// Quick validation tests for SDF primitives
// This function can be called from the browser console or imported elsewhere

import { Vector3 } from 'three';
import { 
  SdfBox, SdfSphere, SdfCapsule, SdfTorus, SdfTransform,
  SdfUnion, SdfSubtraction, SdfIntersection, SdfWithColor,
  testPrimitive, testSdfAtPoint,
  makeTranslation, makeRotation, makeScale, makePRS,
  useSdfPipeline
} from './sdfFunction';

export function runSdfTests() {
  console.log('=== SDF Function Validation Tests ===\n');

// Test Box
const box = new SdfBox({
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 2, y: 2, z: 2 },
  color: 0xff0000,
});

testPrimitive(box, 'Box (2x2x2 at origin)');

// Verify specific points
console.log('Box validation checks:');
testSdfAtPoint(box, new Vector3(0, 0, 0), -0.9, 0.1); // center (inside)
testSdfAtPoint(box, new Vector3(1.1, 0, 0), 0.0, 0.15); // near surface
console.log('');

// Test Sphere
const sphere = new SdfSphere({
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 2, y: 2, z: 2 },
  color: 0x00ff00,
});

testPrimitive(sphere, 'Sphere (radius 1 at origin)');

console.log('Sphere validation checks:');
testSdfAtPoint(sphere, new Vector3(0, 0, 0), -1.0, 0.1); // center
testSdfAtPoint(sphere, new Vector3(1, 0, 0), 0.0, 0.1); // on surface
console.log('');

// Test Capsule
const capsule = new SdfCapsule({
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 3, z: 1 },
  color: 0x0000ff,
});

testPrimitive(capsule, 'Capsule (r=0.5, h=1.5)');
console.log('');

// Test Torus
const torus = new SdfTorus({
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 2, y: 0.5, z: 2 },
  color: 0xffff00,
});

testPrimitive(torus, 'Torus (major=1, minor=0.25)');
console.log('');

// Test descriptor conversion
console.log('=== Descriptor Conversion ===\n');
const boxDesc = box.toDescriptor();
console.log('Box descriptor:', {
  shape: boxDesc.shape,
  operation: boxDesc.operation,
  color: boxDesc.color.toString(16),
  hasMatrix: !!boxDesc.matrix,
});

console.log('\n=== Transform Tests ===\n');

// Test 1: Simple translation
const unitBox = new SdfBox({
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
  color: 0xff00ff,
});

const translatedBox = new SdfTransform(
  makeTranslation(5, 0, 0),
  unitBox
);

console.log('Translated box (moved +5 in X):');
console.log('  At (0,0,0):', translatedBox.evaluate(new Vector3(0, 0, 0)).toFixed(4));
console.log('  At (5,0,0):', translatedBox.evaluate(new Vector3(5, 0, 0)).toFixed(4));
console.log('  At (5.5,0,0):', translatedBox.evaluate(new Vector3(5.5, 0, 0)).toFixed(4));

// Test 2: Nested transforms (should compose)
const doubleTranslated = new SdfTransform(
  makeTranslation(0, 3, 0),
  translatedBox
);

console.log('\nDouble translated box (moved +5 in X, then +3 in Y):');
console.log('  At (5,3,0):', doubleTranslated.evaluate(new Vector3(5, 3, 0)).toFixed(4));

// Test 3: Scale transform
const scaledSphere = new SdfTransform(
  makeScale(2, 2, 2),
  new SdfSphere({
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    color: 0x00ffff,
  })
);

console.log('\nScaled sphere (2x):');
console.log('  At origin:', scaledSphere.evaluate(new Vector3(0, 0, 0)).toFixed(4));
console.log('  At (1,0,0):', scaledSphere.evaluate(new Vector3(1, 0, 0)).toFixed(4));

// Test descriptor with transform
const transformedDesc = translatedBox.toDescriptor();
console.log('\nTransformed box descriptor:', {
  shape: transformedDesc.shape,
  hasMatrix: transformedDesc.hasMatrix,
  matrixDefined: !!transformedDesc.matrix,
});

console.log('\n=== GLSL Generation Tests ===\n');

// Test GLSL generation for primitives
console.log('Box GLSL:');
console.log(box.toGLSL('p'));
console.log('');

console.log('Sphere GLSL:');
console.log(sphere.toGLSL('p'));
console.log('');

// Test GLSL generation for transformed shapes
console.log('Translated box GLSL:');
console.log(translatedBox.toGLSL('p'));
console.log('');

console.log('Double translated box GLSL:');
console.log(doubleTranslated.toGLSL('p'));
console.log('');

console.log('\n=== Boolean Operation Tests ===\n');

// Test Union
const sphere1 = new SdfSphere({
  position: { x: -1, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
  color: 0xff0000,
});

const sphere2 = new SdfSphere({
  position: { x: 1, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
  color: 0x00ff00,
});

const unionSdf = new SdfUnion([sphere1, sphere2], 0.5);

console.log('Union of two spheres:');
console.log('  At (-1, 0, 0):', unionSdf.evaluate(new Vector3(-1, 0, 0)).toFixed(4));
console.log('  At (0, 0, 0):', unionSdf.evaluate(new Vector3(0, 0, 0)).toFixed(4));
console.log('  At (1, 0, 0):', unionSdf.evaluate(new Vector3(1, 0, 0)).toFixed(4));

// Test Subtraction
const bigBox = new SdfBox({
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 3, y: 3, z: 3 },
  color: 0xff0000,
});

const smallSphere = new SdfSphere({
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1.5, y: 1.5, z: 1.5 },
  color: 0x00ff00,
});

const subtractionSdf = new SdfSubtraction(bigBox, smallSphere, 0.5);

console.log('\nBox with sphere subtracted:');
console.log('  At (0, 0, 0):', subtractionSdf.evaluate(new Vector3(0, 0, 0)).toFixed(4));
console.log('  At (1, 0, 0):', subtractionSdf.evaluate(new Vector3(1, 0, 0)).toFixed(4));

// Test color wrapper
const coloredBox = new SdfWithColor(unitBox, 0x00ffff);
console.log('\nColored box color:', coloredBox.color.toString(16));

// Test GLSL for boolean ops
console.log('\nUnion GLSL:');
console.log(unionSdf.toGLSL('p'));

console.log('\n=== Mode Switch Status ===');
console.log('USE_SDF_PIPELINE:', useSdfPipeline());
console.log('(Set window.USE_SDF_PIPELINE = true to enable new backend)');

console.log('\n=== Visual Verification ===');
console.log('Let\'s trace a ray through a sphere to see if math is correct:\n');

// Create a simple sphere at origin
const testSphere = new SdfSphere({
  position: { x: 0, y: 0, z: 0 },
  scale: { x: 2, y: 2, z: 2 },  // radius = 1
  color: 0xff0000,
});

console.log('Sphere: center (0,0,0), radius 1.0');
console.log('Ray marching from point (5,0,0) toward center:\n');

// March along a ray from (5,0,0) toward origin
let rayPos = new Vector3(5, 0, 0);
const rayDir = new Vector3(-1, 0, 0); // moving toward origin
let totalDist = 0;
let steps = 0;

while (totalDist < 10 && steps < 20) {
  const dist = testSphere.evaluate(rayPos);
  console.log(`  Step ${steps}: pos=(${rayPos.x.toFixed(2)}, ${rayPos.y.toFixed(2)}, ${rayPos.z.toFixed(2)}) → distance=${dist.toFixed(3)}`);
  
  if (Math.abs(dist) < 0.01) {
    console.log('  ✅ HIT SURFACE!');
    break;
  }
  
  // March forward by the distance
  rayPos.add(rayDir.clone().multiplyScalar(Math.abs(dist)));
  totalDist += Math.abs(dist);
  steps++;
}

console.log(`\nShould hit surface near x=1.0 (sphere edge)`);
console.log(`Actual final x: ${rayPos.x.toFixed(3)}`);
console.log(Math.abs(rayPos.x - 1.0) < 0.1 ? '✅ CORRECT!' : '❌ WRONG!');

console.log('\n=== All Tests Complete ===');
}

// Auto-run if window.testSdf is called
if (typeof window !== 'undefined') {
  window.testSdf = runSdfTests;
}
