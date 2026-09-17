import { describe, expect, it } from 'vitest'
import { createGraph } from './graph.js'
import { layoutStructural } from './structuralLayout.js'

describe('layoutStructural', () => {
  it('produces no edges regardless of the input graph having any', () => {
    const graph = createGraph(
      [
        { id: 'parent', label: 'Parent' },
        { id: 'child', label: 'Child', parentId: 'parent' },
      ],
      [{ id: 'x', source: 'parent', target: 'child' }],
    )
    const positioned = layoutStructural(graph)
    expect(positioned.edges).toEqual([])
  })

  it('sizes a container to enclose its children', () => {
    const graph = createGraph([
      { id: 'parent', label: 'Parent' },
      { id: 'a', label: 'A', parentId: 'parent' },
      { id: 'b', label: 'B', parentId: 'parent' },
    ])
    const positioned = layoutStructural(graph)
    const parent = positioned.nodes.find((n) => n.id === 'parent')!
    const a = positioned.nodes.find((n) => n.id === 'a')!
    const b = positioned.nodes.find((n) => n.id === 'b')!

    const parentLeft = parent.x - parent.width / 2
    const parentRight = parent.x + parent.width / 2
    const parentTop = parent.y - parent.height / 2
    const parentBottom = parent.y + parent.height / 2

    for (const child of [a, b]) {
      expect(child.x - child.width / 2).toBeGreaterThanOrEqual(parentLeft)
      expect(child.x + child.width / 2).toBeLessThanOrEqual(parentRight)
      expect(child.y - child.height / 2).toBeGreaterThanOrEqual(parentTop)
      expect(child.y + child.height / 2).toBeLessThanOrEqual(parentBottom)
    }
  })

  it('wraps children onto a new row once maxRowWidth is exceeded', () => {
    const graph = createGraph([
      { id: 'parent', label: 'Parent' },
      { id: 'a', label: 'A', parentId: 'parent' },
      { id: 'b', label: 'B', parentId: 'parent' },
      { id: 'c', label: 'C', parentId: 'parent' },
    ])
    const positioned = layoutStructural(graph, { leafWidth: 100, maxRowWidth: 250, gap: 10 })
    const a = positioned.nodes.find((n) => n.id === 'a')!
    const c = positioned.nodes.find((n) => n.id === 'c')!
    // 3 leaves at 100 + 2 gaps of 10 = 320 > maxRowWidth 250, so the third
    // leaf should wrap onto a second row (different y than the first).
    expect(c.y).toBeGreaterThan(a.y)
  })

  it('sizes a leaf wide enough for a long label', () => {
    const graph = createGraph([
      { id: 'short', label: 'A' },
      { id: 'long', label: 'A Much Much Longer Node Label' },
    ])
    const positioned = layoutStructural(graph)
    const short = positioned.nodes.find((n) => n.id === 'short')!
    const long = positioned.nodes.find((n) => n.id === 'long')!
    expect(long.width).toBeGreaterThan(short.width)
  })

  it('clamps leaf width in "fixed" sizing mode', () => {
    const graph = createGraph([{ id: 'long', label: 'A Much Much Longer Node Label Than Default' }])
    const positioned = layoutStructural(graph, { nodeSizing: 'fixed', leafWidth: 140 })
    expect(positioned.nodes[0]!.width).toBe(140)
  })

  it('places multiple root nodes side by side without overlapping', () => {
    const graph = createGraph([
      { id: 'root1', label: 'Root 1' },
      { id: 'root2', label: 'Root 2' },
    ])
    const positioned = layoutStructural(graph)
    const root1 = positioned.nodes.find((n) => n.id === 'root1')!
    const root2 = positioned.nodes.find((n) => n.id === 'root2')!
    expect(root2.x - root2.width / 2).toBeGreaterThanOrEqual(root1.x + root1.width / 2)
  })
})
