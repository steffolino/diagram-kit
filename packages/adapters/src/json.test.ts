import { describe, expect, it } from 'vitest'
import { fromJson } from './json.js'

describe('fromJson', () => {
  it('parses the same spec shape as fromYaml', () => {
    const graph = fromJson(
      JSON.stringify({
        nodes: [
          { id: 'api', label: 'API' },
          { id: 'db', label: 'Database' },
        ],
        edges: [{ from: 'api', to: 'db' }],
      }),
    )
    expect(graph.nodes).toHaveLength(2)
    expect(graph.edges).toHaveLength(1)
  })

  it('raises a JSON-specific error for malformed JSON, not a YAML one', () => {
    expect(() => fromJson('{ not valid json')).toThrow(/Invalid JSON/)
  })

  it('still validates the resulting graph', () => {
    expect(() => fromJson(JSON.stringify({ nodes: [{ id: 'a' }, { id: 'a' }] }))).toThrow()
  })
})
