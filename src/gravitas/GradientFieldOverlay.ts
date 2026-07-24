// GradientFieldOverlay — ported from gravitas/src/renderer/GradientFieldOverlay.ts.
// Faithful port: the only change is the data source — his version pulled a cached
// EvaluatorVM from World/EvaluatorRegistry; ours is handed the EvaluatorVM directly
// (built from the compiled packet's SDF root). Sampling, arrow pool, colors, slice
// planes, and the autoClear overlay render are his code.

import * as THREE from 'three';
import type { EvaluatorVM } from './EvaluatorVM';

export type SlicePlane = 'XZ' | 'XY' | 'YZ';

export interface GradientFieldOptions {
    gridResolution?: number; // arrows per axis, default 20
    gridExtent?: number; // half-width in world units, default 4
    slicePlane?: SlicePlane; // which plane to sample, default 'XZ'
    sliceOffset?: number; // offset along the normal axis, default 0
    arrowScale?: number; // length multiplier, default 0.3
}

const INSIDE_COLOR = new THREE.Color(0x44aaff); // blue — inside
const OUTSIDE_COLOR = new THREE.Color(0xff8800); // orange — outside
const SURFACE_COLOR = new THREE.Color(0x44ff88); // green — near zero

// Reusable per-frame scratch
const _dir = new THREE.Vector3();
const _out = new Float32Array(4);

export class GradientFieldOverlay {
    private scene: any;
    private arrows: any[] = [];
    private _visible = false;

    public options: Required<GradientFieldOptions>;

    constructor(options: GradientFieldOptions = {}) {
        this.scene = new THREE.Scene();
        this.options = {
            gridResolution: options.gridResolution ?? 20,
            gridExtent: options.gridExtent ?? 4,
            slicePlane: options.slicePlane ?? 'XZ',
            sliceOffset: options.sliceOffset ?? 0,
            arrowScale: options.arrowScale ?? 0.3,
        };
    }

    get visible() {
        return this._visible;
    }

    setVisible(visible: boolean) {
        this._visible = visible;
        if (visible) this.rebuild();
        else this.clear();
    }

    /**
     * Reallocate the arrow pool (call when grid params change or on show).
     */
    rebuild() {
        this.clear();
        if (!this._visible) return;

        const N = this.options.gridResolution;
        const count = N * N;

        // Pre-allocate the arrow pool
        for (let k = 0; k < count; k++) {
            const arrow = new THREE.ArrowHelper(
                new THREE.Vector3(0, 1, 0),
                new THREE.Vector3(0, 0, 0),
                this.options.arrowScale,
                OUTSIDE_COLOR.getHex()
            );
            // Force always-on-top regardless of anything drawn before this pass:
            // depthTest/depthWrite off on the ACTUAL materials, not just a one-time
            // depth-buffer clear beforehand (belt-and-suspenders — this debug
            // overlay must never be ambiguous about whether it's visible).
            (arrow.line.material as any).depthTest = false;
            (arrow.line.material as any).depthWrite = false;
            (arrow.line.material as any).toneMapped = false;
            (arrow.cone.material as any).depthTest = false;
            (arrow.cone.material as any).depthWrite = false;
            (arrow.cone.material as any).toneMapped = false;
            arrow.renderOrder = 999;
            this.scene.add(arrow);
            this.arrows.push(arrow);
        }

        // Position grid immediately (positions don't change, only directions/colors)
        this._updatePositions();
    }

    /**
     * Update arrow directions and colors from the EvaluatorVM — call every frame.
     * Allocation-free: reuses the existing arrow pool.
     */
    update(vm: EvaluatorVM | null) {
        if (!this._visible) return;
        if (!vm || this.arrows.length === 0) return;

        const {
            gridResolution: N,
            gridExtent: E,
            slicePlane,
            sliceOffset: offset,
            arrowScale,
        } = this.options;

        let k = 0;
        const step = (2 * E) / (N - 1);

        for (let i = 0; i < N; i++) {
            for (let j = 0; j < N; j++) {
                const u = -E + i * step;
                const v = -E + j * step;

                let x = 0,
                    y = 0,
                    z = 0;
                if (slicePlane === 'XZ') {
                    x = u;
                    z = v;
                    y = offset;
                } else if (slicePlane === 'XY') {
                    x = u;
                    y = v;
                    z = offset;
                } else {
                    y = u;
                    z = v;
                    x = offset;
                }

                vm.evaluate(x, y, z, _out);
                const dist = _out[0];
                const gx = _out[1],
                    gy = _out[2],
                    gz = _out[3];

                const gradLen = Math.sqrt(gx * gx + gy * gy + gz * gz);
                const arrow = this.arrows[k++];

                if (gradLen < 1e-6) {
                    arrow.visible = false;
                    continue;
                }

                arrow.visible = true;

                // Negate: arrows point toward nearest surface (−∇f = steepest descent)
                _dir.set(-gx / gradLen, -gy / gradLen, -gz / gradLen);
                arrow.setDirection(_dir);

                // Length = gradient magnitude × scale (≈arrowScale for a proper SDF)
                const length = gradLen * arrowScale;
                arrow.setLength(length, length * 0.35, length * 0.25);

                // Color by sign of SDF value
                if (dist < -0.05) {
                    arrow.setColor(INSIDE_COLOR);
                } else if (dist > 0.05) {
                    arrow.setColor(OUTSIDE_COLOR);
                } else {
                    arrow.setColor(SURFACE_COLOR);
                }
            }
        }
    }

    private _updatePositions() {
        const { gridResolution: N, gridExtent: E, slicePlane, sliceOffset: offset } = this.options;
        const step = (2 * E) / (N - 1);
        let k = 0;
        for (let i = 0; i < N; i++) {
            for (let j = 0; j < N; j++) {
                const u = -E + i * step;
                const v = -E + j * step;
                let x = 0,
                    y = 0,
                    z = 0;
                if (slicePlane === 'XZ') {
                    x = u;
                    z = v;
                    y = offset;
                } else if (slicePlane === 'XY') {
                    x = u;
                    y = v;
                    z = offset;
                } else {
                    y = u;
                    z = v;
                    x = offset;
                }
                this.arrows[k++].position.set(x, y, z);
            }
        }
    }

    private clear() {
        for (const arrow of this.arrows) {
            this.scene.remove(arrow);
            (arrow.line as any)?.geometry?.dispose();
            (arrow.cone as any)?.geometry?.dispose();
        }
        this.arrows = [];
    }

    render(renderer: any, camera: any) {
        if (!this._visible) return;
        renderer.autoClear = false;
        renderer.render(this.scene, camera);
        renderer.autoClear = true;
    }

    dispose() {
        this.clear();
    }
}
