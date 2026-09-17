# @steffolino/diagram-kit-react

[![npm](https://img.shields.io/npm/v/@steffolino/diagram-kit-react.svg)](https://www.npmjs.com/package/@steffolino/diagram-kit-react)
[![license](https://img.shields.io/npm/l/@steffolino/diagram-kit-react.svg)](../../LICENSE)

Interactive React renderer for `@steffolino/diagram-kit-core` graphs: real `dagre`
auto-layout, click-to-select detail panel.

```tsx
import { fromYaml } from '@steffolino/diagram-kit-adapters'
import { DiagramView } from '@steffolino/diagram-kit-react'

const graph = fromYaml(yamlSource)

function Diagram() {
  return <DiagramView graph={graph} layout={{ direction: 'TB' }} />
}
```

Requires `react`/`react-dom` ^18 or ^19 as peer dependencies.

Part of the diagram-kit monorepo. See the repo root README for the full
picture.
