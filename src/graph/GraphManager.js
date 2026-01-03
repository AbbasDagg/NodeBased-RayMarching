// Simple DAG evaluator for the node graph. Computes nodes on-demand,
// ensuring upstream inputs are evaluated first. Nodes register compute
// functions via a registry provided by nodeTypes.

import { nodeRegistry } from './nodeTypes';

export class GraphManager {
  constructor(nodes, edges) {
    this.nodes = nodes;
    this.edges = edges;
    this.outputs = new Map(); // nodeId -> output object
    this.visiting = new Set();
    this.order = []; // evaluation order log
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
  // recompute and propagate fresh values. Adjacency index remains intact.
  beginFrame() {
    this.outputs.clear();
    this.visiting.clear();
    this.order = [];
  }

  // Update nodes/edges incrementally without rebuilding the GraphManager instance
  setNodes(nodes) {
    this.nodes = nodes;
  }

  setEdges(edges) {
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
    // Clear outputs for safety; next frame will recompute as needed
    this.beginFrame();
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
