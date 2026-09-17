import { generateTheme } from './theme.js'
import type { DiagramTheme } from './theme.js'

/**
 * Named category -> color, for the category vocabulary diagram-kit's own
 * adapters/examples use: "presentation/application/infrastructure/core/external"
 * (typical layered architecture), "context" (fromArchitectureLandscape), and
 * "directory/file" (fromDirectory). Any other category string still falls
 * back to the generated palette via categoryColor()'s hashing — these are a
 * curated top-up, not an exhaustive list.
 */
function withConventionalCategories(categoryColors: Record<string, string>, options: Parameters<typeof generateTheme>[0]): DiagramTheme {
  return generateTheme({ ...options, categoryColors })
}

/**
 * Real Tailwind CSS palette values (the same ones shadcn/ui themes are
 * typically built on top of) as named category accents, over a tinted
 * neutral scale generated to match.
 */
const slate = withConventionalCategories(
  {
    presentation: '#0ea5e9', // sky-500
    application: '#8b5cf6', // violet-500
    infrastructure: '#64748b', // slate-500
    core: '#10b981', // emerald-500
    external: '#f59e0b', // amber-500
    context: '#8b5cf6',
    directory: '#64748b',
    file: '#94a3b8', // slate-400
  },
  { seedHue: 222, tintNeutrals: true },
)

const rose = withConventionalCategories(
  {
    presentation: '#f43f5e', // rose-500
    application: '#fb7185', // rose-400
    infrastructure: '#71717a', // zinc-500
    core: '#e11d48', // rose-600
    external: '#f59e0b', // amber-500
    context: '#f43f5e',
    directory: '#71717a',
    file: '#a1a1aa', // zinc-400
  },
  { seedHue: 350, tintNeutrals: true },
)

const violet = withConventionalCategories(
  {
    presentation: '#8b5cf6', // violet-500
    application: '#a78bfa', // violet-400
    infrastructure: '#71717a', // zinc-500
    core: '#7c3aed', // violet-600
    external: '#14b8a6', // teal-500
    context: '#8b5cf6',
    directory: '#71717a',
    file: '#a1a1aa',
  },
  { seedHue: 265, tintNeutrals: true },
)

/**
 * The Dracula theme's actual published palette (draculatheme.com) —
 * reproduced as-is rather than generated, since its specific hex values are
 * the point.
 */
const dracula: DiagramTheme = {
  dark: {
    background: '#282a36',
    surface: '#2b2d3a',
    border: '#44475a',
    text: '#f8f8f2',
    textMuted: '#6272a4',
    edge: '#6272a4',
    edgeProjected: '#44475a',
    categories: ['#8be9fd', '#50fa7b', '#ffb86c', '#ff79c6', '#bd93f9', '#ff5555', '#f1fa8c'],
    categoryColors: {
      presentation: '#ff79c6',
      application: '#bd93f9',
      infrastructure: '#6272a4',
      core: '#50fa7b',
      external: '#ffb86c',
      context: '#bd93f9',
      directory: '#6272a4',
      file: '#8be9fd',
    },
  },
  light: {
    background: '#f8f8f2',
    surface: '#ffffff',
    border: '#e2e2e9',
    text: '#282a36',
    textMuted: '#6272a4',
    edge: '#9aa1ac',
    edgeProjected: '#c7cbd3',
    categories: ['#0891a3', '#1a9850', '#c2740a', '#c2277c', '#8250c4', '#d6273a', '#a68a00'],
    categoryColors: {
      presentation: '#c2277c',
      application: '#8250c4',
      infrastructure: '#6272a4',
      core: '#1a9850',
      external: '#c2740a',
      context: '#8250c4',
      directory: '#6272a4',
      file: '#0891a3',
    },
  },
}

/**
 * Pure grayscale (chroma 0) — hand-tuned rather than run through
 * `generateTheme`'s hue-rotation generator, since hue is meaningless at
 * zero chroma: every category would come out the same gray. Categories are
 * differentiated by lightness step instead, each with a distinct light and
 * dark counterpart so contrast against the background holds in both modes.
 */
const greyscale: DiagramTheme = {
  light: {
    background: '#FFFFFF',
    surface: '#F5F5F5',
    border: '#D4D4D4',
    text: '#171717',
    textMuted: '#737373',
    edge: '#A3A3A3',
    edgeProjected: '#D4D4D4',
    categories: ['#171717', '#404040', '#525252', '#737373', '#8A8A8A', '#A3A3A3', '#BFBFBF'],
    categoryColors: {
      presentation: '#171717',
      application: '#404040',
      infrastructure: '#737373',
      core: '#525252',
      external: '#8A8A8A',
      context: '#404040',
      directory: '#737373',
      file: '#A3A3A3',
    },
  },
  dark: {
    background: '#171717',
    surface: '#212121',
    border: '#3F3F3F',
    text: '#F5F5F5',
    textMuted: '#A3A3A3',
    edge: '#5C5C5C',
    edgeProjected: '#3F3F3F',
    categories: ['#F5F5F5', '#D4D4D4', '#BFBFBF', '#A3A3A3', '#8A8A8A', '#737373', '#5C5C5C'],
    categoryColors: {
      presentation: '#F5F5F5',
      application: '#D4D4D4',
      infrastructure: '#8A8A8A',
      core: '#BFBFBF',
      external: '#737373',
      context: '#D4D4D4',
      directory: '#8A8A8A',
      file: '#A3A3A3',
    },
  },
}

/**
 * Generated with parameters tuned to evoke the mood of the equivalent
 * daisyUI theme name — not a reproduction of its literal (and, as of
 * daisyUI 5, OKLCH-native) design tokens.
 */
const synthwave = withConventionalCategories(
  {
    presentation: '#ff5fd8',
    application: '#a15fff',
    infrastructure: '#5f8dff',
    core: '#5fffe0',
    external: '#ffd65f',
    context: '#a15fff',
    directory: '#5f8dff',
    file: '#8888aa',
  },
  { seedHue: 300, chroma: 0.2, tintNeutrals: true },
)

const cyberpunk = withConventionalCategories(
  {
    presentation: '#ffe94f',
    application: '#ff5fa2',
    infrastructure: '#5fd0ff',
    core: '#8bff5f',
    external: '#ff8f5f',
    context: '#ff5fa2',
    directory: '#5fd0ff',
    file: '#a8a8a8',
  },
  { seedHue: 55, chroma: 0.22, tintNeutrals: true },
)

const forest = withConventionalCategories(
  {
    presentation: '#4fae6a',
    application: '#7cc98f',
    infrastructure: '#6b8f78',
    core: '#2f8f5a',
    external: '#a3b869',
    context: '#7cc98f',
    directory: '#6b8f78',
    file: '#8fa896',
  },
  { seedHue: 145, chroma: 0.13, tintNeutrals: true },
)

const retro = withConventionalCategories(
  {
    presentation: '#c2703c',
    application: '#3c9a8f',
    infrastructure: '#a89078',
    core: '#c2903c',
    external: '#8f6b3c',
    context: '#3c9a8f',
    directory: '#a89078',
    file: '#bfae98',
  },
  { seedHue: 30, chroma: 0.1, tintNeutrals: true },
)

const defaultPreset = withConventionalCategories(
  {
    presentation: '#3B6EA5',
    application: '#5F8D6B',
    infrastructure: '#A5763B',
    core: '#7A5FA5',
    external: '#3F8A8C',
    context: '#5F8D6B',
    directory: '#A5763B',
    file: '#8f97a3',
  },
  {},
)

export const themePresets = {
  default: defaultPreset,
  slate,
  rose,
  violet,
  dracula,
  greyscale,
  synthwave,
  cyberpunk,
  forest,
  retro,
} satisfies Record<string, DiagramTheme>

export type ThemePresetName = keyof typeof themePresets
