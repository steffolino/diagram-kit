import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { CliError, detectFormat, parseGraph, renderGraph } from './render.js'

let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'diagram-kit-cli-test-'))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('detectFormat', () => {
  it('detects yaml, json, and mermaid from extension', () => {
    expect(detectFormat('graph.yaml', false)).toBe('yaml')
    expect(detectFormat('graph.yml', false)).toBe('yaml')
    expect(detectFormat('graph.json', false)).toBe('json')
    expect(detectFormat('graph.mmd', false)).toBe('mermaid')
  })

  it('detects directory when the path is a real directory, regardless of extension', () => {
    expect(detectFormat('some-folder', true)).toBe('directory')
  })

  it('returns null for an unrecognized extension, e.g. tree text', () => {
    expect(detectFormat('graph.txt', false)).toBeNull()
  })
})

describe('parseGraph', () => {
  it('parses a yaml file into a graph', () => {
    const file = join(dir, 'graph.yaml')
    writeFileSync(file, 'nodes:\n  - id: a\n    label: A\n')
    const graph = parseGraph('yaml', file)
    expect(graph.nodes).toHaveLength(1)
    expect(graph.nodes[0]!.id).toBe('a')
  })

  it('parses a json file into a graph', () => {
    const file = join(dir, 'graph.json')
    writeFileSync(file, JSON.stringify({ nodes: [{ id: 'a', label: 'A' }], edges: [] }))
    const graph = parseGraph('json', file)
    expect(graph.nodes).toHaveLength(1)
  })

  it('parses a real directory into a containment graph', () => {
    const graph = parseGraph('directory', dir)
    expect(graph.nodes.some((n) => n.id === '.')).toBe(true)
  })
})

describe('renderGraph', () => {
  const graph = { nodes: [{ id: 'a', label: 'A' }], edges: [] }

  it('renders an SVG string for a .svg output path', () => {
    const result = renderGraph(graph, 'out.svg')
    expect(typeof result).toBe('string')
    expect(result as string).toContain('<svg')
  })

  it('renders a PNG buffer for a .png output path', () => {
    const result = renderGraph(graph, 'out.png')
    expect(Buffer.isBuffer(result)).toBe(true)
  })

  it('throws a CliError for an unsupported output extension', () => {
    expect(() => renderGraph(graph, 'out.pdf')).toThrow(CliError)
  })

  it('throws a CliError for an unknown theme preset', () => {
    // @ts-expect-error deliberately invalid preset name for the error-path test
    expect(() => renderGraph(graph, 'out.svg', { preset: 'not-a-real-preset' })).toThrow(CliError)
  })
})
