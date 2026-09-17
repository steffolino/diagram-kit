import { describe, expect, it } from 'vitest'
import { createGraph } from './graph.js'
import { layoutCycle } from './cycleLayout.js'

const graph = createGraph([
  { id: 'backlog', label: 'Product Backlog', detail: 'Prioritize work and refine the product backlog.' },
  { id: 'planning', label: 'Sprint Planning' },
  { id: 'sprint', label: 'Sprint', badge: '1–4 weeks', detail: 'Build and test a usable increment.' },
  { id: 'daily', label: 'Daily Scrum', badge: '24 h' },
  { id: 'done', label: 'Delivery' },
], [
  { id: 'loop', source: 'sprint', target: 'sprint', style: 'block' },
  { id: 'daily-loop', source: 'daily', target: 'daily', style: 'block' },
  { id: 'a', source: 'backlog', target: 'planning', style: 'block' },
  { id: 'b', source: 'planning', target: 'sprint', style: 'block' },
  { id: 'c', source: 'sprint', target: 'done', style: 'block' },
])

describe('layoutCycle', () => {
  it.each([false, true])('keeps a landscape flow and circular arrows (inline: %s)', (showDetails) => {
    const result = layoutCycle(graph, { showDetails })
    expect(result.width).toBeGreaterThan(result.height)
    const positions = new Map(result.nodes.map((node) => [node.id, node]))
    expect(positions.get('backlog')!.x).toBeLessThan(positions.get('planning')!.x)
    expect(positions.get('planning')!.x).toBeLessThan(positions.get('sprint')!.x)
    expect(positions.get('sprint')!.x).toBeLessThan(positions.get('done')!.x)
    for (const [edgeId, nodeId] of [['loop', 'sprint'], ['daily-loop', 'daily']]) {
      const loop = result.edges.find((edge) => edge.id === edgeId)!
      const center = positions.get(nodeId!)!
      const radii = loop.points.map((p) => Math.hypot(p.x - center.x, p.y - center.y))
      expect(Math.max(...radii) - Math.min(...radii)).toBeLessThan(0.001)
      expect(loop.arrow!.length).toBeGreaterThan(100)
    }
    for (const edge of result.edges) {
      for (const p of [...edge.points, ...(edge.arrow ?? [])]) {
        expect(p.x).toBeGreaterThanOrEqual(0)
        expect(p.y).toBeGreaterThanOrEqual(0)
        expect(p.x).toBeLessThanOrEqual(result.width)
        expect(p.y).toBeLessThanOrEqual(result.height)
      }
    }
  })

  it('handles empty and non-repeating graphs', () => {
    expect(layoutCycle(createGraph()).nodes).toEqual([])
    expect(layoutCycle(createGraph([{ id: 'one', label: 'One' }])).nodes).toHaveLength(1)
  })
})
