// BoundsCalculator — ported from gravitas/src/renderer/compiler/BoundsCalculator.ts.
// mergeBoundSpheres is his code verbatim. Extensions for the thesis node set:
//   - primitiveRadius for box / torus / capsule (his only knew sphere)
//   - transform: child bound mapped through the FORWARD matrix (inverse of the
//     node's stored inverseMatrix); radius scaled by the Frobenius norm of the
//     linear part (≥ spectral norm ⇒ conservative)
//   - smooth ops: bound inflated by k/6 (max outward bulge of the smooth blend)
//   - deformation: bound inflated by |amplitude| (his version passed through
//     unchanged, which under-bounds for large warps)
// His per-node AABB texture encoding is intentionally NOT ported: the fragment
// shader never samples uAABBData (verified against SDFMaterial.frag) — only the
// per-object bounding spheres (uObjectCenter/uObjectRadius) are consumed.

import type { SDFNode } from './SDFSchema';
import { SDFOperatorNode, SDFSmoothOperatorNode, SDFDeformationNode, TransformNode } from './SDFSchema';

export interface BoundSphere {
    center: [number, number, number];
    radius: number;
}

// Row-major 4×4 inverse (adjugate method). Returns identity when singular.
function invert4(a: number[]): number[] {
    const inv = new Array(16);
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
    const det = a[0]*inv[0] + a[1]*inv[4] + a[2]*inv[8] + a[3]*inv[12];
    if (Math.abs(det) < 1e-12) return [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
    for (let i = 0; i < 16; i++) inv[i] /= det;
    return inv;
}

export class BoundsCalculator {
    // Per-ROOT bounding spheres — one per entry in `nodes` (his per-object model).
    static computeRootBounds(nodes: SDFNode[]): BoundSphere[] {
        return nodes.map((n) => this.computeRecursive(n));
    }

    private static computeRecursive(node: SDFNode): BoundSphere {
        const n = node as any;
        switch (node.type) {
            case 'sphere':
            case 'box':
            case 'torus':
            case 'capsule':
                return {
                    center: [n.position[0], n.position[1], n.position[2]],
                    radius: this.primitiveRadius(node),
                };

            case 'smoothUnion':
            case 'smoothSubtraction': {
                const on = node as SDFOperatorNode;
                const left = this.computeRecursive(on.left);
                const right = this.computeRecursive(on.right);
                const merged = this.mergeBoundSpheres(left, right);
                // Smooth blend can bulge outward by at most k/6 (h³k/6 with h ≤ 1).
                const k = (node as SDFSmoothOperatorNode).k || 0;
                return { center: merged.center, radius: merged.radius + Math.max(k, 0) / 6 };
            }

            case 'deformation': {
                const dn = node as SDFDeformationNode;
                const child = this.computeRecursive(dn.child);
                // Y-warp moves points by at most |amplitude|.
                return { center: child.center, radius: child.radius + Math.abs(n.amplitude ?? 0) };
            }

            case 'transform': {
                const tn = node as TransformNode;
                const child = this.computeRecursive(tn.child);
                // Child bound lives in LOCAL space; map through the forward matrix.
                const M = invert4(tn.inverseMatrix);
                const [cx, cy, cz] = child.center;
                const wx = M[0]*cx + M[1]*cy + M[2]*cz + M[3];
                const wy = M[4]*cx + M[5]*cy + M[6]*cz + M[7];
                const wz = M[8]*cx + M[9]*cy + M[10]*cz + M[11];
                // Frobenius norm of the linear part ≥ spectral norm ⇒ conservative radius scale.
                const fro = Math.sqrt(
                    M[0]*M[0] + M[1]*M[1] + M[2]*M[2] +
                    M[4]*M[4] + M[5]*M[5] + M[6]*M[6] +
                    M[8]*M[8] + M[9]*M[9] + M[10]*M[10]
                );
                return { center: [wx, wy, wz], radius: child.radius * Math.max(fro, 1e-6) };
            }

            default:
                throw new Error(`Unsupported node type: ${(node as any).type}`);
        }
    }

    private static primitiveRadius(node: SDFNode): number {
        const n = node as any;
        switch (node.type) {
            case 'sphere':
                return n.radius;
            case 'box': {
                const [hx, hy, hz] = n.halfExtents;
                return Math.sqrt(hx * hx + hy * hy + hz * hz);
            }
            case 'torus':
                return n.majorRadius + n.minorRadius;
            case 'capsule':
                return Math.max(n.halfHeight, n.radius);
            default:
                return 0;
        }
    }

    // — his code verbatim —
    private static mergeBoundSpheres(left: BoundSphere, right: BoundSphere): BoundSphere {
        const dx = right.center[0] - left.center[0];
        const dy = right.center[1] - left.center[1];
        const dz = right.center[2] - left.center[2];
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (distance + right.radius <= left.radius) {
            return { center: [...left.center] as [number, number, number], radius: left.radius };
        }

        if (distance + left.radius <= right.radius) {
            return { center: [...right.center] as [number, number, number], radius: right.radius };
        }

        const radius = (distance + left.radius + right.radius) * 0.5;
        const ratio = distance > 0 ? (radius - left.radius) / distance : 0;

        const center: [number, number, number] = [
            left.center[0] + dx * ratio,
            left.center[1] + dy * ratio,
            left.center[2] + dz * ratio,
        ];

        return { center, radius };
    }
}
