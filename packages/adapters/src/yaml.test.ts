import { describe, expect, it } from 'vitest'
import { fromYaml } from './yaml.js'

describe('fromYaml', () => {
  it('parses nodes and edges', () => {
    const graph = fromYaml(`
nodes:
  - id: api
    label: API
    category: presentation
  - id: db
    label: Database
edges:
  - from: api
    to: db
    label: reads
`)
    expect(graph.nodes).toHaveLength(2)
    expect(graph.edges).toHaveLength(1)
    expect(graph.edges[0]).toMatchObject({ source: 'api', target: 'db', label: 'reads' })
  })

  it('defaults label to id when omitted', () => {
    const graph = fromYaml('nodes:\n  - id: solo\n')
    expect(graph.nodes[0]).toMatchObject({ id: 'solo', label: 'solo' })
  })

  it('maps parent to parentId', () => {
    const graph = fromYaml('nodes:\n  - id: a\n  - id: b\n    parent: a\n')
    expect(graph.nodes.find((n) => n.id === 'b')?.parentId).toBe('a')
  })

  it('throws when there is no top-level nodes list', () => {
    expect(() => fromYaml('edges: []\n')).toThrow(/nodes/)
  })

  it('throws for a duplicate node id (via validateGraph)', () => {
    expect(() => fromYaml('nodes:\n  - id: a\n  - id: a\n')).toThrow()
  })

  it('throws for an edge referencing a missing node', () => {
    expect(() => fromYaml('nodes:\n  - id: a\nedges:\n  - from: a\n    to: missing\n')).toThrow()
  })
})
