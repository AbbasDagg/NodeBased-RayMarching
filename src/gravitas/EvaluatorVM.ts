// Gravitas EvaluatorVM — copied from gravitas/src/sdf/EvaluatorVM.ts
// Extended to expose evaluateGradientNumerical() for the thesis loss function.

import { SDFNode } from './SDFSchema';
import { compileEvaluatorNode, evaluateEvaluatorVM } from './EvaluatorVM.generated';

export class EvaluatorVM {
    ops: Int32Array;
    data: Float32Array;

    // Pre-allocated execution stacks
    private mathStack = new Float32Array(256 * 4);
    private ptStack   = new Float32Array(256 * 3);
    private mStack    = new Float32Array(256 * 9);

    constructor(rootNode: SDFNode) {
        const opsOut: number[] = [];
        const dataOut: number[] = [];
        const compile = (node: SDFNode) => compileEvaluatorNode(node, opsOut, dataOut, compile);
        compile(rootNode);
        this.ops  = new Int32Array(opsOut);
        this.data = new Float32Array(dataOut);
    }

    // Returns [dist, gx, gy, gz] in out[0..3].
    evaluate(x: number, y: number, z: number, out: Float32Array) {
        const { mathStack, ptStack, mStack } = this;
        let sp = 0, wp = 0, dp = 0;
        let px = x, py = y, pz = z;

        for (let i = 0; i < this.ops.length; i++) {
            const result = evaluateEvaluatorVM.call(
                this, this.ops[i],
                px, py, pz, sp, wp, dp,
                mathStack, ptStack, mStack,
            );
            px = result.px; py = result.py; pz = result.pz;
            sp = result.sp; wp = result.wp; dp = result.dp;
        }

        out[0] = mathStack[0];
        out[1] = mathStack[1];
        out[2] = mathStack[2];
        out[3] = mathStack[3];
    }

    // Convenience: returns distance only.
    distance(x: number, y: number, z: number): number {
        const out = new Float32Array(4);
        this.evaluate(x, y, z, out);
        return out[0];
    }

    // Central-difference gradient — exact regardless of node types.
    // Use this when you need a reliable gradient for the loss function.
    evaluateGradientNumerical(
        x: number, y: number, z: number, eps = 1e-4
    ): { x: number; y: number; z: number } {
        return {
            x: (this.distance(x + eps, y, z) - this.distance(x - eps, y, z)) / (2 * eps),
            y: (this.distance(x, y + eps, z) - this.distance(x, y - eps, z)) / (2 * eps),
            z: (this.distance(x, y, z + eps) - this.distance(x, y, z - eps)) / (2 * eps),
        };
    }
}
