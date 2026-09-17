import { describe, expect, it } from 'vitest'
import { generateTheme, defaultTheme, categoryColor, withAlpha } from './theme.js'

describe('generateTheme', () => {
  it('produces both light and dark modes with the requested category count', () => {
    const theme = generateTheme({ categoryCount: 5 })
    expect(theme.light.categories).toHaveLength(5)
    expect(theme.dark.categories).toHaveLength(5)
  })

  it('uses an explicit categories list as-is when provided', () => {
    const colors = ['#111111', '#222222']
    const theme = generateTheme({ categories: colors })
    expect(theme.light.categories).toEqual(colors)
    expect(theme.dark.categories).toEqual(colors)
  })

  it('threads categoryColors through to both modes', () => {
    const theme = generateTheme({ categoryColors: { core: '#abcdef' } })
    expect(theme.light.categoryColors?.core).toBe('#abcdef')
    expect(theme.dark.categoryColors?.core).toBe('#abcdef')
  })

  it('produces different neutral scales for light vs dark by default', () => {
    const theme = generateTheme()
    expect(theme.light.background).not.toBe(theme.dark.background)
  })
})

describe('defaultTheme', () => {
  it('is a valid generated theme', () => {
    expect(defaultTheme.light.categories.length).toBeGreaterThan(0)
    expect(defaultTheme.dark.categories.length).toBeGreaterThan(0)
  })
})

describe('categoryColor', () => {
  it('prefers an explicit categoryColors entry over the hashed fallback', () => {
    const theme = generateTheme({ categoryColors: { core: '#ff00ff' } })
    expect(categoryColor('core', theme, 'light')).toBe('#ff00ff')
  })

  it('falls back to hashing an unregistered category onto the palette', () => {
    const theme = generateTheme({ categories: ['#111111', '#222222'] })
    const color = categoryColor('unregistered-category', theme, 'light')
    expect(theme.light.categories).toContain(color)
  })

  it('is deterministic for the same category string', () => {
    const theme = generateTheme()
    const first = categoryColor('application', theme, 'light')
    const second = categoryColor('application', theme, 'light')
    expect(first).toBe(second)
  })

  it('returns textMuted for an undefined category', () => {
    const theme = generateTheme()
    expect(categoryColor(undefined, theme, 'light')).toBe(theme.light.textMuted)
  })
})

describe('withAlpha', () => {
  it('appends a two-digit alpha hex suffix', () => {
    expect(withAlpha('#3B6EA5', 0.5)).toBe('#3B6EA580')
  })

  it('renders full opacity as ff', () => {
    expect(withAlpha('#000000', 1)).toBe('#000000ff')
  })

  it('renders zero opacity as 00', () => {
    expect(withAlpha('#000000', 0)).toBe('#00000000')
  })
})
