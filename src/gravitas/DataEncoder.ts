import type { SDFNode } from './SDFSchema';
import type { SDFLayout } from './LayoutManager';
import { SDFOperatorNode, SDFDeformationNode } from './SDFSchema';

// Write shape geometry / operator parameters into the flat scene data buffer.
// Buffer layout: 4 floats per texel, one or more texels per node.
export function encodeScene(nodes: SDFNode[], layout: SDFLayout, out: Float32Array): void {
    for (const node of nodes) encodeNode(node, layout, out);
}

function encodeNode(node: SDFNode, layout: SDFLayout, out: Float32Array): void {
    const entry = layout.get(node.id);
    if (!entry) throw new Error(`DataEncoder: node "${node.id}" not in layout`);
    const b = entry.offset * 4;
    const n = node as any;

    switch (node.type) {
        case 'sphere':
            out[b+0] = n.position[0]; out[b+1] = n.position[1]; out[b+2] = n.position[2]; out[b+3] = n.radius;
            break;

        case 'box':
            out[b+0] = n.position[0]; out[b+1] = n.position[1]; out[b+2] = n.position[2]; out[b+3] = n.halfExtents[0];
            out[b+4] = n.halfExtents[1]; out[b+5] = n.halfExtents[2]; out[b+6] = 0; out[b+7] = 0;
            break;

        case 'torus':
            out[b+0] = n.position[0]; out[b+1] = n.position[1]; out[b+2] = n.position[2]; out[b+3] = n.majorRadius;
            out[b+4] = n.minorRadius; out[b+5] = 0; out[b+6] = 0; out[b+7] = 0;
            break;

        case 'capsule':
            out[b+0] = n.position[0]; out[b+1] = n.position[1]; out[b+2] = n.position[2]; out[b+3] = n.radius;
            out[b+4] = n.halfHeight; out[b+5] = 0; out[b+6] = 0; out[b+7] = 0;
            break;

        case 'smoothUnion':
        case 'smoothSubtraction': {
            const op = node as SDFOperatorNode;
            encodeNode(op.left,  layout, out);
            encodeNode(op.right, layout, out);
            out[b] = (op as any).k;
            break;
        }

        case 'deformation': {
            const dn = node as SDFDeformationNode;
            encodeNode(dn.child, layout, out);
            out[b+0] = n.frequency; out[b+1] = n.amplitude;
            break;
        }

        // Pre-order: write the 16-float row-major inverse matrix first, then child.
        case 'transform': {
            const tn = node as SDFDeformationNode;
            for (let i = 0; i < 16; i++) out[b + i] = (n as any).inverseMatrix[i] ?? 0;
            encodeNode(tn.child, layout, out);
            break;
        }

        default:
            throw new Error(`DataEncoder: unknown node type "${node.type}"`);
    }
}

// PBR material data — 3 texels (12 floats) per leaf, same traversal order as LayoutManager.
//   texel 3i   → [r, g, b, metalness]
//   texel 3i+1 → [roughness, emissiveR, emissiveG, emissiveB]
//   texel 3i+2 → [emissiveIntensity, specular*, ao*, reserved]   (*reserved — not consumed yet)
// The 3rd texel is reserved headroom so specular/IOR/AO can be added later without
// re-plumbing the texel stride across the compiler + shaders.
export const MATERIAL_TEXELS = 3;

export function encodeMaterials(nodes: SDFNode[], out: Float32Array): void {
    const leaves: SDFNode[] = [];
    for (const node of nodes) collectLeaves(node, leaves);

    for (let i = 0; i < leaves.length; i++) {
        const mat = (leaves[i] as any).material ?? {};
        const color: [number, number, number] = mat.color ?? [1, 1, 1];
        const metalness: number = mat.metalness ?? 0.0;
        const roughness: number = mat.roughness ?? 0.5;
        const emv: [number, number, number] = mat.emissive ?? [0, 0, 0];
        const emissiveIntensity: number = mat.emissiveIntensity ?? 1.0;
        const b = i * MATERIAL_TEXELS * 4;
        out[b+0]  = color[0]; out[b+1] = color[1]; out[b+2] = color[2]; out[b+3] = metalness;
        out[b+4]  = roughness; out[b+5] = emv[0]; out[b+6] = emv[1]; out[b+7] = emv[2];
        out[b+8]  = emissiveIntensity; out[b+9] = 0; out[b+10] = 0; out[b+11] = 0;
    }
}

function collectLeaves(node: SDFNode, result: SDFNode[]): void {
    switch (node.type) {
        case 'sphere':
        case 'box':
        case 'torus':
        case 'capsule':
            result.push(node);
            break;
        case 'smoothUnion':
        case 'smoothSubtraction': {
            const n = node as SDFOperatorNode;
            collectLeaves(n.left,  result);
            collectLeaves(n.right, result);
            break;
        }
        case 'deformation':
        case 'transform':
            collectLeaves((node as SDFDeformationNode).child, result);
            break;
    }
}
