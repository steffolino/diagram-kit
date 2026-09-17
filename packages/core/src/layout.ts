import dagre from '@dagrejs/dagre'
import type { DiagramGraph } from './graph.js'
import { estimateNodeWidth } from './textWidth.js'

export interface LayoutOptions {
  /** Layout flow direction, dagre's rankdir. Default "TB" (top-to-bottom). */
  direction?: 'TB' | 'BT' | 'LR' | 'RL'
  /** Minimum node width — nodes with longer labels grow wider to fit, up to `maxNodeWidth`, when `nodeSizing` is "responsive". Default 160. */
  nodeWidth?: number
  /** Cap on how wide a single node can grow to fit its label. Default 420. */
  maxNodeWidth?: number
  /** "responsive" (default): nodes grow to fit their label, up to `maxNodeWidth`. "fixed": every node is exactly `nodeWidth` wide, and a label too long to fit gets truncated with an ellipsis instead. */
  nodeSizing?: 'responsive' | 'fixed'
  nodeHeight?: number
  /** Horizontal gap between nodes on the same rank. */
  nodeSpacing?: number
  /** Vertical gap between ranks. */
  rankSpacing?: number
}

export interface PositionedNode {
  id: string
  x: number
  y: number
  width: number
  height: number
}

export interface PositionedEdge {
  id: string
  /** Full point list dagre routed the edge through, including endpoints. */
  points: Array<{ x: number; y: number }>
}

export interface PositionedGraph {
  nodes: PositionedNode[]
  edges: PositionedEdge[]
  width: number
  height: number
}

const DEFAULTS: Required<LayoutOptions> = {
  direction: 'TB',
  nodeWidth: 160,
  maxNodeWidth: 420,
  nodeSizing: 'responsive',
  nodeHeight: 48,
  nodeSpacing: 40,
  rankSpacing: 80,
}

/** Runs dagre's layered/DAG layout over a normalized graph and returns absolute pixel positions. */
export function layoutGraph(graph: DiagramGraph, options: LayoutOptions = {}): PositionedGraph {
  const opts = { ...DEFAULTS, ...options }

  const g = new dagre.graphlib.Graph({ multigraph: true })
  g.setGraph({
    rankdir: opts.direction,
    nodesep: opts.nodeSpacing,
    ranksep: opts.rankSpacing,
  })
  g.setDefaultEdgeLabel(() => ({}))

  for (const node of graph.nodes) {
    const width = estimateNodeWidth(node.label, node.badge, {
      minWidth: opts.nodeWidth,
      maxWidth: opts.nodeSizing === 'fixed' ? opts.nodeWidth : opts.maxNodeWidth,
    })
    g.setNode(node.id, { width, height: opts.nodeHeight })
  }
  for (const edge of graph.edges) {
    g.setEdge(edge.source, edge.target, {}, edge.id)
  }

  dagre.layout(g)

  const nodes: PositionedNode[] = graph.nodes.map((node) => {
    const positioned = g.node(node.id) as { x: number; y: number; width: number; height: number }
    return {
      id: node.id,
      x: positioned.x,
      y: positioned.y,
      width: positioned.width,
      height: positioned.height,
    }
  })

  const edges: PositionedEdge[] = graph.edges.map((edge) => {
    const edgeData = g.edge({ v: edge.source, w: edge.target, name: edge.id }) as {
      points: Array<{ x: number; y: number }>
    }
    return { id: edge.id, points: edgeData.points }
  })

  const graphLabel = g.graph()
  return {
    nodes,
    edges,
    width: graphLabel.width ?? 0,
    height: graphLabel.height ?? 0,
  }
}
