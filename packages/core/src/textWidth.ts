// Per-character width ratios (fraction of font-size), approximating a
// typical system-ui/sans-serif proportional font. There's no canvas or DOM
// available in a headless/static rendering context, so this is a portable
// estimate rather than a real text measurement — good enough to size a box
// to its label instead of using one fixed width for every node regardless
// of content.
const NARROW_CHARS = new Set(['i', 'l', 'j', '.', ',', "'", '!', ':', ';', '|', ' ', '"'])
const WIDE_CHARS = new Set(['m', 'w', 'M', 'W'])
const NARROW_WIDTH = 0.3
const WIDE_WIDTH = 0.92
const UPPERCASE_WIDTH = 0.66
const DEFAULT_WIDTH = 0.56

export function estimateTextWidth(text: string, fontSize = 12): number {
  let total = 0
  for (const ch of text) {
    if (NARROW_CHARS.has(ch)) total += NARROW_WIDTH
    else if (WIDE_CHARS.has(ch)) total += WIDE_WIDTH
    else if (ch >= 'A' && ch <= 'Z') total += UPPERCASE_WIDTH
    else total += DEFAULT_WIDTH
  }
  return total * fontSize
}

export interface NodeWidthOptions {
  minWidth?: number
  maxWidth?: number
  fontSize?: number
  /** Fixed space consumed by the accent dot, gaps, and left/right padding. Default 46. */
  horizontalPadding?: number
}

/** Estimates the box width a node's chip/rect needs to fit its label (and badge) without the text overflowing, clamped to [minWidth, maxWidth]. */
export function estimateNodeWidth(label: string, badge: string | undefined, options: NodeWidthOptions = {}): number {
  const { minWidth = 140, maxWidth = 420, fontSize = 12, horizontalPadding = 46 } = options
  let width = estimateTextWidth(label, fontSize) + horizontalPadding
  if (badge) width += estimateTextWidth(badge, 10) + 10
  return Math.min(maxWidth, Math.max(minWidth, Math.ceil(width)))
}

/**
 * Shortens `label` with a trailing "…" until it fits `maxWidth`, for
 * renderers (like static SVG) with no native text-truncation of their
 * own — the React renderer gets this for free from CSS `text-overflow:
 * ellipsis` instead.
 */
export function truncateLabel(label: string, maxWidth: number, fontSize = 12): string {
  if (estimateTextWidth(label, fontSize) <= maxWidth) return label
  let end = label.length - 1
  while (end > 0 && estimateTextWidth(label.slice(0, end) + '…', fontSize) > maxWidth) {
    end--
  }
  return label.slice(0, end) + '…'
}
