# @diagram-kit/element

`<diagram-kit-view>` — the framework-agnostic way to embed an interactive
diagram-kit graph. It's a real Custom Element (Web Component), so it works
with a plain `<script type="module">` import in React, Vue, Angular, or no
framework at all.

```ts
import '@diagram-kit/element'
import { fromYaml } from '@diagram-kit/adapters'

const graph = fromYaml(yamlSource)
const el = document.createElement('diagram-kit-view')
el.graph = graph
document.body.appendChild(el)
```

Or declaratively, with the graph assigned from a script:

```html
<diagram-kit-view id="view" layout-mode="structural" mode="dark"></diagram-kit-view>
<script type="module">
  import '@diagram-kit/element'
  document.getElementById('view').graph = myGraph
</script>
```

Renders via `@diagram-kit/static`'s `renderSvg` (no React dependency), and
supports the same `layout-mode`, `mode`, `preset`, `padding`,
`colorize-nodes`, `direction`, and `detail-placement` attributes as the
React `<DiagramView />`'s equivalent props.

Part of the diagram-kit monorepo. See the repo root README for the full
picture.
