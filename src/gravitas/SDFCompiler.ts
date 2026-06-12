import type { SDFNode } from './SDFSchema';
import { computeLayout } from './LayoutManager';
import { encodeScene, encodeMaterials } from './DataEncoder';
import { generateGLSL } from './GLSLGenerator';
import { GLSL_PRIMITIVES, GLSL_OPERATORS } from './glslShaders';

export interface SDFRenderPacket {
    mapGLSL: string;            // GLSL: grav_map(p) + mapSmooth(p)
    declarations: string;       // GLSL helpers to prepend (primitives + operators)
    sceneData: Float32Array;    // scene geometry texture data (4 floats per texel)
    materialData: Float32Array; // PBR material data (2×4 floats per leaf)
    topologyHash: string;
    totalTexels: number;
    totalMaterials: number;
}

// Compact string that uniquely identifies the tree structure (not parameters).
// Same hash ⟹ same GLSL → skip recompile and only re-encode texture data.
function topologyHash(nodes: SDFNode[]): string {
    function hashNode(n: SDFNode): string {
        const nn = n as any;
        switch (n.type) {
            case 'sphere':
            case 'box':
                return `${n.id}:${n.type}`;
            case 'smoothUnion':
            case 'smoothSubtraction':
                return `(${hashNode(nn.left)}|${n.type}|${hashNode(nn.right)})`;
            case 'deformation':
            case 'transform':
                return `${n.type}(${hashNode(nn.child)})`;
            default:
                return `${n.id}:${n.type}`;
        }
    }
    return nodes.map(hashNode).join(',');
}

export function compileSDF(
    nodes: SDFNode[],
    previousPacket?: SDFRenderPacket | null,
): SDFRenderPacket {
    const hash = topologyHash(nodes);

    // Fast path: topology unchanged → reuse GLSL, just refresh texture data in-place.
    if (previousPacket && previousPacket.topologyHash === hash) {
        const { layout } = computeLayout(nodes);
        encodeScene(nodes, layout, previousPacket.sceneData);
        encodeMaterials(nodes, previousPacket.materialData);
        return previousPacket;
    }

    const { layout, totalTexels, totalMaterials } = computeLayout(nodes);

    const mapGLSL   = generateGLSL(nodes, layout);
    const sceneData = new Float32Array(Math.max(totalTexels, 1) * 4);
    const materialData = new Float32Array(Math.max(totalMaterials, 1) * 2 * 4);

    encodeScene(nodes, layout, sceneData);
    encodeMaterials(nodes, materialData);

    const declarations = GLSL_PRIMITIVES + '\n' + GLSL_OPERATORS;

    return { mapGLSL, declarations, sceneData, materialData, topologyHash: hash, totalTexels, totalMaterials };
}
