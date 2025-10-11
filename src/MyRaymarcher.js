import { BoxGeometry, CylinderGeometry, IcosahedronGeometry, Mesh, Frustum, Vector3, Matrix4, Vector2, Sphere, PlaneGeometry, WebGLRenderTarget, DepthTexture, UnsignedShortType, RawShaderMaterial, GLSL3, MathUtils, TorusGeometry } from 'three';

var lighting = "#ifdef ENVMAP_TYPE_CUBE_UV\n\n#define PI 3.141592653589793\n#define RECIPROCAL_PI 0.3183098861837907\n\nstruct GeometricContext {\n  vec3 normal;\n  vec3 viewDir;\n};\n\nstruct PhysicalMaterial {\n  vec3 diffuseColor;\n  float roughness;\n  vec3 specularColor;\n  float specularF90;\n};\n\nstruct ReflectedLight {\n  vec3 indirectDiffuse;\n  vec3 indirectSpecular;\n};\n\nvec3 BRDF_Lambert(const in vec3 diffuseColor) {\n  return RECIPROCAL_PI * diffuseColor;\n}\n\nvec2 DFGApprox(const in vec3 normal, const in vec3 viewDir, const in float roughness) {\n  float dotNV = saturate(dot(normal, viewDir));\n  const vec4 c0 = vec4(-1.0, -0.0275, -0.572, 0.022);\n  const vec4 c1 = vec4(1.0, 0.0425, 1.04, -0.04);\n  vec4 r = roughness * c0 + c1;\n  float a004 = min(r.x * r.x, exp2(-9.28 * dotNV)) * r.x + r.y;\n  vec2 fab = vec2(-1.04, 1.04) * a004 + r.zw;\n  return fab;\n}\n\nvoid computeMultiscattering(const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter) {\n  vec2 fab = DFGApprox(normal, viewDir, roughness);\n  vec3 FssEss = specularColor * fab.x + specularF90 * fab.y;\n  float Ess = fab.x + fab.y;\n  float Ems = 1.0 - Ess;\n  vec3 Favg = specularColor + (1.0 - specularColor) * 0.047619;\n  vec3 Fms = FssEss * Favg / (1.0 - Ems * Favg);\n  singleScatter += FssEss;\n  multiScatter += Fms * Ems;\n}\n\nvoid RE_IndirectDiffuse(const in vec3 irradiance, const in GeometricContext geometry, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {\n  reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert(material.diffuseColor);\n}\n\nvoid RE_IndirectSpecular(const in vec3 radiance, const in vec3 irradiance, const in GeometricContext geometry, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {\n  vec3 singleScattering = vec3(0.0);\n  vec3 multiScattering = vec3(0.0);\n  vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;\n  computeMultiscattering(geometry.normal, geometry.viewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering);\n  vec3 diffuse = material.diffuseColor * (1.0 - (singleScattering + multiScattering));\n  reflectedLight.indirectSpecular += radiance * singleScattering;\n  reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;\n  reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;\n}\n\nvec3 getIBLRadiance(const in vec3 viewDir, const in vec3 normal, const in float roughness) {\n  vec3 reflectVec = reflect(-viewDir, normal);\n  reflectVec = normalize(mix(reflectVec, normal, roughness * roughness));\n  vec4 envMapColor = textureCubeUV(envMap, reflectVec, roughness);\n  return envMapColor.rgb * envMapIntensity;\n}\n\nvec3 getIBLIrradiance(const in vec3 normal) {\n  vec3 envMapColor = textureCubeUV(envMap, normal, 1.0).rgb;\n  return PI * envMapColor * envMapIntensity;\n}\n\nvec3 getLight(const in vec3 position, const in vec3 normal, const in vec3 diffuse) {\n  GeometricContext geometry;\n  geometry.normal = normal;\n  geometry.viewDir = normalize(cameraPosition - position);\n\n  PhysicalMaterial material;\n  material.diffuseColor = diffuse * (1.0 - metalness);\n  material.roughness = max(min(roughness, 1.0), 0.0525);\n  material.specularColor = mix(vec3(0.04), diffuse, metalness);\n  material.specularF90 = 1.0;\n\n  ReflectedLight reflectedLight = ReflectedLight(vec3(0.0), vec3(0.0));\n  vec3 radiance = getIBLRadiance(geometry.viewDir, geometry.normal, material.roughness);\n  vec3 irradiance = getIBLIrradiance(geometry.normal);\n  RE_IndirectDiffuse(irradiance, geometry, material, reflectedLight);\n  RE_IndirectSpecular(radiance, irradiance, geometry, material, reflectedLight);\n\n  return reflectedLight.indirectDiffuse + reflectedLight.indirectSpecular;\n}\n\n#else\n\nvec3 getLight(const in vec3 position, const in vec3 normal, const in vec3 diffuse) {\n  return diffuse * envMapIntensity;\n}\n\n#endif\n";


// Change SDFs here
var raymarcherFragment = "precision highp float;\nprecision highp int;\n\nstruct Bounds {\n  vec3 center;\n  float radius;\n};\n\nstruct Entity {\n  vec3 color;\n  int operation;\n  vec3 position;\n  vec4 rotation;\n  vec3 scale;\n  int shape;\n};\n\nstruct SDF {\n  float distance;\n  vec3 color;\n};\n\nout vec4 fragColor;\nin vec3 ray;\nuniform float blending;\nuniform Bounds bounds;\nuniform vec3 cameraDirection;\nuniform float cameraFar;\nuniform float cameraFov;\nuniform float cameraNear;\nuniform vec3 cameraPosition;\nuniform Entity entities[MAX_ENTITIES];\nuniform sampler2D envMap;\nuniform float envMapIntensity;\nuniform float metalness;\nuniform int numEntities;\nuniform vec2 resolution;\nuniform float roughness;\n\n#define saturate(a) clamp(a, 0.0, 1.0)\n#define texture2D texture\n#include <cube_uv_reflection_fragment>\n#include <encodings_pars_fragment>\n#include <lighting>\n\nvec3 applyQuaternion(const in vec3 p, const in vec4 q) {\n  return p + 2.0 * cross(-q.xyz, cross(-q.xyz, p) + q.w * p);\n}\n\nfloat sdBox(const in vec3 p, const in vec3 r) {\n  vec3 q = abs(p)-r;\n  return length(max(q,0.0))+min(max(q.x,max(q.y,q.z)),0.0);\n}\n\nfloat sdCapsule(in vec3 p, const in vec3 r) {\n  p.y -= clamp(p.y,-r.y+r.x,r.y-r.x);\n  return length(p)-r.x;\n}\n\nfloat sdEllipsoid(const in vec3 p, const in vec3 r) {\n  float k0 = length(p/r);\n  float k1 = length(p/(r*r));\n  return k0*(k0-1.0)/k1;\n}\n\nfloat sdSphere(const in vec3 p, const in float r) {\n  return length(p)-r;\n}\n\nSDF sdEntity(in vec3 p, const in Entity e) {\n  float distance;\n  p = applyQuaternion(p - e.position, normalize(e.rotation));\n  switch (e.shape) {\n    default:\n    case 0:\n      distance = sdBox(p, e.scale * 0.5 - vec3(0.1)) - 0.1;\n      break;\n    case 1:\n      distance = sdCapsule(p, e.scale * 0.5);\n      break;\n    case 2:\n      distance = sdEllipsoid(p, e.scale * 0.5);\n      break;\n  }\n  return SDF(distance, e.color);\n}\n\nSDF opSmoothUnion(const in SDF a, const in SDF b, const in float k) {\n  float h = saturate(0.5 + 0.5 * (b.distance - a.distance) / k);\n  return SDF(\n    mix(b.distance, a.distance, h) - k*h*(1.0-h),\n    mix(b.color, a.color, h)\n  );\n}\n\nSDF opSmoothSubtraction(const in SDF a, const in SDF b, const in float k) {\n  float h = saturate(0.5 - 0.5 * (a.distance + b.distance) / k);\n  return SDF(\n    mix(a.distance, -b.distance, h) + k*h*(1.0-h),\n    mix(a.color, b.color, h)\n  );\n}\n\nSDF opSmoothIntersection(const in SDF a, const in SDF b, const in float k) {\n  float h = saturate(0.5 + 0.5 * (b.distance - a.distance) / k);\n  return SDF(\n    mix(a.distance, b.distance, h) + k*h*(1.0-h),\n    mix(a.color, b.color, h)\n  );\n}\n\nSDF map(const in vec3 p) {\n  SDF scene = sdEntity(p, entities[0]);\n  for (int i = 1, l = min(numEntities, MAX_ENTITIES); i < l; i++) {\n    switch (entities[i].operation) {\n      default:\n      case 0:\n        scene = opSmoothUnion(scene, sdEntity(p, entities[i]), blending);\n        break;\n      case 1:\n        scene = opSmoothSubtraction(scene, sdEntity(p, entities[i]), blending);\n        break;\n      case 2:\n        scene = opSmoothIntersection(scene, sdEntity(p, entities[i]), blending);\n        break;\n    }\n  }\n  return scene;\n}\n\nvec3 getNormal(const in vec3 p, const in float d) {\n  const vec2 o = vec2(0.001, 0);\n  return normalize(\n    d - vec3(\n      map(p - o.xyy).distance,\n      map(p - o.yxy).distance,\n      map(p - o.yyx).distance\n    )\n  );\n}\n\n#ifdef CONETRACING\nvoid march(inout vec4 color, inout float distance) {\n  float closest = MAX_DISTANCE;\n  float coverage = 1.0;\n  float coneRadius = (2.0 * tan(cameraFov / 2.0)) / resolution.y;\n  for (int i = 0; i < MAX_ITERATIONS && distance < MAX_DISTANCE; i++) {\n    vec3 position = cameraPosition + ray * distance;\n    float distanceToBounds = sdSphere(position - bounds.center, bounds.radius);\n    if (distanceToBounds > 0.1) {\n      distance += distanceToBounds;\n    } else {\n      SDF step = map(position);\n      float cone = coneRadius * distance;\n      if (step.distance < cone) {\n        if (closest > distance) {\n          closest = distance;\n        }\n        float alpha = smoothstep(cone, -cone, step.distance);\n        vec3 pixel = getLight(position, getNormal(position, step.distance), step.color);\n        color.rgb += coverage * (alpha * pixel);\n        coverage *= (1.0 - alpha);\n        if (coverage <= MIN_COVERAGE) {\n          break;\n        }\n      }\n      distance += max(abs(step.distance), MIN_DISTANCE);\n    }\n  }\n  distance = closest;\n  color.a = 1.0 - (max(coverage - MIN_COVERAGE, 0.0) / (1.0 - MIN_COVERAGE));\n}\n#else\nvoid march(inout vec4 color, inout float distance) {\n  for (int i = 0; i < MAX_ITERATIONS && distance < MAX_DISTANCE; i++) {\n    vec3 position = cameraPosition + ray * distance;\n    float distanceToBounds = sdSphere(position - bounds.center, bounds.radius);\n    if (distanceToBounds > 0.1) {\n      distance += distanceToBounds;\n    } else {\n      SDF step = map(position);\n      if (step.distance <= MIN_DISTANCE) {\n        color = vec4(getLight(position, getNormal(position, step.distance), step.color), 1.0);\n        break;\n      }\n      distance += step.distance;\n    }\n  }\n}\n#endif\n\nvoid main() {\n  vec4 color = vec4(0.0);\n  float distance = cameraNear;\n  march(color, distance);\n  fragColor = saturate(LinearTosRGB(color));\n  float z = (distance >= MAX_DISTANCE) ? cameraFar : (distance * dot(cameraDirection, ray));\n  float ndcDepth = -((cameraFar + cameraNear) / (cameraNear - cameraFar)) + ((2.0 * cameraFar * cameraNear) / (cameraNear - cameraFar)) / z;\n  gl_FragDepth = ((gl_DepthRange.diff * ndcDepth) + gl_DepthRange.near + gl_DepthRange.far) / 2.0;\n}\n";

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
  vec3 position;
  vec4 rotation;
  vec3 scale;
  int shape;
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

// sdTerrainWithColor: heightfield terrain SDF (distance = y - height)
// entityColor encodes the world seed (via hex -> vec3 0..1). Same seed -> same terrain
SDF sdTerrainWithColor(const in vec3 p, const in vec3 scale, const in vec3 entityPos, const in vec3 entityColor) {
  // entityColor is 0..1 vec3 from hex; unpack to a stable integer-ish seed
  float terrainSeed = floor(entityColor.r * 255.0) + floor(entityColor.g * 255.0) * 256.0 + floor(entityColor.b * 255.0) * 65536.0;
  
  // Increase feature frequency a bit for more variety while keeping smoothness
  vec2 noiseCoord = p.xz * 0.03;
  
  // Multi-octave value noise (fBm-like). Same seed yields same terrain; different seed offsets the sampling region
  // Separate base water and noiseSum so we can scale vertical range cleanly
  float baseLevel = -3.0;                     // Water level baseline
  float heightScale = 1.35;                   // Increase vertical range slightly (tweakable)
  float noiseSum = 0.0;
  noiseSum += simpleNoise(noiseCoord, terrainSeed) * 8.0;                    // Base terrain
  noiseSum += simpleNoise(noiseCoord * 2.0, terrainSeed + 123.0) * 4.0;      // Hills  
  noiseSum += simpleNoise(noiseCoord * 4.0, terrainSeed + 456.0) * 2.0;      // Medium features
  noiseSum += simpleNoise(noiseCoord * 8.0, terrainSeed + 789.0) * 1.0;      // Surface details
  noiseSum += simpleNoise(noiseCoord * 16.0, terrainSeed + 1337.0) * 0.5;    // Fine details (subtle)
  float height = baseLevel + noiseSum * heightScale;
  
  // Allow more range so peaks can reach snow more often
  height = clamp(height, -12.0, 24.0);
  
  // Height-based coloring - MAXIMUM WATER  
  vec3 color;
  if (height < -5.0) {
    color = vec3(0.0, 0.1, 0.4); // Very deep water (dark blue)
  } else if (height < -2.0) {
    color = vec3(0.0, 0.3, 0.7); // Deep water (blue)
  } else if (height < 1.0) {
    color = vec3(0.2, 0.5, 0.9); // Shallow water (light blue) - EXPANDED
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
  float distance = p.y - height; // Proper heightfield SDF
  
  return SDF(distance, color);
}

SDF sdEntity(in vec3 p, const in Entity e) {
  float distance;
  
  // Special case for terrain - DON'T apply transformations, use world coordinates
  if (e.shape == 4) {
    return sdTerrainWithColor(p, e.scale, e.position, e.color); // Pass original world p
  }
  
  // For all other shapes, apply normal transformations
  p = applyQuaternion(p - e.position, normalize(e.rotation));
  switch (e.shape) {
    default:
    case 0:
      distance = sdBox(p, e.scale * 0.5 - vec3(0.1)) - 0.1;
      break;
    case 1:
      distance = sdCapsule(p, e.scale * 0.5);
      break;
    case 2:
      distance = sdEllipsoid(p, e.scale * 0.5);
      break;
    case 3:
      distance = sdTorus(p, e.scale.xy * 0.5);
      break;
  }
  return SDF(distance, e.color);
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
  const vec2 o = vec2(0.001, 0);
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
      distance += max(abs(step.distance), MIN_DISTANCE);
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
      distance += step.distance;
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
      entities.forEach(({ color, operation, position, rotation, scale, shape }, i) => {
        const uniform = uniforms.entities.value[i];
        uniform.color.copy(color);
        uniform.operation = operation;
        uniform.position.copy(position);
        uniform.rotation.copy(rotation);
        uniform.scale.copy(scale);
        uniform.shape = shape;
      });
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

  static cloneEntity({ color, operation, position, rotation, scale, shape }) {
    return {
      color: color.clone(),
      operation,
      position: position.clone(),
      rotation: rotation.clone(),
      scale: scale.clone(),
      shape,
    };
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
  terrain: 4,
};

export { Raymarcher as default };
