import { Matrix4 } from 'three';

function getByPath(root, path) {
	let cur = root;
	for (let i = 0; i < path.length; i++) {
		if (cur == null) return null;
		cur = cur[path[i]];
	}
	return cur;
}

function colorToVec3(color) {
	const r = ((color >> 16) & 255) / 255;
	const g = ((color >> 8) & 255) / 255;
	const b = (color & 255) / 255;
	return [r, g, b];
}

function quatFromNode(node) {
	const q = node && node.quaternion;
	if (q && q.x !== undefined) {
		return [q.x, q.y, q.z, q.w];
	}
	return [0, 0, 0, 1];
}

function invMatrixFromNode(node) {
	if (node && node.inverseMatrix && typeof node.inverseMatrix.toArray === 'function') {
		// Match the previous inline mat4(...) convention used by SdfTransform.toGLSL.
		// Three.js stores elements column-major; the legacy shader path effectively
		// consumed a transposed layout in constructor order.
		return node.inverseMatrix.clone().transpose().toArray();
	}
	if (node && node.matrix && typeof node.matrix.clone === 'function') {
		return node.matrix.clone().invert().transpose().toArray();
	}
	return new Matrix4().identity().toArray();
}

class RuntimeCompiler {
	constructor() {
		this.floatParams = [];
		this.vec3Params = [];
		this.vec4Params = [];
		this.mat4Params = [];
		this.signatureParts = [];
	}

	allocFloat(path, read) {
		const idx = this.floatParams.length;
		this.floatParams.push({ path, read });
		return `uSdfFloat[${idx}]`;
	}

	allocVec3(path, read) {
		const idx = this.vec3Params.length;
		this.vec3Params.push({ path, read });
		return `uSdfVec3[${idx}]`;
	}

	allocVec4(path, read) {
		const idx = this.vec4Params.length;
		this.vec4Params.push({ path, read });
		return `uSdfVec4[${idx}]`;
	}

	allocMat4(path, read) {
		const idx = this.mat4Params.length;
		this.mat4Params.push({ path, read });
		return `uSdfMat4[${idx}]`;
	}

	signature(text) {
		this.signatureParts.push(text);
	}
}

function compileSdfExpression(node, path, c, varName = 'p') {
	if (!node) {
		c.signature('null');
		return 'SDF(1e9, vec3(1.0, 0.0, 1.0))';
	}

	const type = node.constructor ? node.constructor.name : 'UnknownSdf';
	c.signature(type);

	if (type === 'SdfBox') {
		const pos = c.allocVec3([...path], (n) => {
			const p = n.position;
			return [p.x, p.y, p.z];
		});
		const quat = c.allocVec4([...path], quatFromNode);
		const half = c.allocVec3([...path], (n) => {
			return [n.scale.x * 0.5 - 0.1, n.scale.y * 0.5 - 0.1, n.scale.z * 0.5 - 0.1];
		});
		const color = c.allocVec3([...path], (n) => colorToVec3(n.color));
		const pLocal = `applyQuaternion(${varName} - ${pos}, normalize(${quat}))`;
		return `SDF(sdBox(${pLocal}, ${half}) - 0.1, ${color})`;
	}

	if (type === 'SdfSphere') {
		const pos = c.allocVec3([...path], (n) => {
			const p = n.position;
			return [p.x, p.y, p.z];
		});
		const quat = c.allocVec4([...path], quatFromNode);
		const rad = c.allocVec3([...path], (n) => {
			return [n.scale.x * 0.5, n.scale.y * 0.5, n.scale.z * 0.5];
		});
		const color = c.allocVec3([...path], (n) => colorToVec3(n.color));
		const pLocal = `applyQuaternion(${varName} - ${pos}, normalize(${quat}))`;
		return `SDF(sdEllipsoid(${pLocal}, ${rad}), ${color})`;
	}

	if (type === 'SdfCapsule') {
		const pos = c.allocVec3([...path], (n) => {
			const p = n.position;
			return [p.x, p.y, p.z];
		});
		const quat = c.allocVec4([...path], quatFromNode);
		const r = c.allocVec3([...path], (n) => {
			return [n.scale.x * 0.5, n.scale.y * 0.5, n.scale.z * 0.5];
		});
		const color = c.allocVec3([...path], (n) => colorToVec3(n.color));
		const pLocal = `applyQuaternion(${varName} - ${pos}, normalize(${quat}))`;
		return `SDF(sdCapsule(${pLocal}, ${r}), ${color})`;
	}

	if (type === 'SdfTorus') {
		const pos = c.allocVec3([...path], (n) => {
			const p = n.position;
			return [p.x, p.y, p.z];
		});
		const quat = c.allocVec4([...path], quatFromNode);
		const t = c.allocVec3([...path], (n) => {
			return [n.scale.x * 0.5, n.scale.y * 0.5, n.scale.z * 0.5];
		});
		const color = c.allocVec3([...path], (n) => colorToVec3(n.color));
		const pLocal = `applyQuaternion(${varName} - ${pos}, normalize(${quat}))`;
		return `SDF(sdTorus(${pLocal}, (${t}).xy), ${color})`;
	}

	if (type === 'SdfTransform') {
		const inv = c.allocMat4([...path], invMatrixFromNode);
		const transformedPoint = `(${inv} * vec4(${varName}, 1.0)).xyz`;
		return compileSdfExpression(node.child, [...path, 'child'], c, transformedPoint);
	}

	if (type === 'SdfWithColor') {
		const childExpr = compileSdfExpression(node.sdf, [...path, 'sdf'], c, varName);
		const color = c.allocVec3([...path], (n) => colorToVec3(n.color));
		return `SDF((${childExpr}).distance, ${color})`;
	}

	if (type === 'SdfUnion') {
		const children = node.children || [];
		c.signature(`u${children.length}`);
		if (children.length === 0) return 'SDF(1e9, vec3(1.0, 0.0, 1.0))';
		let result = compileSdfExpression(children[0], [...path, 'children', 0], c, varName);
		const k = c.allocFloat([...path], (n) => n.blending);
		for (let i = 1; i < children.length; i++) {
			const childExpr = compileSdfExpression(children[i], [...path, 'children', i], c, varName);
			result = `opSmoothUnion(${result}, ${childExpr}, ${k})`;
		}
		return result;
	}

	if (type === 'SdfSubtraction') {
		const subs = node.subtractedChildren || [];
		c.signature(`s${subs.length}`);
		let result = compileSdfExpression(node.base, [...path, 'base'], c, varName);
		const k = c.allocFloat([...path], (n) => n.blending);
		for (let i = 0; i < subs.length; i++) {
			const childExpr = compileSdfExpression(subs[i], [...path, 'subtractedChildren', i], c, varName);
			result = `opSmoothSubtraction(${result}, ${childExpr}, ${k})`;
		}
		return result;
	}

	if (type === 'SdfIntersection') {
		const children = node.children || [];
		c.signature(`i${children.length}`);
		if (children.length === 0) return 'SDF(1e9, vec3(1.0, 0.0, 1.0))';
		let result = compileSdfExpression(children[0], [...path, 'children', 0], c, varName);
		const k = c.allocFloat([...path], (n) => n.blending);
		for (let i = 1; i < children.length; i++) {
			const childExpr = compileSdfExpression(children[i], [...path, 'children', i], c, varName);
			result = `opSmoothIntersection(${result}, ${childExpr}, ${k})`;
		}
		return result;
	}

	c.signature('fallback');
	return node.toGLSL(varName);
}

function buildDeclarations(layout) {
	const lines = [];
	if (layout.floatParams.length) lines.push(`uniform float uSdfFloat[${layout.floatParams.length}];`);
	if (layout.vec3Params.length) lines.push(`uniform vec3 uSdfVec3[${layout.vec3Params.length}];`);
	if (layout.vec4Params.length) lines.push(`uniform vec4 uSdfVec4[${layout.vec4Params.length}];`);
	if (layout.mat4Params.length) lines.push(`uniform mat4 uSdfMat4[${layout.mat4Params.length}];`);
	return lines.join('\n');
}

function evaluateUniforms(layout, rootSdf) {
	const floats = new Array(layout.floatParams.length);
	const vec3 = new Array(layout.vec3Params.length * 3);
	const vec4 = new Array(layout.vec4Params.length * 4);
	const mat4 = new Array(layout.mat4Params.length * 16);

	layout.floatParams.forEach((p, i) => {
		const node = getByPath(rootSdf, p.path);
		let value = 0;
		try {
			value = Number(p.read(node)) || 0;
		} catch (e) {
			value = 0;
		}
		floats[i] = value;
	});

	layout.vec3Params.forEach((p, i) => {
		const node = getByPath(rootSdf, p.path);
		let v = [0, 0, 0];
		try {
			v = p.read(node) || [0, 0, 0];
		} catch (e) {
			v = [0, 0, 0];
		}
		vec3[i * 3 + 0] = Number(v[0]) || 0;
		vec3[i * 3 + 1] = Number(v[1]) || 0;
		vec3[i * 3 + 2] = Number(v[2]) || 0;
	});

	layout.vec4Params.forEach((p, i) => {
		const node = getByPath(rootSdf, p.path);
		let v = [0, 0, 0, 1];
		try {
			v = p.read(node) || [0, 0, 0, 1];
		} catch (e) {
			v = [0, 0, 0, 1];
		}
		vec4[i * 4 + 0] = Number(v[0]) || 0;
		vec4[i * 4 + 1] = Number(v[1]) || 0;
		vec4[i * 4 + 2] = Number(v[2]) || 0;
		vec4[i * 4 + 3] = Number(v[3]) || 1;
	});

	layout.mat4Params.forEach((p, i) => {
		const node = getByPath(rootSdf, p.path);
		let m = new Matrix4().identity().toArray();
		try {
			m = p.read(node) || new Matrix4().identity().toArray();
		} catch (e) {
			m = new Matrix4().identity().toArray();
		}
		for (let k = 0; k < 16; k++) {
			mat4[i * 16 + k] = Number(m[k]) || 0;
		}
	});

	return { floats, vec3, vec4, mat4 };
}

export function buildSdfRuntimePacket(rootSdf, previousPacket = null) {
	if (!rootSdf) return null;
	const quickSignature = getSdfTopologySignature(rootSdf);

	if (previousPacket && previousPacket.layout) {
		if (quickSignature === previousPacket.topologyHash) {
			const values = evaluateUniforms(previousPacket.layout, rootSdf);
			return {
				...previousPacket,
				values,
			};
		}
	}

	const compiler = new RuntimeCompiler();
	const expression = compileSdfExpression(rootSdf, [], compiler, 'p');
	const topologyHash = quickSignature;
	const declarations = buildDeclarations(compiler);
	const values = evaluateUniforms(compiler, rootSdf);

	return {
		topologyHash,
		expression,
		declarations,
		layout: compiler,
		values,
	};
}

export function getSdfTopologySignature(rootSdf) {
	if (!rootSdf) return 'null';
	const compiler = new RuntimeCompiler();
	compileSdfExpression(rootSdf, [], compiler, 'p');
	return compiler.signatureParts.join('|');
}
