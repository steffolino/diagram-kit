import { formatHex } from 'culori'

/**
 * Design tokens, not the fixed CSS "accent" class names used in earlier
 * hand-built diagrams. A category (an adapter-defined string) is hashed
 * onto a palette slot, so new categories degrade gracefully instead of
 * falling back to an "unstyled" state.
 */

export interface ThemeColors {
  background: string
  surface: string
  border: string
  text: string
  textMuted: string
  edge: string
  edgeProjected: string
  /** Fallback palette for categories with no explicit entry in `categoryColors` — hashed onto a slot so unregistered categories still degrade gracefully instead of going unstyled. */
  categories: string[]
  /** Named category -> color. Takes precedence over `categories`. This is what a color picker keyed by category name (e.g. "application", "external") should write to. */
  categoryColors?: Record<string, string>
}

export interface DiagramTheme {
  light: ThemeColors
  dark: ThemeColors
}

export interface GenerateThemeOptions {
  /**
   * Explicit categorical palette (hex or any CSS color string), used as-is
   * for both light and dark mode. Set this when you already have brand
   * colors — it skips generation entirely.
   */
  categories?: string[]
  /**
   * Named category -> color, e.g. `{ application: '#5F8D6B', external: '#3F8A8C' }`.
   * Takes precedence over `categories`/generation for any category listed here;
   * categories not listed still fall back to the generated/explicit palette.
   */
  categoryColors?: Record<string, string>
  /** Starting hue in degrees (0-360) for a generated palette. Default 250 (blue). */
  seedHue?: number
  /** Degrees between each generated category's hue. Default 47 — avoids evenly-divided wheels landing two categories on near-identical hues. */
  hueStep?: number
  /** How many categories to pre-generate when the graph's category list isn't known yet. Default 8. */
  categoryCount?: number
  /** OKLCH chroma (colorfulness) for generated categories, roughly 0-0.4. Default 0.11 — restrained, not neon. */
  chroma?: number
  /** Tints background/surface/border/edge with `seedHue` at very low chroma instead of pure gray, for a cohesive brand-matched neutral scale. Default false. */
  tintNeutrals?: boolean
}

function oklchHex(l: number, c: number, h: number): string {
  return formatHex({ mode: 'oklch', l, c, h })
}

function generateCategories(options: GenerateThemeOptions, mode: 'light' | 'dark'): string[] {
  if (options.categories) return options.categories
  const seedHue = options.seedHue ?? 250
  const hueStep = options.hueStep ?? 47
  const count = options.categoryCount ?? 8
  const chroma = options.chroma ?? 0.11
  const lightness = mode === 'light' ? 0.52 : 0.78

  return Array.from({ length: count }, (_, i) => oklchHex(lightness, chroma, (seedHue + i * hueStep) % 360))
}

function neutralScale(options: GenerateThemeOptions, mode: 'light' | 'dark'): Omit<ThemeColors, 'categories'> {
  const hue = options.seedHue ?? 250
  const c = options.tintNeutrals ? 0.02 : 0

  if (mode === 'light') {
    return {
      background: oklchHex(0.995, c, hue),
      surface: oklchHex(0.97, c, hue),
      border: oklchHex(0.87, c, hue),
      text: oklchHex(0.22, c * 1.5, hue),
      textMuted: oklchHex(0.48, c, hue),
      edge: oklchHex(0.68, c, hue),
      edgeProjected: oklchHex(0.83, c, hue),
    }
  }

  return {
    background: oklchHex(0.14, c, hue),
    surface: oklchHex(0.19, c, hue),
    border: oklchHex(0.28, c, hue),
    text: oklchHex(0.92, c, hue),
    textMuted: oklchHex(0.66, c, hue),
    edge: oklchHex(0.42, c, hue),
    edgeProjected: oklchHex(0.28, c, hue),
  }
}

/**
 * Generates a full light/dark theme from a handful of parameters instead of
 * hand-picked hex codes — pass an explicit `categories` palette if you have
 * brand colors, or let it derive an evenly-spaced OKLCH palette from a seed
 * hue. OKLCH (rather than HSL) keeps generated colors at consistent
 * perceived lightness/vividness across hues, so e.g. yellow and blue
 * categories read as equally prominent instead of the yellow blowing out.
 */
export function generateTheme(options: GenerateThemeOptions = {}): DiagramTheme {
  return {
    light: {
      ...neutralScale(options, 'light'),
      categories: generateCategories(options, 'light'),
      categoryColors: options.categoryColors,
    },
    dark: {
      ...neutralScale(options, 'dark'),
      categories: generateCategories(options, 'dark'),
      categoryColors: options.categoryColors,
    },
  }
}

export const defaultTheme: DiagramTheme = generateTheme()

/** Appends an alpha channel to a hex color, e.g. `withAlpha('#3B6EA5', 0.5)` -> `#3B6EA580`. */
export function withAlpha(hex: string, alpha: number): string {
  const alphaHex = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0')
  return `${hex}${alphaHex}`
}

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

/**
 * Resolves a category string to a color for the given mode: an explicit
 * `categoryColors[category]` entry wins if present, otherwise the category
 * is hashed onto a slot in the fallback `categories` palette so unregistered
 * categories still get a stable (if arbitrary) color instead of going
 * unstyled.
 */
export function categoryColor(
  category: string | undefined,
  theme: DiagramTheme,
  mode: 'light' | 'dark' = 'light',
): string {
  const colors = theme[mode]
  if (!category) return colors.textMuted
  const named = colors.categoryColors?.[category]
  if (named) return named
  const index = hashString(category) % colors.categories.length
  return colors.categories[index]!
}
