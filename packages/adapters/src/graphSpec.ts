import type { DiagramEdge, DiagramGraph, DiagramNode } from '@steffolino/diagram-kit-core'
import { createGraph, validateGraph } from '@steffolino/diagram-kit-core'

/**
 * Hand-authored graph spec shape shared by the YAML and JSON adapters —
 * the same data, just two different textual encodings of it.
 */
export interface GraphSpec {
  nodes: Array<{
    id: string
    label?: string
    detail?: string
    category?: string
    badge?: string
    parent?: string
    shape?: 'rect' | 'cylinder'
    borderStyle?: 'solid' | 'dashed'
  }>
  edges?: Array<{
    from: string
    to: string
    label?: string
    weight?: number
    kind?: string
    projected?: boolean
    style?: 'line' | 'block'
  }>
}

export function graphFromSpec(spec: GraphSpec, sourceLabel: string): DiagramGraph {
  if (!spec || !Array.isArray(spec.nodes)) {
    throw new Error(`${sourceLabel} graph spec must have a top-level "nodes" list`)
  }

  const nodes: DiagramNode[] = spec.nodes.map((n) => ({
    id: n.id,
    label: n.label ?? n.id,
    detail: n.detail,
    category: n.category,
    badge: n.badge,
    parentId: n.parent,
    shape: n.shape,
    borderStyle: n.borderStyle,
  }))

  const edges: DiagramEdge[] = (spec.edges ?? []).map((e, i) => ({
    id: `${e.from}->${e.to}#${i}`,
    source: e.from,
    target: e.to,
    label: e.label,
    weight: e.weight,
    kind: e.kind,
    projected: e.projected,
    style: e.style,
  }))

  const graph = createGraph(nodes, edges)
  validateGraph(graph)
  return graph
}
