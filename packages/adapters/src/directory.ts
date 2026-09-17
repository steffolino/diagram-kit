// Node-only: reads the filesystem directly. Import from
// "@diagram-kit/adapters/directory", not the package root, so this never
// ends up in a browser bundle.
import { readdirSync, statSync } from 'node:fs'
import { basename, join, relative } from 'node:path'
import type { DiagramEdge, DiagramGraph, DiagramNode } from '@diagram-kit/core'
import { createGraph, validateGraph } from '@diagram-kit/core'

export interface DirectoryGraphOptions {
  /** Directory/file names to skip entirely, e.g. node_modules, .git. */
  ignore?: string[]
  /** How many levels deep to walk. Default 4. */
  maxDepth?: number
  /** Include files as leaf nodes, not just directories. Default true. */
  includeFiles?: boolean
}

const DEFAULT_IGNORE = ['node_modules', '.git', 'dist', 'build', '__pycache__', '.venv']

/** Walks a directory tree and produces a containment graph (parentId + "contains" edges) for structure diagrams. */
export function fromDirectory(rootPath: string, options: DirectoryGraphOptions = {}): DiagramGraph {
  const ignore = new Set(options.ignore ?? DEFAULT_IGNORE)
  const maxDepth = options.maxDepth ?? 4
  const includeFiles = options.includeFiles ?? true

  const nodes: DiagramNode[] = []
  const edges: DiagramEdge[] = []

  function idFor(path: string): string {
    const rel = relative(rootPath, path)
    return rel === '' ? '.' : rel.replace(/\\/g, '/')
  }

  function walk(path: string, depth: number, parentId: string | undefined): void {
    const id = idFor(path)
    const stats = statSync(path)
    const isDir = stats.isDirectory()

    if (!isDir && !includeFiles) return

    nodes.push({
      id,
      label: basename(path) || path,
      category: isDir ? 'directory' : 'file',
      parentId,
    })

    if (parentId !== undefined) {
      edges.push({
        id: `${parentId}->${id}`,
        source: parentId,
        target: id,
        kind: 'contains',
      })
    }

    if (isDir && depth < maxDepth) {
      const entries = readdirSync(path).filter((entry) => !ignore.has(entry))
      for (const entry of entries.sort()) {
        walk(join(path, entry), depth + 1, id)
      }
    }
  }

  walk(rootPath, 0, undefined)

  const graph = createGraph(nodes, edges)
  validateGraph(graph)
  return graph
}
