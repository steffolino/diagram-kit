import { describe, expect, it } from 'vitest'
import { createGraph } from './graph.js'
import { layoutStack } from './stackLayout.js'

describe('layoutStack', () => {
  it('produces no edges', () => {
    const graph = createGraph(
      [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
      ],
      [{ id: 'x', source: 'a', target: 'b' }],
    )
    expect(layoutStack(graph).edges).toEqual([])
  })

  it('stacks nodes vertically in graph order with increasing y', () => {
    const graph = createGraph([
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
      { id: 'c', label: 'C' },
    ])
    const positioned = layoutStack(graph, { direction: 'vertical' })
    const a = positioned.nodes.find((n) => n.id === 'a')!
    const b = positioned.nodes.find((n) => n.id === 'b')!
    const c = positioned.nodes.find((n) => n.id === 'c')!
    expect(b.y).toBeGreaterThan(a.y)
    expect(c.y).toBeGreaterThan(b.y)
  })

  it('lays out nodes horizontally with increasing x in horizontal direction', () => {
    const graph = createGraph([
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ])
    const positioned = layoutStack(graph, { direction: 'horizontal' })
    const a = positioned.nodes.find((n) => n.id === 'a')!
    const b = positioned.nodes.find((n) => n.id === 'b')!
    expect(b.x).toBeGreaterThan(a.x)
  })

  it('grows node width to fit a long label in responsive mode', () => {
    const graph = createGraph([{ id: 'long', label: 'A Much Much Longer Node Label Than Default' }])
    const positioned = layoutStack(graph)
    expect(positioned.nodes[0]!.width).toBeGreaterThan(200)
  })

  it('clamps node width in fixed sizing mode', () => {
    const graph = createGraph([{ id: 'long', label: 'A Much Much Longer Node Label Than Default' }])
    const positioned = layoutStack(graph, { nodeSizing: 'fixed', nodeWidth: 200 })
    expect(positioned.nodes[0]!.width).toBe(200)
  })

  it('handles an empty graph without throwing', () => {
    const graph = createGraph([])
    expect(() => layoutStack(graph)).not.toThrow()
  })
})
