import { BoxGeometry, CylinderGeometry, IcosahedronGeometry, Mesh, Frustum, Vector3, Matrix4, Vector2, Sphere, PlaneGeometry, WebGLRenderTarget, DepthTexture, UnsignedShortType, RawShaderMaterial, GLSL3, MathUtils, TorusGeometry } from 'three';

var lighting = "#ifdef ENVMAP_TYPE_CUBE_UV\n\n#define PI 3.141592653589793\n#define RECIPROCAL_PI 0.3183098861837907\n\nstruct GeometricContext {\n  vec3 normal;\n  vec3 viewDir;\n};\n\nstruct PhysicalMaterial {\n  vec3 diffuseColor;\n  float roughness;\n  vec3 specularColor;\n  float specularF90;\n};\n\nstruct ReflectedLight {\n  vec3 indirectDiffuse;\n  vec3 indirectSpecular;\n};\n\nvec3 BRDF_Lambert(const in vec3 diffuseColor) {\n  return RECIPROCAL_PI * diffuseColor;\n}\n\nvec2 DFGApprox(const in vec3 normal, const in vec3 viewDir, const in float roughness) {\n  float dotNV = saturate(dot(normal, viewDir));\n  const vec4 c0 = vec4(-1.0, -0.0275, -0.572, 0.022);\n  const vec4 c1 = vec4(1.0, 0.0425, 1.04, -0.04);\n  vec4 r = roughness * c0 + c1;\n  float a004 = min(r.x * r.x, exp2(-9.28 * dotNV)) * r.x + r.y;\n  vec2 fab = vec2(-1.04, 1.04) * a004 + r.zw;\n  return fab;\n}\n\nvoid computeMultiscattering(const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter) {\n  vec2 fab = DFGApprox(normal, viewDir, roughness);\n  vec3 FssEss = specularColor * fab.x + specularF90 * fab.y;\n  float Ess = fab.x + fab.y;\n  float Ems = 1.0 - Ess;\n  vec3 Favg = specularColor + (1.0 - specularColor) * 0.047619;\n  vec3 Fms = FssEss * Favg / (1.0 - Ems * Favg);\n  singleScatter += FssEss;\n  multiScatter += Fms * Ems;\n}\n\nvoid RE_IndirectDiffuse(const in vec3 irradiance, const in GeometricContext geometry, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {\n  reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert(material.diffuseColor);\n}\n\nvoid RE_IndirectSpecular(const in vec3 radiance, const in vec3 irradiance, const in GeometricContext geometry, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {\n  vec3 singleScattering = vec3(0.0);\n  vec3 multiScattering = vec3(0.0);\n  vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;\n  computeMultiscattering(geometry.normal, geometry.viewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering);\n  vec3 diffuse = material.diffuseColor * (1.0 - (singleScattering + multiScattering));\n  reflectedLight.indirectSpecular += radiance * singleScattering;\n  reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;\n  reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;\n}\n\nvec3 getIBLRadiance(const in vec3 viewDir, const in vec3 normal, const in float roughness) {\n  vec3 reflectVec = reflect(-viewDir, normal);\n  reflectVec = normalize(mix(reflectVec, normal, roughness * roughness));\n  vec4 envMapColor = textureCubeUV(envMap, reflectVec, roughness);\n  return envMapColor.rgb * envMapIntensity;\n}\n\nvec3 getIBLIrradiance(const in vec3 normal) {\n  vec3 envMapColor = textureCubeUV(envMap, normal, 1.0).rgb;\n  return PI * envMapColor * envMapIntensity;\n}\n\nvec3 getLight(const in vec3 position, const in vec3 normal, const in vec3 diffuse) {\n  GeometricContext geometry;\n  geometry.normal = normal;\n  geometry.viewDir = normalize(cameraPosition - position);\n\n  PhysicalMaterial material;\n  material.diffuseColor = diffuse * (1.0 - metalness);\n  material.roughness = max(min(roughness, 1.0), 0.0525);\n  material.specularColor = mix(vec3(0.04), diffuse, metalness);\n  material.specularF90 = 1.0;\n\n  ReflectedLight reflectedLight = ReflectedLight(vec3(0.0), vec3(0.0));\n  vec3 radiance = getIBLRadiance(geometry.viewDir, geometry.normal, material.roughness);\n  vec3 irradiance = getIBLIrradiance(geometry.normal);\n  RE_IndirectDiffuse(irradiance, geometry, material, reflectedLight);\n  RE_IndirectSpecular(radiance, irradiance, geometry, material, reflectedLight);\n\n  return reflectedLight.indirectDiffuse + reflectedLight.indirectSpecular;\n}\n\n#else\n\nvec3 getLight(const in vec3 position, const in vec3 normal, const in vec3 diffuse) {\n  return diffuse * envMapIntensity;\n}\n\n#endif\n";


// Change SDFs here
var raymarcherFragment = `
precision highp float;
precision highp int;

struct Bounds {
  vec3 center;
  float radius;
};

struct Entity {
  vec3 color;
  int operation;
  vec3 position; // legacy (ignored when hasMatrix==1)
  vec4 rotation; // legacy (ignored when hasMatrix==1)
  vec3 scale;    // legacy (ignored when hasMatrix==1)
  int shape;
  mat4 invMatrix; // full inverse transform (used when hasMatrix==1)
  float hasMatrix; // 1.0 => use invMatrix path
  /* TERRAIN DISABLED - Terrain parameters
  float octaves;
  float amplitude;
  float clampYMin;
  float clampYMax;
  float offsetX;
  float offsetZ;
  float seed;
  // Displacement clamp (applies to shape-surface displacement)
  float dispClampMin;
  float dispClampMax;
  // Shaping controls
  float peakGain;   // >1 magnifies positive (mountain) displacement
  float valleyGain; // >1 magnifies negative (sea) displacement
  // Color ramp toggle
  float useColorRamp;
  // User smoothing strength [0..1]
  float smoothingStrength;
  // Apply displacement only within this local Y range (with feather)
  float dispApplyMinY;
  float dispApplyMaxY;
  float dispFeather;
  */
};

struct SDF {
  float distance;
  vec3 color;
};

out vec4 fragColor;
in vec3 ray;
uniform float blending;
uniform Bounds bounds;
uniform vec3 cameraDirection;
uniform float cameraFar;
uniform float cameraFov;
uniform float cameraNear;
uniform vec3 cameraPosition;
uniform Entity entities[MAX_ENTITIES];
uniform sampler2D envMap;
uniform float envMapIntensity;
uniform float metalness;
uniform int numEntities;
uniform vec2 resolution;
uniform float roughness;

#define saturate(a) clamp(a, 0.0, 1.0)
#define texture2D texture
#include <cube_uv_reflection_fragment>
#include <encodings_pars_fragment>
#include <lighting>

vec3 applyQuaternion(const in vec3 p, const in vec4 q) {
  return p + 2.0 * cross(-q.xyz, cross(-q.xyz, p) + q.w * p);
}

float sdBox(const in vec3 p, const in vec3 r) {
  vec3 q = abs(p) - r;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float sdCapsule(in vec3 p, const in vec3 r) {
  p.y -= clamp(p.y, -r.y + r.x, r.y - r.x);
  return length(p) - r.x;
}

float sdEllipsoid(const in vec3 p, const in vec3 r) {
  float k0 = length(p / r);
  float k1 = length(p / (r * r));
  return k0 * (k0 - 1.0) / k1;
}

float sdSphere(const in vec3 p, const in float r) {
  return length(p) - r;
}

float sdTorus(const in vec3 p, const in vec2 t) {
  vec2 q = vec2(length(p.xz) - t.x, p.y);
  return length(q) - t.y;
}

/* TERRAIN DISABLED - Noise functions and terrain generation
// Stable hash (fixed constants) to avoid precision artifacts; seed will be applied via coordinate offset
// hash21: classic value-noise hash (not gradient/Perlin). We keep constants fixed for continuity
float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// simpleNoise: 2D value noise with bilinear interpolation
// We derive a small, stable seed-based offset to pick a different part of the noise field per world
float simpleNoise(vec2 p, float seed) {
  // Derive a small, stable offset from the seed to sample a different region without huge coordinates
  float sx = fract(sin(seed * 12.9898) * 43758.5453);
  float sy = fract(sin(seed * 78.2330) * 12345.6789);
  vec2 seedOffset = vec2(sx, sy) * 64.0; // shift up to 64 grid cells; small enough to keep precision

  vec2 pp = p + seedOffset;
  vec2 i = floor(pp);
  vec2 f = fract(pp);

  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));

  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

// ===== Perlin2D (gradient-based noise) =====
// More continuous derivatives than value noise; smoother, more natural look

// random2: deterministic hash from 2D grid coordinate
vec2 random2(vec2 p) {
  return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
}

// grad2: compute gradient vector at corner p for Perlin noise
vec2 grad2(vec2 p) {
  vec2 h = random2(p);
  return normalize(h * 2.0 - 1.0); // Map [0,1] to [-1,1] and normalize
}

// fade2: smoothstep-like fade function (Perlin's improved polynomial)
vec2 fade2(vec2 t) {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

// perlin2: single octave of 2D Perlin noise
float perlin2(vec2 p, float seed) {
  // Apply seed offset to sample different region
  float sx = fract(sin(seed * 12.9898) * 43758.5453);
  float sy = fract(sin(seed * 78.2330) * 12345.6789);
  vec2 seedOffset = vec2(sx, sy) * 64.0;
  
  vec2 pp = p + seedOffset;
  vec2 i = floor(pp);
  vec2 f = fract(pp);
  
  // Get gradients at corners
  vec2 g00 = grad2(i + vec2(0.0, 0.0));
  vec2 g10 = grad2(i + vec2(1.0, 0.0));
  vec2 g01 = grad2(i + vec2(0.0, 1.0));
  vec2 g11 = grad2(i + vec2(1.0, 1.0));
  
  // Compute dot products
  float n00 = dot(g00, f - vec2(0.0, 0.0));
  float n10 = dot(g10, f - vec2(1.0, 0.0));
  float n01 = dot(g01, f - vec2(0.0, 1.0));
  float n11 = dot(g11, f - vec2(1.0, 1.0));
  
  // Interpolate
  vec2 u = fade2(f);
  float nx0 = mix(n00, n10, u.x);
  float nx1 = mix(n01, n11, u.x);
  return mix(nx0, nx1, u.y);
}

// fbm2: Fractional Brownian Motion using Perlin noise
float fbm2(vec2 p, float seed, int octaves, float amplitude) {
  float sum = 0.0;
  float amp = amplitude;
  float freq = 1.0;
  
  for (int i = 0; i < 8; i++) {
    if (i >= octaves) break;
    sum += perlin2(p * freq, seed + float(i) * 12345.0) * amp;
    freq *= 2.0;
    amp *= 0.5;
  }
  
  return sum;
}

// sdTerrainWithColor: heightfield terrain SDF (distance = y - height)
// Now uses entity parameters for full control via UI nodes
// p = world coordinates (for heightfield distance), plocal = local coordinates (for noise sampling)
SDF sdTerrainWithColor(const in vec3 p, const in vec3 plocal, const in Entity e) {
  // Extract terrain seed from entity color
  float terrainSeed = floor(e.color.r * 255.0) + floor(e.color.g * 255.0) * 256.0 + floor(e.color.b * 255.0) * 65536.0;
  
  // Apply scroll offsets in local space (offsetX/Z control panning through noise field)
  // Use LOCAL coordinates for noise sampling so pattern stays fixed to shape
  vec2 scrolledCoord = plocal.xz + vec2(e.offsetX, e.offsetZ);
  
  // Base noise frequency
  vec2 noiseCoord = scrolledCoord * 0.03;
  
  // Use Perlin fBm with entity-controlled octaves and amplitude
  int octaves = int(e.octaves);
  float amplitude = e.amplitude;
  
  // Generate terrain height using Perlin fBm
  float baseLevel = -3.0;
  float heightScale = 8.0; // Base scale for first octave
  float noiseSum = fbm2(noiseCoord, terrainSeed, octaves, heightScale * amplitude);
  
  float height = baseLevel + noiseSum;
  
  // Clamp height using entity parameters
  height = clamp(height, e.clampYMin, e.clampYMax);
  
  // Height-based coloring
  vec3 color;
  if (height < -5.0) {
    color = vec3(0.0, 0.1, 0.4); // Very deep water (dark blue)
  } else if (height < -2.0) {
    color = vec3(0.0, 0.3, 0.7); // Deep water (blue)
  } else if (height < 1.0) {
    color = vec3(0.2, 0.5, 0.9); // Shallow water (light blue)
  } else if (height < 2.5) {
    color = vec3(0.8, 0.7, 0.5); // Beach/sand (tan)
  } else if (height < 5.0) {
    color = vec3(0.2, 0.8, 0.2); // Grass (green)
  } else if (height < 7.0) {
    color = vec3(0.4, 0.6, 0.2); // Hills (olive)
  } else if (height < 11.0) {
    color = vec3(0.6, 0.4, 0.2); // Mountains (brown)
  } else {
    color = vec3(0.9, 0.9, 0.9); // Snow peaks (white)
  }
  
  // Create terrain as heightfield: distance to surface is (y - height)
  // Use WORLD coordinates for distance calculation (p.y not plocal.y)
  float distance = p.y - height;
  
  return SDF(distance, color);
}

// Apply terrain displacement to any shape's surface
// Compute terrain displacement amount and its application weight (local-space sampling)
// Returns vec2(displacementAfterWeight, weight)
vec2 terrainDisplacementAndWeight(const in vec3 plocal, const in Entity e) {
  // Use the seed directly from the entity
  float terrainSeed = e.seed;
  
  // Apply scroll offsets in local space
  vec2 scrolledCoord = plocal.xz + vec2(e.offsetX, e.offsetZ);
  
  // Sample noise in local coordinates
  vec2 noiseCoord = scrolledCoord * 0.05;
  
  // Octaves are provided by entity (from node or debug override)
  int octaves = int(e.octaves + 0.5);
  float amplitude = e.amplitude;
  
  // Generate displacement amount using Perlin fBm
  float displacementScale = 1.5; // balanced default scale
  float displacement = fbm2(noiseCoord, terrainSeed, octaves, displacementScale * amplitude);
  
  // Shape mountains vs seas (linear gain only)
  displacement = (displacement >= 0.0)
    ? (displacement * e.peakGain)
    : (displacement * e.valleyGain);
  // Clamp the displacement to requested range (independent from height clamps)
  displacement = clamp(displacement, e.dispClampMin, e.dispClampMax);

  // Also enforce absolute local-Y limits for displaced surface
  // Allowed final Y range is [clampYMin, clampYMax], so displacement must be within [min - y, max - y]
  if (e.clampYMax > e.clampYMin) {
    float dmin = e.clampYMin - plocal.y;
    float dmax = e.clampYMax - plocal.y;
    displacement = clamp(displacement, dmin, dmax);
  }

  // Compute apply weight within a specified local-Y band with optional feathering
  float weight = 1.0;
  if (e.dispApplyMaxY > e.dispApplyMinY) {
    float f = max(e.dispFeather, 0.0001);
    float wLow = smoothstep(e.dispApplyMinY, e.dispApplyMinY + f, plocal.y);
    float wHigh = 1.0 - smoothstep(e.dispApplyMaxY - f, e.dispApplyMaxY, plocal.y);
    weight = clamp(wLow * wHigh, 0.0, 1.0);
  }
  return vec2(displacement * weight, weight);
}
// END TERRAIN DISABLED */

SDF sdEntity(in vec3 p, const in Entity e) {
  float distance;
  vec3 outColor = e.color;
  
  // Transform point into local space
  vec3 plocal;
  if (e.hasMatrix > 0.5) {
    plocal = (e.invMatrix * vec4(p, 1.0)).xyz;
  } else {
    plocal = applyQuaternion(p - e.position, normalize(e.rotation));
  }

  /* TERRAIN DISABLED
  // Terrain heightfield uses local coords for noise sampling but world p for distance
  if (e.shape == 4) {
    return sdTerrainWithColor(p, plocal, e);
  }
  */
  
  switch (e.shape) {
    default:
    case 0:
      distance = sdBox(plocal, (e.hasMatrix>0.5? vec3(1.0): e.scale) * 0.5 - vec3(0.1)) - 0.1;
      break;
    case 1:
      distance = sdCapsule(plocal, (e.hasMatrix>0.5? vec3(1.0): e.scale) * 0.5);
      break;
    case 2:
      distance = sdEllipsoid(plocal, (e.hasMatrix>0.5? vec3(1.0): e.scale) * 0.5);
      break;
    case 3:
      distance = sdTorus(plocal, (e.hasMatrix>0.5? vec2(1.0): e.scale.xy) * 0.5);
      break;
  }
  
  /* TERRAIN DISABLED - Displacement application
  // Apply displacement only when octaves > 0 (i.e., TerrainParams connected or debug override)
  int ocount = int(e.octaves + 0.5);
  if (ocount > 0) {
    // Compute displacement and weight; optionally smooth when shaping breaks smoothness
    vec2 dw0 = terrainDisplacementAndWeight(plocal, e);
    float disp = dw0.x;
    float weight = dw0.y;
    // Adaptive smoothing based on user smoothingStrength (0..1); cheap 3-tap for low levels, 5-tap for high
    float smLevel = saturate(e.smoothingStrength);
    if (smLevel > 0.01) {
      float sigma = mix(0.2, 1.2, smLevel);
      if (smLevel < 0.34) {
        // 3-tap (center + X + Z)
        vec2 dpx = terrainDisplacementAndWeight(p + vec3( sigma, 0.0,  0.0), e);
        vec2 dpz = terrainDisplacementAndWeight(p + vec3( 0.0,  0.0,  sigma), e);
        disp = 0.6 * disp + 0.2 * (dpx.x + dpz.x);
      } else {
        // 5-tap cross
        vec2 dpx = terrainDisplacementAndWeight(p + vec3( sigma, 0.0,  0.0), e);
        vec2 dnx = terrainDisplacementAndWeight(p + vec3(-sigma, 0.0,  0.0), e);
        vec2 dpz = terrainDisplacementAndWeight(p + vec3( 0.0,  0.0,  sigma), e);
        vec2 dnz = terrainDisplacementAndWeight(p + vec3( 0.0,  0.0, -sigma), e);
        disp = 0.4 * disp + 0.15 * (dpx.x + dnx.x + dpz.x + dnz.x);
      }
    }
    // Displace strictly along local Y by re-evaluating the base SDF at y-offset point
    vec3 p2 = plocal; p2.y -= disp;
    float distanceY;
    switch (e.shape) {
      default:
      case 0: distanceY = sdBox(p2, e.scale * 0.5 - vec3(0.1)) - 0.1; break;
      case 1: distanceY = sdCapsule(p2, e.scale * 0.5); break;
      case 2: distanceY = sdEllipsoid(p2, e.scale * 0.5); break;
      case 3: distanceY = sdTorus(p2, e.scale.xy * 0.5); break;
    }
    distance = distanceY;
    // Optional color mapping toggle: blend ramp with base color using apply weight
    float denom = max(e.dispClampMax - e.dispClampMin, 0.0001);
    float t = saturate((disp - e.dispClampMin) / denom);
    if (e.useColorRamp > 0.5) {
      vec3 rampColor;
      if (t < 0.2) {
        rampColor = vec3(0.0, 0.1, 0.4);
      } else if (t < 0.35) {
        rampColor = vec3(0.0, 0.3, 0.7);
      } else if (t < 0.5) {
        rampColor = vec3(0.8, 0.7, 0.5);
      } else if (t < 0.65) {
        rampColor = vec3(0.2, 0.8, 0.2);
      } else if (t < 0.8) {
        rampColor = vec3(0.4, 0.6, 0.2);
      } else if (t < 0.95) {
        rampColor = vec3(0.6, 0.4, 0.2);
      } else {
        rampColor = vec3(0.9, 0.9, 0.9);
      }
      outColor = mix(e.color, rampColor, weight);
    }
  }
  // END TERRAIN DISABLED */
  
  return SDF(distance, outColor);
}

SDF opSmoothUnion(const in SDF a, const in SDF b, const in float k) {
  float h = saturate(0.5 + 0.5 * (b.distance - a.distance) / k);
  return SDF(
    mix(b.distance, a.distance, h) - k * h * (1.0 - h),
    mix(b.color, a.color, h)
  );
}

SDF opSmoothSubtraction(const in SDF a, const in SDF b, const in float k) {
  float h = saturate(0.5 - 0.5 * (a.distance + b.distance) / k);
  return SDF(
    mix(a.distance, -b.distance, h) + k * h * (1.0 - h),
    mix(a.color, b.color, h)
  );
}

SDF opSmoothIntersection(const in SDF a, const in SDF b, const in float k) {
  float h = saturate(0.5 + 0.5 * (b.distance - a.distance) / k);
  return SDF(
    mix(a.distance, b.distance, h) + k * h * (1.0 - h),
    mix(a.color, b.color, h)
  );
}

SDF map(const in vec3 p) {
  SDF scene = sdEntity(p, entities[0]);
  for (int i = 1, l = min(numEntities, MAX_ENTITIES); i < l; i++) {
    switch (entities[i].operation) {
      default:
      case 0:
        scene = opSmoothUnion(scene, sdEntity(p, entities[i]), blending);
        break;
      case 1:
        scene = opSmoothSubtraction(scene, sdEntity(p, entities[i]), blending);
        break;
      case 2:
        scene = opSmoothIntersection(scene, sdEntity(p, entities[i]), blending);
        break;
    }
  }
  return scene;
}

vec3 getNormal(const in vec3 p, const in float d) {
  // Scale epsilon with distance to stabilize normals under strong displacement
  float e = max(0.001, 0.5 * abs(d));
  vec2 o = vec2(e, 0.0);
  return normalize(
    d - vec3(
      map(p - o.xyy).distance,
      map(p - o.yxy).distance,
      map(p - o.yyx).distance
    )
  );
}

#ifdef CONETRACING
void march(inout vec4 color, inout float distance) {
  float closest = MAX_DISTANCE;
  float coverage = 1.0;
  float coneRadius = (2.0 * tan(cameraFov / 2.0)) / resolution.y;
  for (int i = 0; i < MAX_ITERATIONS && distance < MAX_DISTANCE; i++) {
    vec3 position = cameraPosition + ray * distance;
    float distanceToBounds = sdSphere(position - bounds.center, bounds.radius);
    if (distanceToBounds > 0.1) {
      distance += distanceToBounds;
    } else {
      SDF step = map(position);
      float cone = coneRadius * distance;
      if (step.distance < cone) {
        if (closest > distance) {
          closest = distance;
        }
        float alpha = smoothstep(cone, -cone, step.distance);
        vec3 pixel = getLight(position, getNormal(position, step.distance), step.color);
        color.rgb += coverage * (alpha * pixel);
        coverage *= (1.0 - alpha);
        if (coverage <= MIN_COVERAGE) {
          break;
        }
      }
      distance += max(abs(step.distance) * SAFETY_STEP, MIN_DISTANCE);
    }
  }
  distance = closest;
  color.a = 1.0 - (max(coverage - MIN_COVERAGE, 0.0) / (1.0 - MIN_COVERAGE));
}
#else
void march(inout vec4 color, inout float distance) {
  for (int i = 0; i < MAX_ITERATIONS && distance < MAX_DISTANCE; i++) {
    vec3 position = cameraPosition + ray * distance;
    float distanceToBounds = sdSphere(position - bounds.center, bounds.radius);
    if (distanceToBounds > 0.1) {
      distance += distanceToBounds;
    } else {
      SDF step = map(position);
      if (step.distance <= MIN_DISTANCE) {
        color = vec4(getLight(position, getNormal(position, step.distance), step.color), 1.0);
        break;
      }
      distance += max(abs(step.distance) * SAFETY_STEP, MIN_DISTANCE);
    }
  }
}
#endif

void main() {
  vec4 color = vec4(0.0);
  float distance = cameraNear;
  march(color, distance);
  fragColor = saturate(LinearTosRGB(color));
  float z = (distance >= MAX_DISTANCE) ? cameraFar : (distance * dot(cameraDirection, ray));
  float ndcDepth = -((cameraFar + cameraNear) / (cameraNear - cameraFar)) + ((2.0 * cameraFar * cameraNear) / (cameraNear - cameraFar)) / z;
  gl_FragDepth = ((gl_DepthRange.diff * ndcDepth) + gl_DepthRange.near + gl_DepthRange.far) / 2.0;
}
`;



var raymarcherVertex = "out vec3 ray;\nin vec3 position;\nuniform float cameraFov;\nuniform vec2 resolution;\nuniform mat4 viewMatrix;\n\nvoid main() {\n  gl_Position = vec4(position.xy, 0, 1);\n  float aspect = resolution.y / resolution.x;\n  vec2 uv = vec2(position.x, position.y * aspect);\n  float cameraDistance = (1.0 / tan(cameraFov / 2.0)) * aspect;\n  ray = normalize(vec3(uv, -cameraDistance) * mat3(viewMatrix));\n}\n";

var screenFragment = "precision highp float;\n\nout vec4 fragColor;\nin vec2 uv;\nuniform sampler2D colorTexture;\nuniform sampler2D depthTexture;\n\nvoid main() {\n  fragColor = texture(colorTexture, uv);\n  gl_FragDepth = texture(depthTexture, uv).r;\n}\n";

var screenVertex = "out vec2 uv;\nin vec3 position;\n\nvoid main() {\n  gl_Position = vec4(position.xy, 0, 1);\n  uv = position.xy * 0.5 + 0.5;\n}\n";

const _bounds = [];
const _colliders = [
  new BoxGeometry(1, 1, 1),          // 0: box
  new CylinderGeometry(0.5, 0.5, 1), // 1: capsule
  new IcosahedronGeometry(0.5, 2),   // 2: sphere
  new CylinderGeometry(0.5, 0.5, 1), // 3: torus
  new BoxGeometry(10, 0.1, 10),      // 4: terrain (flat wide box)
].map((geometry) => {
  geometry.computeBoundingSphere();
  return new Mesh(geometry);
});
const _frustum = new Frustum();
const _position = new Vector3();
const _projection = new Matrix4();
const _size = new Vector2();
const _sphere = new Sphere();

class Raymarcher extends Mesh {
  constructor({ 
    blending = 0.5,
    conetracing = true,
    envMap = null,
    envMapIntensity = 1,
    metalness = 0,
    layers = [],
    resolution = 0.6,
    roughness = 1,
  } = {}) {
    const plane = new PlaneGeometry(2, 2, 1, 1);
    plane.deleteAttribute('normal');
    plane.deleteAttribute('uv');
    const target = new WebGLRenderTarget(1, 1, { depthTexture: new DepthTexture(1, 1, UnsignedShortType) });
    const screen = new RawShaderMaterial({
      glslVersion: GLSL3,
      transparent: !!conetracing,
      vertexShader: screenVertex,
      fragmentShader: screenFragment,
      uniforms: {
        colorTexture: { value: target.texture },
        depthTexture: { value: target.depthTexture },
      },
    });
    super(plane, screen);
    const material = new RawShaderMaterial({
      glslVersion: GLSL3,
      transparent: !!conetracing,
      vertexShader: raymarcherVertex,
      fragmentShader: raymarcherFragment.replace('#include <lighting>', lighting),
      defines: {
        CONETRACING: !!conetracing,
        MAX_ENTITIES: 0,
        MAX_DISTANCE: '1000.0',
        MAX_ITERATIONS: 200,
        MIN_COVERAGE: '0.02',
        MIN_DISTANCE: '0.02',
        SAFETY_STEP: '0.8',
      },
      uniforms: {
        blending: { value: blending },
        bounds: { value: { center: new Vector3(), radius: 0 } },
        cameraDirection: { value: new Vector3() },
        cameraFar: { value: 0 },
        cameraFov: { value: 0 },
        cameraNear: { value: 0 },
        envMap: { value: null },
        envMapIntensity: { value: envMapIntensity },
        metalness: { value: metalness },
        resolution: { value: new Vector2() },
        roughness: { value: roughness },
        numEntities: { value: 0 },
        entities: {
          value: [],
          properties: {
            color: {},
            operation: {},
            position: {},
            rotation: {},
            scale: {},
            shape: {},
            invMatrix: {},
            hasMatrix: {},
            octaves: {},
            amplitude: {},
            clampYMin: {},
            clampYMax: {},
            offsetX: {},
            offsetZ: {},
            seed: {},
            dispClampMin: {},
            dispClampMax: {},
            peakGain: {},
            valleyGain: {},
            useColorRamp: {},
            smoothingStrength: {},
            dispApplyMinY: {},
            dispApplyMaxY: {},
            dispFeather: {},
          },
        },
      },
    });
    const { defines, uniforms } = material;
    this.userData = {
      get blending() {
        return uniforms.blending.value;
      },
      set blending(value) {
        uniforms.blending.value = value;
      },
      get conetracing() {
        return defines.CONETRACING;
      },
      set conetracing(value) {
        if (defines.CONETRACING !== !!value) {
          defines.CONETRACING = !!value;
          material.transparent = screen.transparent = !!value;
          material.needsUpdate = true;
        }
      },
      get envMap() {
        return uniforms.envMap.value;
      },
      set envMap(value) {
        uniforms.envMap.value = value;
        if (defines.ENVMAP_TYPE_CUBE_UV !== !!value) {
          defines.ENVMAP_TYPE_CUBE_UV = !!value;
          material.needsUpdate = true;
        }
        if (value) {
          const maxMip = Math.log2(value.image.height) - 2;
          const texelWidth = 1.0 / (3 * Math.max(Math.pow(2, maxMip), 7 * 16));
          const texelHeight = 1.0 / value.image.height;
          if (defines.CUBEUV_MAX_MIP !== `${maxMip}.0`) {
            defines.CUBEUV_MAX_MIP = `${maxMip}.0`;
            material.needsUpdate = true;
          }
          if (defines.CUBEUV_TEXEL_WIDTH !== texelWidth) {
            defines.CUBEUV_TEXEL_WIDTH = texelWidth;
            material.needsUpdate = true;
          }
          if (defines.CUBEUV_TEXEL_HEIGHT !== texelHeight) {
            defines.CUBEUV_TEXEL_HEIGHT = texelHeight;
            material.needsUpdate = true;
          }
        }
      },
      get envMapIntensity() {
        return uniforms.envMapIntensity.value;
      },
      set envMapIntensity(value) {
        uniforms.envMapIntensity.value = value;
      },
      get metalness() {
        return uniforms.metalness.value;
      },
      set metalness(value) {
        uniforms.metalness.value = value;
      },
      get roughness() {
        return uniforms.roughness.value;
      },
      set roughness(value) {
        uniforms.roughness.value = value;
      },
      layers,
      raymarcher: new Mesh(plane, material),
      resolution,
      target,
    };
    this.matrixAutoUpdate = this.userData.raymarcher.matrixAutoUpdate = false;
    this.frustumCulled = this.userData.raymarcher.frustumCulled = false;
    if (envMap) {
      this.userData.envMap = envMap;
    }
  }

  copy(source) {
    const { userData } = this;
    const { userData: { blending, conetracing, envMap, envMapIntensity, metalness, layers, resolution, roughness } } = source;
    userData.blending = blending;
    userData.conetracing = conetracing;
    userData.envMap = envMap;
    userData.envMapIntensity = envMapIntensity;
    userData.metalness = metalness;
    userData.layers = layers.map((layer) => layer.map(Raymarcher.cloneEntity));
    userData.resolution = resolution;
    userData.roughness = roughness;
    return this;
  }

  dispose() {
    const { material, geometry, userData: { raymarcher, target } } = this;
    material.dispose();
    geometry.dispose();
    raymarcher.material.dispose();
    target.dispose();
    target.depthTexture.dispose();
    target.texture.dispose();
  }

  onBeforeRender(renderer, scene, camera) {
    const { userData: { layers, resolution, raymarcher, target } } = this;
    // TERRAIN DISABLED const debugForce = !!this.userData.debugForceTerrain;
    const { material: { defines, uniforms } } = raymarcher;

    camera.getWorldDirection(uniforms.cameraDirection.value);
    uniforms.cameraFar.value = camera.far;
    uniforms.cameraFov.value = MathUtils.degToRad(camera.fov);
    uniforms.cameraNear.value = camera.near;
    
    _frustum.setFromProjectionMatrix(
      _projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    );
    camera.getWorldPosition(_position);
    const sortedLayers = layers
      .reduce((layers, entities, layer) => {
        if (defines.MAX_ENTITIES < entities.length) {
          defines.MAX_ENTITIES = entities.length;
          uniforms.entities.value = entities.map(Raymarcher.cloneEntity);
          raymarcher.material.needsUpdate = true;
          if (!this.__loggedMaxEntitiesOnce) {
            console.log('[Raymarcher] Updated MAX_ENTITIES to', defines.MAX_ENTITIES, 'and rebuilt uniforms.entities');
            this.__loggedMaxEntitiesOnce = true;
          }
        }
        const bounds = Raymarcher.getLayerBounds(layer);
        entities.forEach((entity) => {
          const {
            geometry: { boundingSphere },
            matrixWorld,
          } = Raymarcher.getEntityCollider(entity);
          _sphere.copy(boundingSphere).applyMatrix4(matrixWorld);
          if (bounds.isEmpty()) {
            bounds.copy(_sphere);
          } else {
            bounds.union(_sphere);
          }
        });
        if (_frustum.intersectsSphere(bounds)) {
          layers.push({
            bounds,
            distance: bounds.center.distanceTo(_position),
            entities,
          });
        }
        return layers;
      }, [])
      .sort(({ distance: a }, { distance: b }) => defines.CONETRACING ? (b - a) : (a - b));

    renderer.getDrawingBufferSize(_size).multiplyScalar(resolution).floor();
    if (target.width !== _size.x || target.height !== _size.y) {
      target.setSize(_size.x, _size.y);
      uniforms.resolution.value.copy(_size);
    }

    const currentAutoClear = renderer.autoClear;
    const currentClearAlpha = renderer.getClearAlpha();
    const currentRenderTarget = renderer.getRenderTarget();
    const currentShadowAutoUpdate = renderer.shadowMap.autoUpdate;
    const currentXrEnabled = renderer.xr.enabled;
    renderer.autoClear = false;
    renderer.shadowMap.autoUpdate = false;
    renderer.xr.enabled = false;
    renderer.setClearAlpha(0);
    renderer.setRenderTarget(target);
    renderer.state.buffers.depth.setMask(true);

    renderer.clear();
    sortedLayers.forEach(({ bounds, entities }) => {
      uniforms.bounds.value.center.copy(bounds.center);
      uniforms.bounds.value.radius = bounds.radius;
      uniforms.numEntities.value = entities.length;
    entities.forEach(({ color, operation, position, rotation, scale, shape, invMatrix, hasMatrix/* TERRAIN DISABLED , octaves, amplitude, clampYMin, clampYMax, offsetX, offsetZ, seed, dispClampMin, dispClampMax, peakGain, valleyGain, useColorRamp, smoothingStrength, dispApplyMinY, dispApplyMaxY, dispFeather */ }, i) => {
        const uniform = uniforms.entities.value[i];
        uniform.color.copy(color);
        uniform.operation = operation;
        uniform.position.copy(position);
        uniform.rotation.copy(rotation);
        uniform.scale.copy(scale);
        uniform.shape = shape;
      uniform.invMatrix.copy(invMatrix);
      uniform.hasMatrix = hasMatrix;
        /* TERRAIN DISABLED
        // If debugForce is on, override terrain uniforms to strong values
        if (debugForce) {
          uniform.octaves = 6.0;
          uniform.amplitude = 2.2;
          uniform.clampYMin = -12.0;
          uniform.clampYMax = 24.0;
          uniform.offsetX = 0.0;
          uniform.offsetZ = 0.0;
          uniform.seed = 777.0;
          uniform.dispClampMin = -9999.0;
          uniform.dispClampMax = 9999.0;
          uniform.peakGain = 1.5;
          uniform.valleyGain = 1.5;
          uniform.useColorRamp = 1.0;
          uniform.smoothingStrength = 0.4;
          uniform.dispApplyMinY = -9999.0;
          uniform.dispApplyMaxY = 9999.0;
          uniform.dispFeather = 0.5;
        } else {
          uniform.octaves = octaves;
          uniform.amplitude = amplitude;
          uniform.clampYMin = clampYMin;
          uniform.clampYMax = clampYMax;
          uniform.offsetX = offsetX;
          uniform.offsetZ = offsetZ;
          uniform.seed = seed;
          uniform.dispClampMin = dispClampMin;
          uniform.dispClampMax = dispClampMax;
          uniform.peakGain = peakGain;
          uniform.valleyGain = valleyGain;
          uniform.useColorRamp = useColorRamp;
          uniform.smoothingStrength = (smoothingStrength !== undefined ? smoothingStrength : 0.0);
          uniform.dispApplyMinY = (dispApplyMinY !== undefined ? dispApplyMinY : -9999.0);
          uniform.dispApplyMaxY = (dispApplyMaxY !== undefined ? dispApplyMaxY : 9999.0);
          uniform.dispFeather = (dispFeather !== undefined ? dispFeather : 0.0);
        }
        */
      });
      // minimal one-time log is kept above when MAX_ENTITIES updates
      renderer.render(raymarcher, camera);
    });

    renderer.autoClear = currentAutoClear;
    renderer.shadowMap.autoUpdate = currentShadowAutoUpdate;
    renderer.xr.enabled = currentXrEnabled;
    renderer.setClearAlpha(currentClearAlpha);
    renderer.setRenderTarget(currentRenderTarget);
    if (camera.viewport) renderer.state.viewport(camera.viewport);
  }

  raycast(raycaster, intersects) {
    const { userData: { layers } } = this;
    layers.forEach((layer, layerId) => layer.forEach((entity, entityId) => {
      const entityIntersects = [];
      Raymarcher.getEntityCollider(entity).raycast(raycaster, entityIntersects);
      entityIntersects.forEach((intersect) => {
        intersect.entity = entity;
        intersect.entityId = entityId;
        intersect.layer = layer;
        intersect.layerId = layerId;
        intersect.object = this;
        intersects.push(intersect);
      });
    }));
  }

  static cloneEntity({ color, operation, position, rotation, scale, shape/* TERRAIN DISABLED , terrainParams */ }) {
    const entity = {
      color: color.clone(),
      operation,
      position: position.clone(),
      rotation: rotation.clone(),
      scale: scale.clone(),
      shape,
      invMatrix: new Matrix4(),
      hasMatrix: 0.0,
      /* TERRAIN DISABLED
      // Default terrain parameters - octaves=0 means NO terrain displacement
      octaves: 0,
      amplitude: 1.35,
      clampYMin: -12,
      clampYMax: 24,
      offsetX: 0,
      offsetZ: 0,
      seed: 0,
  dispClampMin: -9999,
  dispClampMax: 9999,
  peakGain: 1.0,
  valleyGain: 1.0,
  smoothingStrength: 0.0,
  useColorRamp: 1.0,
  dispApplyMinY: -9999.0,
  dispApplyMaxY: 9999.0,
  dispFeather: 0.0,
      */
    };
    
    /* TERRAIN DISABLED
    // Override with terrainParams if provided - this activates terrain!
    if (terrainParams) {
      entity.octaves = terrainParams.octaves;
      entity.amplitude = terrainParams.amplitude;
      entity.clampYMin = terrainParams.clampYMin;
      entity.clampYMax = terrainParams.clampYMax;
      entity.offsetX = terrainParams.offsetX;
      entity.offsetZ = terrainParams.offsetZ;
      entity.seed = terrainParams.seed;
  entity.dispClampMin = terrainParams.dispClampMin ?? -9999;
  entity.dispClampMax = terrainParams.dispClampMax ?? 9999;
  entity.peakGain = terrainParams.peakGain ?? 1.0;
  entity.valleyGain = terrainParams.valleyGain ?? 1.0;
  entity.smoothingStrength = terrainParams.smoothingStrength ?? 0.0;
  entity.useColorRamp = (terrainParams.useColorRamp ?? true) ? 1.0 : 0.0;
  entity.dispApplyMinY = terrainParams.dispApplyMinY ?? -9999.0;
  entity.dispApplyMaxY = terrainParams.dispApplyMaxY ?? 9999.0;
  entity.dispFeather = terrainParams.dispFeather ?? 0.0;
      
    }
    */
    
    return entity;
  }

  static getEntityCollider({ position, rotation, scale, shape }) {
    const collider = _colliders[shape];
    collider.position.copy(position);
    collider.quaternion.copy(rotation);
    collider.scale.copy(scale);
    if (shape === Raymarcher.shapes.capsule) {
      collider.scale.z = collider.scale.x;
    }
    collider.updateMatrixWorld();
    return collider;
  }

  static getLayerBounds(layer) {
    if (!_bounds[layer]) {
      _bounds[layer] = new Sphere();
    }
    return _bounds[layer].makeEmpty();
  }
}

Raymarcher.operations = {
  union: 0,
  substraction: 1,
  intersection: 2,
};

Raymarcher.shapes = {
  box: 0,
  capsule: 1,
  sphere: 2,
  torus: 3,
  // TERRAIN DISABLED terrain: 4,
};

export { Raymarcher as default };
