// gravitasAdapter.js
// Bridges the flat ReactFlow shapes array to the real Gravitas SDFNode compiler.
// Keeps the same exported API so App.js needs no changes.

import { SphereNode, BoxNode, SmoothUnionNode, SmoothSubtractionNode, TransformNode } from '../gravitas/SDFSchema';
import { compileSDF } from '../gravitas/SDFCompiler';

const BLEND_K = 0.5; // smooth blend width applied to all boolean operations

function hexToRgb(hex) {
    const n = typeof hex === 'number' ? hex : parseInt(String(hex).replace('#', ''), 16);
    return [
        ((n >> 16) & 0xff) / 255,
        ((n >> 8)  & 0xff) / 255,
        (n         & 0xff) / 255,
    ];
}

// Map Raymarcher.shapes numeric codes to type strings
const SHAPE_CODE_TO_TYPE = { 0: 'box', 1: 'capsule', 2: 'sphere', 3: 'torus' };

function resolveShapeType(shape) {
    if (typeof shape === 'number') return SHAPE_CODE_TO_TYPE[shape] ?? 'sphere';
    return shape ?? 'sphere';
}

function shapeToLeaf(s, id) {
    const color = hexToRgb(s.color ?? 0xffffff);
    const shapeType = resolveShapeType(s.shape);

    // Full matrix path: place primitive at origin with unit size, wrap in TransformNode.
    // The inverse matrix already encodes position + rotation + scale + shear.
    if (s.hasMatrix && s.inverseMatrix) {
        let leaf;
        if (shapeType === 'box') {
            leaf = new BoxNode(id, [0, 0, 0], [0.5, 0.5, 0.5]);
        } else {
            leaf = new SphereNode(id, [0, 0, 0], 0.5);
        }
        leaf.material = { color };
        const invMat = Array.isArray(s.inverseMatrix) ? s.inverseMatrix : Array.from(s.inverseMatrix);
        return new TransformNode(`t_${id}`, leaf, invMat);
    }

    // Fallback: position + uniform scale only (no rotation or shear).
    const pos = s.position ? [s.position.x, s.position.y, s.position.z] : [0, 0, 0];
    const scale = s.scale ?? { x: 1, y: 1, z: 1 };

    if (shapeType === 'box') {
        const node = new BoxNode(id, pos, [scale.x * 0.5, scale.y * 0.5, scale.z * 0.5]);
        node.material = { color };
        return node;
    }

    const radius = s.radius !== undefined
        ? s.radius
        : Math.max(scale.x, scale.y, scale.z) * 0.5;
    const node = new SphereNode(id, pos, radius);
    node.material = { color };
    return node;
}

// Build a left-leaning binary tree from a flat shapes list.
// idPrefix keeps node IDs unique when multiple groups are combined later.
// Each shape's `operation` field controls how it combines with the running tree:
//   'subtraction' → SmoothSubtractionNode(tree, newLeaf, k)  [carve leaf out of tree]
//   'union' or default → SmoothUnionNode(tree, newLeaf, k)
function buildTreeFromShapes(shapes, idPrefix = '') {
    if (shapes.length === 0) return null;
    let tree = shapeToLeaf(shapes[0], `${idPrefix}s0`);
    for (let i = 1; i < shapes.length; i++) {
        const s = shapes[i];
        const leaf = shapeToLeaf(s, `${idPrefix}s${i}`);
        if ((s.operation ?? 'union') === 'subtraction') {
            tree = new SmoothSubtractionNode(`${idPrefix}op${i}`, tree, leaf, BLEND_K);
        } else {
            tree = new SmoothUnionNode(`${idPrefix}op${i}`, tree, leaf, BLEND_K);
        }
    }
    return tree;
}

export function buildGravitasRuntimePacketFromShapes(shapes, previousPacket = null) {
    if (!shapes || shapes.length === 0) return null;

    // Group shapes by render node (__renderGroup tag set by App.js).
    // Shapes in the same render node blend together (k = BLEND_K).
    // Shapes from different render nodes must NOT interact — they are joined
    // with a hard union (k = 0) so they render as isolated objects, matching
    // the behaviour of the legacy per-layer pipeline.
    const groups = new Map();
    for (const s of shapes) {
        const gid = s.__renderGroup ?? 0;
        if (!groups.has(gid)) groups.set(gid, []);
        groups.get(gid).push(s);
    }

    const groupIds = [...groups.keys()].sort((a, b) => a - b);
    const groupRoots = [];
    for (const gid of groupIds) {
        const root = buildTreeFromShapes(groups.get(gid), `g${gid}_`);
        if (root) groupRoots.push(root);
    }

    if (groupRoots.length === 0) return null;

    // Hard-union group roots: k=0 collapses to min(a,b) with no blend zone.
    let combined = groupRoots[0];
    for (let i = 1; i < groupRoots.length; i++) {
        combined = new SmoothUnionNode(`grp${i}`, combined, groupRoots[i], 0);
    }

    return compileSDF([combined], previousPacket);
}

export default { buildGravitasRuntimePacketFromShapes };
