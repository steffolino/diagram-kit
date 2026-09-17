// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import { createGraph } from '@diagram-kit/core'
import { DiagramKitElement, defineDiagramKitElement } from './index.js'

const graph = createGraph(
  [
    { id: 'a', label: 'A', category: 'core', detail: 'Node A detail' },
    { id: 'b', label: 'B', category: 'external' },
  ],
  [{ id: 'a->b', source: 'a', target: 'b', label: 'calls' }],
)

describe('DiagramKitElement', () => {
  beforeEach(() => {
    defineDiagramKitElement()
  })

  it('registers as a custom element under the default tag name', () => {
    expect(customElements.get('diagram-kit-view')).toBe(DiagramKitElement)
  })

  it('renders nothing until a graph is assigned', () => {
    const el = document.createElement('diagram-kit-view') as DiagramKitElement
    document.body.appendChild(el)
    expect(el.shadowRoot?.querySelector('svg')).toBeNull()
    el.remove()
  })

  it('renders an SVG with a data-node-id group per node once a graph is assigned', () => {
    const el = document.createElement('diagram-kit-view') as DiagramKitElement
    document.body.appendChild(el)
    el.graph = graph
    expect(el.shadowRoot?.querySelector('svg')).not.toBeNull()
    expect(el.shadowRoot?.querySelectorAll('[data-node-id]').length).toBe(2)
    el.remove()
  })

  it('applies the direction attribute to graph-mode layout', () => {
    const wide = document.createElement('diagram-kit-view') as DiagramKitElement
    wide.setAttribute('direction', 'LR')
    document.body.appendChild(wide)
    wide.graph = graph
    const wideWidth = Number(wide.shadowRoot!.querySelector('svg')!.getAttribute('width'))

    const tall = document.createElement('diagram-kit-view') as DiagramKitElement
    tall.setAttribute('direction', 'TB')
    document.body.appendChild(tall)
    tall.graph = graph
    const tallWidth = Number(tall.shadowRoot!.querySelector('svg')!.getAttribute('width'))

    expect(wideWidth).toBeGreaterThan(tallWidth)
    wide.remove()
    tall.remove()
  })

  it('re-renders when an observed attribute changes', () => {
    const el = document.createElement('diagram-kit-view') as DiagramKitElement
    document.body.appendChild(el)
    el.graph = graph
    el.setAttribute('layout-mode', 'stack')
    expect(el.shadowRoot?.querySelector('svg')).not.toBeNull()
    el.remove()
  })

  it('opens a detail panel and dispatches node-click when a node is clicked', () => {
    const el = document.createElement('diagram-kit-view') as DiagramKitElement
    document.body.appendChild(el)
    el.graph = graph

    let receivedNodeId: string | undefined
    el.addEventListener('node-click', (event) => {
      receivedNodeId = (event as CustomEvent).detail.nodeId
    })

    const group = el.shadowRoot!.querySelector('[data-node-id="a"]')!
    group.dispatchEvent(new Event('click', { bubbles: true }))

    expect(receivedNodeId).toBe('a')
    const panel = el.shadowRoot!.querySelector('.dk-panel')!
    expect(panel.classList.contains('dk-panel-open')).toBe(true)
    expect(panel.textContent).toContain('A')
    expect(panel.textContent).toContain('Node A detail')
    el.remove()
  })

  it('closes the detail panel when the close button is clicked', () => {
    const el = document.createElement('diagram-kit-view') as DiagramKitElement
    document.body.appendChild(el)
    el.graph = graph

    const group = el.shadowRoot!.querySelector('[data-node-id="a"]')!
    group.dispatchEvent(new Event('click', { bubbles: true }))
    const panel = el.shadowRoot!.querySelector('.dk-panel')!
    expect(panel.classList.contains('dk-panel-open')).toBe(true)

    const closeButton = el.shadowRoot!.querySelector('.dk-panel-close')!
    closeButton.dispatchEvent(new Event('click', { bubbles: true }))
    expect(panel.classList.contains('dk-panel-open')).toBe(false)
    el.remove()
  })
})
