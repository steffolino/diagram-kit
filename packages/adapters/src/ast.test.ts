import { describe, expect, it } from 'vitest'
import { fromArchitectureLandscape, type ArchitectureLandscapeManifest } from './ast.js'

const manifest: ArchitectureLandscapeManifest = {
  contexts: {
    ingestion: {
      layers: { domain: 3, application: 2 },
      aggregates: [{ name: 'Import', is_formal_aggregate_root: true }],
      routes: [{ method: 'POST', path: '/imports' }],
      adapters: [{ name: 'ImportRepository', kind: 'repository' }],
      external_systems: ['S3'],
    },
    read_models: {
      layers: {},
      aggregates: [],
      routes: [],
      adapters: [],
      external_systems: [],
    },
  },
  context_edges: [{ from: 'ingestion', to: 'read_models', import_count: 4 }],
}

describe('fromArchitectureLandscape', () => {
  it('creates one node per context, tagged with the "context" category', () => {
    const graph = fromArchitectureLandscape(manifest)
    expect(graph.nodes).toHaveLength(2)
    expect(graph.nodes.every((n) => n.category === 'context')).toBe(true)
  })

  it('badges a context with no formal aggregate root as read-only', () => {
    const graph = fromArchitectureLandscape(manifest)
    const readModels = graph.nodes.find((n) => n.id === 'read_models')!
    expect(readModels.badge).toBe('read-only')
  })

  it('does not badge a context that has a formal write aggregate root', () => {
    const graph = fromArchitectureLandscape(manifest)
    const ingestion = graph.nodes.find((n) => n.id === 'ingestion')!
    expect(ingestion.badge).toBeUndefined()
  })

  it('maps context_edges to weighted import edges', () => {
    const graph = fromArchitectureLandscape(manifest)
    expect(graph.edges).toHaveLength(1)
    expect(graph.edges[0]).toMatchObject({ source: 'ingestion', target: 'read_models', weight: 4, kind: 'imports' })
  })
})
