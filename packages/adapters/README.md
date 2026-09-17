# @diagram-kit/adapters

Turns an input format into a `@diagram-kit/core` `DiagramGraph`.

```ts
import { fromYaml, fromMermaid, fromArchitectureLandscape } from '@diagram-kit/adapters'
// Node-only, at a separate subpath so browser bundles never pull in node:fs:
import { fromDirectory } from '@diagram-kit/adapters/directory'
```

- `fromYaml(source)` — hand-authored `{ nodes, edges }` YAML spec.
- `fromMermaid(source)` — a subset of Mermaid flowchart/graph syntax.
- `fromArchitectureLandscape(manifest)` — normalizes the JSON shape produced
  by an external `ast`-module walker (bounded contexts, aggregates, routes,
  cross-context import edges).
- `fromDirectory(rootPath, options)` — walks a directory tree into a
  containment graph. Node-only.

Part of the diagram-kit monorepo. See the repo root README for the full
picture.
