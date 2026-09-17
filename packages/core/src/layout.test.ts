import { describe, expect, it } from 'vitest'
import { createGraph } from './graph.js'
import { layoutGraph } from './layout.js'

describe('layoutGraph', () => {
  it('positions every node and preserves edge count', () => {
    const graph = createGraph(
      [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
        { id: 'c', label: 'C' },
      ],
      [
        { id: 'a->b', source: 'a', target: 'b' },
        { id: 'b->c', source: 'b', target: 'c' },
      ],
    )
    const positioned = layoutGraph(graph)

    expect(positioned.nodes).toHaveLength(3)
    expect(positioned.edges).toHaveLength(2)
    for (const node of positioned.nodes) {
      expect(Number.isFinite(node.x)).toBe(true)
      expect(Number.isFinite(node.y)).toBe(true)
      expect(node.width).toBeGreaterThan(0)
      expect(node.height).toBeGreaterThan(0)
    }
    expect(positioned.width).toBeGreaterThan(0)
    expect(positioned.height).toBeGreaterThan(0)
  })

  it('routes a top-to-bottom layout with later ranks below earlier ones', () => {
    const graph = createGraph(
      [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
      ],
      [{ id: 'a->b', source: 'a', target: 'b' }],
    )
    const positioned = layoutGraph(graph, { direction: 'TB' })
    const a = positioned.nodes.find((n) => n.id === 'a')!
    const b = positioned.nodes.find((n) => n.id === 'b')!
    expect(b.y).toBeGreaterThan(a.y)
  })

  it('handles a graph with no edges', () => {
    const graph = createGraph([{ id: 'solo', label: 'Solo' }])
    const positioned = layoutGraph(graph)
    expect(positioned.nodes).toHaveLength(1)
    expect(positioned.edges).toHaveLength(0)
  })

  it('grows node width to fit a long label beyond the default minimum', () => {
    const graph = createGraph([
      { id: 'short', label: 'A' },
      { id: 'long', label: 'A Much Much Longer Node Label Than The Default Width' },
    ])
    const positioned = layoutGraph(graph)
    const short = positioned.nodes.find((n) => n.id === 'short')!
    const long = positioned.nodes.find((n) => n.id === 'long')!
    expect(long.width).toBeGreaterThan(short.width)
  })

  it('clamps node width to nodeWidth in "fixed" sizing mode regardless of label length', () => {
    const graph = createGraph([
      { id: 'long', label: 'A Much Much Longer Node Label Than The Default Width' },
    ])
    const positioned = layoutGraph(graph, { nodeSizing: 'fixed', nodeWidth: 160 })
    expect(positioned.nodes[0]!.width).toBe(160)
  })

  it('supports multiple parallel edges between the same two nodes (multigraph)', () => {
    const graph = createGraph(
      [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
      ],
      [
        { id: 'edge1', source: 'a', target: 'b' },
        { id: 'edge2', source: 'a', target: 'b' },
      ],
    )
    expect(() => layoutGraph(graph)).not.toThrow()
    const positioned = layoutGraph(graph)
    expect(positioned.edges).toHaveLength(2)
  })
})
