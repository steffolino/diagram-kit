import type { CSSProperties, JSX } from 'react'
import type { DiagramNode, ThemeColors } from '@diagram-kit/core'
import { withAlpha } from '@diagram-kit/core'

export type DetailPanelPosition = 'top' | 'right' | 'bottom' | 'left'

export interface DetailPanelProps {
  node: DiagramNode
  colors: ThemeColors
  onClose: () => void
  /** Which edge of the diagram the panel docks to. Default "right". */
  position?: DetailPanelPosition
  /** Frosted-glass styling (translucent + backdrop blur) instead of a flat surface color. Default false. */
  glass?: boolean
  /** The diagram's own laid-out width/height, so the panel scales down for a small diagram instead of overhanging past its edges at a fixed size. */
  containerWidth: number
  containerHeight: number
}

const SIDEBAR_SIZE = 260
const BAR_SIZE = 160

function positionStyle(
  position: DetailPanelPosition,
  colors: ThemeColors,
  containerWidth: number,
  containerHeight: number,
): CSSProperties {
  const width = Math.min(SIDEBAR_SIZE, containerWidth * 0.75)
  const height = Math.min(BAR_SIZE, containerHeight * 0.6)

  switch (position) {
    case 'left':
      return { top: 0, left: 0, bottom: 0, width, borderRight: `1px solid ${colors.border}` }
    case 'top':
      return { top: 0, left: 0, right: 0, height, borderBottom: `1px solid ${colors.border}` }
    case 'bottom':
      return { bottom: 0, left: 0, right: 0, height, borderTop: `1px solid ${colors.border}` }
    case 'right':
    default:
      return { top: 0, right: 0, bottom: 0, width, borderLeft: `1px solid ${colors.border}` }
  }
}

export function DetailPanel({
  node,
  colors,
  onClose,
  position = 'right',
  glass = false,
  containerWidth,
  containerHeight,
}: DetailPanelProps): JSX.Element {
  return (
    <aside
      aria-label={`Details for ${node.label}`}
      style={{
        position: 'absolute',
        padding: 16,
        background: glass ? withAlpha(colors.surface, 0.6) : colors.surface,
        backdropFilter: glass ? 'blur(14px) saturate(160%)' : undefined,
        WebkitBackdropFilter: glass ? 'blur(14px) saturate(160%)' : undefined,
        color: colors.text,
        overflowY: 'auto',
        ...positionStyle(position, colors, containerWidth, containerHeight),
      }}
    >
      <button
        type="button"
        aria-label="Close details"
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: colors.textMuted,
          cursor: 'pointer',
          float: 'right',
          fontSize: 14,
        }}
      >
        Close
      </button>
      <h3 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600 }}>{node.label}</h3>
      {node.badge && (
        <span
          style={{
            display: 'inline-block',
            fontSize: 11,
            padding: '2px 6px',
            borderRadius: 4,
            background: colors.border,
            color: colors.textMuted,
            marginBottom: 8,
          }}
        >
          {node.badge}
        </span>
      )}
      {node.detail && <p style={{ fontSize: 13, color: colors.textMuted, lineHeight: 1.5 }}>{node.detail}</p>}
    </aside>
  )
}
