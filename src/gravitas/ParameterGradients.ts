// Thesis extension — NOT part of the original Gravitas library.
//
// Parameter-gradient support for the EvaluatorVM: ∂f/∂θ for every tunable scalar
// in an SDF tree (positions, radii, extents, blend k, deformation params).
// This is the piece image→SDF fitting needs: spatial gradients ∂f/∂(x,y,z) already
// flow analytically through the VM; parameter gradients are provided here by
// central differences applied DIRECTLY to the VM's baked data array. The offset
// map mirrors compileEvaluatorNode's dataOut layout exactly, so a parameter can be
// perturbed (or optimized) without recompiling the VM — the same "patch data
// in-place" idea Gravitas' EvaluatorRegistry documents for parameter updates.
//
// Fitting-loop usage:
//   const vm  = new EvaluatorVM(root);
//   const map = compileParameterMap(root);
//   const g   = evaluateParameterGradients(vm, map, x, y, z);   // ∂d/∂θ_i
//   ...gradient-descend a θ vector, apply with writeParamVector(vm, map, θ)...
//   syncTreeFromData(vm, map);  // push fitted values back into the node objects
//                               // so compileSDF renders the fitted shape.

import type { SDFNode } from './SDFSchema';
import { EvaluatorVM } from './EvaluatorVM';

export interface ParamEntry {
    node: SDFNode;        // owning node (for write-back)
    nodeId: string;
    nodeType: string;
    name: string;         // e.g. 'position.x', 'radius', 'k', 'frequency'
    dataOffset: number;   // index into EvaluatorVM.data
    // Write a value both into a live VM data array and back onto the node object.
    setOnNode: (node: SDFNode, value: number) => void;
    getFromNode: (node: SDFNode) => number;
}

export interface ParameterMapOptions {
    // Transform matrices are 16 raw floats; optimizing them directly is rarely
    // what you want (prefer optimizing the source PRS). Off by default.
    includeTransformMatrices?: boolean;
}

// Walks the tree in the exact order compileEvaluatorNode consumes dataOut and
// records the offset of every scalar. MUST stay in lockstep with
// EvaluatorVM.generated.ts — each case advances `dp` by the same count.
export function compileParameterMap(
    root: SDFNode,
    options: ParameterMapOptions = {},
): ParamEntry[] {
    const entries: ParamEntry[] = [];
    let dp = 0;

    const pushPos = (node: SDFNode) => {
        const axes: Array<[string, number]> = [['x', 0], ['y', 1], ['z', 2]];
        for (const [axis, i] of axes) {
            entries.push({
                node, nodeId: node.id, nodeType: node.type,
                name: `position.${axis}`, dataOffset: dp + i,
                setOnNode: (n: any, v: number) => { n.position[i] = v; },
                getFromNode: (n: any) => n.position[i],
            });
        }
    };
    const pushScalar = (node: SDFNode, name: string, offset: number, prop: string, index?: number) => {
        entries.push({
            node, nodeId: node.id, nodeType: node.type,
            name, dataOffset: offset,
            setOnNode: index === undefined
                ? (n: any, v: number) => { n[prop] = v; }
                : (n: any, v: number) => { n[prop][index] = v; },
            getFromNode: index === undefined
                ? (n: any) => n[prop]
                : (n: any) => n[prop][index],
        });
    };

    const walk = (node: SDFNode): void => {
        const n = node as any;
        switch (node.type) {
            case 'sphere':
                pushPos(node);
                pushScalar(node, 'radius', dp + 3, 'radius');
                dp += 4;
                break;
            case 'box':
                pushPos(node);
                pushScalar(node, 'halfExtents.x', dp + 3, 'halfExtents', 0);
                pushScalar(node, 'halfExtents.y', dp + 4, 'halfExtents', 1);
                pushScalar(node, 'halfExtents.z', dp + 5, 'halfExtents', 2);
                dp += 6;
                break;
            case 'torus':
                pushPos(node);
                pushScalar(node, 'majorRadius', dp + 3, 'majorRadius');
                pushScalar(node, 'minorRadius', dp + 4, 'minorRadius');
                dp += 5;
                break;
            case 'capsule':
                pushPos(node);
                pushScalar(node, 'radius', dp + 3, 'radius');
                pushScalar(node, 'halfHeight', dp + 4, 'halfHeight');
                dp += 5;
                break;
            case 'smoothUnion':
            case 'smoothSubtraction':
                walk(n.left);
                walk(n.right);
                pushScalar(node, 'k', dp, 'k');
                dp += 1;
                break;
            case 'deformation':
                // push-order: frequency, amplitude BEFORE the child (matches VM)
                pushScalar(node, 'frequency', dp, 'frequency');
                pushScalar(node, 'amplitude', dp + 1, 'amplitude');
                dp += 2;
                walk(n.child);
                break;
            case 'transform':
                if (options.includeTransformMatrices) {
                    for (let i = 0; i < 16; i++) {
                        pushScalar(node, `invMatrix[${i}]`, dp + i, 'inverseMatrix', i);
                    }
                }
                dp += 16;
                walk(n.child);
                break;
            default:
                throw new Error(`ParameterGradients: unsupported node type "${node.type}"`);
        }
    };

    walk(root);
    return entries;
}

// ∂d/∂θ_i at one point, by central differences patched straight into vm.data.
// eps is absolute; parameters here are all O(0.1..10) world units so 1e-4 is safe.
export function evaluateParameterGradients(
    vm: EvaluatorVM,
    map: ParamEntry[],
    x: number, y: number, z: number,
    eps = 1e-4,
): Float32Array {
    const grads = new Float32Array(map.length);
    for (let i = 0; i < map.length; i++) {
        const off = map[i].dataOffset;
        const saved = vm.data[off];
        vm.data[off] = saved + eps;
        const dPlus = vm.distance(x, y, z);
        vm.data[off] = saved - eps;
        const dMinus = vm.distance(x, y, z);
        vm.data[off] = saved;
        grads[i] = (dPlus - dMinus) / (2 * eps);
    }
    return grads;
}

// Read the current parameter vector θ out of the VM data array.
export function readParamVector(vm: EvaluatorVM, map: ParamEntry[]): Float32Array {
    const theta = new Float32Array(map.length);
    for (let i = 0; i < map.length; i++) theta[i] = vm.data[map[i].dataOffset];
    return theta;
}

// Apply an optimizer-updated θ back into the VM (cheap, no recompile).
export function writeParamVector(vm: EvaluatorVM, map: ParamEntry[], theta: ArrayLike<number>): void {
    for (let i = 0; i < map.length; i++) vm.data[map[i].dataOffset] = theta[i];
}

// Push the VM's current parameter values back onto the SDFNode objects, so the
// fitted tree can be re-rendered by compileSDF / serialized via toJSON.
export function syncTreeFromData(vm: EvaluatorVM, map: ParamEntry[]): void {
    for (const entry of map) {
        entry.setOnNode(entry.node, vm.data[entry.dataOffset]);
    }
}
