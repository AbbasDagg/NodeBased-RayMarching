// Gravitas SDFSchema — copied from gravitas/src/sdf/SDFSchema.ts
// Decorators removed (they are no-ops at runtime; CRA/Babel needs experimentalDecorators
// configured to preserve them, so we omit them here to keep the build simple).
// Extended with BoxNode, SmoothSubtractionNode, TransformNode.

export type Vector3Array = [number, number, number];
export type QuaternionArray = [number, number, number, number];

export interface ParamDef {
    name: string;
    label: string;
    type: 'number' | 'color' | 'vector3' | 'vector2' | 'vector4' | 'boolean' | 'select';
    min?: number;
    max?: number;
    step?: number;
    decimals?: number;
    options?: string[];
    optionLabels?: string[];
}

export interface MaterialDef {
    color: Vector3Array;
    metalness?: number;
    roughness?: number;
    emissive?: Vector3Array;
}

// ── Base classes (from Gravitas) ─────────────────────────────────────────────

export abstract class SDFNode {
    readonly id: string;
    public position: Vector3Array;
    public rotation?: QuaternionArray;
    public scale?: Vector3Array;

    constructor(id: string, position: Vector3Array = [0, 0, 0]) {
        this.id = id;
        this.position = position;
    }
    abstract readonly type: string;
    abstract toJSON(): any;
}

export abstract class SDFShapeNode extends SDFNode {
    public material?: MaterialDef;
}

export class SphereNode extends SDFShapeNode {
    readonly type = 'sphere';
    public radius: number;

    static value(x: number, y: number, z: number, radius: number): number {
        return Math.sqrt(x * x + y * y + z * z) - radius;
    }
    static grad(x: number, y: number, z: number, _radius: number): { x: number; y: number; z: number } {
        const len = Math.sqrt(x * x + y * y + z * z);
        if (len < 1e-10) return { x: 0, y: 1, z: 0 };
        return { x: x / len, y: y / len, z: z / len };
    }

    constructor(id: string, position: Vector3Array, radius: number) {
        super(id, position);
        this.radius = radius;
    }
    toJSON() {
        return { type: this.type, id: this.id, position: this.position, radius: this.radius, material: this.material };
    }
}

export abstract class SDFOperatorNode extends SDFNode {
    public left: SDFNode;
    public right: SDFNode;
    constructor(id: string, left: SDFNode, right: SDFNode) {
        super(id, [0, 0, 0]);
        this.left = left;
        this.right = right;
    }
}

export abstract class SDFSmoothOperatorNode extends SDFOperatorNode {
    public k: number;
    constructor(id: string, left: SDFNode, right: SDFNode, k: number) {
        super(id, left, right);
        this.k = k;
    }
}

export class SmoothUnionNode extends SDFSmoothOperatorNode {
    readonly type = 'smoothUnion';
    public k: number;

    static value(aD: number, bD: number, k: number): number {
        const h = Math.max(k - Math.abs(aD - bD), 0) / k;
        return Math.min(aD, bD) - h * h * h * k * (1 / 6);
    }
    static derivative(aD: number, bD: number, k: number): { a: number; b: number } {
        const h = Math.max(k - Math.abs(aD - bD), 0) / k;
        const m = 0.5 * h * h;
        const b = aD < bD ? m : 1 - m;
        return { a: 1 - b, b };
    }

    constructor(id: string, left: SDFNode, right: SDFNode, k: number) {
        super(id, left, right, k);
        this.k = k;
    }
    toJSON() {
        return { type: this.type, id: this.id, left: this.left.toJSON(), right: this.right.toJSON(), k: this.k };
    }
}

export abstract class SDFDeformationNode extends SDFNode {
    public child: SDFNode;
    constructor(id: string, child: SDFNode) {
        super(id, [0, 0, 0]);
        this.child = child;
    }
}

export class DeformationNode extends SDFDeformationNode {
    readonly type = 'deformation';
    public frequency: number;
    public amplitude: number;

    static evaluatePush(
        data: Float32Array, new_dp: number,
        new_px: number, new_py: number, new_pz: number,
        new_wp: number, ptStack: Float32Array, mStack: Float32Array
    ) {
        ptStack[new_wp * 3 + 0] = new_px;
        ptStack[new_wp * 3 + 1] = new_py;
        ptStack[new_wp * 3 + 2] = new_pz;
        const frequency = data[new_dp++];
        const amplitude = data[new_dp++];
        mStack[new_wp * 9 + 0] = frequency;
        mStack[new_wp * 9 + 1] = amplitude;
        return {
            px: new_px,
            py: new_py + amplitude * Math.sin(frequency * new_px),
            pz: new_pz,
            dp: new_dp,
            wp: new_wp + 1,
        };
    }

    static evaluatePop(
        _px: number, _py: number, _pz: number,
        new_sp: number, new_wp: number,
        mathStack: Float32Array, ptStack: Float32Array, mStack: Float32Array
    ) {
        const wp = new_wp - 1;
        const old_px = ptStack[wp * 3 + 0];
        const old_py = ptStack[wp * 3 + 1];
        const old_pz = ptStack[wp * 3 + 2];
        const frequency = mStack[wp * 9 + 0];
        const amplitude = mStack[wp * 9 + 1];
        const fx = frequency * old_px;
        const J = [1, 0, 0, amplitude * frequency * Math.cos(fx), 1, 0, 0, 0, 1];
        const pi = (new_sp - 1) * 4;
        const gx = mathStack[pi + 1], gy = mathStack[pi + 2], gz = mathStack[pi + 3];
        return {
            px: old_px, py: old_py, pz: old_pz, wp,
            gx: J[0] * gx + J[3] * gy + J[6] * gz,
            gy: J[1] * gx + J[4] * gy + J[7] * gz,
            gz: J[2] * gx + J[5] * gy + J[8] * gz,
        };
    }

    constructor(id: string, child: SDFNode, frequency: number, amplitude: number) {
        super(id, child);
        this.frequency = frequency;
        this.amplitude = amplitude;
    }
    toJSON() {
        return { type: this.type, id: this.id, child: this.child.toJSON(), frequency: this.frequency, amplitude: this.amplitude };
    }
}

// ── Extensions ───────────────────────────────────────────────────────────────

export class BoxNode extends SDFShapeNode {
    readonly type = 'box';
    public halfExtents: Vector3Array;

    constructor(id: string, position: Vector3Array, halfExtents: Vector3Array) {
        super(id, position);
        this.halfExtents = halfExtents;
    }
    toJSON() {
        return { type: this.type, id: this.id, position: this.position, halfExtents: this.halfExtents, material: this.material };
    }
}

export class SmoothSubtractionNode extends SDFSmoothOperatorNode {
    readonly type = 'smoothSubtraction';
    // left = base (carved into), right = cutter (removed)
    constructor(id: string, left: SDFNode, right: SDFNode, k: number) {
        super(id, left, right, k);
    }
    toJSON() {
        return { type: this.type, id: this.id, left: this.left.toJSON(), right: this.right.toJSON(), k: this.k };
    }
}

// TransformNode applies a 4×4 row-major inverse matrix (world→local) to the
// query point before evaluating the child SDF. Enables rotation in GLSL and CPU VM.
export class TransformNode extends SDFDeformationNode {
    readonly type = 'transform';
    public inverseMatrix: number[]; // 16 floats, row-major

    constructor(id: string, child: SDFNode, inverseMatrix: number[]) {
        super(id, child);
        this.inverseMatrix = inverseMatrix;
    }
    toJSON() {
        return { type: this.type, id: this.id, child: this.child.toJSON(), inverseMatrix: this.inverseMatrix };
    }
}

// ── Factory ──────────────────────────────────────────────────────────────────

export class SDFNodeFactory {
    static fromJSON(data: any): SDFNode {
        switch (data.type) {
            case 'sphere': {
                const n = new SphereNode(data.id, data.position, data.radius);
                if (data.material) n.material = data.material;
                return n;
            }
            case 'box': {
                const n = new BoxNode(data.id, data.position, data.halfExtents);
                if (data.material) n.material = data.material;
                return n;
            }
            case 'smoothUnion':
                return new SmoothUnionNode(data.id, SDFNodeFactory.fromJSON(data.left), SDFNodeFactory.fromJSON(data.right), data.k);
            case 'smoothSubtraction':
                return new SmoothSubtractionNode(data.id, SDFNodeFactory.fromJSON(data.left), SDFNodeFactory.fromJSON(data.right), data.k);
            case 'deformation':
                return new DeformationNode(data.id, SDFNodeFactory.fromJSON(data.child), data.frequency, data.amplitude);
            case 'transform':
                return new TransformNode(data.id, SDFNodeFactory.fromJSON(data.child), data.inverseMatrix);
            default:
                throw new Error(`Unknown SDFNode type: ${data.type}`);
        }
    }
}
