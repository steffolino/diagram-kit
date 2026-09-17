import type { DiagramGraph, DiagramNode, DiagramTheme, LayoutOptions } from '@diagram-kit/core'
import { defaultTheme, themePresets, type ThemePresetName } from '@diagram-kit/core'
import { renderSvg, type LayoutMode, type RenderSvgOptions } from '@diagram-kit/static'

const OBSERVED_ATTRIBUTES = ['layout-mode', 'mode', 'preset', 'padding', 'colorize-nodes', 'direction'] as const

const STYLES = `
  :host { display: block; position: relative; }
  .dk-svg-wrap { width: 100%; height: 100%; overflow: auto; }
  .dk-svg-wrap svg [data-node-id] { cursor: pointer; }
  .dk-panel {
    position: absolute;
    top: 12px;
    right: 12px;
    max-width: 280px;
    background: #fff;
    border: 1px solid #DADCE0;
    border-radius: 8px;
    padding: 12px 30px 12px 14px;
    font: 13px system-ui, sans-serif;
    color: #1F2328;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    display: none;
  }
  .dk-panel.dk-panel-open { display: block; }
  .dk-panel-close {
    position: absolute;
    top: 6px;
    right: 8px;
    border: none;
    background: none;
    cursor: pointer;
    font-size: 14px;
    color: #5B6270;
    padding: 0;
    line-height: 1;
  }
  .dk-panel-title { font-weight: 600; margin: 0 0 4px; }
  .dk-panel-category { font-size: 11px; color: #5B6270; margin: 0 0 6px; }
  .dk-panel-detail { margin: 0; }
`

/**
 * `<diagram-kit-view>` — the framework-agnostic way to embed an interactive
 * diagram-kit graph: works with a plain <script type="module"> import in any
 * app (React, Vue, Angular, or no framework at all), since it's just a DOM
 * element once registered.
 *
 * Usage:
 *   import '@diagram-kit/element'
 *   const el = document.createElement('diagram-kit-view')
 *   el.graph = myGraph
 *   document.body.appendChild(el)
 *
 * Or declaratively, with the graph assigned from a script:
 *   <diagram-kit-view id="view" layout-mode="structural" mode="dark"></diagram-kit-view>
 *   <script type="module">
 *     document.getElementById('view').graph = myGraph
 *   </script>
 */
export class DiagramKitElement extends HTMLElement {
  static get observedAttributes(): readonly string[] {
    return OBSERVED_ATTRIBUTES
  }

  #graph: DiagramGraph | null = null
  #theme: DiagramTheme | null = null
  #wrap: HTMLDivElement
  #panel: HTMLDivElement

  constructor() {
    super()
    const root = this.attachShadow({ mode: 'open' })
    const style = document.createElement('style')
    style.textContent = STYLES
    root.appendChild(style)

    this.#wrap = document.createElement('div')
    this.#wrap.className = 'dk-svg-wrap'
    root.appendChild(this.#wrap)

    this.#panel = document.createElement('div')
    this.#panel.className = 'dk-panel'
    root.appendChild(this.#panel)

    this.#wrap.addEventListener('click', (event) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const nodeGroup = target.closest('[data-node-id]')
      if (!nodeGroup) return
      const nodeId = nodeGroup.getAttribute('data-node-id')
      const node = this.#graph?.nodes.find((n) => n.id === nodeId)
      if (!node) return
      this.#showPanel(node)
      this.dispatchEvent(
        new CustomEvent('node-click', { detail: { nodeId: node.id, node }, bubbles: true, composed: true }),
      )
    })
  }

  connectedCallback(): void {
    this.#render()
  }

  attributeChangedCallback(): void {
    this.#render()
  }

  get graph(): DiagramGraph | null {
    return this.#graph
  }

  set graph(value: DiagramGraph | null) {
    this.#graph = value
    this.#panel.classList.remove('dk-panel-open')
    this.#render()
  }

  get theme(): DiagramTheme | null {
    return this.#theme
  }

  set theme(value: DiagramTheme | null) {
    this.#theme = value
    this.#render()
  }

  #showPanel(node: DiagramNode): void {
    this.#panel.innerHTML = ''

    const close = document.createElement('button')
    close.type = 'button'
    close.className = 'dk-panel-close'
    close.setAttribute('aria-label', 'Close')
    close.textContent = '✕'
    close.addEventListener('click', () => this.#panel.classList.remove('dk-panel-open'))
    this.#panel.appendChild(close)

    const title = document.createElement('p')
    title.className = 'dk-panel-title'
    title.textContent = node.label
    this.#panel.appendChild(title)

    if (node.category) {
      const category = document.createElement('p')
      category.className = 'dk-panel-category'
      category.textContent = node.badge ? `${node.category} · ${node.badge}` : node.category
      this.#panel.appendChild(category)
    }

    if (node.detail) {
      const detail = document.createElement('p')
      detail.className = 'dk-panel-detail'
      detail.textContent = node.detail
      this.#panel.appendChild(detail)
    }

    this.#panel.classList.add('dk-panel-open')
  }

  #render(): void {
    if (!this.#graph) {
      this.#wrap.innerHTML = ''
      return
    }

    const layoutMode = (this.getAttribute('layout-mode') as LayoutMode | null) ?? 'graph'
    const mode = (this.getAttribute('mode') as 'light' | 'dark' | null) ?? 'light'
    const presetName = this.getAttribute('preset') as ThemePresetName | null
    const theme = this.#theme ?? (presetName && themePresets[presetName] ? themePresets[presetName] : defaultTheme)
    const paddingAttr = this.getAttribute('padding')
    const padding = paddingAttr ? Number(paddingAttr) : 24
    const colorizeNodes = this.hasAttribute('colorize-nodes')

    const direction = this.getAttribute('direction') as LayoutOptions['direction'] | null
    const options: RenderSvgOptions = {
      layoutMode,
      theme,
      mode,
      padding,
      colorizeNodes,
      layout: direction ? { direction } : undefined,
    }
    this.#wrap.innerHTML = renderSvg(this.#graph, options)
  }
}

/** Registers `<diagram-kit-view>` (or a custom tag name) as a Custom Element. Safe to call more than once. */
export function defineDiagramKitElement(tagName = 'diagram-kit-view'): void {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, DiagramKitElement)
  }
}

defineDiagramKitElement()
