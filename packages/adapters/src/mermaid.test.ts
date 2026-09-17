import { describe, expect, it } from 'vitest'
import { fromMermaid } from './mermaid.js'

describe('fromMermaid', () => {
  it('parses a basic flowchart with shaped nodes', () => {
    const graph = fromMermaid('flowchart TD\n  A[API] --> B[Database]\n')
    expect(graph.nodes).toHaveLength(2)
    expect(graph.nodes.find((n) => n.id === 'A')?.label).toBe('API')
    expect(graph.edges).toHaveLength(1)
    expect(graph.edges[0]).toMatchObject({ source: 'A', target: 'B' })
  })

  it('parses an edge label written as -->|label|', () => {
    const graph = fromMermaid('flowchart TD\n  A --> |calls| B\n')
    expect(graph.edges[0]?.label).toBe('calls')
  })

  it('parses an inline-label edge written as -- label -->', () => {
    const graph = fromMermaid('flowchart TD\n  A -- calls --> B\n')
    expect(graph.edges[0]?.label).toBe('calls')
  })

  it('infers bare node ids with no explicit shape', () => {
    const graph = fromMermaid('flowchart TD\n  A --> B\n')
    expect(graph.nodes.find((n) => n.id === 'A')?.label).toBe('A')
  })

  it('ignores comments and directives it does not support', () => {
    const graph = fromMermaid('flowchart TD\n  %% a comment\n  classDef foo fill:#fff\n  A --> B\n')
    expect(graph.nodes).toHaveLength(2)
  })

  it('reuses an existing node rather than duplicating it', () => {
    const graph = fromMermaid('flowchart TD\n  A[API] --> B\n  A --> C\n')
    expect(graph.nodes.filter((n) => n.id === 'A')).toHaveLength(1)
  })
})
