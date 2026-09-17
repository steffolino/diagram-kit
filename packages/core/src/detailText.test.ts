import { describe, expect, it } from 'vitest'
import { detailLines } from './detailText.js'
import { estimateTextWidth } from './textWidth.js'
import { createGraph } from './graph.js'
import { layoutGraph } from './layout.js'
import { layoutStack } from './stackLayout.js'
import { layoutStructural } from './structuralLayout.js'

describe('inline descriptions', () => {
  it('wraps paragraphs and long words without dropping text', () => {
    const text = 'A long description with Supercalifragilisticexpialidocious\nSecond paragraph & <markup>.'
    const lines = detailLines(text, 90)
    expect(lines.join('').replace(/\s/g, '')).toBe(text.replace(/\s/g, ''))
    for (const line of lines) expect(estimateTextWidth(line, 11)).toBeLessThanOrEqual(90)
    expect(detailLines(undefined, 90)).toEqual([])
  })
  it.each([layoutGraph, layoutStack, layoutStructural])('expands boxes before positioning their neighbors', (layout) => {
    const graph = createGraph([
      { id: 'a', label: 'One', detail: 'A long description that must wrap over several lines inside this box.' },
      { id: 'b', label: 'Two' },
    ], [{ id: 'ab', source: 'a', target: 'b' }])
    const compact = layout(graph)
    const expanded = layout(graph, { showDetails: true })
    const [a, b] = expanded.nodes
    expect(a!.height).toBeGreaterThan(compact.nodes[0]!.height)
    expect(b!.height).toBe(compact.nodes[1]!.height)
    expect(Math.abs(a!.x - b!.x) >= (a!.width + b!.width) / 2 || Math.abs(a!.y - b!.y) >= (a!.height + b!.height) / 2).toBe(true)
  })
  it('reserves container header descriptions above children', () => {
    const graph = createGraph([
      { id: 'parent', label: 'Parent', detail: 'Container description that must stay above its children.' },
      { id: 'child', label: 'Child', parentId: 'parent', detail: 'Child description' },
    ])
    const compact = layoutStructural(graph)
    const expanded = layoutStructural(graph, { showDetails: true })
    expect(expanded.nodes[1]!.y - expanded.nodes[1]!.height / 2).toBeGreaterThan(compact.nodes[1]!.y - compact.nodes[1]!.height / 2)
    expect(expanded.height).toBeGreaterThan(compact.height)
  })
})
