// Shared types and JS implementations of GLSL math builtins.
// Used by primitives.ts at runtime (CPU evaluation).
// The transpiler (scripts/gen-glsl.mjs) reads primitives.ts and maps
// these call sites to GLSL builtins of the same name.

export type Vec3 = { x: number; y: number; z: number };
export type Vec2 = { x: number; y: number };

export function length(v: Vec3 | Vec2): number {
    if ('z' in v) return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function dot(a: Vec3, b: Vec3): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function clamp(x: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, x));
}

export function mix(a: number, b: number, t: number): number {
    return a * (1 - t) + b * t;
}

export function sign(x: number): number {
    return Math.sign(x);
}

export function normalize(v: Vec3): Vec3 {
    const len = length(v);
    if (len < 1e-10) return { x: 0, y: 0, z: 0 };
    return { x: v.x / len, y: v.y / len, z: v.z / len };
}

export function cross(a: Vec3, b: Vec3): Vec3 {
    return {
        x: a.y * b.z - a.z * b.y,
        y: a.z * b.x - a.x * b.z,
        z: a.x * b.y - a.y * b.x,
    };
}
