import { describe, expect, it } from 'vitest'
import { themePresets } from './presets.js'

describe('themePresets', () => {
  it('every preset has both light and dark modes with at least one category', () => {
    for (const [name, theme] of Object.entries(themePresets)) {
      expect(theme.light.categories.length, `${name}.light.categories`).toBeGreaterThan(0)
      expect(theme.dark.categories.length, `${name}.dark.categories`).toBeGreaterThan(0)
      expect(theme.light.background, `${name}.light.background`).toBeTruthy()
      expect(theme.dark.background, `${name}.dark.background`).toBeTruthy()
    }
  })

  it('every preset defines the conventional category names both adapters/samples rely on', () => {
    const conventional = ['presentation', 'application', 'infrastructure', 'core', 'external']
    for (const [name, theme] of Object.entries(themePresets)) {
      for (const category of conventional) {
        expect(theme.light.categoryColors?.[category], `${name}.light.categoryColors.${category}`).toBeTruthy()
      }
    }
  })

  it('the dracula preset uses the real published Dracula background color', () => {
    expect(themePresets.dracula.dark.background).toBe('#282a36')
  })
})
