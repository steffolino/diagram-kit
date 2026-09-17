import type { DiagramGraph } from './graph.js'
import type { PositionedGraph, PositionedNode } from './layout.js'
import { estimateNodeWidth, estimateTextWidth } from './textWidth.js'
import { detailHeight } from './detailText.js'

export interface StructuralLayoutOptions {
  showDetails?: boolean
  /** Inner padding between a container's border and its children. Default 16. */
  padding?: number
  /** Gap between sibling boxes, both within a row and between rows. Default 10. */
  gap?: number
  /** Minimum leaf width — leaves with longer labels grow wider to fit, up to `maxLeafWidth`, when `nodeSizing` is "responsive". Default 140. */
  leafWidth?: number
  /** Cap on how wide a single leaf can grow to fit its label. Default 420. */
  maxLeafWidth?: number
  /** "responsive" (default): leaves grow to fit their label, up to `maxLeafWidth`. "fixed": every leaf is exactly `leafWidth` wide, and a label too long to fit gets truncated with an ellipsis instead. */
  nodeSizing?: 'responsive' | 'fixed'
  leafHeight?: number
  /** Space reserved at the top of a container for its own label. Default 30. */
  headerHeight?: number
  /** Children wrap onto a new row once a row would exceed this width. Default 560. */
  maxRowWidth?: number
}

const DEFAULTS: Required<StructuralLayoutOptions> = {
  showDetails: false,
  padding: 16,
  gap: 10,
  leafWidth: 140,
  maxLeafWidth: 420,
  nodeSizing: 'responsive',
  leafHeight: 40,
  headerHeight: 30,
  maxRowWidth: 560,
}

interface Size {
  width: number
  height: number
}

function wrapIntoRows<T extends Size>(items: T[], gap: number, maxRowWidth: number): T[][] {
  const rows: T[][] = []
  let row: T[] = []
  let rowWidth = 0
  for (const item of items) {
    const nextWidth = rowWidth + (row.length > 0 ? gap : 0) + item.width
    if (row.length > 0 && nextWidth > maxRowWidth) {
      rows.push(row)
      row = []
      rowWidth = 0
    }
    row.push(item)
    rowWidth += (row.length > 1 ? gap : 0) + item.width
  }
  if (row.length > 0) rows.push(row)
  return rows
}

/**
 * Nested-box layout from `DiagramNode.parentId` containment — a container
 * is sized to fit its children (wrapped into rows), no connector lines are
 * produced, and containment is read from nesting instead. This is the
 * "structural" counterpart to `layoutGraph`'s node-and-edge DAG layout, for
 * data that's naturally a tree (a directory walk, a context's internal
 * layers) rather than an arbitrary graph.
 */
export function layoutStructural(graph: DiagramGraph, options: StructuralLayoutOptions = {}): PositionedGraph {
  const opts = { ...DEFAULTS, ...options }

  const childrenByParent = new Map<string | undefined, string[]>()
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]))
  for (const node of graph.nodes) {
    const list = childrenByParent.get(node.parentId) ?? []
    list.push(node.id)
    childrenByParent.set(node.parentId, list)
  }

  const sizeCache = new Map<string, Size>()

  function measure(id: string): Size {
    const cached = sizeCache.get(id)
    if (cached) return cached
    const node = nodeById.get(id)!
    const childIds = childrenByParent.get(id) ?? []
    let size: Size
    if (childIds.length === 0) {
      const width = estimateNodeWidth(node.label, node.badge, {
        minWidth: opts.leafWidth,
        maxWidth: opts.nodeSizing === 'fixed' ? opts.leafWidth : opts.maxLeafWidth,
      })
      size = { width, height: opts.leafHeight + detailHeight(node, width, opts.showDetails) }
    } else {
      const childSizes = childIds.map(measure)
      const rows = wrapIntoRows(childSizes, opts.gap, opts.maxRowWidth)
      const contentWidth = Math.max(...rows.map((row) => row.reduce((sum, s, i) => sum + s.width + (i > 0 ? opts.gap : 0), 0)))
      const contentHeight = rows.reduce((sum, row, i) => sum + Math.max(...row.map((s) => s.height)) + (i > 0 ? opts.gap : 0), 0)
      // A container must also be wide enough for its own header label —
      // otherwise a container with few/narrow children but a long name
      // (e.g. a deeply-nested directory) overflows its own header text.
      // In "fixed" mode the header is capped instead (and truncated when
      // rendered), matching leaves not growing either.
      const rawHeaderWidth = estimateTextWidth(node.label, 12) + 40
      const headerWidth = opts.nodeSizing === 'fixed' ? Math.min(rawHeaderWidth, opts.leafWidth) : rawHeaderWidth
      size = {
        width: Math.max(contentWidth + opts.padding * 2, headerWidth),
        height: contentHeight + opts.padding * 2 + opts.headerHeight,
      }
      size.height += detailHeight(node, size.width, opts.showDetails)
    }
    sizeCache.set(id, size)
    return size
  }

  for (const node of graph.nodes) measure(node.id)

  const positioned: PositionedNode[] = []

  function place(id: string, x: number, y: number): void {
    const size = sizeCache.get(id)!
    positioned.push({ id, x: x + size.width / 2, y: y + size.height / 2, width: size.width, height: size.height })

    const childIds = childrenByParent.get(id) ?? []
    if (childIds.length === 0) return

    const children = childIds.map((childId) => ({ id: childId, ...sizeCache.get(childId)! }))
    const rows = wrapIntoRows(children, opts.gap, opts.maxRowWidth)

    let cursorY = y + opts.padding + opts.headerHeight + detailHeight(nodeById.get(id)!, size.width, opts.showDetails)
    for (const row of rows) {
      let cursorX = x + opts.padding
      const rowHeight = Math.max(...row.map((c) => c.height))
      for (const child of row) {
        place(child.id, cursorX, cursorY)
        cursorX += child.width + opts.gap
      }
      cursorY += rowHeight + opts.gap
    }
  }

  const roots = childrenByParent.get(undefined) ?? []
  let cursorX = 0
  for (const rootId of roots) {
    place(rootId, cursorX, 0)
    cursorX += sizeCache.get(rootId)!.width + opts.gap
  }

  const width = Math.max(0, ...positioned.map((p) => p.x + p.width / 2))
  const height = Math.max(0, ...positioned.map((p) => p.y + p.height / 2))

  return { nodes: positioned, edges: [], width, height }
}
