# @steffolino/diagram-kit-element

[![npm](https://img.shields.io/npm/v/@steffolino/diagram-kit-element.svg)](https://www.npmjs.com/package/@steffolino/diagram-kit-element)
[![license](https://img.shields.io/npm/l/@steffolino/diagram-kit-element.svg)](../../LICENSE)

`<diagram-kit-view>` — the framework-agnostic way to embed an interactive
diagram-kit graph. It's a real Custom Element (Web Component), so it works
with a plain `<script type="module">` import in React, Vue, Angular, or no
framework at all.

```ts
import '@steffolino/diagram-kit-element'
import { fromYaml } from '@steffolino/diagram-kit-adapters'

const graph = fromYaml(yamlSource)
const el = document.createElement('diagram-kit-view')
el.graph = graph
document.body.appendChild(el)
```

Or declaratively, with the graph assigned from a script:

```html
<diagram-kit-view id="view" layout-mode="structural" mode="dark"></diagram-kit-view>
<script type="module">
  import '@steffolino/diagram-kit-element'
  document.getElementById('view').graph = myGraph
</script>
```

Renders via `@steffolino/diagram-kit-static`'s `renderSvg` (no React dependency), and
supports the same `layout-mode`, `mode`, `preset`, `padding`,
`colorize-nodes`, `direction`, and `detail-placement` attributes as the
React `<DiagramView />`'s equivalent props.

Part of the diagram-kit monorepo. See the repo root README for the full
picture.
