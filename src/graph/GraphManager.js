// Simple DAG evaluator for the node graph. Computes nodes on-demand,
// ensuring upstream inputs are evaluated first. Nodes register compute
// functions via a registry provided by nodeTypes.

import { nodeRegistry } from './nodeTypes';

export class GraphManager {
  constructor(nodes, edges) {
    this.nodes = nodes;
    this.edges = edges;
    this.outputs = new Map(); // nodeId -> output object
    this.nodeSnapshots = new Map(); // nodeId -> serialized snapshot used for dirty checks
    this.visiting = new Set();
    this.order = []; // evaluation order log
    this.frameId = 0;
    this.dynamicNodeTypes = new Set(['motorNode']);
    this.dynamicNodes = new Set();
    // Build an incoming adjacency index: targetId -> (targetHandle -> [sourceIds])
    this.incoming = new Map();
    // Build an outgoing adjacency index: sourceId -> [{ target, targetHandle }]
    this.outgoing = new Map();
    for (const e of edges) {
      let byHandle = this.incoming.get(e.target);
      if (!byHandle) {
        byHandle = new Map();
        this.incoming.set(e.target, byHandle);
      }
      const list = byHandle.get(e.targetHandle) || [];
      list.push(e.source);
      byHandle.set(e.targetHandle, list);
      const outList = this.outgoing.get(e.source) || [];
      outList.push({ target: e.target, targetHandle: e.targetHandle });
      this.outgoing.set(e.source, outList);
    }
    this._refreshDynamicNodes();
    // First run should compute all nodes lazily from render roots.
    this.nodes.forEach((n) => {
      this.nodeSnapshots.set(n.id, this._snapshotNode(n));
    });
  }

  _snapshotNode(node) {
    const data = node && node.data ? node.data : {};
    return `${node.type}|${JSON.stringify(data)}`;
  }

  _refreshDynamicNodes() {
    this.dynamicNodes.clear();
    for (const n of this.nodes) {
      if (this.dynamicNodeTypes.has(n.type)) {
        this.dynamicNodes.add(n.id);
      }
    }
  }

  getNode(id) {
    return this.nodes.find(n => n.id === id);
  }

  // Return array of source node ids connected to target handle
  getUpstreams(targetId, targetHandle) {
    const byHandle = this.incoming.get(targetId);
    if (!byHandle) return [];
    return byHandle.get(targetHandle) || [];
  }

  // Require upstream outputs for a specific handle; compute sources if needed
  requireInputs(targetId, targetHandle) {
    const sources = this.getUpstreams(targetId, targetHandle);
    return sources.map(srcId => this.computeNode(srcId));
  }

  computeNode(nodeId) {
    if (!nodeId) return null;
    if (this.outputs.has(nodeId)) return this.outputs.get(nodeId);
    if (this.visiting.has(nodeId)) {
      console.warn('Cycle detected or re-entry on node', nodeId);
      return null;
    }
    this.visiting.add(nodeId);
    const node = this.getNode(nodeId);
    if (!node) {
      this.visiting.delete(nodeId);
      return null;
    }
    const handler = nodeRegistry[node.type];
    if (!handler) {
      console.warn('No compute handler for node type', node.type);
      this.visiting.delete(nodeId);
      return null;
    }
    // Log evaluation order on first computation of this node
    this.order.push({ id: nodeId, type: node.type });
    const output = handler.compute(node, this);
    this.outputs.set(nodeId, output);
    this.visiting.delete(nodeId);
    return output;
  }

  // Compute shapes for a given Render node (by id)
  computeRenderShapes(renderNodeId) {
    const renderOutput = this.computeNode(renderNodeId);
    return renderOutput && renderOutput.shapes ? renderOutput.shapes : [];
  }

  // Debug helper: compute from a render node and return the evaluation order
  debugOrderFromRender(renderNodeId) {
    // Reset logs and caches
    this.outputs.clear();
    this.visiting.clear();
    this.order = [];
    // Compute render outputs (this will populate order)
    this.computeRenderShapes(renderNodeId);
    return this.order.slice();
  }

  // Begin a new frame: clear memoized outputs so dynamic nodes (e.g., motors)
  // recompute and propagate fresh values. Static subgraphs stay cached.
  beginFrame() {
    this.frameId += 1;
    // Only invalidate dynamic roots and their downstream dependents.
    this.dynamicNodes.forEach((id) => this.invalidateFrom(id));
    this.visiting.clear();
    this.order = [];
  }

  // Update nodes/edges incrementally without rebuilding the GraphManager instance
  setNodes(nodes) {
    const prevById = new Map(this.nodes.map((n) => [n.id, n]));
    const nextById = new Map(nodes.map((n) => [n.id, n]));

    // Removed nodes: clear their cached outputs.
    prevById.forEach((prevNode, id) => {
      if (!nextById.has(id)) {
        this.outputs.delete(id);
        this.nodeSnapshots.delete(id);
      }
    });

    this.nodes = nodes;
    this._refreshDynamicNodes();

    // Added/changed nodes invalidate their downstream chain.
    nodes.forEach((node) => {
      const prevNode = prevById.get(node.id);
      const nextSnap = this._snapshotNode(node);
      if (!prevNode) {
        this.nodeSnapshots.set(node.id, nextSnap);
        this.invalidateFrom(node.id);
        return;
      }

      const prevSnap = this.nodeSnapshots.get(node.id) || this._snapshotNode(prevNode);
      if (prevSnap !== nextSnap) {
        this.nodeSnapshots.set(node.id, nextSnap);
        this.invalidateFrom(node.id);
      }
    });
  }

  setEdges(edges) {
    const prevEdges = this.edges || [];
    this.edges = edges;
    // Rebuild adjacency indices quickly
    this.incoming = new Map();
    this.outgoing = new Map();
    for (const e of edges) {
      let byHandle = this.incoming.get(e.target);
      if (!byHandle) {
        byHandle = new Map();
        this.incoming.set(e.target, byHandle);
      }
      const inList = byHandle.get(e.targetHandle) || [];
      inList.push(e.source);
      byHandle.set(e.targetHandle, inList);

      const outList = this.outgoing.get(e.source) || [];
      outList.push({ target: e.target, targetHandle: e.targetHandle });
      this.outgoing.set(e.source, outList);
    }

    // Invalidate only targets affected by edge topology changes.
    const prevSet = new Set(prevEdges.map((e) => `${e.source}|${e.sourceHandle}|${e.target}|${e.targetHandle}`));
    const nextSet = new Set(edges.map((e) => `${e.source}|${e.sourceHandle}|${e.target}|${e.targetHandle}`));
    const changedTargets = new Set();

    prevEdges.forEach((e) => {
      const k = `${e.source}|${e.sourceHandle}|${e.target}|${e.targetHandle}`;
      if (!nextSet.has(k)) changedTargets.add(e.target);
    });
    edges.forEach((e) => {
      const k = `${e.source}|${e.sourceHandle}|${e.target}|${e.targetHandle}`;
      if (!prevSet.has(k)) changedTargets.add(e.target);
    });

    if (changedTargets.size === 0) {
      // Fallback safety for unknown topology edits.
      this.outputs.clear();
    } else {
      changedTargets.forEach((id) => this.invalidateFrom(id));
    }

    this.visiting.clear();
    this.order = [];
  }

  // Invalidate downstream outputs starting from a node (optional optimization)
  invalidateFrom(nodeId) {
    const stack = [nodeId];
    const visited = new Set();
    while (stack.length) {
      const id = stack.pop();
      if (visited.has(id)) continue;
      visited.add(id);
      this.outputs.delete(id);
      const outs = this.outgoing.get(id) || [];
      for (const { target } of outs) {
        stack.push(target);
      }
    }
  }
}
