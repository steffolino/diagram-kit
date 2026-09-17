import { describe, expect, it } from 'vitest'
import { createGraph, generateTheme } from '@diagram-kit/core'
import { renderSvg } from './renderSvg.js'

const graph = createGraph(
  [
    { id: 'a', label: 'A', category: 'core' },
    { id: 'b', label: 'B', category: 'external' },
  ],
  [{ id: 'a->b', source: 'a', target: 'b', label: 'calls' }],
)

describe('renderSvg', () => {
  it('produces a well-formed SVG document containing every node label', () => {
    const svg = renderSvg(graph)
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg.trim().endsWith('</svg>')).toBe(true)
    expect(svg).toContain('>A<')
    expect(svg).toContain('>B<')
  })

  it('respects the padding option in the overall canvas size', () => {
    const small = renderSvg(graph, { padding: 0 })
    const large = renderSvg(graph, { padding: 100 })
    const widthOf = (svg: string) => Number(/width="(\d+)"/.exec(svg)![1])
    expect(widthOf(large)).toBeGreaterThan(widthOf(small))
  })

  it('renders a cylinder shape with distinct markup from a rect', () => {
    const withShape = createGraph([{ id: 'db', label: 'Database', shape: 'cylinder' }])
    const svg = renderSvg(withShape)
    expect(svg).toContain('<ellipse')
  })

  it('renders block-style edges as filled polygons, not stroked paths', () => {
    const blockGraph = createGraph(
      [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
      ],
      [{ id: 'a->b', source: 'a', target: 'b', style: 'block' }],
    )
    const svg = renderSvg(blockGraph)
    expect(svg).toContain('<polygon')
  })

  it('draws containers with a border and header divider in structural mode', () => {
    const structuralGraph = createGraph([
      { id: 'parent', label: 'Parent' },
      { id: 'child', label: 'Child', parentId: 'parent' },
    ])
    const svg = renderSvg(structuralGraph, { layoutMode: 'structural' })
    expect(svg).toContain('<line')
  })

  it('produces no edge markup in stack layout mode', () => {
    const svg = renderSvg(graph, { layoutMode: 'stack' })
    expect(svg).not.toContain('<path')
  })

  it('truncates a label that does not fit its box in fixed node-sizing mode', () => {
    const longLabelGraph = createGraph([
      { id: 'long', label: 'A Much Much Longer Label Than The Fixed Box Width Allows' },
    ])
    const svg = renderSvg(longLabelGraph, { layout: { nodeSizing: 'fixed', nodeWidth: 140 } })
    expect(svg).toContain('…')
  })

  it('never lets a label overflow its own box width, across varied label lengths', () => {
    const labels = [
      'x',
      'a normal label',
      'a considerably longer label than the default box width',
      'an extremely long label that would badly overflow a fixed-size box without truncation or growth',
    ]
    const varied = createGraph(labels.map((label, i) => ({ id: `n${i}`, label })))
    const svg = renderSvg(varied)

    const groups = [...svg.matchAll(/<rect[^>]*x="([\d.]+)"[^>]*width="([\d.]+)"[^>]*\/>[\s\S]*?<text[^>]*>([^<]*)<\/text>/g)]
    expect(groups.length).toBeGreaterThan(0)
    for (const [, , width] of groups) {
      expect(Number(width)).toBeGreaterThan(0)
    }
  })

  it('tags every node group with its own id for click-handling consumers', () => {
    const svg = renderSvg(graph)
    expect(svg).toContain('data-node-id="a"')
    expect(svg).toContain('data-node-id="b"')
  })

  it('applies a custom theme background', () => {
    const theme = generateTheme()
    theme.light.background = '#123456'
    const svg = renderSvg(graph, { theme, mode: 'light' })
    expect(svg).toContain('#123456')
  })
})
