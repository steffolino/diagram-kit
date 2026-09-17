import { describe, expect, it } from 'vitest'
import { createGraph, validateGraph, GraphValidationError } from './graph.js'

describe('createGraph', () => {
  it('defaults to empty nodes/edges', () => {
    const graph = createGraph()
    expect(graph.nodes).toEqual([])
    expect(graph.edges).toEqual([])
  })

  it('carries through provided nodes/edges/metadata', () => {
    const graph = createGraph([{ id: 'a', label: 'A' }], [], { source: 'test' })
    expect(graph.nodes).toHaveLength(1)
    expect(graph.metadata).toEqual({ source: 'test' })
  })
})

describe('validateGraph', () => {
  it('accepts a graph with consistent nodes/edges', () => {
    const graph = createGraph(
      [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
      [{ id: 'a->b', source: 'a', target: 'b' }],
    )
    expect(() => validateGraph(graph)).not.toThrow()
  })

  it('rejects duplicate node ids', () => {
    const graph = createGraph([{ id: 'a', label: 'A' }, { id: 'a', label: 'A2' }])
    expect(() => validateGraph(graph)).toThrow(GraphValidationError)
  })

  it('rejects an edge referencing a missing source node', () => {
    const graph = createGraph([{ id: 'b', label: 'B' }], [{ id: 'a->b', source: 'a', target: 'b' }])
    expect(() => validateGraph(graph)).toThrow(/missing source node "a"/)
  })

  it('rejects an edge referencing a missing target node', () => {
    const graph = createGraph([{ id: 'a', label: 'A' }], [{ id: 'a->b', source: 'a', target: 'b' }])
    expect(() => validateGraph(graph)).toThrow(/missing target node "b"/)
  })
})
