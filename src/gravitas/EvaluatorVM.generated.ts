// Gravitas EvaluatorVM.generated — copied from gravitas/src/sdf/EvaluatorVM.generated.ts
// Extended with OP_BOX, OP_SMOOTH_SUBTRACTION.

import type { SDFNode } from './SDFSchema';
import { SphereNode, SmoothUnionNode, DeformationNode,
         BoxNode, SmoothSubtractionNode, TorusNode, CapsuleNode, TransformNode } from './SDFSchema';
import { sdSphere, opSmoothUnion, sdBox, opSmoothSubtraction, sdTorus, sdCapsule } from './primitives.generated';
import { sdSphereGrad, opSmoothUnionDeriv, sdBoxGrad, opSmoothSubtractionDeriv, sdTorusGrad, sdCapsuleGrad } from './sdfOps.generated';

// ── Opcodes (from Gravitas) ───────────────────────────────────────────────────
export const OP_SPHERE = 1;
export const OP_SMOOTHUNION = 2;
export const OP_PUSH_DEFORMATION = 3;
export const OP_POP_DEFORMATION = 4;

// ── Extended opcodes ──────────────────────────────────────────────────────────
export const OP_BOX = 5;
export const OP_SMOOTH_SUBTRACTION = 6;
export const OP_TORUS = 7;
export const OP_CAPSULE = 8;
export const OP_PUSH_TRANSFORM = 9;  // apply 4×4 inverse matrix to p (pre-order, like deformation push)
export const OP_POP_TRANSFORM = 10;  // restore p, back-transform gradient by linearᵀ

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
        case 'torus': {
            const n = node as TorusNode;
            opsOut.push(OP_TORUS);
            dataOut.push(n.position[0], n.position[1], n.position[2]);
            dataOut.push(n.majorRadius, n.minorRadius);
            break;
        }
        case 'capsule': {
            const n = node as CapsuleNode;
            opsOut.push(OP_CAPSULE);
            dataOut.push(n.position[0], n.position[1], n.position[2]);
            dataOut.push(n.radius, n.halfHeight);
            break;
        }
        case 'transform': {
            const n = node as TransformNode;
            opsOut.push(OP_PUSH_TRANSFORM);
            for (let i = 0; i < 16; i++) dataOut.push(n.inverseMatrix[i] ?? 0);
            compile(n.child);
            opsOut.push(OP_POP_TRANSFORM);
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

    } else if (op === OP_TORUS) {
        const cx = this.data[new_dp++], cy = this.data[new_dp++], cz = this.data[new_dp++];
        const R = this.data[new_dp++], r = this.data[new_dp++];
        const lx = new_px - cx, ly = new_py - cy, lz = new_pz - cz;
        const pi = new_sp * 4;
        new_sp++;
        mathStack[pi] = sdTorus(lx, ly, lz, R, r);
        const tg = sdTorusGrad(lx, ly, lz, R, r);
        mathStack[pi + 1] = tg.x; mathStack[pi + 2] = tg.y; mathStack[pi + 3] = tg.z;

    } else if (op === OP_CAPSULE) {
        const cx = this.data[new_dp++], cy = this.data[new_dp++], cz = this.data[new_dp++];
        const rad = this.data[new_dp++], hh = this.data[new_dp++];
        const lx = new_px - cx, ly = new_py - cy, lz = new_pz - cz;
        const pi = new_sp * 4;
        new_sp++;
        mathStack[pi] = sdCapsule(lx, ly, lz, rad, hh);
        const cg = sdCapsuleGrad(lx, ly, lz, rad, hh);
        mathStack[pi + 1] = cg.x; mathStack[pi + 2] = cg.y; mathStack[pi + 3] = cg.z;

    } else if (op === OP_PUSH_TRANSFORM) {
        // Save original point, apply affine p' = M·(p,1) with M = row-major inverse
        // matrix, and stash the linear 3×3 in mStack for the gradient back-transform.
        ptStack[new_wp * 3 + 0] = new_px;
        ptStack[new_wp * 3 + 1] = new_py;
        ptStack[new_wp * 3 + 2] = new_pz;
        const m0 = this.data[new_dp++], m1 = this.data[new_dp++], m2 = this.data[new_dp++], m3 = this.data[new_dp++];
        const m4 = this.data[new_dp++], m5 = this.data[new_dp++], m6 = this.data[new_dp++], m7 = this.data[new_dp++];
        const m8 = this.data[new_dp++], m9 = this.data[new_dp++], m10 = this.data[new_dp++], m11 = this.data[new_dp++];
        new_dp += 4; // skip bottom row (affine)
        const base = new_wp * 9;
        mStack[base + 0] = m0; mStack[base + 1] = m1; mStack[base + 2] = m2;
        mStack[base + 3] = m4; mStack[base + 4] = m5; mStack[base + 5] = m6;
        mStack[base + 6] = m8; mStack[base + 7] = m9; mStack[base + 8] = m10;
        const tx = m0 * new_px + m1 * new_py + m2 * new_pz + m3;
        const ty = m4 * new_px + m5 * new_py + m6 * new_pz + m7;
        const tz = m8 * new_px + m9 * new_py + m10 * new_pz + m11;
        new_px = tx; new_py = ty; new_pz = tz;
        new_wp = new_wp + 1;

    } else if (op === OP_POP_TRANSFORM) {
        // f(p) = g(Mp + t)  ⇒  ∇f = M_linᵀ · ∇g. Restore the original point.
        const wp = new_wp - 1;
        const base = wp * 9;
        const a = mStack[base + 0], b = mStack[base + 1], c = mStack[base + 2];
        const d = mStack[base + 3], e = mStack[base + 4], f = mStack[base + 5];
        const g = mStack[base + 6], h = mStack[base + 7], i = mStack[base + 8];
        const pi = (new_sp - 1) * 4;
        const gx = mathStack[pi + 1], gy = mathStack[pi + 2], gz = mathStack[pi + 3];
        mathStack[pi + 1] = a * gx + d * gy + g * gz;
        mathStack[pi + 2] = b * gx + e * gy + h * gz;
        mathStack[pi + 3] = c * gx + f * gy + i * gz;
        new_px = ptStack[wp * 3 + 0];
        new_py = ptStack[wp * 3 + 1];
        new_pz = ptStack[wp * 3 + 2];
        new_wp = wp;

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
