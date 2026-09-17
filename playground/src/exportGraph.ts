function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadSvg(svg: string, filename = 'diagram.svg'): void {
  triggerDownload(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), filename)
}

/**
 * Rasterizes an SVG string to PNG entirely client-side (Image -> canvas ->
 * toBlob). @resvg/resvg-js (used for Node-side PNG export) is a native
 * binding and can't run in a browser, so this is a separate path, not a
 * reuse of @diagram-kit/static's renderPng.
 */
export async function downloadPng(svg: string, scale = 2, filename = 'diagram.png'): Promise<void> {
  const svgUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const image = new Image()
    const loaded = new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('Failed to load SVG for PNG export'))
    })
    image.src = svgUrl
    await loaded

    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth * scale
    canvas.height = image.naturalHeight * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context unavailable')
    ctx.scale(scale, scale)
    ctx.drawImage(image, 0, 0)

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) throw new Error('Canvas failed to produce a PNG blob')
    triggerDownload(blob, filename)
  } finally {
    URL.revokeObjectURL(svgUrl)
  }
}
