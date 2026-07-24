import type { SDFNode } from './SDFSchema';
import { computeLayout } from './LayoutManager';
import { encodeScene, encodeMaterials, MATERIAL_TEXELS } from './DataEncoder';
import { generateGLSL } from './GLSLGenerator';
import { BoundsCalculator } from './BoundsCalculator';
import { GLSL_PRIMITIVES, GLSL_OPERATORS } from './glslShaders';

export interface SDFRenderPacket {
    mapGLSL: string;            // GLSL: grav_map(p) + mapSmooth(p)
    declarations: string;       // GLSL helpers to prepend (primitives + operators)
    sceneData: Float32Array;    // scene geometry texture data (4 floats per texel)
    materialData: Float32Array; // PBR material data (2×4 floats per leaf)
    topologyHash: string;
    totalTexels: number;
    totalMaterials: number;
    sdfRoot?: SDFNode;          // CPU-evaluable tree root (EvaluatorVM / gradient overlay)
    // Per-object bounding spheres (BoundsCalculator) for the uObjectCenter /
    // uObjectRadius guards in the generated map(). One entry per top-level root.
    objectCenters: number[][];
    objectRadii: number[];
}

// Compact string that uniquely identifies the tree structure (not parameters).
// Same hash ⟹ same GLSL → skip recompile and only re-encode texture data.
function topologyHash(nodes: SDFNode[]): string {
    function hashNode(n: SDFNode): string {
        const nn = n as any;
        switch (n.type) {
            case 'sphere':
            case 'box':
            case 'torus':
            case 'capsule':
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
    // Bounds are parameter-dependent (positions/sizes), so recompute them here too.
    if (previousPacket && previousPacket.topologyHash === hash) {
        const { layout } = computeLayout(nodes);
        encodeScene(nodes, layout, previousPacket.sceneData);
        encodeMaterials(nodes, previousPacket.materialData);
        const bounds = BoundsCalculator.computeRootBounds(nodes);
        previousPacket.objectCenters = bounds.map(b => b.center as number[]);
        previousPacket.objectRadii  = bounds.map(b => b.radius);
        return previousPacket;
    }

    const { layout, totalTexels, totalMaterials } = computeLayout(nodes);

    const mapGLSL   = generateGLSL(nodes, layout);
    const sceneData = new Float32Array(Math.max(totalTexels, 1) * 4);
    const materialData = new Float32Array(Math.max(totalMaterials, 1) * MATERIAL_TEXELS * 4);

    encodeScene(nodes, layout, sceneData);
    encodeMaterials(nodes, materialData);

    const bounds = BoundsCalculator.computeRootBounds(nodes);

    const declarations = GLSL_PRIMITIVES + '\n' + GLSL_OPERATORS;

    return {
        mapGLSL, declarations, sceneData, materialData, topologyHash: hash, totalTexels, totalMaterials,
        objectCenters: bounds.map(b => b.center as number[]),
        objectRadii: bounds.map(b => b.radius),
    };
}
