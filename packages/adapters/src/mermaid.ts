import type { DiagramEdge, DiagramGraph, DiagramNode } from '@steffolino/diagram-kit-core'
import { createGraph, validateGraph } from '@steffolino/diagram-kit-core'

/**
 * Parses a subset of Mermaid flowchart/graph syntax into a normalized graph
 * so it can be re-rendered with diagram-kit's own layout and theming
 * instead of Mermaid's default styling.
 *
 * Supported:
 *   flowchart TD | graph LR ...
 *   id[Label] / id(Label) / id{Label} / id((Label)) / id (bare)
 *   A --> B | A --- B | A -.-> B | A ==> B
 *   A -->|label| B | A -- label --> B
 *
 * Not supported (throws or ignores): subgraphs, styling directives,
 * click/callback bindings, class defs. Treat this as "parse a diagram
 * someone wrote by hand", not a full Mermaid-spec implementation.
 */

const NODE_SHAPE_PATTERN = /^([A-Za-z0-9_-]+)(?:(\[)([^\]]*)\]|(\()([^)]*)\)|(\{)([^}]*)\})?$/
const EDGE_PATTERN =
  /^(.+?)\s*(-->|---|-\.->|==>)\s*(?:\|([^|]*)\|\s*)?(.+)$/
const INLINE_LABEL_EDGE_PATTERN = /^(.+?)\s*--\s*(.+?)\s*-->\s*(.+)$/

function parseNodeToken(token: string): { id: string; label?: string } {
  const match = NODE_SHAPE_PATTERN.exec(token.trim())
  if (!match) return { id: token.trim() }
  const id = match[1]!
  const label = match[3] ?? match[5] ?? match[7]
  return { id, label }
}

export function fromMermaid(source: string): DiagramGraph {
  const nodesById = new Map<string, DiagramNode>()
  const edges: DiagramEdge[] = []
  let edgeCounter = 0

  const ensureNode = (id: string, label?: string): void => {
    const existing = nodesById.get(id)
    if (existing) {
      if (label && existing.label === existing.id) existing.label = label
      return
    }
    nodesById.set(id, { id, label: label ?? id })
  }

  const lines = source
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('%%'))

  for (const line of lines) {
    if (/^(flowchart|graph)\s+/i.test(line)) continue
    if (/^(subgraph|end|classDef|class|click|style)\b/i.test(line)) continue

    const inlineLabelMatch = INLINE_LABEL_EDGE_PATTERN.exec(line)
    const plainEdgeMatch = inlineLabelMatch ? null : EDGE_PATTERN.exec(line)
    if (inlineLabelMatch || plainEdgeMatch) {
      // The two patterns capture different group shapes (inline: left,
      // label, right — plain: left, op, label, right), so each needs its
      // own destructuring rather than sharing one positional unpack.
      const [left, label, right] = inlineLabelMatch
        ? [inlineLabelMatch[1]!, inlineLabelMatch[2], inlineLabelMatch[3]!]
        : [plainEdgeMatch![1]!, plainEdgeMatch![3], plainEdgeMatch![4]!]
      const from = parseNodeToken(left)
      const to = parseNodeToken(right)
      ensureNode(from.id, from.label)
      ensureNode(to.id, to.label)
      edges.push({
        id: `mermaid-edge-${edgeCounter++}`,
        source: from.id,
        target: to.id,
        label: label || undefined,
      })
      continue
    }

    const bare = parseNodeToken(line)
    if (bare.id) ensureNode(bare.id, bare.label)
  }

  const graph = createGraph(Array.from(nodesById.values()), edges)
  validateGraph(graph)
  return graph
}
