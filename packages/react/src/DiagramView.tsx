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
  layoutStructural,
  layoutStack,
  defaultTheme,
  categoryColor,
  pointsToSvgPath,
  blockArrowPoints,
  pointsToPolygon,
  withAlpha,
} from '@diagram-kit/core'
import { DetailPanel, type DetailPanelPosition } from './DetailPanel.js'

export type LayoutMode = 'graph' | 'structural' | 'stack'

export interface DiagramViewProps {
  graph: DiagramGraph
  /** Which layout algorithm positions nodes. "graph" (default): dagre DAG layout, edges drawn as routed lines. "structural": nested boxes from `parentId` containment, no connectors. "stack": flat sequential list, no hierarchy, no connectors. */
  layoutMode?: LayoutMode
  layout?: LayoutOptions
  structuralLayout?: StructuralLayoutOptions
  stackLayout?: StackLayoutOptions
  theme?: DiagramTheme
  mode?: 'light' | 'dark'
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
 * Interactive diagram, three layout modes sharing one renderer: "graph"
 * (real dagre auto-layout, edges drawn as routed lines or chunky block
 * arrows), "structural" (nested boxes from containment, no connectors —
 * a context card containing its layers, a directory containing its
 * files), and "stack" (a flat sequential list, no hierarchy at all).
 * Clicking a node opens a detail panel in every mode.
 */
export function DiagramView({
  graph,
  layoutMode = 'graph',
  layout,
  structuralLayout,
  stackLayout,
  theme = defaultTheme,
  mode = 'light',
  showDetailPanel = true,
  detailPanelPosition = 'right',
  glass = false,
  colorizeNodes = false,
  onSelect,
}: DiagramViewProps): JSX.Element {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const colors = theme[mode]

  const backdropGradient = useMemo(() => {
    if (!glass) return undefined
    const [a, b, c] = colors.categories
    return `radial-gradient(circle at 15% 15%, ${a ?? colors.edge}55, transparent 45%), radial-gradient(circle at 85% 30%, ${b ?? colors.edge}44, transparent 50%), radial-gradient(circle at 50% 90%, ${c ?? colors.edge}33, transparent 55%)`
  }, [glass, colors])

  const positioned = useMemo(() => {
    if (layoutMode === 'structural') return layoutStructural(graph, structuralLayout)
    if (layoutMode === 'stack') return layoutStack(graph, stackLayout)
    return layoutGraph(graph, layout)
  }, [graph, layout, structuralLayout, stackLayout, layoutMode])

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
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    padding: '0 10px',
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
            <NodeContent node={node} accent={accent} colors={colors} />
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
        <NodeContent node={node} accent={accent} colors={colors} />
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
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'relative',
        width: positioned.width,
        height: positioned.height,
        background: backdropGradient ? `${backdropGradient}, ${colors.background}` : colors.background,
      }}
    >
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
            const strokeColor = source?.projected ? colors.edgeProjected : colors.edge
            const midpoint = edge.points[Math.floor((edge.points.length - 1) / 2)]

            if (source?.style === 'block') {
              const polygon = blockArrowPoints(edge.points)
              return (
                <g key={edge.id}>
                  <polygon points={pointsToPolygon(polygon)} fill={strokeColor} opacity={0.85} />
                  {source.label && midpoint && (
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

      {showDetailPanel && selectedNode && (
        <DetailPanel
          node={selectedNode}
          colors={colors}
          position={detailPanelPosition}
          glass={glass}
          containerWidth={positioned.width}
          containerHeight={positioned.height}
          onClose={() => select(null)}
        />
      )}
    </div>
  )
}
