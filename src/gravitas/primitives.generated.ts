// AUTO-GENERATED section from Gravitas — source of truth: gravitas/src/sdf/SDFSchema.ts
// Extended with sdBox and opSmoothSubtraction for thesis project.

export function sdSphere(x: number, y: number, z: number, radius: number): number {
    return Math.sqrt(x * x + y * y + z * z) - radius;
}
export function opSmoothUnion(aD: number, bD: number, k: number): number {
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
