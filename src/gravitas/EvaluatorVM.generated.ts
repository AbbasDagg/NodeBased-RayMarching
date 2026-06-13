// Gravitas EvaluatorVM.generated — copied from gravitas/src/sdf/EvaluatorVM.generated.ts
// Extended with OP_BOX, OP_SMOOTH_SUBTRACTION.

import type { SDFNode } from './SDFSchema';
import { SphereNode, SmoothUnionNode, DeformationNode,
         BoxNode, SmoothSubtractionNode } from './SDFSchema';
import { sdSphere, opSmoothUnion, sdBox, opSmoothSubtraction } from './primitives.generated';
import { sdSphereGrad, opSmoothUnionDeriv, sdBoxGrad, opSmoothSubtractionDeriv } from './sdfOps.generated';

// ── Opcodes (from Gravitas) ───────────────────────────────────────────────────
export const OP_SPHERE = 1;
export const OP_SMOOTHUNION = 2;
export const OP_PUSH_DEFORMATION = 3;
export const OP_POP_DEFORMATION = 4;

// ── Extended opcodes ──────────────────────────────────────────────────────────
export const OP_BOX = 5;
export const OP_SMOOTH_SUBTRACTION = 6;

// ── Compiler ──────────────────────────────────────────────────────────────────

export function compileEvaluatorNode(
    node: SDFNode,
    opsOut: number[],
    dataOut: number[],
    compile: (n: SDFNode) => void
) {
    switch (node.type) {
        // ── From Gravitas ──────────────────────────────────────────────────
        case 'sphere': {
            const n = node as SphereNode;
            opsOut.push(OP_SPHERE);
            dataOut.push(n.position[0], n.position[1], n.position[2], n.radius);
            break;
        }
        case 'smoothUnion': {
            const n = node as SmoothUnionNode;
            compile(n.left);
            compile(n.right);
            opsOut.push(OP_SMOOTHUNION);
            dataOut.push(n.k);
            break;
        }
        case 'deformation': {
            const n = node as DeformationNode;
            opsOut.push(OP_PUSH_DEFORMATION);
            dataOut.push(n.frequency, n.amplitude);
            compile(n.child);
            opsOut.push(OP_POP_DEFORMATION);
            break;
        }
        // ── Extensions ────────────────────────────────────────────────────
        case 'box': {
            const n = node as BoxNode;
            opsOut.push(OP_BOX);
            dataOut.push(n.position[0], n.position[1], n.position[2]);
            dataOut.push(n.halfExtents[0], n.halfExtents[1], n.halfExtents[2]);
            break;
        }
        case 'smoothSubtraction': {
            const n = node as SmoothSubtractionNode;
            compile(n.left);  // base
            compile(n.right); // cutter
            opsOut.push(OP_SMOOTH_SUBTRACTION);
            dataOut.push(n.k);
            break;
        }
        default:
            throw new Error(`VM Compile Error: Unsupported node type ${node.type}`);
    }
}

// ── Evaluator ─────────────────────────────────────────────────────────────────

export function evaluateEvaluatorVM(
    this: any,
    op: number,
    new_px: number,
    new_py: number,
    new_pz: number,
    new_sp: number,
    new_wp: number,
    new_dp: number,
    mathStack: Float32Array,
    ptStack: Float32Array,
    mStack: Float32Array,
): { px: number; py: number; pz: number; sp: number; wp: number; dp: number } {

    if (op === OP_SPHERE) {
        const cx = this.data[new_dp++], cy = this.data[new_dp++], cz = this.data[new_dp++];
        const v_radius = this.data[new_dp++];
        const pi = new_sp * 4;
        new_sp++;
        mathStack[pi] = sdSphere(new_px - cx, new_py - cy, new_pz - cz, v_radius);
        const sg = sdSphereGrad(new_px - cx, new_py - cy, new_pz - cz, v_radius);
        mathStack[pi + 1] = sg.x; mathStack[pi + 2] = sg.y; mathStack[pi + 3] = sg.z;

    } else if (op === OP_BOX) {
        const cx = this.data[new_dp++], cy = this.data[new_dp++], cz = this.data[new_dp++];
        const hx = this.data[new_dp++], hy = this.data[new_dp++], hz = this.data[new_dp++];
        const lx = new_px - cx, ly = new_py - cy, lz = new_pz - cz;
        const pi = new_sp * 4;
        new_sp++;
        mathStack[pi] = sdBox(lx, ly, lz, hx, hy, hz);
        const bg = sdBoxGrad(lx, ly, lz, hx, hy, hz);
        mathStack[pi + 1] = bg.x; mathStack[pi + 2] = bg.y; mathStack[pi + 3] = bg.z;

    } else if (op === OP_SMOOTHUNION) {
        const v_k = this.data[new_dp++];
        new_sp--;
        const b_i = new_sp * 4;
        const bD = mathStack[b_i], bx = mathStack[b_i + 1], by = mathStack[b_i + 2], bz = mathStack[b_i + 3];
        new_sp--;
        const a_i = new_sp * 4;
        const aD = mathStack[a_i], ax = mathStack[a_i + 1], ay = mathStack[a_i + 2], az = mathStack[a_i + 3];
        const dist = opSmoothUnion(aD, bD, v_k);
        const deriv = opSmoothUnionDeriv(aD, bD, v_k);
        const pi = new_sp * 4;
        new_sp++;
        mathStack[pi] = dist;
        mathStack[pi + 1] = deriv.a * ax + deriv.b * bx;
        mathStack[pi + 2] = deriv.a * ay + deriv.b * by;
        mathStack[pi + 3] = deriv.a * az + deriv.b * bz;

    } else if (op === OP_SMOOTH_SUBTRACTION) {
        const v_k = this.data[new_dp++];
        new_sp--;
        const c_i = new_sp * 4; // cutter (right, pushed last)
        const cD = mathStack[c_i], cgx = mathStack[c_i + 1], cgy = mathStack[c_i + 2], cgz = mathStack[c_i + 3];
        new_sp--;
        const a_i = new_sp * 4; // base (left)
        const aD = mathStack[a_i], agx = mathStack[a_i + 1], agy = mathStack[a_i + 2], agz = mathStack[a_i + 3];
        const dist = opSmoothSubtraction(aD, cD, v_k);
        const deriv = opSmoothSubtractionDeriv(aD, cD, v_k);
        const pi = new_sp * 4;
        new_sp++;
        mathStack[pi] = dist;
        mathStack[pi + 1] = deriv.base * agx + deriv.cutter * cgx;
        mathStack[pi + 2] = deriv.base * agy + deriv.cutter * cgy;
        mathStack[pi + 3] = deriv.base * agz + deriv.cutter * cgz;

    } else if (op === OP_PUSH_DEFORMATION) {
        const res = DeformationNode.evaluatePush(this.data, new_dp, new_px, new_py, new_pz, new_wp, ptStack, mStack);
        new_px = res.px; new_py = res.py; new_pz = res.pz;
        new_dp = res.dp; new_wp = res.wp;

    } else if (op === OP_POP_DEFORMATION) {
        const res = DeformationNode.evaluatePop(new_px, new_py, new_pz, new_sp, new_wp, mathStack, ptStack, mStack);
        new_px = res.px; new_py = res.py; new_pz = res.pz; new_wp = res.wp;
        mathStack[(new_sp - 1) * 4 + 1] = res.gx;
        mathStack[(new_sp - 1) * 4 + 2] = res.gy;
        mathStack[(new_sp - 1) * 4 + 3] = res.gz;

    }

    return { px: new_px, py: new_py, pz: new_pz, sp: new_sp, wp: new_wp, dp: new_dp };
}
