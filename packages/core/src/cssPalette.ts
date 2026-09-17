export interface ExtractedColor {
  name: string
  value: string
}

const COLOR_VALUE = /^(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\)|oklch\([^)]*\)|oklab\([^)]*\)|lch\([^)]*\)|lab\([^)]*\))$/

function isColorValue(value: string): boolean {
  return COLOR_VALUE.test(value.trim())
}

/**
 * Pulls color values out of pasted CSS or a Tailwind-style JS/TS object —
 * CSS custom properties (`--brand-500: #3b82f6;`, including Tailwind v4's
 * `@theme { --color-primary: oklch(...); }`) and simple
 * `key: '#hex'` object entries (a `tailwind.config.js` `colors: { ... }`
 * block, or any similar JS/TS object literal). Deliberately not a full CSS
 * or JS parser — just regex over color-shaped values, so it works on a
 * pasted fragment without needing complete, valid syntax around it.
 */
export function extractCssColors(source: string): ExtractedColor[] {
  const results: ExtractedColor[] = []
  const seen = new Set<string>()

  const cssVarPattern = /--([\w-]+)\s*:\s*([^;]+);/g
  for (const match of source.matchAll(cssVarPattern)) {
    const name = match[1]!
    const value = match[2]!.trim()
    if (isColorValue(value) && !seen.has(name)) {
      results.push({ name, value })
      seen.add(name)
    }
  }

  const jsObjectPattern = /['"]?([\w-]+)['"]?\s*:\s*['"]([^'"]+)['"]/g
  for (const match of source.matchAll(jsObjectPattern)) {
    const name = match[1]!
    const value = match[2]!.trim()
    if (isColorValue(value) && !seen.has(name)) {
      results.push({ name, value })
      seen.add(name)
    }
  }

  return results
}
