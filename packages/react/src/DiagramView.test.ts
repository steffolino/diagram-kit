// @vitest-environment happy-dom
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createGraph } from '@steffolino/diagram-kit-core'
import { DiagramView } from './DiagramView.js'

describe('DiagramView padding', () => {
  it.each(['graph', 'structural', 'stack', 'cycle'] as const)('includes padding in the glass canvas for %s layout', (layoutMode) => {
    const graph = createGraph([{ id: 'a', label: 'API' }])
    const render = (padding: number) => {
      const host = document.createElement('div')
      host.innerHTML = renderToStaticMarkup(createElement(DiagramView, { graph, layoutMode, glass: true, padding }))
      return host.firstElementChild as HTMLElement
    }
    const plain = render(0)
    const padded = render(80)
    expect(parseFloat(padded.style.width) - parseFloat(plain.style.width)).toBe(160)
    expect(parseFloat(padded.style.height) - parseFloat(plain.style.height)).toBe(160)
    expect(padded.getAttribute('style')).toContain('radial-gradient')
    const content = padded.firstElementChild as HTMLElement
    expect(content.style.left).toBe('80px')
    expect(content.style.top).toBe('80px')
    expect(content.style.background).toBe('')
  })
  it.each(['graph', 'structural', 'stack', 'cycle'] as const)('shows inline descriptions only when selected in %s layout', (layoutMode) => {
    const graph = createGraph([{ id: 'a', label: 'API', detail: 'Private description' }])
    const panel = renderToStaticMarkup(createElement(DiagramView, { graph, layoutMode }))
    const inline = renderToStaticMarkup(createElement(DiagramView, { graph, layoutMode, detailPlacement: 'inline' }))
    expect(panel).not.toContain('Private description')
    expect(inline).toContain('Private description')
    expect(inline.indexOf('API')).toBeLessThan(inline.indexOf('Private description'))
  })
})
