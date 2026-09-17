/**
 * Normalized diagram model. Every input adapter (YAML, directory walker,
 * Mermaid, AST extractors) produces this shape; every renderer (React,
 * static SVG/PNG) consumes it. Adapters and renderers never talk to each
 * other directly.
 */

export interface DiagramNode {
  id: string
  label: string
  /** Longer text shown in a detail panel/drawer on selection. */
  detail?: string
  /** Free-form grouping key used for color coding (e.g. "domain", "external"). Not a fixed enum — adapters define their own vocabulary. */
  category?: string
  /** Small pill shown next to the label, e.g. "planned", "deprecated". */
  badge?: string
  /** Nodes this node logically contains, for compound/grouped layout. */
  parentId?: string
  /** Visual shape for a leaf node. Default "rect". */
  shape?: 'rect' | 'cylinder'
  /**
   * Border style when this node is rendered as a structural-mode container
   * (i.e. other nodes have it as `parentId`) — solid for a real system
   * boundary, dashed for a looser logical grouping. Default "solid".
   */
  borderStyle?: 'solid' | 'dashed'
  metadata?: Record<string, unknown>
}

export interface DiagramEdge {
  id: string
  source: string
  target: string
  label?: string
  /** Relative strength, e.g. import count. Renderers may map this to stroke width. */
  weight?: number
  /** Free-form kind, e.g. "calls", "imports", "contains". */
  kind?: string
  /** Marks an edge as aspirational/not-yet-built, mirroring the "future" edges pattern. */
  projected?: boolean
  /** "line" (default): a thin stroked path. "block": a chunky filled flow-arrow, for a process/pipeline diagram's step-to-step transitions. */
  style?: 'line' | 'block'
}

export interface DiagramGraph {
  nodes: DiagramNode[]
  edges: DiagramEdge[]
  metadata?: Record<string, unknown>
}

export function createGraph(
  nodes: DiagramNode[] = [],
  edges: DiagramEdge[] = [],
  metadata?: Record<string, unknown>,
): DiagramGraph {
  return { nodes, edges, metadata }
}

export class GraphValidationError extends Error {}

/** Throws if edges reference missing nodes or ids collide. Adapters should call this before returning. */
export function validateGraph(graph: DiagramGraph): void {
  const seen = new Set<string>()
  for (const node of graph.nodes) {
    if (seen.has(node.id)) {
      throw new GraphValidationError(`Duplicate node id "${node.id}"`)
    }
    seen.add(node.id)
  }
  for (const edge of graph.edges) {
    if (!seen.has(edge.source)) {
      throw new GraphValidationError(`Edge "${edge.id}" references missing source node "${edge.source}"`)
    }
    if (!seen.has(edge.target)) {
      throw new GraphValidationError(`Edge "${edge.id}" references missing target node "${edge.target}"`)
    }
  }
}
