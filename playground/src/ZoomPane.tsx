import { useEffect, useLayoutEffect, useRef, useState, type JSX, type ReactNode } from 'react'

interface ZoomPaneProps {
  children: ReactNode
  background?: string
  /**
   * Values that change whenever the wrapped diagram's own intrinsic size
   * might have changed (new graph, layout mode, direction, padding, detail
   * placement, ...) — triggers a re-measure and an automatic re-fit to the
   * viewport, so the diagram always opens as large as the screen allows
   * instead of sitting at its raw pixel size in the corner.
   */
  fitDeps: readonly unknown[]
}

const MIN_SCALE = 0.1
const MAX_SCALE = 5
const FIT_MARGIN = 24
const ZOOM_STEP = 1.25

const zoomButtonStyle = {
  width: 28,
  height: 28,
  fontSize: 16,
  lineHeight: 1,
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  borderRadius: 4,
  color: '#1F2328',
} as const

function clampScale(value: number): number {
  return Math.max(MIN_SCALE, Math.min(value, MAX_SCALE))
}

/**
 * Scrollable, zoomable viewport around a diagram whose real size is only
 * known once it's rendered (DiagramView sizes itself to its own layout, not
 * to its container). Measures that intrinsic size via a ref, fits it to the
 * available viewport by default, and offers +/- controls plus native
 * scroll/touch panning once zoomed past the fit.
 */
export function ZoomPane({ children, background, fitDeps }: ZoomPaneProps): JSX.Element {
  const viewportRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const naturalSizeRef = useRef({ width: 0, height: 0 })
  // Tracks whether the person has zoomed by hand since the last content
  // change — a manual zoom level should survive a window resize rather than
  // snapping back to "fit" underneath them.
  const manualRef = useRef(false)
  const [scale, setScale] = useState(1)
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 })

  function fitScaleFor(viewportWidth: number, viewportHeight: number): number {
    const { width, height } = naturalSizeRef.current
    if (width === 0 || height === 0 || viewportWidth === 0 || viewportHeight === 0) return 1
    const fit = Math.min((viewportWidth - FIT_MARGIN * 2) / width, (viewportHeight - FIT_MARGIN * 2) / height)
    return clampScale(fit)
  }

  // Re-measure the wrapped diagram's unscaled size whenever it might have
  // changed, and fit it to the viewport. useLayoutEffect (rather than
  // useEffect) so the fit is applied before the browser paints — otherwise
  // the diagram would flash at its raw size for a frame first.
  useLayoutEffect(() => {
    const content = contentRef.current
    const viewport = viewportRef.current
    if (!content || !viewport) return
    naturalSizeRef.current = { width: content.offsetWidth, height: content.offsetHeight }
    const size = { width: viewport.clientWidth, height: viewport.clientHeight }
    setViewportSize(size)
    manualRef.current = false
    setScale(fitScaleFor(size.width, size.height))
    // fitDeps is an intentionally dynamic dependency list supplied by the caller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, fitDeps)

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const { width, height } = entry.contentRect
      setViewportSize({ width, height })
      if (!manualRef.current) setScale(fitScaleFor(width, height))
    })
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [])

  function zoomBy(factor: number): void {
    manualRef.current = true
    setScale((current) => clampScale(current * factor))
  }

  function resetZoom(): void {
    manualRef.current = false
    setScale(fitScaleFor(viewportSize.width, viewportSize.height))
  }

  const sizerWidth = naturalSizeRef.current.width * scale
  const sizerHeight = naturalSizeRef.current.height * scale
  // Centers the diagram when it's smaller than the viewport; drops to zero
  // (plain top-left anchoring, scrollable) once it's zoomed past that, so
  // there's no fighting with the browser's own scroll handling.
  const marginLeft = Math.max(0, (viewportSize.width - sizerWidth) / 2)
  const marginTop = Math.max(0, (viewportSize.height - sizerHeight) / 2)

  return (
    <div ref={viewportRef} style={{ position: 'relative', flex: 1, overflow: 'auto', background }}>
      <div style={{ width: sizerWidth, height: sizerHeight, marginLeft, marginTop }}>
        <div ref={contentRef} style={{ display: 'inline-block', transform: `scale(${scale})`, transformOrigin: '0 0' }}>
          {children}
        </div>
      </div>

      <div
        style={{
          position: 'fixed',
          right: 16,
          bottom: 16,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: 4,
          background: '#fff',
          border: '1px solid #DADCE0',
          borderRadius: 8,
          boxShadow: '0 1px 6px rgba(0,0,0,0.15)',
        }}
      >
        <button type="button" onClick={() => zoomBy(1 / ZOOM_STEP)} aria-label="Zoom out" style={zoomButtonStyle}>
          −
        </button>
        <button type="button" onClick={resetZoom} aria-label="Fit to screen" style={{ ...zoomButtonStyle, width: 52, fontSize: 11 }}>
          {Math.round(scale * 100)}%
        </button>
        <button type="button" onClick={() => zoomBy(ZOOM_STEP)} aria-label="Zoom in" style={zoomButtonStyle}>
          +
        </button>
      </div>
    </div>
  )
}
