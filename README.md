# diagram-kit

MIT-licensed library for generating technical diagrams — architecture maps,
entity-relationship diagrams, directory structures — from real inputs
(YAML specs, a directory tree, Mermaid syntax, or a source-code AST
manifest), rendered either as an interactive embeddable React component or
exported as a static SVG/PNG for slides.

## Packages

| Package | Purpose |
|---|---|
| [`@diagram-kit/core`](packages/core) | Normalized `{ nodes, edges }` graph model, `dagre`-based auto-layout, and light/dark theme tokens. Everything else depends on this, nothing here depends on React or the DOM. |
| [`@diagram-kit/adapters`](packages/adapters) | Turns an input format into a `DiagramGraph`: `fromYaml`, `fromMermaid`, `fromArchitectureLandscape` (browser-safe, package root) and `fromDirectory` (Node-only, `@diagram-kit/adapters/directory`). |
| [`@diagram-kit/react`](packages/react) | `<DiagramView />` — interactive renderer: auto-layout positions, click-to-select detail panel. |
| [`@diagram-kit/static`](packages/static) | Headless `renderSvg` / `renderPng` for slide decks, via `@resvg/resvg-js` (prebuilt bindings, no native build step). |
| `playground` | Vite + React app for manually exercising `@diagram-kit/react` during development. |

## Design notes

- **One layout, two outputs.** `layoutGraph` (dagre) runs once; the React
  renderer and the static SVG renderer both consume the same
  `PositionedGraph`, so an embedded diagram and its slide-deck export stay
  visually consistent.
- **Real auto-layout, not hand-picked coordinates.** Earlier hand-built
  diagrams in other projects used fixed percentage positions per node,
  which doesn't scale past a handful of hand-placed nodes or survive a
  changing node count. diagram-kit computes positions from the graph
  itself.
- **Categories are open-ended, not a fixed enum.** `DiagramNode.category`
  is any string; `categoryColor` hashes it onto a palette slot instead of
  requiring a hardcoded set of theme classes.
- **Not Mermaid's default styling.** `fromMermaid` parses a Mermaid
  flowchart *subset* into the normalized graph specifically so it can be
  re-rendered with diagram-kit's own layout and theme — the point is
  escaping Mermaid's default renderer, not reimplementing it.
- **The AST adapter is a consumer, not an extractor.** `fromArchitectureLandscape`
  takes the JSON shape a `Python ast`-module walker (aggregates/routes/adapters/
  external systems per bounded context, plus real cross-context import edges)
  would produce, and normalizes it. Writing a generic TypeScript/Python AST
  walker shipped with this repo is future work, not yet built.

## Usage

```ts
import { fromYaml } from '@diagram-kit/adapters'
import { DiagramView } from '@diagram-kit/react'

const graph = fromYaml(yamlSource)

function Diagram() {
  return <DiagramView graph={graph} layout={{ direction: 'TB' }} />
}
```

```ts
import { fromYaml } from '@diagram-kit/adapters'
import { renderPng } from '@diagram-kit/static'

const png = renderPng(fromYaml(yamlSource), { scale: 2 })
```

## Development

Descriptions can appear beneath entity titles with
`<DiagramView detailPlacement="inline" ... />`, or in the click-to-open panel
with `detailPlacement="panel"` (the default). Inline descriptions wrap and
expand their boxes in every layout, including nested containers. Use the same
`detailPlacement` option with `renderSvg` / `renderPng`, or the
`detail-placement="inline"` attribute on `<diagram-kit-view>`. The playground's
**Description placement** control also updates downloads and code snippets.

The Scrum sample defaults to the landscape, left-to-right `cycle` layout:
backlog and planning feed a large Sprint loop, with a smaller Daily Scrum loop
and finished work to the right. There are no person icons. In cycle mode, the
first self-edge defines the main repeat loop and other self-edges define the
smaller loops. Input and output steps follow their order in the source. Graphs
without a self-edge fall back to a left-to-right graph layout.

```sh
pnpm install
pnpm build           # builds core, adapters, react, static in dependency order
pnpm --filter @diagram-kit/playground dev
```

## Cloudflare Workers

Use `playground` as the root directory, `pnpm run build` as the build command,
and `npx wrangler deploy` as the deploy command. The committed
`playground/wrangler.jsonc` serves `dist` as static assets with SPA fallback.
Its Worker name is `diagram-kit`; keep it in sync with the Cloudflare project.

The explicit Wrangler configuration avoids automatic framework setup, which
can select npm inside this pnpm workspace and fail on `workspace:*` dependencies.

## Cloudflare Pages

Use `playground` as the root directory, `pnpm run build` as the build command,
and `dist` as the build output directory. The playground build compiles its
workspace dependencies before type-checking and bundling the app, so it also
works on a fresh checkout without existing package `dist` folders.

The GitHub Pages workflow in `.github/workflows/deploy-playground.yml` is
separate from Cloudflare's build configuration.
