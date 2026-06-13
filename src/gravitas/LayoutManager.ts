import type { SDFNode } from './SDFSchema';
import { SDFOperatorNode, SDFDeformationNode } from './SDFSchema';

export interface LayoutEntry {
    offset: number;     // index into scene data texture
    materialId: number; // leaf material slot (-1 for operators)
    nodeId: number;     // sequential visit index
}

export type SDFLayout = Map<string, LayoutEntry>;

export interface LayoutResult {
    layout: SDFLayout;
    totalTexels: number;
    totalMaterials: number;
    totalNodes: number;
}

// Texels consumed per node type in the scene data texture.
const TEXEL_COUNTS: Record<string, number> = {
    sphere: 1,
    box: 2,
    smoothUnion: 1,
    smoothSubtraction: 1,
    deformation: 1,
    transform: 4, // 4 rows × 4 floats = full 4×4 inverse matrix
};

function layoutNode(
    node: SDFNode,
    cursor: { at: number },
    matCur: { at: number },
    nodeCur: { at: number },
    layout: SDFLayout,
): void {
    switch (node.type) {
        case 'sphere':
        case 'box':
            layout.set(node.id, { offset: cursor.at, materialId: matCur.at, nodeId: nodeCur.at });
            cursor.at += TEXEL_COUNTS[node.type]!;
            matCur.at++;
            nodeCur.at++;
            break;

        case 'smoothUnion':
        case 'smoothSubtraction': {
            const n = node as SDFOperatorNode;
            layoutNode(n.left,  cursor, matCur, nodeCur, layout);
            layoutNode(n.right, cursor, matCur, nodeCur, layout);
            layout.set(node.id, { offset: cursor.at, materialId: -1, nodeId: nodeCur.at });
            cursor.at += TEXEL_COUNTS[node.type]!;
            nodeCur.at++;
            break;
        }

        case 'deformation': {
            const n = node as SDFDeformationNode;
            layoutNode(n.child, cursor, matCur, nodeCur, layout);
            layout.set(node.id, { offset: cursor.at, materialId: -1, nodeId: nodeCur.at });
            cursor.at += TEXEL_COUNTS.deformation!;
            nodeCur.at++;
            break;
        }

        // transform is PRE-ORDER: matrix texels allocated before child so GLSL
        // emits the point transform before evaluating the child SDF.
        case 'transform': {
            const n = node as SDFDeformationNode;
            layout.set(node.id, { offset: cursor.at, materialId: -1, nodeId: nodeCur.at });
            cursor.at += 4;
            nodeCur.at++;
            layoutNode(n.child, cursor, matCur, nodeCur, layout);
            break;
        }

        default:
            throw new Error(`LayoutManager: unknown node type "${node.type}"`);
    }
}

export function computeLayout(nodes: SDFNode[]): LayoutResult {
    const layout: SDFLayout = new Map();
    const cursor  = { at: 0 };
    const matCur  = { at: 0 };
    const nodeCur = { at: 0 };

    for (const node of nodes) layoutNode(node, cursor, matCur, nodeCur, layout);

    return { layout, totalTexels: cursor.at, totalMaterials: matCur.at, totalNodes: nodeCur.at };
}
