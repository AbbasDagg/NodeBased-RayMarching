import type { SDFNode } from './SDFSchema';
import type { SDFLayout } from './LayoutManager';
import { SDFOperatorNode, SDFDeformationNode } from './SDFSchema';

// Generates two GLSL functions from a compiled SDF tree:
//
//   vec2       grav_map(vec3 p)   — returns (distance, materialId float). Used by
//                                   MyRaymarcher's SDF map() wrapper and by the
//                                   Gravitas renderer's map() shim.
//
//   MatResult  mapSmooth(vec3 p)  — full PBR material blending path. Used only by
//                                   the Gravitas renderer after a ray hit.
//
// Convention for operators.glsl opSmoothSubtraction*:
//   arg a = cutter, arg b = base  (a carves into b: result = max(-a, b))
// In SmoothSubtractionNode: left=base, right=cutter → emit (right, left) to the operator.

export function generateGLSL(nodes: SDFNode[], layout: SDFLayout): string {
    const mapLines: string[] = [];
    const smoothLines: string[] = [];
    const mapRoots: string[] = [];
    const smoothRoots: string[] = [];

    for (const node of nodes) {
        const { mapVar, smoothVar } = emitNode(node, layout, mapLines, smoothLines, 'p');
        mapRoots.push(mapVar);
        smoothRoots.push(smoothVar);
    }

    // If there are multiple top-level roots, union them together.
    let mapResult   = mapRoots[0];
    let smoothResult = smoothRoots[0];
    for (let i = 1; i < mapRoots.length; i++) {
        mapResult    = `opUnionMat(${mapResult}, ${mapRoots[i]})`;
        smoothResult = `opUnionMR(${smoothResult}, ${smoothRoots[i]})`;
    }

    const gravMap = [
        'vec2 grav_map(vec3 p) {',
        ...mapLines.map(l => '  ' + l),
        `  return ${mapResult};`,
        '}',
    ].join('\n');

    const mapSmooth = [
        'MatResult mapSmooth(vec3 p) {',
        ...smoothLines.map(l => '  ' + l),
        `  return ${smoothResult};`,
        '}',
    ].join('\n');

    return gravMap + '\n\n' + mapSmooth;
}

// Returns { mapVar, smoothVar } — the result variable names for each output function.
function emitNode(
    node: SDFNode,
    layout: SDFLayout,
    mapLines: string[],
    smoothLines: string[],
    pVar: string,
): { mapVar: string; smoothVar: string } {
    const entry = layout.get(node.id);
    if (!entry) throw new Error(`GLSLGenerator: node "${node.id}" not in layout`);
    const o   = entry.offset;
    const mid = entry.materialId;

    switch (node.type) {
        case 'sphere': {
            const dv = `_d${o}`;
            const sdfExpr = `sdSphere(${pVar}.x-${dv}.x, ${pVar}.y-${dv}.y, ${pVar}.z-${dv}.z, ${dv}.w)`;
            mapLines.push(
                `vec4 ${dv} = texelFetch(uSceneData, ivec2(${o}, 0), 0);`,
                `vec2 _r${o} = vec2(${sdfExpr}, ${mid}.0);`,
            );
            smoothLines.push(
                `vec4 ${dv} = texelFetch(uSceneData, ivec2(${o}, 0), 0);`,
                `vec4 _ma${o} = texelFetch(uMaterialData, ivec2(${mid * 2},   0), 0);`,
                `vec4 _mb${o} = texelFetch(uMaterialData, ivec2(${mid * 2+1}, 0), 0);`,
                `MatResult _mr${o} = MatResult(${sdfExpr}, _ma${o}.rgb, _ma${o}.a, _mb${o}.r, _mb${o}.gba);`,
            );
            return { mapVar: `_r${o}`, smoothVar: `_mr${o}` };
        }

        case 'box': {
            const dv0 = `_d${o}`, dv1 = `_d${o+1}`;
            const sdfExpr = `sdBox(${pVar}.x-${dv0}.x, ${pVar}.y-${dv0}.y, ${pVar}.z-${dv0}.z, ${dv0}.w, ${dv1}.x, ${dv1}.y)`;
            mapLines.push(
                `vec4 ${dv0} = texelFetch(uSceneData, ivec2(${o},   0), 0);`,
                `vec4 ${dv1} = texelFetch(uSceneData, ivec2(${o+1}, 0), 0);`,
                `vec2 _r${o} = vec2(${sdfExpr}, ${mid}.0);`,
            );
            smoothLines.push(
                `vec4 ${dv0} = texelFetch(uSceneData, ivec2(${o},   0), 0);`,
                `vec4 ${dv1} = texelFetch(uSceneData, ivec2(${o+1}, 0), 0);`,
                `vec4 _ma${o} = texelFetch(uMaterialData, ivec2(${mid * 2},   0), 0);`,
                `vec4 _mb${o} = texelFetch(uMaterialData, ivec2(${mid * 2+1}, 0), 0);`,
                `MatResult _mr${o} = MatResult(${sdfExpr}, _ma${o}.rgb, _ma${o}.a, _mb${o}.r, _mb${o}.gba);`,
            );
            return { mapVar: `_r${o}`, smoothVar: `_mr${o}` };
        }

        case 'smoothUnion': {
            const n = node as SDFOperatorNode;
            const L = emitNode(n.left,  layout, mapLines, smoothLines, pVar);
            const R = emitNode(n.right, layout, mapLines, smoothLines, pVar);
            mapLines.push(
                `vec4 _dk${o} = texelFetch(uSceneData, ivec2(${o}, 0), 0);`,
                `vec2 _r${o} = opSmoothUnionMat(${L.mapVar}, ${R.mapVar}, _dk${o}.x);`,
            );
            smoothLines.push(
                `vec4 _dk${o} = texelFetch(uSceneData, ivec2(${o}, 0), 0);`,
                `MatResult _mr${o} = opSmoothUnionMR(${L.smoothVar}, ${R.smoothVar}, _dk${o}.x);`,
            );
            return { mapVar: `_r${o}`, smoothVar: `_mr${o}` };
        }

        case 'smoothSubtraction': {
            const n = node as SDFOperatorNode;
            const L = emitNode(n.left,  layout, mapLines, smoothLines, pVar); // base
            const R = emitNode(n.right, layout, mapLines, smoothLines, pVar); // cutter
            // operators.glsl convention: first arg = cutter, second = base
            mapLines.push(
                `vec4 _dk${o} = texelFetch(uSceneData, ivec2(${o}, 0), 0);`,
                `vec2 _r${o} = opSmoothSubtractionMat(${R.mapVar}, ${L.mapVar}, _dk${o}.x);`,
            );
            smoothLines.push(
                `vec4 _dk${o} = texelFetch(uSceneData, ivec2(${o}, 0), 0);`,
                `MatResult _mr${o} = opSmoothSubtractionMR(${R.smoothVar}, ${L.smoothVar}, _dk${o}.x);`,
            );
            return { mapVar: `_r${o}`, smoothVar: `_mr${o}` };
        }

        // Pre-order: matrix rows at texels o..o+2 (row 3 = [0,0,0,1] implicit).
        case 'transform': {
            const n = node as SDFDeformationNode;
            const pl = `_pl${o}`;
            const matLines = [
                `vec4 _m0o${o} = texelFetch(uSceneData, ivec2(${o},   0), 0);`,
                `vec4 _m1o${o} = texelFetch(uSceneData, ivec2(${o+1}, 0), 0);`,
                `vec4 _m2o${o} = texelFetch(uSceneData, ivec2(${o+2}, 0), 0);`,
                `vec3 ${pl} = vec3(`,
                `  dot(_m0o${o}.xyz, ${pVar}) + _m0o${o}.w,`,
                `  dot(_m1o${o}.xyz, ${pVar}) + _m1o${o}.w,`,
                `  dot(_m2o${o}.xyz, ${pVar}) + _m2o${o}.w`,
                `);`,
            ];
            mapLines.push(...matLines);
            smoothLines.push(...matLines);
            return emitNode(n.child, layout, mapLines, smoothLines, pl);
        }

        case 'deformation': {
            const n = node as SDFDeformationNode;
            const pd = `_pd${o}`;
            const defLines = [
                `vec4 _dd${o} = texelFetch(uSceneData, ivec2(${o}, 0), 0);`,
                `vec3 ${pd} = vec3(${pVar}.x, ${pVar}.y + _dd${o}.y * sin(_dd${o}.x * ${pVar}.x), ${pVar}.z);`,
            ];
            mapLines.push(...defLines);
            smoothLines.push(...defLines);
            return emitNode(n.child, layout, mapLines, smoothLines, pd);
        }

        default:
            throw new Error(`GLSLGenerator: unknown node type "${node.type}"`);
    }
}
