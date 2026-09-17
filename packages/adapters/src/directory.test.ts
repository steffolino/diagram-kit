import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { fromDirectory } from './directory.js'

let root: string

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'diagram-kit-directory-test-'))
  mkdirSync(join(root, 'src'))
  mkdirSync(join(root, 'node_modules'))
  writeFileSync(join(root, 'src', 'index.ts'), '')
  writeFileSync(join(root, 'README.md'), '')
  writeFileSync(join(root, 'node_modules', 'ignored.js'), '')
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('fromDirectory', () => {
  it('includes real files and directories with correct containment', () => {
    const graph = fromDirectory(root)
    const rootNode = graph.nodes.find((n) => n.id === '.')!
    const src = graph.nodes.find((n) => n.label === 'src')!
    const indexTs = graph.nodes.find((n) => n.label === 'index.ts')!
    expect(src.parentId).toBe(rootNode.id)
    expect(indexTs.parentId).toBe(src.id)
  })

  it('ignores node_modules by default', () => {
    const graph = fromDirectory(root)
    expect(graph.nodes.some((n) => n.label === 'node_modules')).toBe(false)
    expect(graph.nodes.some((n) => n.label === 'ignored.js')).toBe(false)
  })

  it('categorizes directories and files distinctly', () => {
    const graph = fromDirectory(root)
    const src = graph.nodes.find((n) => n.label === 'src')!
    const readme = graph.nodes.find((n) => n.label === 'README.md')!
    expect(src.category).toBe('directory')
    expect(readme.category).toBe('file')
  })

  it('excludes files entirely when includeFiles is false', () => {
    const graph = fromDirectory(root, { includeFiles: false })
    expect(graph.nodes.some((n) => n.category === 'file')).toBe(false)
  })

  it('respects a custom ignore list', () => {
    const graph = fromDirectory(root, { ignore: ['src'] })
    expect(graph.nodes.some((n) => n.label === 'src')).toBe(false)
    expect(graph.nodes.some((n) => n.label === 'index.ts')).toBe(false)
  })

  it('produces a "contains" edge for every parent/child pair', () => {
    const graph = fromDirectory(root)
    for (const node of graph.nodes) {
      if (node.parentId === undefined) continue
      expect(graph.edges.some((e) => e.source === node.parentId && e.target === node.id && e.kind === 'contains')).toBe(
        true,
      )
    }
  })
})
