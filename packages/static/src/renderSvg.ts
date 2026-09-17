import type {
  DiagramGraph,
  DiagramNode,
  DiagramTheme,
  LayoutOptions,
  StackLayoutOptions,
  StructuralLayoutOptions,
} from '@steffolino/diagram-kit-core'
import {
  layoutGraph,
  layoutCycle,
  layoutStructural,
  layoutStack,
  defaultTheme,
  categoryColor,
  pointsToSvgPath,
  blockArrowPoints,
  pointsToPolygon,
  withAlpha,
  truncateLabel,
  estimateTextWidth,
  detailLines,
  detailHeight,
  type Point,
} from '@steffolino/diagram-kit-core'

export type LayoutMode = 'graph' | 'structural' | 'stack' | 'cycle'

export interface RenderSvgOptions {
  layoutMode?: LayoutMode
  layout?: LayoutOptions
  structuralLayout?: StructuralLayoutOptions
  stackLayout?: StackLayoutOptions
  theme?: DiagramTheme
  mode?: 'light' | 'dark'
  /** Extra pixels of margin around the laid-out graph. Default 24. */
  padding?: number
  detailPlacement?: 'panel' | 'inline'
  /** Tints each entity's own fill/border with its category color instead of a neutral surface + accent dot. Default false. */
  colorizeNodes?: boolean
  /** Frosted-glass entities (translucent fill/border) over a soft gradient backdrop, matching @steffolino/diagram-kit-react's `glass` prop. Default false. */
  glass?: boolean
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
    detailPlacement = 'panel',
    glass = false,
  } = options
  const colors = theme[mode]
  const showDetails = detailPlacement === 'inline'
  const positioned =
    layoutMode === 'cycle'
      ? layoutCycle(graph, { showDetails })
      : layoutMode === 'structural'
      ? layoutStructural(graph, { ...structuralLayout, showDetails })
      : layoutMode === 'stack'
        ? layoutStack(graph, { ...stackLayout, showDetails })
        : layoutGraph(graph, { ...layout, showDetails })
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
      const strokeColor = layoutMode === 'cycle' && source && source.source === source.target
        ? categoryColor(nodeById.get(source.source)?.category, theme, mode)
        : source?.projected ? colors.edgeProjected : colors.edge

      const labelMarkup = (offsetY: number): string =>
        source?.label && midpoint
          ? `<text x="${midpoint.x}" y="${midpoint.y + offsetY}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10" fill="${colors.textMuted}" stroke="${colors.background}" stroke-width="4" paint-order="stroke">${escapeXml(source.label)}</text>`
          : ''

      if (edge.arrow || source?.style === 'block') {
        const polygon = edge.arrow?.map((p) => ({ x: p.x + padding, y: p.y + padding })) ?? blockArrowPoints(points)
        return `<g><polygon points="${pointsToPolygon(polygon)}" fill="${strokeColor}" opacity="0.85" />${labelMarkup(-12)}</g>`
      }

      const strokeWidth = 1 + ((source?.weight ?? 1) / maxWeight) * 2
      const dash = source?.projected ? ' stroke-dasharray="4 3"' : ''
      return `<g><path d="${pointsToSvgPath(points)}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}"${dash} />${labelMarkup(-6)}</g>`
    })
    .join('\n    ')

  function entityFill(accent: string, alpha: number): string {
    if (colorizeNodes) return withAlpha(accent, glass ? alpha * 0.7 : alpha)
    return glass ? withAlpha(colors.surface, 0.55) : colors.surface
  }

  function entityBorder(accent: string): string {
    if (colorizeNodes) return withAlpha(accent, 0.5)
    return glass ? withAlpha(colors.border, 0.5) : colors.border
  }

  // Three soft, off-center radial blobs in the theme's own category colors —
  // matches @steffolino/diagram-kit-react's `glass` backdrop gradient. stop-opacity
  // (rather than DiagramView's hex-alpha-suffix trick) works for any color
  // format the theme uses, not just hex.
  const backdropMarkup = glass
    ? (() => {
        const [a, b, c] = colors.categories
        const blobs: [string, number, number, number, number][] = [
          [a ?? colors.edge, 15, 15, 45, 0.33],
          [b ?? colors.edge, 85, 30, 50, 0.27],
          [c ?? colors.edge, 50, 90, 55, 0.2],
        ]
        const defs = blobs
          .map(
            ([color, cx, cy, r], i) => `<radialGradient id="dk-glass-${i}" cx="${cx}%" cy="${cy}%" r="${r}%">
        <stop offset="0%" stop-color="${color}" stop-opacity="${blobs[i]![4]}" />
        <stop offset="100%" stop-color="${color}" stop-opacity="0" />
      </radialGradient>`,
          )
          .join('\n      ')
        const rects = blobs.map((_, i) => `<rect x="0" y="0" width="${width}" height="${height}" fill="url(#dk-glass-${i})" />`).join('\n    ')
        return `<defs>\n      ${defs}\n    </defs>\n    ${rects}`
      })()
    : ''

  function leafMarkup(node: DiagramNode, x: number, y: number, w: number, h: number): string {
    const accent = categoryColor(node.category, theme, mode)
    const fill = entityFill(accent, 0.14)
    const stroke = entityBorder(accent)
    // Truncate with an ellipsis if the label doesn't fit the box — a
    // safety net always, and the actual mechanism in "fixed" node-sizing
    // mode, where the box no longer grows to fit the label.
    const badgeWidth = node.badge ? estimateTextWidth(node.badge, 10) + 6 : 0
    const rawLabel = truncateLabel(node.label, w - 34 - badgeWidth, 12)
    const labelWidth = estimateTextWidth(rawLabel, 12)
    const contentX = x + (w - (14 + labelWidth + badgeWidth)) / 2
    const descriptionHeight = detailHeight(node, w, showDetails)
    // With inline detail text, rect nodes pin the title to a fixed offset
    // from the box top so every entity's title lands on the same horizontal
    // line regardless of its own detail length — layouts that give every
    // node a uniform height (e.g. cycle) would otherwise leave shorter-text
    // nodes with a taller box but no signal of that beyond where their
    // title happens to center. With no detail text shown, there's nothing
    // below the title to align against, so it's just centered in the box.
    // Cylinders keep the old content-centered behavior (rarer with detail
    // text, and the cap geometry makes a fixed offset less predictable).
    const centerY = node.shape === 'cylinder'
      ? y + (h + Math.min(20, h * 0.35)) / 2 - descriptionHeight / 2
      : showDetails
        ? y + 30
        : y + h / 2
    const content = `<circle cx="${contentX + 4}" cy="${centerY}" r="4" fill="${accent}" />
      <text x="${contentX + 14 + labelWidth / 2}" y="${centerY + 4}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" font-weight="500" fill="${colors.text}">${escapeXml(rawLabel)}</text>${node.badge ? `
      <text x="${contentX + 14 + labelWidth + 6}" y="${centerY + 3}" font-family="system-ui, sans-serif" font-size="10" fill="${colors.textMuted}">${escapeXml(node.badge)}</text>` : ''}${descriptionMarkup(node, x + w / 2, centerY + 26, w)}`

    if (node.shape === 'cylinder') {
      return `<g data-node-id="${escapeXml(node.id)}">
      ${cylinderMarkup(x, y, w, h, fill, stroke)}
      ${content}
    </g>`
    }

    return `<g data-node-id="${escapeXml(node.id)}">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${fill}" stroke="${stroke}" />
      ${content}
    </g>`
  }

  function descriptionMarkup(node: DiagramNode, centerX: number, firstBaseline: number, width: number): string {
    if (!showDetails) return ''
    return detailLines(node.detail, width - 24).map((line, i) =>
      `<text x="${centerX}" y="${firstBaseline + i * 15}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" fill="${colors.textMuted}">${escapeXml(line)}</text>`,
    ).join('\n')
  }

  function containerMarkup(node: DiagramNode, x: number, y: number, w: number, h: number): string {
    const accent = categoryColor(node.category, theme, mode)
    const dash = node.borderStyle === 'dashed' ? ' stroke-dasharray="5 4"' : ''
    const fill = colorizeNodes ? withAlpha(accent, glass ? 0.14 : 0.1) : colors.surface
    const stroke = entityBorder(accent)
    const label = escapeXml(truncateLabel(node.label, w - 34, 12))
    return `<g data-node-id="${escapeXml(node.id)}">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${fill}" fill-opacity="${colorizeNodes ? 1 : glass ? 0.35 : 0.6}" stroke="${stroke}"${dash} />
      <line x1="${x}" y1="${y + 26}" x2="${x + w}" y2="${y + 26}" stroke="${stroke}" />
      <circle cx="${x + 14}" cy="${y + 13}" r="4" fill="${accent}" />
      <text x="${x + 24}" y="${y + 17}" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="${colors.text}">${label}</text>
      ${descriptionMarkup(node, x + w / 2, y + 46, w)}
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
    ${backdropMarkup}
  </g>
  <g>
    ${edgeMarkup}
  </g>
  <g>
    ${nodeMarkup}
  </g>
</svg>
`
}
