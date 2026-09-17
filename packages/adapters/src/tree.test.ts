import { describe, expect, it } from 'vitest'
import { fromTree, fromTreeText } from './tree.js'

describe('fromTree', () => {
  it('flattens nested children into parentId containment with no edges', () => {
    const graph = fromTree({
      label: 'root',
      children: [{ label: 'child', children: [{ label: 'grandchild' }] }],
    })
    expect(graph.edges).toEqual([])
    expect(graph.nodes).toHaveLength(3)
    const root = graph.nodes.find((n) => n.label === 'root')!
    const child = graph.nodes.find((n) => n.label === 'child')!
    const grandchild = graph.nodes.find((n) => n.label === 'grandchild')!
    expect(child.parentId).toBe(root.id)
    expect(grandchild.parentId).toBe(child.id)
  })

  it('accepts an array of root nodes', () => {
    const graph = fromTree([{ label: 'a' }, { label: 'b' }])
    expect(graph.nodes).toHaveLength(2)
    expect(graph.nodes.every((n) => n.parentId === undefined)).toBe(true)
  })

  it('uses an explicit id when provided instead of generating a slug', () => {
    const graph = fromTree({ id: 'my-id', label: 'Something' })
    expect(graph.nodes[0]!.id).toBe('my-id')
  })

  it('disambiguates duplicate labels at the same path', () => {
    const graph = fromTree({ label: 'root', children: [{ label: 'x' }, { label: 'x' }] })
    const ids = graph.nodes.map((n) => n.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('fromTreeText', () => {
  it('parses box-drawing tree output', () => {
    const graph = fromTreeText('src\n├── a.ts\n└── b.ts\n')
    expect(graph.nodes.map((n) => n.label).sort()).toEqual(['a.ts', 'b.ts', 'src'])
    const a = graph.nodes.find((n) => n.label === 'a.ts')!
    const src = graph.nodes.find((n) => n.label === 'src')!
    expect(a.parentId).toBe(src.id)
  })

  it('parses a nested box-drawing tree correctly by depth', () => {
    const graph = fromTreeText('src\n├── components\n│   └── Button.tsx\n└── utils\n')
    const components = graph.nodes.find((n) => n.label === 'components')!
    const button = graph.nodes.find((n) => n.label === 'Button.tsx')!
    expect(button.parentId).toBe(components.id)
  })

  it('parses a plain indented list with no box-drawing characters', () => {
    const graph = fromTreeText('src\n  components\n    Button.tsx\n  utils\n')
    const components = graph.nodes.find((n) => n.label === 'components')!
    const button = graph.nodes.find((n) => n.label === 'Button.tsx')!
    expect(button.parentId).toBe(components.id)
  })

  it('produces the same tree shape from box-drawing and plain-indent encodings of the same structure', () => {
    const boxDrawing = fromTreeText('src\n├── components\n│   └── Button.tsx\n')
    const plainIndent = fromTreeText('src\n  components\n    Button.tsx\n')
    expect(boxDrawing.nodes.map((n) => n.label).sort()).toEqual(plainIndent.nodes.map((n) => n.label).sort())
  })

  it('ignores blank lines', () => {
    const graph = fromTreeText('src\n\n├── a.ts\n\n')
    expect(graph.nodes.map((n) => n.label).sort()).toEqual(['a.ts', 'src'])
  })
})
