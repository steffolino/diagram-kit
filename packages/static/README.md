# @diagram-kit/static

Headless SVG/PNG export for `@diagram-kit/core` graphs — for slides and
presentations, not embedding. Uses `@resvg/resvg-js` (prebuilt native
bindings, no local build toolchain needed).

```ts
import { fromYaml } from '@diagram-kit/adapters'
import { renderSvg } from '@diagram-kit/static'
// Node-only, at a separate subpath — depends on a native (napi) binding
// and must never end up in a browser bundle:
import { renderPng } from '@diagram-kit/static/png'

const graph = fromYaml(yamlSource)
const svg = renderSvg(graph)
const png = renderPng(graph, { scale: 2 })
```

In a browser, use `renderSvg` (pure string building, no dependencies on the
DOM or Node) and rasterize to PNG yourself via an offscreen `<canvas>` if
needed — `@resvg/resvg-js` cannot run client-side.

Part of the diagram-kit monorepo. See the repo root README for the full
picture.
