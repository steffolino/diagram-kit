# @diagram-kit/core

Normalized `{ nodes, edges }` graph model, `dagre`-based auto-layout, and
light/dark theme tokens shared by every diagram-kit renderer and adapter.
Framework-agnostic — no React, no DOM.

```ts
import { createGraph, layoutGraph, defaultTheme } from '@diagram-kit/core'

const graph = createGraph(
  [
    { id: 'api', label: 'API', category: 'presentation' },
    { id: 'domain', label: 'Domain', category: 'core' },
  ],
  [{ id: 'api->domain', source: 'api', target: 'domain' }],
)

const positioned = layoutGraph(graph, { direction: 'TB' })
```

Part of the diagram-kit monorepo. See the repo root README for the full
picture (adapters, React renderer, static export).
