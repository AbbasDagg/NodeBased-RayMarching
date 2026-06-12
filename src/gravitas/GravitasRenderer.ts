// GravitasRenderer — CRA-compatible Three.js ShaderMaterial using the Gravitas
// PBR fragment shader. Replaces SDFMaterial.ts from Gravitas, removing the
// Vite virtual module import and assembling the shader from string constants.

import * as THREE from 'three';
import type { SDFRenderPacket } from './SDFCompiler';
import { GLSL_PRIMITIVES, GLSL_OPERATORS, FRAG_SHADER_BODY } from './glslShaders';

// Vertex shader: fullscreen quad in NDC, no MVP transform.
const VERT_SHADER = `void main() { gl_Position = vec4(position, 1.0); }`;

// dfgLUT is declared by lights_physical_pars_fragment for IBL energy compensation.
// We don't use indirect lighting, so a 1×1 stub is fine.
const dfgLutStub = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
dfgLutStub.needsUpdate = true;

// Assembly order (must match forward-declaration requirements in GLSL):
//   1. Three.js math helpers + light structs/uniforms
//   2. SDF primitives  (sdSphere, sdBox)
//   3. SDF operators   (MatResult, opSmoothUnionMR, …)
//   4. Scene + material sampler uniforms
//   5. Generated GLSL  (grav_map() + mapSmooth())
//   6. map() shim      (calls grav_map — required by calcNormal / raymarch in FRAG_SHADER_BODY)
//   7. Fragment shader body (raymarch, BRDF, main)
function buildFragmentShader(mapGLSL: string): string {
    return [
        THREE.ShaderChunk.common,
        THREE.ShaderChunk.lights_pars_begin,
        THREE.ShaderChunk.lights_physical_pars_fragment,
        GLSL_PRIMITIVES,
        GLSL_OPERATORS,
        'uniform sampler2D uSceneData;',
        'uniform sampler2D uMaterialData;',
        mapGLSL,
        // map() wrapper — grav_map returns vec2(dist, matId), exactly what the frag shader needs.
        'vec2 map(vec3 p) { return grav_map(p); }',
        FRAG_SHADER_BODY,
    ].join('\n');
}

function makeTexture(data: Float32Array, width: number): THREE.DataTexture {
    const tex = new THREE.DataTexture(new Float32Array(data), Math.max(width, 1), 1,
        THREE.RGBAFormat, THREE.FloatType);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.generateMipmaps = false;
    tex.flipY = false;
    tex.needsUpdate = true;
    return tex;
}

// THREE has no @types/three installed — all THREE.* references are typed as any.
// We access inherited ShaderMaterial properties through (this as any) so TypeScript
// doesn't complain about unknown properties on the subclass.
export class GravitasMaterial extends (THREE.ShaderMaterial as any) {
    private _sceneTex: any;
    private _matTex: any;
    private _lastHash: string;

    constructor(packet: SDFRenderPacket) {
        const sceneTex = makeTexture(packet.sceneData, packet.totalTexels);
        const matTex   = makeTexture(packet.materialData, packet.totalMaterials * 2);

        super({
            vertexShader: VERT_SHADER,
            fragmentShader: buildFragmentShader(packet.mapGLSL),
            uniforms: THREE.UniformsUtils.merge([
                THREE.UniformsLib.lights,
                {
                    dfgLUT:          { value: dfgLutStub },
                    uSceneData:      { value: null },
                    uMaterialData:   { value: null },
                    uMaterialBlend:  { value: true },
                    uCameraPos:      { value: new THREE.Vector3() },
                    uCameraMatrix:   { value: new THREE.Matrix4() },
                    uResolution:     { value: new THREE.Vector2(1, 1) },
                    uFov:            { value: 75.0 },
                    uMaxDist:        { value: 1000.0 },
                    uTime:           { value: 0.0 },
                    uClearColor:     { value: new THREE.Color(0x000000) },
                    uFogDensity:     { value: 0.0 },
                },
            ]),
            lights: true,
            depthTest: false,
            depthWrite: false,
        });

        this._sceneTex = sceneTex;
        this._matTex   = matTex;
        this._lastHash = packet.topologyHash;
        // UniformsUtils.merge clones textures — assign originals after super() so
        // in-place Float32Array updates later reach the GPU.
        (this as any).uniforms.uSceneData.value    = sceneTex;
        (this as any).uniforms.uMaterialData.value = matTex;
    }

    // Update from a new packet. Rebuilds shader only when topology changes.
    applyPacket(packet: SDFRenderPacket): void {
        if (packet.topologyHash !== this._lastHash) {
            (this as any).fragmentShader = buildFragmentShader(packet.mapGLSL);
            (this as any).needsUpdate = true;
            this._lastHash = packet.topologyHash;

            this._sceneTex.dispose();
            this._matTex.dispose();
            this._sceneTex = makeTexture(packet.sceneData, packet.totalTexels);
            this._matTex   = makeTexture(packet.materialData, packet.totalMaterials * 2);
            (this as any).uniforms.uSceneData.value    = this._sceneTex;
            (this as any).uniforms.uMaterialData.value = this._matTex;
        } else {
            this._sceneTex.image.data.set(packet.sceneData);
            this._sceneTex.needsUpdate = true;
            this._matTex.image.data.set(packet.materialData);
            this._matTex.needsUpdate = true;
        }
    }
}
