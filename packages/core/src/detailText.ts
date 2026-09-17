import type { DiagramNode } from './graph.js'
import { estimateTextWidth } from './textWidth.js'

/** Shared line breaking keeps browser and headless exports the same height. */
export function detailLines(detail: string | undefined, width: number): string[] {
  if (!detail?.trim()) return []
  const lines: string[] = []
  for (const paragraph of detail.split('\n')) {
    let line = ''
    for (const word of paragraph.trim().split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word
      if (estimateTextWidth(candidate, 11) <= Math.max(11, width)) {
        line = candidate
        continue
      }
      if (line) lines.push(line)
      line = ''
      for (const char of word) {
        if (line && estimateTextWidth(line + char, 11) > Math.max(11, width)) {
          lines.push(line)
          line = ''
        }
        line += char
      }
    }
    lines.push(line)
  }
  return lines
}

export function detailHeight(node: DiagramNode, width: number, showDetails = false): number {
  const count = showDetails ? detailLines(node.detail, width - 24).length : 0
  return count ? count * 15 + 8 : 0
}
