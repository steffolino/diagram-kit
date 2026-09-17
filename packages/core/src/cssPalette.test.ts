import { describe, expect, it } from 'vitest'
import { extractCssColors } from './cssPalette.js'

describe('extractCssColors', () => {
  it('extracts hex custom properties from :root CSS', () => {
    const result = extractCssColors(':root { --brand: #3b82f6; --accent: #f43f5e; }')
    expect(result).toEqual([
      { name: 'brand', value: '#3b82f6' },
      { name: 'accent', value: '#f43f5e' },
    ])
  })

  it('extracts colors from a Tailwind v4 @theme block, including oklch()', () => {
    const result = extractCssColors('@theme { --color-primary-500: oklch(0.6 0.15 250); --font-sans: "Inter"; }')
    expect(result).toEqual([{ name: 'color-primary-500', value: 'oklch(0.6 0.15 250)' }])
  })

  it('ignores non-color custom properties like spacing and fonts', () => {
    const result = extractCssColors('--spacing-4: 1rem; --radius: 8px; --font-sans: "Inter", sans-serif;')
    expect(result).toEqual([])
  })

  it('extracts colors from a JS/TS object literal (tailwind.config colors block)', () => {
    const result = extractCssColors(`colors: { primary: '#3b82f6', secondary: "#f43f5e" }`)
    expect(result).toEqual([
      { name: 'primary', value: '#3b82f6' },
      { name: 'secondary', value: '#f43f5e' },
    ])
  })

  it('deduplicates by name, keeping the first occurrence', () => {
    const result = extractCssColors('--brand: #111111; --brand: #222222;')
    expect(result).toEqual([{ name: 'brand', value: '#111111' }])
  })

  it('returns an empty array for input with no colors', () => {
    expect(extractCssColors('body { margin: 0; padding: 8px; }')).toEqual([])
  })
})
