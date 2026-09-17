import type { DiagramGraph, DiagramTheme, LayoutOptions } from '@diagram-kit/core'
import type { DetailPanelPosition, LayoutMode } from '@diagram-kit/react'

export interface CodeExportOptions {
  layoutMode: LayoutMode
  direction: NonNullable<LayoutOptions['direction']>
  theme: DiagramTheme
  mode: 'light' | 'dark'
  colorizeNodes: boolean
  glass: boolean
  showDetailPanel: boolean
  detailPanelPosition: DetailPanelPosition
  detailPlacement: 'panel' | 'inline'
  padding: number
}

function indent(json: string): string {
  return json.replace(/\n/g, '\n  ')
}

function serializeGraphCall(graph: DiagramGraph): string {
  const nodes = indent(JSON.stringify(graph.nodes, null, 2))
  const edges = indent(JSON.stringify(graph.edges, null, 2))
  return `createGraph(\n  ${nodes},\n  ${edges},\n)`
}

/**
 * A React component that renders exactly what's in the playground right
 * now — the graph is inlined as data (not re-parsed from YAML/JSON/tree
 * text) so the snippet works regardless of which input format was used,
 * including a picked folder.
 */
export function generateReactSnippet(graph: DiagramGraph, options: CodeExportOptions): string {
  const layoutProp = options.layoutMode === 'graph' ? `\n      layout={{ direction: '${options.direction}' }}` : ''
  return `import { DiagramView } from '@diagram-kit/react'
import { createGraph } from '@diagram-kit/core'
import type { DiagramTheme } from '@diagram-kit/core'

const graph = ${serializeGraphCall(graph)}

const theme: DiagramTheme = ${JSON.stringify(options.theme, null, 2)}

export function MyDiagram() {
  return (
    <DiagramView
      graph={graph}
      layoutMode="${options.layoutMode}"${layoutProp}
      theme={theme}
      mode="${options.mode}"
      padding={${options.padding}}
      colorizeNodes={${options.colorizeNodes}}
      glass={${options.glass}}
      showDetailPanel={${options.showDetailPanel}}
      detailPanelPosition="${options.detailPanelPosition}"
      detailPlacement="${options.detailPlacement}"
    />
  )
}
`
}

/**
 * Framework-agnostic version using the `<diagram-kit-view>` Custom Element
 * (@diagram-kit/element) — works in Vue, Angular, plain HTML, or anywhere
 * else that isn't React. It has a simpler built-in detail panel (a fixed
 * top-right popup), so "glass" and detail-panel position aren't settable —
 * those stay React-only features.
 */
export function generateElementSnippet(graph: DiagramGraph, options: CodeExportOptions): string {
  const attrs = [
    `layout-mode="${options.layoutMode}"`,
    options.layoutMode === 'graph' ? `direction="${options.direction}"` : null,
    `mode="${options.mode}"`,
    `padding="${options.padding}"`,
    `detail-placement="${options.detailPlacement}"`,
    options.colorizeNodes ? 'colorize-nodes' : null,
  ]
    .filter((attr): attr is string => attr !== null)
    .join(' ')

  return `<!-- Works in any framework (or none) — it's a real DOM element once registered. -->
<diagram-kit-view id="diagram" ${attrs}></diagram-kit-view>

<script type="module">
  import '@diagram-kit/element'
  import { createGraph } from '@diagram-kit/core'

  const graph = ${serializeGraphCall(graph)}

  const theme = ${JSON.stringify(options.theme, null, 2)}

  const view = document.getElementById('diagram')
  view.theme = theme
  view.graph = graph
</script>
`
}
