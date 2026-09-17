import type { DiagramGraph } from './graph.js'
import type { PositionedGraph, PositionedNode } from './layout.js'
import { estimateNodeWidth } from './textWidth.js'

export interface StackLayoutOptions {
  direction?: 'vertical' | 'horizontal'
  gap?: number
  /** Minimum node width — nodes with longer labels grow wider to fit, up to `maxNodeWidth`, when `nodeSizing` is "responsive". Default 200. */
  nodeWidth?: number
  /** Cap on how wide a single node can grow to fit its label. Default 420. */
  maxNodeWidth?: number
  /** "responsive" (default): nodes grow to fit their label, up to `maxNodeWidth`. "fixed": every node is exactly `nodeWidth` wide, and a label too long to fit gets truncated with an ellipsis instead. */
  nodeSizing?: 'responsive' | 'fixed'
  nodeHeight?: number
}

const DEFAULTS: Required<StackLayoutOptions> = {
  direction: 'vertical',
  gap: 10,
  nodeWidth: 200,
  maxNodeWidth: 420,
  nodeSizing: 'responsive',
  nodeHeight: 44,
}

/**
 * Flat sequential list — every node in graph order, evenly spaced, no
 * hierarchy and no connectors. For data with no real structure to show
 * (or where showing it would be noise), like a single context's internal
 * layers listed one after another.
 */
export function layoutStack(graph: DiagramGraph, options: StackLayoutOptions = {}): PositionedGraph {
  const opts = { ...DEFAULTS, ...options }

  const widths = graph.nodes.map((node) =>
    estimateNodeWidth(node.label, node.badge, {
      minWidth: opts.nodeWidth,
      maxWidth: opts.nodeSizing === 'fixed' ? opts.nodeWidth : opts.maxNodeWidth,
    }),
  )

  const nodes: PositionedNode[] = []
  let cursor = 0

  if (opts.direction === 'vertical') {
    const overallWidth = Math.max(0, ...widths)
    graph.nodes.forEach((node, i) => {
      const width = widths[i]!
      nodes.push({ id: node.id, x: overallWidth / 2, y: cursor + opts.nodeHeight / 2, width, height: opts.nodeHeight })
      cursor += opts.nodeHeight + opts.gap
    })
  } else {
    graph.nodes.forEach((node, i) => {
      const width = widths[i]!
      nodes.push({ id: node.id, x: cursor + width / 2, y: opts.nodeHeight / 2, width, height: opts.nodeHeight })
      cursor += width + opts.gap
    })
  }

  const width = opts.direction === 'vertical' ? Math.max(0, ...widths) : Math.max(0, cursor - opts.gap)
  const height = opts.direction === 'vertical' ? Math.max(0, cursor - opts.gap) : opts.nodeHeight

  return { nodes, edges: [], width, height }
}
