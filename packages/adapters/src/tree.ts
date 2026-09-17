import type { DiagramGraph, DiagramNode } from '@steffolino/diagram-kit-core'
import { createGraph, validateGraph } from '@steffolino/diagram-kit-core'

export interface TreeNodeInput {
  /** Defaults to a slug of the path from the root if omitted. */
  id?: string
  label: string
  detail?: string
  category?: string
  badge?: string
  shape?: 'rect' | 'cylinder'
  borderStyle?: 'solid' | 'dashed'
  children?: TreeNodeInput[]
}

/**
 * Flattens a nested `{ label, children }` tree — the shape most JS tree
 * data (a file-explorer model, a `d3.hierarchy` source, a JSON export of
 * an org chart) already comes in — into a normalized graph with
 * `parentId` containment and zero edges. Pair with `layoutMode:
 * "structural"` or `"stack"`; a "graph" layout would just show every node
 * floating disconnected, since trees-as-input produce no edges.
 */
export function fromTree(root: TreeNodeInput | TreeNodeInput[]): DiagramGraph {
  const roots = Array.isArray(root) ? root : [root]
  const nodes: DiagramNode[] = []
  const usedIds = new Set<string>()

  function slug(pathParts: string[]): string {
    const base = pathParts.join('/').toLowerCase().replace(/[^a-z0-9/]+/g, '-')
    let id = base
    let i = 2
    while (usedIds.has(id)) {
      id = `${base}#${i++}`
    }
    return id
  }

  function visit(input: TreeNodeInput, pathParts: string[], parentId: string | undefined): void {
    const path = [...pathParts, input.label]
    const id = input.id ?? slug(path)
    usedIds.add(id)

    nodes.push({
      id,
      label: input.label,
      detail: input.detail,
      category: input.category,
      badge: input.badge,
      shape: input.shape,
      borderStyle: input.borderStyle,
      parentId,
    })

    for (const child of input.children ?? []) {
      visit(child, path, id)
    }
  }

  for (const r of roots) visit(r, [], undefined)

  const graph = createGraph(nodes, [])
  validateGraph(graph)
  return graph
}

const BRANCH = /^(├── |└── )/
const CONTINUATION = /^(│   |    )/

function stripAnsi(line: string): string {
  // eslint-disable-next-line no-control-regex
  return line.replace(/\x1b\[[0-9;]*m/g, '')
}

/**
 * Parses the classic `tree` CLI's box-drawing output (├──/└──/│) into the
 * same nested shape `fromTree` consumes. Falls back to counting plain
 * leading whitespace (auto-detecting the indent unit from the first
 * indented line) for a simple indented list with no box-drawing
 * characters at all.
 */
export function fromTreeText(source: string): DiagramGraph {
  const lines = source
    .split('\n')
    .map(stripAnsi)
    .map((l) => l.replace(/\r$/, ''))
    .filter((l) => l.trim().length > 0)

  const usesBoxDrawing = lines.some((l) => BRANCH.test(l) || l.startsWith('│'))

  interface Entry {
    depth: number
    label: string
  }

  let entries: Entry[]

  if (usesBoxDrawing) {
    entries = lines.map((line) => {
      let rest = line
      let depth = 0
      for (;;) {
        if (BRANCH.test(rest)) {
          rest = rest.replace(BRANCH, '')
          depth += 1
          break
        }
        if (CONTINUATION.test(rest)) {
          rest = rest.replace(CONTINUATION, '')
          depth += 1
          continue
        }
        break
      }
      return { depth, label: rest.trim() }
    })
  } else {
    const indents = lines
      .map((l) => l.length - l.trimStart().length)
      .filter((n) => n > 0)
    const unit = indents.length > 0 ? Math.min(...indents) : 2
    entries = lines.map((line) => {
      const leading = line.length - line.trimStart().length
      return { depth: Math.round(leading / unit), label: line.trim() }
    })
  }

  const roots: TreeNodeInput[] = []
  const stack: { depth: number; node: TreeNodeInput }[] = []

  for (const entry of entries) {
    const node: TreeNodeInput = { label: entry.label, children: [] }
    while (stack.length > 0 && stack[stack.length - 1]!.depth >= entry.depth) {
      stack.pop()
    }
    if (stack.length === 0) {
      roots.push(node)
    } else {
      stack[stack.length - 1]!.node.children!.push(node)
    }
    stack.push({ depth: entry.depth, node })
  }

  return fromTree(roots)
}
