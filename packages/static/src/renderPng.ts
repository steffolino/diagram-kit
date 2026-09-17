import { Resvg } from '@resvg/resvg-js'
import type { DiagramGraph } from '@steffolino/diagram-kit-core'
import { renderSvg, type RenderSvgOptions } from './renderSvg.js'

export interface RenderPngOptions extends RenderSvgOptions {
  /** Output pixel scale (2 = @2x for retina slides). Default 2. */
  scale?: number
}

/** Renders a graph straight to a PNG buffer via resvg (prebuilt native binding, no local build toolchain needed). */
export function renderPng(graph: DiagramGraph, options: RenderPngOptions = {}): Buffer {
  const { scale = 2, ...svgOptions } = options
  const svg = renderSvg(graph, svgOptions)
  const resvg = new Resvg(svg, { fitTo: { mode: 'zoom', value: scale } })
  return resvg.render().asPng()
}
