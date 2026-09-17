import { useMemo, useState, type JSX, type ReactNode } from 'react'
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
  layoutCycle,
  layoutStructural,
  layoutStack,
  defaultTheme,
  categoryColor,
  pointsToSvgPath,
  blockArrowPoints,
  pointsToPolygon,
  withAlpha,
  detailLines,
  detailHeight,
} from '@diagram-kit/core'
import { DetailPanel, type DetailPanelPosition } from './DetailPanel.js'

export type LayoutMode = 'graph' | 'structural' | 'stack' | 'cycle'

export interface DiagramViewProps {
  graph: DiagramGraph
  /** "graph" (default): dagre layout. "structural": nested containment. "stack": sequential list. "cycle": left-to-right process with circular repeat loops. */
  layoutMode?: LayoutMode
  layout?: LayoutOptions
  structuralLayout?: StructuralLayoutOptions
  stackLayout?: StackLayoutOptions
  theme?: DiagramTheme
  mode?: 'light' | 'dark'
  /** Space around the graph, included in the diagram background. Default 0. */
  padding?: number
  /** Show descriptions in a panel on selection (default), or below titles. */
  detailPlacement?: 'panel' | 'inline'
  /** Renders a built-in detail panel on node click when true (default). Pass false to only use onSelect. */
  showDetailPanel?: boolean
  /** Which edge of the diagram the detail panel docks to. Default "right". */
  detailPanelPosition?: DetailPanelPosition
  /** Frosted-glass node chips and detail panel (translucent + backdrop blur) over a soft gradient backdrop, instead of flat surface colors. Default false. */
  glass?: boolean
  /** Tints each entity's own background/border with its category color instead of a neutral surface + accent dot. Default false — entities stay neutral (e.g. dark text on light/white), independent of the category palette. */
  colorizeNodes?: boolean
  onSelect?: (nodeId: string | null) => void
}

function NodeContent({ node, accent, colors }: { node: DiagramNode; accent: string; colors: DiagramTheme['light'] }): JSX.Element {
  return (
    <>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: accent, flexShrink: 0 }} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.label}</span>
      {node.badge && (
        <span style={{ fontSize: 10, color: colors.textMuted, whiteSpace: 'nowrap' }}>{node.badge}</span>
      )}
    </>
  )
}

/**
 * Interactive diagram, four layout modes sharing one renderer: "graph"
 * (real dagre auto-layout, edges drawn as routed lines or chunky block
 * arrows), "structural" (nested boxes from containment, no connectors —
 * a context card containing its layers, a directory containing its
 * files), and "stack" (a flat sequential list, no hierarchy at all).
 * "cycle" adds circular repeat loops to a left-to-right process.
 * Descriptions appear on selection or inline beneath titles.
 */
export function DiagramView({
  graph,
  layoutMode = 'graph',
  layout,
  structuralLayout,
  stackLayout,
  theme = defaultTheme,
  mode = 'light',
  padding = 0,
  detailPlacement = 'panel',
  showDetailPanel = true,
  detailPanelPosition = 'right',
  glass = false,
  colorizeNodes = false,
  onSelect,
}: DiagramViewProps): JSX.Element {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const colors = theme[mode]
  const showDetails = detailPlacement === 'inline'

  const backdropGradient = useMemo(() => {
    if (!glass) return undefined
    const [a, b, c] = colors.categories
    return `radial-gradient(circle at 15% 15%, ${a ?? colors.edge}55, transparent 45%), radial-gradient(circle at 85% 30%, ${b ?? colors.edge}44, transparent 50%), radial-gradient(circle at 50% 90%, ${c ?? colors.edge}33, transparent 55%)`
  }, [glass, colors])

  const positioned = useMemo(() => {
    if (layoutMode === 'cycle') return layoutCycle(graph, { showDetails })
    if (layoutMode === 'structural') return layoutStructural(graph, { ...structuralLayout, showDetails })
    if (layoutMode === 'stack') return layoutStack(graph, { ...stackLayout, showDetails })
    return layoutGraph(graph, { ...layout, showDetails })
  }, [graph, layout, structuralLayout, stackLayout, layoutMode, showDetails])

  const nodeById = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph.nodes])
  const containerIds = useMemo(
    () => new Set(graph.nodes.filter((n) => n.parentId).map((n) => n.parentId!)),
    [graph.nodes],
  )

  const maxWeight = useMemo(() => Math.max(1, ...graph.edges.map((e) => e.weight ?? 1)), [graph.edges])

  const select = (id: string | null): void => {
    setSelectedId((current) => {
      const next = current === id ? null : id
      onSelect?.(next)
      return next
    })
  }

  const selectedNode = selectedId ? (nodeById.get(selectedId) ?? null) : null

  // Neutral by default (e.g. dark text on a light/white surface), independent
  // of the category palette — the accent dot alone carries the category.
  // With `colorizeNodes`, the entity's own fill/border tint toward its
  // category color instead.
  function entityFill(accent: string, glassAlpha: number, solidAlpha: number): string {
    if (colorizeNodes) return withAlpha(accent, glass ? glassAlpha * 0.7 : solidAlpha)
    return glass ? withAlpha(colors.surface, 0.55) : colors.surface
  }

  function entityBorder(accent: string, selected: boolean): string {
    if (selected) return accent
    if (colorizeNodes) return withAlpha(accent, 0.5)
    return glass ? withAlpha(colors.border, 0.5) : colors.border
  }

  const chipStyle = (node: DiagramNode, selected: boolean, accent: string) => ({
    display: 'flex' as const,
    // With inline detail text, pin the title to a fixed offset from the box
    // top (rather than centering) so it lines up across nodes whose boxes
    // are taller than their own content (e.g. cycle mode's uniform-height
    // boxes) — centering would push shorter-text titles down out of line
    // with the rest of the row. With no inline detail, there's nothing
    // below the title to align against, so just center it in the box.
    alignItems: (showDetails ? 'flex-start' : 'center') as 'flex-start' | 'center',
    justifyContent: 'center' as const,
    gap: 6,
    padding: showDetails ? '14px 10px 0' : '0 10px',
    borderRadius: 8,
    border: `1px solid ${entityBorder(accent, selected)}`,
    background: entityFill(accent, 0.3, 0.14),
    backdropFilter: glass ? 'blur(10px) saturate(160%)' : undefined,
    WebkitBackdropFilter: glass ? 'blur(10px) saturate(160%)' : undefined,
    color: colors.text,
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer' as const,
    boxShadow: selected ? `0 0 0 2px ${accent}33` : undefined,
  })

  function renderDescription(node: DiagramNode, width: number): ReactNode {
    const lines = showDetails ? detailLines(node.detail, width - 24) : []
    return lines.length > 0 ? (
      <span style={{ display: 'block', marginTop: 8, fontSize: 11, lineHeight: '15px', fontWeight: 400, color: colors.textMuted, textAlign: 'center' }}>
        {lines.map((line, i) => <span key={i} style={{ display: 'block', whiteSpace: 'pre' }}>{line || '\u00a0'}</span>)}
      </span>
    ) : null
  }

  function renderContent(node: DiagramNode, width: number, accent: string): ReactNode {
    return (
      <span style={{ display: 'block', width: '100%', minWidth: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <NodeContent node={node} accent={accent} colors={colors} />
        </span>
        {renderDescription(node, width)}
      </span>
    )
  }

  function renderLeaf(node: DiagramNode, position: { x: number; y: number; width: number; height: number }): ReactNode {
    const selected = node.id === selectedId
    const accent = categoryColor(node.category, theme, mode)
    const left = position.x - position.width / 2
    const top = position.y - position.height / 2

    if (node.shape === 'cylinder') {
      const capHeight = Math.min(20, position.height * 0.35)
      return (
        <div
          key={node.id}
          role="button"
          tabIndex={0}
          aria-pressed={selected}
          onClick={() => select(node.id)}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && select(node.id)}
          style={{ position: 'absolute', left, top, width: position.width, height: position.height, cursor: 'pointer' }}
        >
          <div
            style={{
              position: 'absolute',
              top: capHeight / 2,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: '0 0 8px 8px',
              border: `1px solid ${entityBorder(accent, selected)}`,
              borderTop: 'none',
              background: entityFill(accent, 0.3, 0.14),
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: capHeight,
              borderRadius: '50%',
              border: `1px solid ${entityBorder(accent, selected)}`,
              background: entityFill(accent, 0.3, 0.14),
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: capHeight,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '0 10px',
              color: colors.text,
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            {renderContent(node, position.width, accent)}
          </div>
        </div>
      )
    }

    return (
      <button
        key={node.id}
        type="button"
        aria-pressed={selected}
        onClick={() => select(node.id)}
        style={{ position: 'absolute', left, top, width: position.width, height: position.height, ...chipStyle(node, selected, accent) }}
      >
        {renderContent(node, position.width, accent)}
      </button>
    )
  }

  function renderContainer(node: DiagramNode, position: { x: number; y: number; width: number; height: number }): ReactNode {
    const selected = node.id === selectedId
    const accent = categoryColor(node.category, theme, mode)
    const left = position.x - position.width / 2
    const top = position.y - position.height / 2

    return (
      <div
        key={node.id}
        style={{
          position: 'absolute',
          left,
          top,
          width: position.width,
          height: position.height,
          borderRadius: 10,
          border: `1px ${node.borderStyle === 'dashed' ? 'dashed' : 'solid'} ${entityBorder(accent, selected)}`,
          background: colorizeNodes
            ? withAlpha(accent, glass ? 0.14 : 0.1)
            : glass
              ? withAlpha(colors.surface, 0.35)
              : withAlpha(colors.surface, 0.6),
          backdropFilter: glass ? 'blur(10px) saturate(160%)' : undefined,
          WebkitBackdropFilter: glass ? 'blur(10px) saturate(160%)' : undefined,
        }}
      >
        <button
          type="button"
          aria-pressed={selected}
          onClick={() => select(node.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            width: '100%',
            padding: '6px 10px',
            background: 'none',
            border: 'none',
            borderBottom: `1px solid ${colorizeNodes ? withAlpha(accent, 0.4) : colors.border}`,
            color: colors.text,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: accent, flexShrink: 0 }} />
          {node.label}
          {node.badge && (
            <span style={{ fontSize: 10, fontWeight: 500, color: colors.textMuted }}>{node.badge}</span>
          )}
        </button>
        <div style={{ padding: '0 12px', height: detailHeight(node, position.width, showDetails) }}>
          {renderDescription(node, position.width)}
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'relative',
        width: positioned.width + padding * 2,
        height: positioned.height + padding * 2,
        background: backdropGradient ? `${backdropGradient}, ${colors.background}` : colors.background,
      }}
    >
      <div style={{ position: 'absolute', left: padding, top: padding, width: positioned.width, height: positioned.height }}>
        {positioned.edges.length > 0 && (
          <svg
            width={positioned.width}
            height={positioned.height}
            style={{ position: 'absolute', inset: 0 }}
            aria-hidden="true"
            focusable="false"
          >
            {positioned.edges.map((edge) => {
              const source = graph.edges.find((e) => e.id === edge.id)
              const strokeColor = layoutMode === 'cycle' && source && source.source === source.target
                ? categoryColor(nodeById.get(source.source)?.category, theme, mode)
                : source?.projected ? colors.edgeProjected : colors.edge
              const midpoint = edge.points[Math.floor((edge.points.length - 1) / 2)]

              if (edge.arrow || source?.style === 'block') {
                const polygon = edge.arrow ?? blockArrowPoints(edge.points)
                return (
                  <g key={edge.id}>
                    <polygon points={pointsToPolygon(polygon)} fill={strokeColor} opacity={0.85} />
                  {source?.label && midpoint && (
                      <text
                        x={midpoint.x}
                        y={midpoint.y - 12}
                        textAnchor="middle"
                        fontSize={10}
                        fill={colors.textMuted}
                        stroke={colors.background}
                        strokeWidth={4}
                        paintOrder="stroke"
                      >
                        {source.label}
                      </text>
                    )}
                  </g>
                )
              }

              const strokeWidth = 1 + ((source?.weight ?? 1) / maxWeight) * 2
              return (
                <g key={edge.id}>
                  <path
                    d={pointsToSvgPath(edge.points)}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={source?.projected ? '4 3' : undefined}
                  />
                  {source?.label && midpoint && (
                    <text
                      x={midpoint.x}
                      y={midpoint.y - 6}
                      textAnchor="middle"
                      fontSize={10}
                      fill={colors.textMuted}
                      stroke={colors.background}
                      strokeWidth={4}
                      paintOrder="stroke"
                    >
                      {source.label}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
        )}

        {positioned.nodes.map((position) => {
          const node = nodeById.get(position.id)
          if (!node) return null
          if (layoutMode === 'structural' && containerIds.has(node.id)) {
            return renderContainer(node, position)
          }
          return renderLeaf(node, position)
        })}

      </div>
      {!showDetails && showDetailPanel && selectedNode && (
        <DetailPanel
          node={selectedNode}
          colors={colors}
          position={detailPanelPosition}
          glass={glass}
          containerWidth={positioned.width + padding * 2}
          containerHeight={positioned.height + padding * 2}
          onClose={() => select(null)}
        />
      )}
    </div>
  )
}
