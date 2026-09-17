import { parse } from 'yaml'
import type { DiagramGraph } from '@diagram-kit/core'
import { type GraphSpec, graphFromSpec } from './graphSpec.js'

/**
 * Hand-authored graph spec, e.g.:
 *
 * ```yaml
 * nodes:
 *   - id: api
 *     label: API
 *     category: presentation
 *   - id: domain
 *     label: Domain
 *     category: core
 * edges:
 *   - from: api
 *     to: domain
 *     label: calls
 * ```
 */
export type YamlGraphSpec = GraphSpec

export function fromYaml(source: string): DiagramGraph {
  const spec = parse(source) as GraphSpec
  return graphFromSpec(spec, 'YAML')
}
