import type { DiagramGraph } from '@steffolino/diagram-kit-core'
import { type GraphSpec, graphFromSpec } from './graphSpec.js'

/**
 * Same spec shape as `fromYaml`, just JSON instead of YAML:
 *
 * ```json
 * {
 *   "nodes": [
 *     { "id": "api", "label": "API", "category": "presentation" },
 *     { "id": "domain", "label": "Domain", "category": "core" }
 *   ],
 *   "edges": [{ "from": "api", "to": "domain", "label": "calls" }]
 * }
 * ```
 *
 * A separate adapter (rather than routing JSON through `fromYaml`'s YAML
 * parser, which happens to accept JSON as a subset) so a malformed-JSON
 * error reads as a JSON syntax error, not a confusing YAML one.
 */
export type JsonGraphSpec = GraphSpec

export function fromJson(source: string): DiagramGraph {
  let spec: GraphSpec
  try {
    spec = JSON.parse(source) as GraphSpec
  } catch (e) {
    throw new Error(`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`)
  }
  return graphFromSpec(spec, 'JSON')
}
