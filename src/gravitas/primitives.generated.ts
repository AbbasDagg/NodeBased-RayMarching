// AUTO-GENERATED section from Gravitas — source of truth: gravitas/src/sdf/SDFSchema.ts
// Extended with sdBox and opSmoothSubtraction for thesis project.

export function sdSphere(x: number, y: number, z: number, radius: number): number {
    return Math.sqrt(x * x + y * y + z * z) - radius;
}
export function opSmoothUnion(aD: number, bD: number, k: number): number {
    // Extension guard: harmonized with his GLSL opSmoothUnionMat, which returns the
    // hard min when k <= 0 (his TS version divides by zero there).
    if (k <= 0) return Math.min(aD, bD);
    const h = Math.max(k - Math.abs(aD - bD), 0.0) / k;
    return Math.min(aD, bD) - h * h * h * k * (1.0 / 6.0);
}
export function opDeformation(
    x: number,
    y: number,
    z: number,
    frequency: number,
    amplitude: number
): { x: number; y: number; z: number } {
    return { x: x, y: y + amplitude * Math.sin(frequency * x), z: z };
}

// ── Extensions ──────────────────────────────────────────────────────────────

export function sdBox(
    x: number, y: number, z: number,
    hx: number, hy: number, hz: number
): number {
    const dx = Math.abs(x) - hx;
    const dy = Math.abs(y) - hy;
    const dz = Math.abs(z) - hz;
    const ox = Math.max(dx, 0), oy = Math.max(dy, 0), oz = Math.max(dz, 0);
    return Math.sqrt(ox * ox + oy * oy + oz * oz) + Math.min(Math.max(dx, dy, dz), 0);
}

export function opSmoothSubtraction(baseD: number, cutterD: number, k: number): number {
    const negC = -cutterD;
    if (k <= 0) return Math.max(negC, baseD);
    const h = Math.max(k - Math.abs(negC - baseD), 0) / k;
    return Math.max(negC, baseD) + h * h * h * k * (1.0 / 6.0);
}

// Torus in the XZ plane (hole axis = Y). Matches the GLSL sdTorus extension.
export function sdTorus(x: number, y: number, z: number, R: number, r: number): number {
    const q = Math.sqrt(x * x + z * z) - R;
    return Math.sqrt(q * q + y * y) - r;
}

// Capsule aligned to the Y axis. Matches the GLSL sdCapsule extension.
export function sdCapsule(x: number, y: number, z: number, radius: number, halfHeight: number): number {
    const seg = Math.max(halfHeight - radius, 0);
    const cy = y - Math.max(-seg, Math.min(seg, y));
    return Math.sqrt(x * x + cy * cy + z * z) - radius;
}
