// GLSL source constants — embedded as strings so CRA/webpack needs no raw-loader.
//
// GLSL_OPERATORS  : verbatim copy of gravitas/src/renderer/glsl/operators.glsl
// FRAG_SHADER_BODY: verbatim copy of gravitas/src/renderer/SDFMaterial.frag
// GLSL_PRIMITIVES : GLSL equivalents of gravitas/src/sdf/primitives.generated.ts
//                   (virtual:sdf-primitives is a Vite plugin that generates GLSL from
//                    those TS functions — we replicate the same signatures here)

// ---------------------------------------------------------------------------
// SDF primitive functions (replacing virtual:sdf-primitives)
// Signatures match primitives.generated.ts exactly; sdBox and opSmoothSubtraction
// are our thesis extensions (not in the original Gravitas primitives).
// ---------------------------------------------------------------------------
export const GLSL_PRIMITIVES = `
float sdSphere(float x, float y, float z, float radius) {
    return sqrt(x*x + y*y + z*z) - radius;
}

float sdBox(float x, float y, float z, float hx, float hy, float hz) {
    float dx = abs(x) - hx;
    float dy = abs(y) - hy;
    float dz = abs(z) - hz;
    float ox = max(dx, 0.0), oy = max(dy, 0.0), oz = max(dz, 0.0);
    return sqrt(ox*ox + oy*oy + oz*oz) + min(max(dx, max(dy, dz)), 0.0);
}

vec3 opDeformation(float x, float y, float z, float frequency, float amplitude) {
    return vec3(x, y + amplitude * sin(frequency * x), z);
}
`;

// ---------------------------------------------------------------------------
// operators.glsl — verbatim copy of gravitas/src/renderer/glsl/operators.glsl
// ---------------------------------------------------------------------------
export const GLSL_OPERATORS = `// SDF operator library — quaternion rotation, AABB helpers, smooth boolean ops,
// material blending. Distance functions live in primitives.generated.glsl.

// Rotate vector v by unit quaternion q (xyzw layout)
// Uses the optimized formula: v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v)
vec3 quatRotate(vec4 q, vec3 v) {
    return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
}

float distToBound(vec3 p, vec4 bound) {
    return length(p - bound.xyz) - bound.w;
}

// ─── Float operators (kept for any direct use) ───────────────────────────────

// ─── Mat operators — return vec2(distance, materialId) ───────────────────────
// Each operator propagates or blends the materialId of its inputs.

// Union: closer surface wins the material
vec2 opUnionMat(vec2 a, vec2 b) {
    return a.x < b.x ? a : b;
}

// Smooth union keeps nearest-material selection for the fast path.
// Full property blending is handled separately by MatResult operators.
vec2 opSmoothUnionMat(vec2 a, vec2 b, float k) {
    if (k <= 0.0) {
        return a.x < b.x ? a : b;
    }

    float h = max(k - abs(a.x - b.x), 0.0) / k;
    float d = min(a.x, b.x) - h * h * h * k * (1.0 / 6.0);
    float m = a.x < b.x ? a.y : b.y;
    return vec2(d, m);
}

// Subtraction: a carves into b. Surface is always b's material;
// at the cut boundary the smooth variant blends toward a's material.
vec2 opSubtractionMat(vec2 a, vec2 b) {
    return vec2(max(-a.x, b.x), b.y);
}

vec2 opSmoothSubtractionMat(vec2 a, vec2 b, float k) {
    if (k <= 0.0) {
        return opSubtractionMat(a, b);
    }

    float negAX = -a.x;
    float h = max(k - abs(negAX - b.x), 0.0) / k;
    float d = max(negAX, b.x) + h * h * h * k * (1.0 / 6.0);
    float m = negAX > b.x ? a.y : b.y;
    return vec2(d, m);
}

// Intersection: surface with larger SDF value wins the material
vec2 opIntersectionMat(vec2 a, vec2 b) {
    return a.x > b.x ? a : b;
}

vec2 opSmoothIntersectionMat(vec2 a, vec2 b, float k) {
    if (k <= 0.0) {
        return opIntersectionMat(a, b);
    }

    float h = max(k - abs(a.x - b.x), 0.0) / k;
    float d = max(a.x, b.x) + h * h * h * k * (1.0 / 6.0);
    float m = a.x > b.x ? a.y : b.y;
    return vec2(d, m);
}

struct MatResult {
    float d;
    vec3 alb;
    float mtl;
    float rgh;
    vec3 emv;
};

MatResult opUnionMR(MatResult a, MatResult b) {
    float t = step(a.d, b.d);
    MatResult r;
    r.d = mix(b.d, a.d, t);
    r.alb = mix(b.alb, a.alb, t);
    r.mtl = mix(b.mtl, a.mtl, t);
    r.rgh = mix(b.rgh, a.rgh, t);
    r.emv = mix(b.emv, a.emv, t);
    return r;
}

MatResult opSmoothUnionMR(MatResult a, MatResult b, float k) {
    if (k <= 0.0) {
        return opUnionMR(a, b);
    }

    float h = max(k - abs(a.d - b.d), 0.0) / k;
    float m = 0.5 * h * h;
    float t = a.d < b.d ? 1.0 - m : m;

    MatResult r;
    r.d = min(a.d, b.d) - h * h * h * k * (1.0 / 6.0);
    r.alb = mix(b.alb, a.alb, t);
    r.mtl = mix(b.mtl, a.mtl, t);
    r.rgh = mix(b.rgh, a.rgh, t);
    r.emv = mix(b.emv, a.emv, t);
    return r;
}

MatResult opSubtractionMR(MatResult a, MatResult b) {
    float t = step(-a.d, b.d);
    MatResult r;
    r.d = max(-a.d, b.d);
    r.alb = mix(a.alb, b.alb, t);
    r.mtl = mix(a.mtl, b.mtl, t);
    r.rgh = mix(a.rgh, b.rgh, t);
    r.emv = mix(a.emv, b.emv, t);
    return r;
}

MatResult opSmoothSubtractionMR(MatResult a, MatResult b, float k) {
    if (k <= 0.0) {
        return opSubtractionMR(a, b);
    }

    float negAD = -a.d;
    float h = max(k - abs(negAD - b.d), 0.0) / k;
    float m = 0.5 * h * h;
    float t = negAD > b.d ? m : 1.0 - m;

    MatResult r;
    r.d = max(negAD, b.d) + h * h * h * k * (1.0 / 6.0);
    r.alb = mix(a.alb, b.alb, t);
    r.mtl = mix(a.mtl, b.mtl, t);
    r.rgh = mix(a.rgh, b.rgh, t);
    r.emv = mix(a.emv, b.emv, t);
    return r;
}

MatResult opIntersectionMR(MatResult a, MatResult b) {
    float t = step(b.d, a.d);
    MatResult r;
    r.d = max(a.d, b.d);
    r.alb = mix(b.alb, a.alb, t);
    r.mtl = mix(b.mtl, a.mtl, t);
    r.rgh = mix(b.rgh, a.rgh, t);
    r.emv = mix(b.emv, a.emv, t);
    return r;
}

MatResult opSmoothIntersectionMR(MatResult a, MatResult b, float k) {
    if (k <= 0.0) {
        return opIntersectionMR(a, b);
    }

    float h = max(k - abs(a.d - b.d), 0.0) / k;
    float m = 0.5 * h * h;
    float t = a.d > b.d ? 1.0 - m : m;

    MatResult r;
    r.d = max(a.d, b.d) + h * h * h * k * (1.0 / 6.0);
    r.alb = mix(b.alb, a.alb, t);
    r.mtl = mix(b.mtl, a.mtl, t);
    r.rgh = mix(b.rgh, a.rgh, t);
    r.emv = mix(b.emv, a.emv, t);
    return r;
}
`;

// ---------------------------------------------------------------------------
// SDFMaterial.frag — verbatim copy of gravitas/src/renderer/SDFMaterial.frag
// Prepended by GravitasRenderer.buildFragmentShader() with: Three.js chunks,
// GLSL_PRIMITIVES, GLSL_OPERATORS, sampler uniforms, and the generated
// grav_map() + mapSmooth() + map() shim.
// ---------------------------------------------------------------------------
export const FRAG_SHADER_BODY = `// Three.js chunks prepended by SDFMaterial.ts (in order):
//   \`common\`                        → PI, RECIPROCAL_PI, saturate(), pow2(), EPSILON, BRDF_Lambert(), F_Schlick()
//   \`lights_pars_begin\`             → light structs/uniforms, getDistanceAttenuation(), getSpotAttenuation(), viewMatrix
//   \`lights_physical_pars_fragment\` → D_GGX(), V_GGX_SmithCorrelated(), PhysicalMaterial struct, RE_Direct_Physical()
//   <generated map()>               → vec2 map(vec3 p) + MatResult mapSmooth(vec3 p) injected by SDFCompiler

// ─── Camera uniforms ──────────────────────────────────────────────────────────
// (primitives.glsl, uSceneData, uMaterialData, and map() are prepended by SDFMaterial.ts)
uniform vec3  uCameraPos;
uniform mat4  uCameraMatrix;   // camera.matrixWorld — NOT projectionMatrix
uniform vec2  uResolution;     // draw buffer size in physical pixels
uniform float uFov;            // camera.fov in degrees
uniform float uMaxDist;        // max ray travel distance (default 1000.0)
uniform float uTime;           // elapsed seconds for animated shaders

// ─── Scene uniforms ───────────────────────────────────────────────────────────
uniform vec3  uClearColor;     // renderer clear color
uniform float uFogDensity;     // 0 = no fog, higher = thicker
uniform bool  uMaterialBlend;  // true = evaluate smooth material blending path

// ─── Raymarch constants ───────────────────────────────────────────────────────
const int   MAX_STEPS = 128;
const float SURF_DIST = 0.001;

// ─── Normal via tetrahedral 4-tap finite differences ─────────────────────────
// Scale the sampling epsilon with ray distance to reduce noise at blend seams.
// Each map() call extracts .x (distance only) — map() now returns vec2.
vec3 calcNormal(vec3 p, float t) {
    float h = max(0.001, 0.002 * t);
    const vec2 k = vec2(1.0, -1.0);
    return normalize(
        k.xyy * map(p + k.xyy * h).x +
        k.yyx * map(p + k.yyx * h).x +
        k.yxy * map(p + k.yxy * h).x +
        k.xxx * map(p + k.xxx * h).x
    );
}

// ─── Enhanced Sphere Tracing (Keinert et al., STAG 2014) ─────────────────────
// Over-relaxation (omega > 1) takes larger-than-SDF steps in open space for
// fewer iterations. Triangle inequality check detects overshooting and backtracks.
// Returns vec2(t, materialId) or vec2(-1, -1) on miss.
//
// Note: when smooth union k is large relative to feature size, opSmoothUnion*
// underestimates distance in the blend zone (not a true SDF). If surface acne
// appears near blend seams, reduce omega toward 1.0.
vec2 raymarch(vec3 ro, vec3 rd) {
    float omega      = 1.3;
    float t          = 0.0;
    float prevRadius = 0.0;
    float stepLength = 0.0;

    for (int i = 0; i < MAX_STEPS; i++) {
        vec2  hit    = map(ro + rd * t);
        float radius = abs(hit.x);

        // Triangle inequality violation — the previous step overshot a surface.
        // Backtrack to the pre-step position and fall back to a conservative step.
        // omega is permanently set to 1.0 for all remaining iterations (conservative
        // but correct — we're near a surface and safe stepping is appropriate here).
        bool sorFail = omega > 1.0 && (radius + prevRadius) < stepLength;
        if (sorFail) {
            t          -= stepLength;
            stepLength  = radius;
            omega       = 1.0;
        } else {
            stepLength = hit.x * omega;
        }
        prevRadius = radius;

        if (!sorFail && radius < SURF_DIST) return vec2(t, hit.y);
        if (t > uMaxDist) break;
        t += stepLength;
    }
    return vec2(-1.0, -1.0);
}

// ─── Evaluate Cook-Torrance BRDF for a single light ─────────────────────────
// Uses D_GGX() and V_GGX_SmithCorrelated() from \`lights_physical_pars_fragment\`,
// F_Schlick() and BRDF_Lambert() from \`common\`.
vec3 evalBRDF(vec3 N, vec3 V, vec3 L, vec3 radiance, vec3 albedo, float metalness, float roughness) {
    vec3  H     = normalize(V + L);
    float NdotL = saturate(dot(N, L));
    float NdotV = saturate(dot(N, V));
    float NdotH = saturate(dot(N, H));
    float VdotH = saturate(dot(V, H));

    float alpha = pow2(roughness);
    vec3  F0    = mix(vec3(0.04), albedo, metalness);

    // Specular: D * V * F  (Three.js functions from lights_physical_pars_fragment)
    float D   = D_GGX(alpha, NdotH);
    float Vis = V_GGX_SmithCorrelated(alpha, NdotL, NdotV);
    vec3  F   = F_Schlick(F0, 1.0, VdotH);
    vec3  specular = D * Vis * F;

    // Diffuse: energy-conserving Lambertian
    vec3 kD      = (1.0 - F) * (1.0 - metalness);
    vec3 diffuse = kD * BRDF_Lambert(albedo);

    return (diffuse + specular) * radiance * NdotL;
}

// ─── Accumulate all Three.js lights (view-space) ────────────────────────────
vec3 shade(vec3 viewPos, vec3 N, vec3 V, vec3 albedo, float metalness, float roughness) {
    vec3 Lo = vec3(0.0);

    // ── Directional lights ───────────────────────────────────────────────
    #if NUM_DIR_LIGHTS == 1
        Lo += evalBRDF(N, V, directionalLights[0].direction,
                       directionalLights[0].color, albedo, metalness, roughness);
    #elif NUM_DIR_LIGHTS > 1
    for (int i = 0; i < NUM_DIR_LIGHTS; i++) {
        Lo += evalBRDF(N, V, directionalLights[i].direction,
                       directionalLights[i].color, albedo, metalness, roughness);
    }
    #endif

    // ── Point lights ─────────────────────────────────────────────────────
    #if NUM_POINT_LIGHTS == 1
    {
        vec3  lVec  = pointLights[0].position - viewPos;
        float dist  = length(lVec);
        vec3  L     = lVec / dist;
        float atten = getDistanceAttenuation(dist, pointLights[0].distance, pointLights[0].decay);
        Lo += evalBRDF(N, V, L, pointLights[0].color * atten, albedo, metalness, roughness);
    }
    #elif NUM_POINT_LIGHTS > 1
    for (int i = 0; i < NUM_POINT_LIGHTS; i++) {
        vec3  lVec  = pointLights[i].position - viewPos;
        float dist  = length(lVec);
        vec3  L     = lVec / dist;
        float atten = getDistanceAttenuation(dist, pointLights[i].distance, pointLights[i].decay);
        Lo += evalBRDF(N, V, L, pointLights[i].color * atten, albedo, metalness, roughness);
    }
    #endif

    // ── Spot lights ──────────────────────────────────────────────────────
    #if NUM_SPOT_LIGHTS == 1
    {
        vec3  lVec    = spotLights[0].position - viewPos;
        float dist    = length(lVec);
        vec3  L       = lVec / dist;
        float atten   = getDistanceAttenuation(dist, spotLights[0].distance, spotLights[0].decay);
        float spotCos = dot(L, spotLights[0].direction);
        float spotAtt = getSpotAttenuation(spotLights[0].coneCos, spotLights[0].penumbraCos, spotCos);
        Lo += evalBRDF(N, V, L, spotLights[0].color * atten * spotAtt, albedo, metalness, roughness);
    }
    #elif NUM_SPOT_LIGHTS > 1
    for (int i = 0; i < NUM_SPOT_LIGHTS; i++) {
        vec3  lVec    = spotLights[i].position - viewPos;
        float dist    = length(lVec);
        vec3  L       = lVec / dist;
        float atten   = getDistanceAttenuation(dist, spotLights[i].distance, spotLights[i].decay);
        float spotCos = dot(L, spotLights[i].direction);
        float spotAtt = getSpotAttenuation(spotLights[i].coneCos, spotLights[i].penumbraCos, spotCos);
        Lo += evalBRDF(N, V, L, spotLights[i].color * atten * spotAtt, albedo, metalness, roughness);
    }
    #endif

    // ── Ambient ──────────────────────────────────────────────────────────
    vec3 ambient = ambientLightColor * albedo;

    return ambient + Lo;
}

// ─── ACES tone mapping (Narkowicz fit) ───────────────────────────────────────
vec3 ACESFilm(vec3 x) {
    float a = 2.51;
    float b = 0.03;
    float c = 2.43;
    float d = 0.59;
    float e = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

void main() {
    // ── Ray construction from camera matrix ──────────────────────────────────
    vec3 right   = normalize(vec3(uCameraMatrix[0]));
    vec3 up      = normalize(vec3(uCameraMatrix[1]));
    vec3 forward = normalize(-vec3(uCameraMatrix[2]));

    float aspect = uResolution.x / uResolution.y;
    vec2 uv = (gl_FragCoord.xy / uResolution - 0.5) * vec2(aspect, 1.0);

    float focalLength = 0.5 / tan(radians(uFov) * 0.5);
    vec3 rd = normalize(forward * focalLength + right * uv.x + up * uv.y);
    vec3 ro = uCameraPos;

    // ── March ────────────────────────────────────────────────────────────────
    vec2 res = raymarch(ro, rd);

    if (res.x > 0.0) {
        vec3 p = ro + rd * res.x;
        vec3 n = calcNormal(p, res.x);

        vec3  albedo;
        float metalness;
        float roughness;
        vec3  emissive;

        if (uMaterialBlend) {
            MatResult mat = mapSmooth(p);
            albedo = mat.alb;
            metalness = mat.mtl;
            roughness = mat.rgh;
            emissive = mat.emv;
        } else {
            float matIdF  = res.y;
            int   m0      = int(floor(matIdF));
            int   m1      = m0 + 1;
            float mBlend  = fract(matIdF);

            // Texel layout: material i → texels 2i (color+metalness) and 2i+1 (roughness+emissive)
            vec4 mat0a = texelFetch(uMaterialData, ivec2(m0 * 2,     0), 0);
            vec4 mat0b = texelFetch(uMaterialData, ivec2(m0 * 2 + 1, 0), 0);
            vec4 mat1a = texelFetch(uMaterialData, ivec2(m1 * 2,     0), 0);
            vec4 mat1b = texelFetch(uMaterialData, ivec2(m1 * 2 + 1, 0), 0);

            albedo = mix(mat0a.rgb,  mat1a.rgb,  mBlend);
            metalness = mix(mat0a.a, mat1a.a, mBlend);
            roughness = mix(mat0b.r, mat1b.r, mBlend);
            emissive = mix(mat0b.gba, mat1b.gba, mBlend);
        }

        // ── Shading ──────────────────────────────────────────────────────────
        // Transform to view space — Three.js light uniforms are in view space
        vec3 viewPos    = (viewMatrix * vec4(p, 1.0)).xyz;
        vec3 viewNormal = normalize(mat3(viewMatrix) * n);
        vec3 V          = normalize(-viewPos);

        vec3 color = shade(viewPos, viewNormal, V, albedo, metalness, roughness) + emissive;

        // Depth fog — fade to clear color (skip when density is 0)
        if (uFogDensity > 0.0) {
            color = mix(color, uClearColor, 1.0 - exp(-res.x * uFogDensity));
        }

        // Tone mapping + linear → sRGB
        color = ACESFilm(color);
        color = pow(color, vec3(1.0 / 2.2));

        gl_FragColor = vec4(color, 1.0);
    } else {
        gl_FragColor = vec4(uClearColor, 1.0);
    }
}
`;
