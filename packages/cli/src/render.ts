import { readFileSync } from 'node:fs'
import { extname } from 'node:path'
import type { DiagramGraph, LayoutOptions, ThemePresetName } from '@diagram-kit/core'
import { themePresets, defaultTheme } from '@diagram-kit/core'
import { fromYaml, fromJson, fromMermaid, fromTreeText } from '@diagram-kit/adapters'
import { fromDirectory } from '@diagram-kit/adapters/directory'
import { renderSvg, type LayoutMode, type RenderSvgOptions } from '@diagram-kit/static'
import { renderPng } from '@diagram-kit/static/png'

export type InputFormat = 'yaml' | 'json' | 'mermaid' | 'tree' | 'directory'

const EXTENSION_FORMATS: Record<string, InputFormat> = {
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.json': 'json',
  '.mmd': 'mermaid',
  '.mermaid': 'mermaid',
}

export class CliError extends Error {}

/** Guesses the input format from a path's extension, or "directory" if it names a real directory. Returns null when it can't be determined — callers should require an explicit --format in that case. */
export function detectFormat(inputPath: string, isDirectory: boolean): InputFormat | null {
  if (isDirectory) return 'directory'
  const ext = extname(inputPath).toLowerCase()
  return EXTENSION_FORMATS[ext] ?? null
}

export function parseGraph(format: InputFormat, inputPath: string): DiagramGraph {
  if (format === 'directory') return fromDirectory(inputPath)

  const source = readFileSync(inputPath, 'utf-8')
  switch (format) {
    case 'yaml':
      return fromYaml(source)
    case 'json':
      return fromJson(source)
    case 'mermaid':
      return fromMermaid(source)
    case 'tree':
      return fromTreeText(source)
  }
}

export interface RenderOptions {
  layoutMode?: LayoutMode
  direction?: LayoutOptions['direction']
  nodeSizing?: LayoutOptions['nodeSizing']
  preset?: ThemePresetName
  mode?: 'light' | 'dark'
  padding?: number
  colorizeNodes?: boolean
  glass?: boolean
  scale?: number
}

function toSvgOptions(options: RenderOptions): RenderSvgOptions {
  const theme = options.preset ? themePresets[options.preset] : defaultTheme
  if (options.preset && !theme) {
    throw new CliError(
      `Unknown preset "${options.preset}". Available: ${Object.keys(themePresets).join(', ')}`,
    )
  }
  return {
    layoutMode: options.layoutMode ?? 'graph',
    layout: { direction: options.direction, nodeSizing: options.nodeSizing },
    theme,
    mode: options.mode ?? 'light',
    padding: options.padding ?? 24,
    colorizeNodes: options.colorizeNodes ?? false,
    glass: options.glass ?? false,
  }
}

/** Renders a graph to an SVG string or PNG buffer depending on the output file's extension. */
export function renderGraph(graph: DiagramGraph, outPath: string, options: RenderOptions = {}): string | Buffer {
  const svgOptions = toSvgOptions(options)
  const ext = extname(outPath).toLowerCase()
  if (ext === '.png') return renderPng(graph, { ...svgOptions, scale: options.scale ?? 2 })
  if (ext === '.svg') return renderSvg(graph, svgOptions)
  throw new CliError(`Unsupported output extension "${ext}" — use a .svg or .png file.`)
}
