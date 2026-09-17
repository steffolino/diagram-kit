// Browser-safe: pure string building, no native bindings. `renderPng` lives
// at the "@diagram-kit/static/png" subpath instead — it depends on
// @resvg/resvg-js, a native (napi) binding that only runs in Node, so it
// must never end up in a browser bundle imported off this root.
export { renderSvg } from './renderSvg.js'
export type { RenderSvgOptions, LayoutMode } from './renderSvg.js'
