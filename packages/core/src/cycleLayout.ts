import type { DiagramGraph } from './graph.js'
import { layoutGraph, type PositionedGraph, type PositionedNode } from './layout.js'
import { estimateNodeWidth } from './textWidth.js'
import { blockArrowPoints, type Point } from './path.js'
import { detailHeight } from './detailText.js'

/**
 * Process diagram with a primary repeat loop and optional smaller repeat loops.
 * The first self-edge identifies the primary loop; further self-edges identify
 * satellites. Ancestors feed in from the left, remaining steps leave to the
 * right. Steps within each lane follow source order. Without a self-edge this
 * falls back to a left-to-right graph.
 */
export function layoutCycle(graph: DiagramGraph, options: { showDetails?: boolean } = {}): PositionedGraph {
  const loops = graph.edges.filter((edge) => edge.source === edge.target)
  const primary = loops[0]?.source
  if (!primary) return layoutGraph(graph, { direction: 'LR', showDetails: options.showDetails })
  const satellites = new Set(loops.slice(1).map((edge) => edge.source).filter((id) => id !== primary))
  const ancestors = new Set<string>()
  const queue = [primary]
  while (queue.length) {
    const target = queue.pop()!
    for (const edge of graph.edges) {
      if (edge.target !== target || edge.source === primary || satellites.has(edge.source) || ancestors.has(edge.source)) continue
      ancestors.add(edge.source)
      queue.push(edge.source)
    }
  }
  const inputs = graph.nodes.filter((node) => ancestors.has(node.id))
  const outputs = graph.nodes.filter((node) => node.id !== primary && !ancestors.has(node.id) && !satellites.has(node.id))
  const widths = new Map(graph.nodes.map((node) => [node.id, estimateNodeWidth(node.label, node.badge, { minWidth: 132, maxWidth: 240 })]))
  const gap = 28
  const extraHeight = (id: string) => detailHeight(graph.nodes.find((node) => node.id === id)!, widths.get(id)!, options.showDetails)
  // All entities share one detail-text allowance (the tallest any single
  // node needs) so every box comes out the same height instead of each
  // ragged with its own detail length.
  const detailExtra = Math.max(0, ...graph.nodes.map((node) => extraHeight(node.id)))
  const inputWidth = inputs.reduce((sum, node) => sum + widths.get(node.id)! + gap, 0)
  const radius = Math.max(118, Math.hypot(widths.get(primary)! / 2, (64 + detailExtra) / 2) + 30)
  const cx = inputWidth + radius + 20
  // Satellite loops always read as clearly smaller than the primary: capped
  // to a fraction of its radius rather than scaling freely with label width.
  const satelliteRadius = (id: string): number => {
    const width = widths.get(id)!
    const height = 44 + detailExtra
    return Math.min(radius * 0.58, Math.max(56, Math.hypot(width, height) / 2 + 16))
  }
  const maxSatelliteRadius = Math.max(0, ...[...satellites].map(satelliteRadius))
  const cy = Math.max(210, radius + maxSatelliteRadius + 50)
  const baseline = cy + radius
  const nodes: PositionedNode[] = []
  let cursor = 0
  for (const node of inputs) {
    const width = widths.get(node.id)!
    nodes.push({ id: node.id, x: cursor + width / 2, y: baseline, width, height: 54 + detailExtra })
    cursor += width + gap
  }
  nodes.push({ id: primary, x: cx, y: cy, width: widths.get(primary)!, height: 64 + detailExtra })
  let right = cx + radius + 42
  for (const node of outputs) {
    const width = widths.get(node.id)!
    nodes.push({ id: node.id, x: right + width / 2, y: baseline, width, height: 54 + detailExtra })
    right += width + gap
  }
  // Fan satellites out above the primary loop, each ring only lightly
  // overlapping the primary so the size difference stays legible.
  let satelliteAngle = -Math.PI * 0.75
  for (const id of satellites) {
    const width = widths.get(id)!
    const height = 44 + detailExtra
    const satRadius = satelliteRadius(id)
    const dist = radius + satRadius * 1.1
    nodes.push({
      id,
      x: cx + Math.cos(satelliteAngle) * dist,
      y: cy + Math.sin(satelliteAngle) * dist,
      width,
      height,
    })
    satelliteAngle -= 0.55
  }
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const edges = graph.edges.map((edge) => {
    const source = byId.get(edge.source)!
    const target = byId.get(edge.target)!
    let points: Point[]
    let arrow: Point[] | undefined
    if (source === target) {
      const loopRadius = source.id === primary ? radius : satelliteRadius(source.id)
      // A nearly complete loop, with a gap at the lower right. The primary
      // loop runs counterclockwise; satellite loops run clockwise. Each has
      // its own gap angles so they can be tuned independently.
      const [start, end] = source.id === primary
        ? [Math.PI * 0.45, Math.PI * 2.4]
        : [Math.PI * 0.35, Math.PI * 2.25]
      const arc = Array.from({ length: 65 }, (_, i) => {
        const angle = start + (end - start) * i / 64
        return { x: source.x + loopRadius * Math.cos(angle), y: source.y + loopRadius * Math.sin(angle) }
      })
      points = source.id === primary ? arc.slice().reverse() : arc
      const half = source.id === primary ? 12 : 8
      const tip = points[points.length - 1]!
      const base = points[points.length - 4]!
      const dx = tip.x - base.x
      const dy = tip.y - base.y
      const len = Math.hypot(dx, dy)
      const nx = -dy / len
      const ny = dx / len
      const shaft = points.slice(0, -3)
      const side = (sign: number) => shaft.map((p, i) => {
        const next = points[i + 1]!
        const length = Math.hypot(next.x - p.x, next.y - p.y)
        return { x: p.x - sign * half * (next.y - p.y) / length, y: p.y + sign * half * (next.x - p.x) / length }
      })
      // Round off the open end of the ring (opposite the arrowhead) instead
      // of leaving it as a flat cut, like a round SVG line cap.
      const start0 = shaft[0]!
      const next0 = points[1]!
      const startLen = Math.hypot(next0.x - start0.x, next0.y - start0.y)
      const startNx = -(next0.y - start0.y) / startLen
      const startNy = (next0.x - start0.x) / startLen
      const capSteps = 12
      const startCap = Array.from({ length: capSteps }, (_, i) => {
        const theta = Math.PI - (Math.PI * i) / capSteps
        const cos = Math.cos(theta)
        const sin = Math.sin(theta)
        return {
          x: start0.x + half * (startNx * cos - startNy * sin),
          y: start0.y + half * (startNx * sin + startNy * cos),
        }
      })
      arrow = [...side(1), { x: base.x + nx * half * 2, y: base.y + ny * half * 2 }, tip,
        { x: base.x - nx * half * 2, y: base.y - ny * half * 2 }, ...side(-1).reverse(), ...startCap]
    } else if (satellites.has(source.id) || satellites.has(target.id)) {
      const dx = target.x - source.x
      const dy = target.y - source.y
      const boundary = (node: PositionedNode, sign: number): Point => {
        const ratio = Math.min(node.width / 2 / Math.abs(dx), node.height / 2 / Math.abs(dy))
        return { x: node.x + sign * dx * ratio, y: node.y + sign * dy * ratio }
      }
      points = [boundary(source, 1), boundary(target, -1)]
    } else {
      const start = source.id === primary
        ? { x: cx + 12, y: baseline }
        : { x: source.x + source.width / 2, y: source.y }
      const end = target.id === primary
        ? { x: cx - 18, y: baseline }
        : { x: target.x - target.width / 2, y: target.y }
      points = [start, end]
      if (edge.style === 'block') arrow = blockArrowPoints(points, { shaftWidth: 8, headWidth: 15, headLength: 18 })
    }
    return { id: edge.id, points, arrow }
  })
  const bounds = [
    ...nodes.flatMap((node) => [
      { x: node.x - node.width / 2, y: node.y - node.height / 2 },
      { x: node.x + node.width / 2, y: node.y + node.height / 2 },
    ]),
    ...edges.flatMap((edge) => [...edge.points, ...(edge.arrow ?? [])]),
  ]
  const offsetX = -Math.min(0, ...bounds.map((p) => p.x))
  const offsetY = -Math.min(0, ...bounds.map((p) => p.y))
  const shift = (p: Point): Point => ({ x: p.x + offsetX, y: p.y + offsetY })
  return {
    nodes: nodes.map((node) => ({ ...node, ...shift(node) })),
    edges: edges.map((edge) => ({ ...edge, points: edge.points.map(shift), arrow: edge.arrow?.map(shift) })),
    width: Math.max(...bounds.map((p) => p.x)) + offsetX,
    height: Math.max(...bounds.map((p) => p.y)) + offsetY,
  }
}
