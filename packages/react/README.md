# @diagram-kit/react

Interactive React renderer for `@diagram-kit/core` graphs: real `dagre`
auto-layout, click-to-select detail panel.

```tsx
import { fromYaml } from '@diagram-kit/adapters'
import { DiagramView } from '@diagram-kit/react'

const graph = fromYaml(yamlSource)

function Diagram() {
  return <DiagramView graph={graph} layout={{ direction: 'TB' }} />
}
```

Requires `react`/`react-dom` ^18 or ^19 as peer dependencies.

Part of the diagram-kit monorepo. See the repo root README for the full
picture.
