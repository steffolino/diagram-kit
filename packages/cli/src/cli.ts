#!/usr/bin/env node
import { existsSync, statSync, writeFileSync } from 'node:fs'
import { Command } from 'commander'
import type { ThemePresetName } from '@diagram-kit/core'
import { themePresets } from '@diagram-kit/core'
import { CliError, detectFormat, parseGraph, renderGraph, type InputFormat } from './render.js'

const program = new Command()

program
  .name('diagram-kit')
  .description('Render a diagram-kit graph (YAML, JSON, Mermaid, tree text, or a directory) to SVG or PNG.')
  .version('0.1.0')

program
  .command('render')
  .description('Render an input file (or directory) to an SVG or PNG diagram.')
  .argument('<input>', 'path to a YAML/JSON/Mermaid/tree-text file, or a directory')
  .requiredOption('-o, --out <file>', 'output path, ending in .svg or .png')
  .option('-f, --format <format>', 'input format: yaml, json, mermaid, tree, directory (auto-detected when omitted)')
  .option('-l, --layout <mode>', 'layout mode: graph, structural, stack', 'graph')
  .option('--direction <direction>', 'graph layout direction: TB, BT, LR, RL')
  .option('--node-sizing <mode>', 'responsive (grow to fit label) or fixed (truncate with ellipsis)')
  .option('--preset <name>', `theme preset: ${Object.keys(themePresets).join(', ')}`)
  .option('--mode <mode>', 'light or dark', 'light')
  .option('--padding <px>', 'margin around the diagram, in pixels', '24')
  .option('--colorize-nodes', 'tint entity backgrounds with their category color, not just an accent dot')
  .option('--scale <n>', 'PNG output pixel scale', '2')
  .action((input: string, opts) => {
    try {
      const isDirectory = existsSync(input) && statSync(input).isDirectory()
      const format = (opts.format as InputFormat | undefined) ?? detectFormat(input, isDirectory)
      if (!format) {
        throw new CliError(
          `Could not detect the input format for "${input}". Pass --format explicitly (yaml, json, mermaid, tree, directory).`,
        )
      }

      const graph = parseGraph(format, input)
      const output = renderGraph(graph, opts.out as string, {
        layoutMode: opts.layout,
        direction: opts.direction,
        nodeSizing: opts.nodeSizing,
        preset: opts.preset as ThemePresetName | undefined,
        mode: opts.mode,
        padding: Number(opts.padding),
        colorizeNodes: Boolean(opts.colorizeNodes),
        scale: Number(opts.scale),
      })

      writeFileSync(opts.out as string, output)
      console.log(`Wrote ${opts.out}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`Error: ${message}`)
      process.exitCode = 1
    }
  })

program.parse()
