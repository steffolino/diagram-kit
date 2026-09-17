import type {
  DiagramGraph,
  DiagramNode,
  DiagramTheme,
  LayoutOptions,
  StackLayoutOptions,
  StructuralLayoutOptions,
} from '@diagram-kit/core'
import {
  layoutGraph,
  layoutStructural,
  layoutStack,
  defaultTheme,
  categoryColor,
  pointsToSvgPath,
  blockArrowPoints,
  pointsToPolygon,
  withAlpha,
  truncateLabel,
  type Point,
} from '@diagram-kit/core'

export type LayoutMode = 'graph' | 'structural' | 'stack'

export interface RenderSvgOptions {
  layoutMode?: LayoutMode
  layout?: LayoutOptions
  structuralLayout?: StructuralLayoutOptions
  stackLayout?: StackLayoutOptions
  theme?: DiagramTheme
  mode?: 'light' | 'dark'
  /** Extra pixels of margin around the laid-out graph. Default 24. */
  padding?: number
  /** Tints each entity's own fill/border with its category color instead of a neutral surface + accent dot. Default false. */
  colorizeNodes?: boolean
}

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;'
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '"':
        return '&quot;'
      default:
        return '&#39;'
    }
  })
}

function cylinderMarkup(x: number, y: number, width: number, height: number, fill: string, stroke: string): string {
  const capHalf = Math.min(10, height * 0.18)
  return `<path d="M ${x},${y + capHalf} L ${x},${y + height - capHalf} A ${width / 2},${capHalf} 0 0,0 ${x + width},${y + height - capHalf} L ${x + width},${y + capHalf} A ${width / 2},${capHalf} 0 0,0 ${x},${y + capHalf} Z" fill="${fill}" stroke="${stroke}" />
      <ellipse cx="${x + width / 2}" cy="${y + capHalf}" rx="${width / 2}" ry="${capHalf}" fill="${fill}" stroke="${stroke}" />`
}

/**
 * Renders a graph to a standalone SVG document, headlessly (no DOM). This is
 * the "clean, stylish static graphic" path — deliberately not Mermaid's
 * default renderer, using the same layout, layout mode, and theme as the
 * interactive React view so the two outputs stay visually consistent.
 */
export function renderSvg(graph: DiagramGraph, options: RenderSvgOptions = {}): string {
  const {
    layoutMode = 'graph',
    layout,
    structuralLayout,
    stackLayout,
    theme = defaultTheme,
    mode = 'light',
    padding = 24,
    colorizeNodes = false,
  } = options
  const colors = theme[mode]
  const positioned =
    layoutMode === 'structural'
      ? layoutStructural(graph, structuralLayout)
      : layoutMode === 'stack'
        ? layoutStack(graph, stackLayout)
        : layoutGraph(graph, layout)
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]))
  const containerIds = new Set(graph.nodes.filter((n) => n.parentId).map((n) => n.parentId!))
  const maxWeight = Math.max(1, ...graph.edges.map((e) => e.weight ?? 1))

  const width = positioned.width + padding * 2
  const height = positioned.height + padding * 2

  const edgeMarkup = positioned.edges
    .map((edge) => {
      const source = graph.edges.find((e) => e.id === edge.id)
      const points: Point[] = edge.points.map((p) => ({ x: p.x + padding, y: p.y + padding }))
      const midpoint = points[Math.floor((points.length - 1) / 2)]
      const strokeColor = source?.projected ? colors.edgeProjected : colors.edge

      const labelMarkup = (offsetY: number): string =>
        source?.label && midpoint
          ? `<text x="${midpoint.x}" y="${midpoint.y + offsetY}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10" fill="${colors.textMuted}" stroke="${colors.background}" stroke-width="4" paint-order="stroke">${escapeXml(source.label)}</text>`
          : ''

      if (source?.style === 'block') {
        const polygon = blockArrowPoints(points)
        return `<g><polygon points="${pointsToPolygon(polygon)}" fill="${strokeColor}" opacity="0.85" />${labelMarkup(-12)}</g>`
      }

      const strokeWidth = 1 + ((source?.weight ?? 1) / maxWeight) * 2
      const dash = source?.projected ? ' stroke-dasharray="4 3"' : ''
      return `<g><path d="${pointsToSvgPath(points)}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}"${dash} />${labelMarkup(-6)}</g>`
    })
    .join('\n    ')

  function entityFill(accent: string, alpha: number): string {
    return colorizeNodes ? withAlpha(accent, alpha) : colors.surface
  }

  function entityBorder(accent: string): string {
    return colorizeNodes ? withAlpha(accent, 0.5) : colors.border
  }

  function leafMarkup(node: DiagramNode, x: number, y: number, w: number, h: number): string {
    const accent = categoryColor(node.category, theme, mode)
    const fill = entityFill(accent, 0.14)
    const stroke = entityBorder(accent)
    const textX = x + 24
    const textY = y + h / 2 + 4
    // Truncate with an ellipsis if the label doesn't fit the box — a
    // safety net always, and the actual mechanism in "fixed" node-sizing
    // mode, where the box no longer grows to fit the label.
    const label = escapeXml(truncateLabel(node.label, w - 34, 12))

    if (node.shape === 'cylinder') {
      return `<g data-node-id="${escapeXml(node.id)}">
      ${cylinderMarkup(x, y, w, h, fill, stroke)}
      <circle cx="${x + 14}" cy="${y + h * 0.68}" r="4" fill="${accent}" />
      <text x="${x + 24}" y="${y + h * 0.68 + 4}" font-family="system-ui, sans-serif" font-size="12" font-weight="500" fill="${colors.text}">${label}</text>
    </g>`
    }

    return `<g data-node-id="${escapeXml(node.id)}">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${fill}" stroke="${stroke}" />
      <circle cx="${x + 14}" cy="${y + h / 2}" r="4" fill="${accent}" />
      <text x="${textX}" y="${textY}" font-family="system-ui, sans-serif" font-size="12" font-weight="500" fill="${colors.text}">${label}</text>
    </g>`
  }

  function containerMarkup(node: DiagramNode, x: number, y: number, w: number, h: number): string {
    const accent = categoryColor(node.category, theme, mode)
    const dash = node.borderStyle === 'dashed' ? ' stroke-dasharray="5 4"' : ''
    const fill = colorizeNodes ? withAlpha(accent, 0.1) : colors.surface
    const stroke = entityBorder(accent)
    const label = escapeXml(truncateLabel(node.label, w - 34, 12))
    return `<g data-node-id="${escapeXml(node.id)}">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${fill}" fill-opacity="${colorizeNodes ? 1 : 0.6}" stroke="${stroke}"${dash} />
      <line x1="${x}" y1="${y + 26}" x2="${x + w}" y2="${y + 26}" stroke="${stroke}" />
      <circle cx="${x + 14}" cy="${y + 13}" r="4" fill="${accent}" />
      <text x="${x + 24}" y="${y + 17}" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="${colors.text}">${label}</text>
    </g>`
  }

  const nodeMarkup = positioned.nodes
    .map((position) => {
      const node = nodeById.get(position.id)
      if (!node) return ''
      const x = position.x - position.width / 2 + padding
      const y = position.y - position.height / 2 + padding
      if (layoutMode === 'structural' && containerIds.has(node.id)) {
        return containerMarkup(node, x, y, position.width, position.height)
      }
      return leafMarkup(node, x, y, position.width, position.height)
    })
    .join('\n    ')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect x="0" y="0" width="${width}" height="${height}" fill="${colors.background}" />
  <g>
    ${edgeMarkup}
  </g>
  <g>
    ${nodeMarkup}
  </g>
</svg>
`
}
