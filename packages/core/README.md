# @steffolino/diagram-kit-core

[![npm](https://img.shields.io/npm/v/@steffolino/diagram-kit-core.svg)](https://www.npmjs.com/package/@steffolino/diagram-kit-core)
[![license](https://img.shields.io/npm/l/@steffolino/diagram-kit-core.svg)](../../LICENSE)

Normalized `{ nodes, edges }` graph model, `dagre`-based auto-layout, and
light/dark theme tokens shared by every diagram-kit renderer and adapter.
Framework-agnostic — no React, no DOM.

```ts
import { createGraph, layoutGraph, defaultTheme } from '@steffolino/diagram-kit-core'

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
