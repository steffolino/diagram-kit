export interface Point {
  x: number
  y: number
}

/** Smooths a dagre bend-point list into a single SVG path via quadratic curves through segment midpoints. */
export function pointsToSvgPath(points: Point[]): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0]!.x} ${points[0]!.y}`

  let path = `M ${points[0]!.x} ${points[0]!.y}`
  for (let i = 1; i < points.length; i++) {
    const point = points[i]!
    if (i === points.length - 1) {
      path += ` L ${point.x} ${point.y}`
    } else {
      const next = points[i + 1]!
      const midX = (point.x + next.x) / 2
      const midY = (point.y + next.y) / 2
      path += ` Q ${point.x} ${point.y}, ${midX} ${midY}`
    }
  }
  return path
}

export interface BlockArrowOptions {
  /** Half-width of the arrow's shaft. Default 10. */
  shaftWidth?: number
  /** Half-width of the arrowhead's base. Default 20. */
  headWidth?: number
  /** Length of the triangular head. Default 24. */
  headLength?: number
}

/**
 * Builds a filled block-arrow polygon (thick shaft + triangular head)
 * between an edge's first and last routed point — the "chunky flow arrow"
 * look of a process/pipeline diagram, as opposed to a thin stroked line
 * with a marker. Ignores intermediate bend points; block arrows read as a
 * straight directional beat between two steps, not a routed path.
 */
export function blockArrowPoints(points: Point[], options: BlockArrowOptions = {}): Point[] {
  const { shaftWidth = 10, headWidth = 20, headLength = 24 } = options
  if (points.length < 2) return []
  const start = points[0]!
  const end = points[points.length - 1]!

  const dx = end.x - start.x
  const dy = end.y - start.y
  const len = Math.hypot(dx, dy)
  if (len === 0) return []

  const ux = dx / len
  const uy = dy / len
  const px = -uy
  const py = ux
  const effectiveHeadLength = Math.min(headLength, len)
  const shaftEnd = { x: end.x - ux * effectiveHeadLength, y: end.y - uy * effectiveHeadLength }

  return [
    { x: start.x + px * shaftWidth, y: start.y + py * shaftWidth },
    { x: shaftEnd.x + px * shaftWidth, y: shaftEnd.y + py * shaftWidth },
    { x: shaftEnd.x + px * headWidth, y: shaftEnd.y + py * headWidth },
    end,
    { x: shaftEnd.x - px * headWidth, y: shaftEnd.y - py * headWidth },
    { x: shaftEnd.x - px * shaftWidth, y: shaftEnd.y - py * shaftWidth },
    { x: start.x - px * shaftWidth, y: start.y - py * shaftWidth },
  ]
}

/** Formats a point list as an SVG `points` attribute value, e.g. for `<polygon>`. */
export function pointsToPolygon(points: Point[]): string {
  return points.map((p) => `${p.x},${p.y}`).join(' ')
}
