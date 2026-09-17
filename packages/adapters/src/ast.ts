import type { DiagramEdge, DiagramGraph, DiagramNode } from '@diagram-kit/core'
import { createGraph, validateGraph } from '@diagram-kit/core'

/**
 * Shape produced by a Python `ast`-module walker over a DDD-style backend
 * (contexts with aggregates/routes/adapters/external systems, plus the
 * real cross-context import graph). Field names are snake_case to match
 * that JSON directly — this adapter is meant to consume the manifest
 * as-is, not require a reshaping step in the extractor script.
 *
 * There is no bundled TypeScript/Python AST walker here yet: writing a
 * generic one is real, separate work (see README). This adapter is the
 * normalization half of that pipeline — point an external extractor's
 * JSON output at `fromArchitectureLandscape` and it becomes a
 * DiagramGraph like any other adapter's output.
 */
export interface ArchitectureLandscapeManifest {
  contexts: Record<
    string,
    {
      layers: Record<string, number>
      aggregates: Array<{ name: string; is_formal_aggregate_root: boolean }>
      routes: Array<{ method: string; path: string }>
      adapters: Array<{ name: string; kind: string }>
      external_systems: string[]
    }
  >
  context_edges: Array<{ from: string; to: string; import_count: number }>
}

export function fromArchitectureLandscape(manifest: ArchitectureLandscapeManifest): DiagramGraph {
  const nodes: DiagramNode[] = Object.entries(manifest.contexts).map(([contextName, ctx]) => {
    const hasWriteRepository = ctx.aggregates.some((a) => a.is_formal_aggregate_root)
    return {
      id: contextName,
      label: contextName,
      category: 'context',
      badge: hasWriteRepository ? undefined : 'read-only',
      detail: `${ctx.aggregates.length} aggregates, ${ctx.routes.length} routes, ${ctx.adapters.length} adapters`,
      metadata: { externalSystems: ctx.external_systems },
    }
  })

  const edges: DiagramEdge[] = manifest.context_edges.map((edge) => ({
    id: `${edge.from}->${edge.to}`,
    source: edge.from,
    target: edge.to,
    weight: edge.import_count,
    kind: 'imports',
  }))

  const graph = createGraph(nodes, edges)
  validateGraph(graph)
  return graph
}
