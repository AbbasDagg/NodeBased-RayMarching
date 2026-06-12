// AUTO-GENERATED section from Gravitas — source of truth: gravitas/src/sdf/SDFSchema.ts
// Extended with sdBoxGrad and opSmoothSubtractionDeriv for thesis project.

export function sdSphereGrad(
    x: number,
    y: number,
    z: number,
    _radius: number
): { x: number; y: number; z: number } {
    const len = Math.sqrt(x * x + y * y + z * z);
    if (len < 1e-10) {
        return { x: 0.0, y: 1.0, z: 0.0 };
    }
    return { x: x / len, y: y / len, z: z / len };
}

export function opSmoothUnionDeriv(aD: number, bD: number, k: number): { a: number; b: number } {
    const h = Math.max(k - Math.abs(aD - bD), 0.0) / k;
    const m = 0.5 * h * h;
    const b = aD < bD ? m : 1.0 - m;
    return { a: 1.0 - b, b: b };
}

export function opDeformationJacobian(
    x: number,
    _y: number,
    _z: number,
    frequency: number,
    amplitude: number
): number[] {
    const fx = frequency * x;
    return [1.0, 0.0, 0.0, amplitude * frequency * Math.cos(fx), 1.0, 0.0, 0.0, 0.0, 1.0];
}

// ── Extensions ──────────────────────────────────────────────────────────────

export function sdBoxGrad(
    x: number, y: number, z: number,
    hx: number, hy: number, hz: number
): { x: number; y: number; z: number } {
    const dx = Math.abs(x) - hx;
    const dy = Math.abs(y) - hy;
    const dz = Math.abs(z) - hz;
    const ox = Math.max(dx, 0), oy = Math.max(dy, 0), oz = Math.max(dz, 0);
    const outLen = Math.sqrt(ox * ox + oy * oy + oz * oz);
    if (outLen > 1e-10) {
        return { x: Math.sign(x) * ox / outLen, y: Math.sign(y) * oy / outLen, z: Math.sign(z) * oz / outLen };
    }
    // Inside: gradient from the closest face (most negative d-component)
    if (dx >= dy && dx >= dz) return { x: Math.sign(x) || 1, y: 0, z: 0 };
    if (dy >= dz)             return { x: 0, y: Math.sign(y) || 1, z: 0 };
    return                           { x: 0, y: 0, z: Math.sign(z) || 1 };
}

// Derivative of opSmoothSubtraction(base, cutter, k) w.r.t. each input.
// Uses smooth-max identity: subtraction = smooth_max(base, -cutter, k).
export function opSmoothSubtractionDeriv(
    baseD: number,
    cutterD: number,
    k: number
): { base: number; cutter: number } {
    if (k <= 0) {
        return -cutterD >= baseD ? { base: 0, cutter: -1 } : { base: 1, cutter: 0 };
    }
    const h = Math.max(k - Math.abs(baseD + cutterD), 0.0) / k;
    const m = 0.5 * h * h;
    // bWeight = weight on the -cutter component in the smooth-max blend
    const bWeight = baseD > -cutterD ? m : 1.0 - m;
    return { base: 1.0 - bWeight, cutter: -bWeight };
}
