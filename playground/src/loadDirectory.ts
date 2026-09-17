import type { TreeNodeInput } from '@steffolino/diagram-kit-adapters'

interface MutableNode {
  label: string
  category: 'file' | 'directory'
  children: Map<string, MutableNode>
}

/**
 * Builds a nested tree from a browser folder picker's flat `FileList` (each
 * File's `webkitRelativePath`, e.g. "myproject/src/index.ts") — a
 * client-side equivalent of `@steffolino/diagram-kit-adapters/directory`'s
 * `fromDirectory`, which can't run in a browser at all since it needs
 * `node:fs`.
 */
export function treeFromFileList(files: FileList): TreeNodeInput[] {
  const root = new Map<string, MutableNode>()

  for (const file of Array.from(files)) {
    const relPath = (file as unknown as { webkitRelativePath?: string }).webkitRelativePath || file.name
    const parts = relPath.split('/').filter(Boolean)
    let level = root
    parts.forEach((part, i) => {
      const isFile = i === parts.length - 1
      let node = level.get(part)
      if (!node) {
        node = { label: part, category: isFile ? 'file' : 'directory', children: new Map() }
        level.set(part, node)
      }
      level = node.children
    })
  }

  function convert(level: Map<string, MutableNode>): TreeNodeInput[] {
    return Array.from(level.values()).map((node) => ({
      label: node.label,
      category: node.category,
      children: node.children.size > 0 ? convert(node.children) : undefined,
    }))
  }

  return convert(root)
}
