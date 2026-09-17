import { useEffect, useMemo, useState, type ChangeEvent, type JSX, type ReactNode } from 'react'
import {
  generateTheme,
  themePresets,
  extractCssColors,
  type DiagramTheme,
  type LayoutOptions,
  type ThemePresetName,
} from '@diagram-kit/core'
import { fromYaml, fromJson, fromTreeText, fromTree } from '@diagram-kit/adapters'
import { renderSvg } from '@diagram-kit/static'
import { DiagramView, type DetailPanelPosition, type LayoutMode } from '@diagram-kit/react'
import { downloadPng, downloadSvg } from './exportGraph.js'
import { treeFromFileList } from './loadDirectory.js'
import { generateElementSnippet, generateReactSnippet } from './codeExport.js'

type InputFormat = 'yaml' | 'json' | 'tree' | 'folder'

const SAMPLE_YAML = `nodes:
  - id: api
    label: API
    category: presentation
    detail: Public HTTP surface. Routes requests into the ingestion and analytics layers.
  - id: connector
    label: Connector
    category: presentation
    badge: planned
  - id: ingestion
    label: Ingestion
    category: application
    detail: Normalizes incoming data before it reaches analytics or repositories.
  - id: analytics
    label: Analytics
    category: application
  - id: overlays
    label: Overlays
    category: application
  - id: repositories
    label: Repositories
    category: infrastructure
  - id: domain
    label: Domain
    category: core
    detail: Aggregate roots and business rules. No outward dependencies.
  - id: postgis
    label: PostGIS
    category: external

edges:
  - from: api
    to: ingestion
  - from: api
    to: analytics
  - from: api
    to: overlays
  - from: connector
    to: api
    projected: true
  - from: ingestion
    to: repositories
  - from: analytics
    to: repositories
  - from: overlays
    to: repositories
  - from: repositories
    to: domain
  - from: domain
    to: postgis
`

const STRUCTURAL_SAMPLE_YAML = `nodes:
  - id: ingestion
    label: Ingestion Context
    category: application
    detail: One bounded context, shown with its internal ports-and-adapters layering nested inside — no connector lines, containment is the border.
  - id: ingestion-domain
    label: Domain
    parent: ingestion
    category: core
  - id: ingestion-application
    label: Application
    parent: ingestion
    category: application
  - id: ingestion-infrastructure
    label: Infrastructure
    parent: ingestion
    category: infrastructure
  - id: coordination
    label: Coordination Context
    category: application
    borderStyle: dashed
    detail: A dashed border reads as a looser logical grouping rather than a hard system boundary.
  - id: coordination-domain
    label: Domain
    parent: coordination
    category: core
  - id: coordination-application
    label: Application
    parent: coordination
    category: application
  - id: coordination-infrastructure
    label: Infrastructure
    parent: coordination
    category: infrastructure

edges: []
`

const STACK_SAMPLE_YAML = `nodes:
  - id: domain
    label: Domain
    category: core
    detail: Aggregate roots and business rules. No outward dependencies.
  - id: application
    label: Application
    category: application
    detail: Use cases and orchestration — the only layer allowed to call out to infrastructure.
  - id: infrastructure
    label: Infrastructure
    category: infrastructure
    detail: Repositories, external clients, adapters.

edges: []
`

const PIPELINE_SAMPLE_YAML = `nodes:
  - id: webui
    label: WebUI
    category: presentation
  - id: backend
    label: Backend Service
    category: application
  - id: api
    label: ePIC API V3
    category: core
  - id: db1
    label: PID Database
    category: infrastructure
    shape: cylinder
  - id: db2
    label: ElasticSearch
    category: infrastructure
    shape: cylinder
  - id: db3
    label: GraphDB
    category: infrastructure
    shape: cylinder

edges:
  - from: webui
    to: backend
    style: block
  - from: backend
    to: api
    style: block
  - from: api
    to: db1
    label: writes
  - from: api
    to: db2
    label: indexes
  - from: api
    to: db3
    label: links
`

const JSON_SAMPLE = JSON.stringify(
  {
    nodes: [
      { id: 'api', label: 'API', category: 'presentation' },
      { id: 'domain', label: 'Domain', category: 'core' },
      { id: 'db', label: 'Database', category: 'infrastructure', shape: 'cylinder' },
    ],
    edges: [
      { from: 'api', to: 'domain', label: 'calls' },
      { from: 'domain', to: 'db', label: 'persists' },
    ],
  },
  null,
  2,
)

// Two encodings of the same directory listing, to exercise both parse
// paths in fromTreeText: box-drawing (the real `tree` CLI's output) and
// the plain-indentation fallback for when there are no box-drawing
// characters at all.
const TREE_TEXT_SAMPLE = `src
├── components
│   ├── Button.tsx
│   └── Modal.tsx
├── features
│   ├── auth
│   └── about
└── utils
    └── format.ts
`

const TREE_TEXT_PLAIN_INDENT_SAMPLE = `backend
  src
    routes
      users.py
      orders.py
    models
      user.py
      order.py
  tests
    test_users.py
`

const SCRUM_SAMPLE_YAML = `nodes:
  - id: backlog
    label: Product Backlog
    category: presentation
    detail: Prioritized, ever-evolving list of everything that might be needed in the product, owned by the Product Owner.
  - id: refinement
    label: Backlog Refinement
    category: application
    detail: Ongoing activity where the team adds detail, estimates, and order to backlog items.
  - id: planning
    label: Sprint Planning
    category: application
    detail: The team selects backlog items and defines a Sprint Goal for the upcoming Sprint.
  - id: sprint-backlog
    label: Sprint Backlog
    category: infrastructure
    detail: The subset of the Product Backlog selected for the Sprint, plus a plan for delivering it.
  - id: daily-scrum
    label: Daily Scrum
    category: core
    detail: A short daily event for the Developers to inspect progress and adapt the plan.
  - id: increment
    label: Increment
    category: infrastructure
    detail: A concrete, usable step toward the product goal, meeting the Definition of Done.
  - id: review
    label: Sprint Review
    category: external
    detail: Stakeholders inspect the Increment and adapt the Product Backlog.
  - id: retro
    label: Sprint Retrospective
    category: application
    detail: The team inspects how the last Sprint went and plans improvements.

edges:
  - from: backlog
    to: refinement
  - from: refinement
    to: backlog
    projected: true
  - from: backlog
    to: planning
  - from: planning
    to: sprint-backlog
  - from: sprint-backlog
    to: daily-scrum
  - from: daily-scrum
    to: increment
  - from: increment
    to: review
  - from: review
    to: retro
  - from: retro
    to: backlog
    label: next sprint
`

const SAMPLES: Record<string, { source: string; format: InputFormat; layoutMode: LayoutMode }> = {
  'graph (architecture, YAML)': { source: SAMPLE_YAML, format: 'yaml', layoutMode: 'graph' },
  'structural (nested contexts, YAML)': { source: STRUCTURAL_SAMPLE_YAML, format: 'yaml', layoutMode: 'structural' },
  'stack (flat layers, YAML)': { source: STACK_SAMPLE_YAML, format: 'yaml', layoutMode: 'stack' },
  'graph (pipeline, shapes + block arrows, YAML)': { source: PIPELINE_SAMPLE_YAML, format: 'yaml', layoutMode: 'graph' },
  'graph (same shape as JSON)': { source: JSON_SAMPLE, format: 'json', layoutMode: 'graph' },
  'structural (directory tree, `tree` CLI output)': {
    source: TREE_TEXT_SAMPLE,
    format: 'tree',
    layoutMode: 'structural',
  },
  'structural (directory tree, plain indent)': {
    source: TREE_TEXT_PLAIN_INDENT_SAMPLE,
    format: 'tree',
    layoutMode: 'structural',
  },
  'graph (standard Scrum process, YAML)': { source: SCRUM_SAMPLE_YAML, format: 'yaml', layoutMode: 'graph' },
}

// Which sample to load when the person switches "Input format" directly
// (rather than via "Sample") — keeps the graph-source textarea's content
// syntactically matched to whichever format is now selected instead of
// leaving stale text in the wrong syntax. "folder" has no text sample.
const DEFAULT_SAMPLE_FOR_FORMAT: Record<InputFormat, string | null> = {
  yaml: 'graph (architecture, YAML)',
  json: 'graph (same shape as JSON)',
  tree: 'structural (directory tree, `tree` CLI output)',
  folder: null,
}

const DIRECTIONS: NonNullable<LayoutOptions['direction']>[] = ['TB', 'BT', 'LR', 'RL']
const POSITIONS: DetailPanelPosition[] = ['top', 'right', 'bottom', 'left']
const FALLBACK_PALETTE = ['#3B6EA5', '#5F8D6B', '#A5763B', '#7A5FA5', '#3F8A8C', '#A5473F', '#3F8A8C']

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }): JSX.Element {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
      <span style={{ color: '#5B6270', fontWeight: 500 }}>{label}</span>
      {children}
      {hint && <span style={{ color: '#8A909B', fontSize: 11, lineHeight: 1.4 }}>{hint}</span>}
    </label>
  )
}

function ToggleGroup<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: readonly T[]
  onChange: (value: T) => void
}): JSX.Element {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          style={{
            flex: '1 0 auto',
            padding: '4px 8px',
            fontSize: 12,
            borderRadius: 4,
            border: `1px solid ${value === option ? '#3B6EA5' : '#DADCE0'}`,
            background: value === option ? '#3B6EA511' : 'none',
            cursor: 'pointer',
          }}
        >
          {option}
        </button>
      ))}
    </div>
  )
}

function Slider({
  value,
  onChange,
  min,
  max,
  step,
  format,
}: {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step: number
  format?: (value: number) => string
}): JSX.Element {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(Number(e.target.value))}
        style={{ flex: 1 }}
      />
      <span style={{ fontSize: 12, width: 44, textAlign: 'right', color: '#1F2328' }}>
        {format ? format(value) : value}
      </span>
    </div>
  )
}

function NamedColorList({
  colors,
  onChange,
}: {
  colors: Record<string, string>
  onChange: (colors: Record<string, string>) => void
}): JSX.Element {
  const entries = Object.entries(colors)
  if (entries.length === 0) {
    return <p style={{ fontSize: 12, color: '#8A909B', margin: 0 }}>No categories in the current graph yet.</p>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {entries.map(([category, color]) => (
        <div key={category} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="color"
            value={color}
            onChange={(e) => onChange({ ...colors, [category]: e.target.value })}
            style={{ width: 28, height: 24, padding: 0, border: 'none', background: 'none', flexShrink: 0 }}
          />
          <span style={{ fontSize: 12, width: 100, flexShrink: 0 }}>{category}</span>
          <input
            type="text"
            value={color}
            onChange={(e) => onChange({ ...colors, [category]: e.target.value })}
            style={{ flex: 1, fontSize: 12, fontFamily: 'monospace', padding: '2px 6px', minWidth: 0 }}
          />
        </div>
      ))}
    </div>
  )
}

function PresetSwatches({ theme }: { theme: DiagramTheme }): JSX.Element {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {theme.light.categories.slice(0, 6).map((color, i) => (
        <span key={i} style={{ width: 14, height: 14, borderRadius: '50%', background: color }} />
      ))}
    </div>
  )
}

// Native <details>/<summary> gives free expand/collapse with no state to
// manage — progressive disclosure for a control panel that's grown past
// "everything visible at once" being scannable, and on mobile this is also
// what fits in the narrower drawer.
function Section({
  title,
  defaultOpen = false,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: ReactNode
}): JSX.Element {
  return (
    <details open={defaultOpen} className="dk-section">
      <summary className="dk-section-summary">{title}</summary>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>{children}</div>
    </details>
  )
}

// One injected stylesheet for the bits inline styles can't express: the
// details/summary marker, and the media query that turns the params panel
// into an off-canvas drawer below 768px.
const RESPONSIVE_CSS = `
  .dk-section { border-top: 1px solid #EEEEF0; padding-top: 12px; }
  .dk-section:first-of-type { border-top: none; padding-top: 0; }
  .dk-section-summary {
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    color: #1F2328;
    list-style: none;
  }
  .dk-section-summary::-webkit-details-marker { display: none; }
  .dk-section-summary::before { content: '▸ '; color: #8A909B; }
  .dk-section[open] > .dk-section-summary::before { content: '▾ '; }
  .dk-panel { width: 340px; box-sizing: border-box; }
  .dk-menu-button { display: none; }
  .dk-scrim { display: none; }
  @media (max-width: 768px) {
    .dk-panel {
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      z-index: 40;
      transform: translateX(-100%);
      transition: transform 0.2s ease;
      box-shadow: 2px 0 16px rgba(0, 0, 0, 0.2);
      width: 85vw;
      max-width: 340px;
    }
    .dk-panel.dk-panel-open { transform: translateX(0); }
    .dk-menu-button {
      display: inline-flex;
      position: fixed;
      top: 12px;
      left: 12px;
      z-index: 20;
    }
    .dk-scrim {
      display: block;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.35);
      z-index: 30;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease;
    }
    .dk-scrim.dk-scrim-visible { opacity: 1; pointer-events: auto; }
  }
`

const DEFAULT_SAMPLE = 'graph (architecture, YAML)'

export function App(): JSX.Element {
  const [selectedSample, setSelectedSample] = useState(DEFAULT_SAMPLE)
  const [inputFormat, setInputFormat] = useState<InputFormat>('yaml')
  const [textSource, setTextSource] = useState(SAMPLE_YAML)
  const [folderGraph, setFolderGraph] = useState<ReturnType<typeof fromTree> | null>(null)
  const [folderName, setFolderName] = useState<string | null>(null)
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('graph')
  const [paletteSource, setPaletteSource] = useState<'preset' | 'generated' | 'explicit'>('preset')
  const [presetName, setPresetName] = useState<ThemePresetName>('default')
  const [seedHue, setSeedHue] = useState(250)
  const [hueStep, setHueStep] = useState(47)
  const [chroma, setChroma] = useState(0.11)
  const [categoryCount, setCategoryCount] = useState(8)
  const [tintNeutrals, setTintNeutrals] = useState(false)
  const [categoryColorMap, setCategoryColorMap] = useState<Record<string, string>>({})
  const [cssImportSource, setCssImportSource] = useState('')
  const [cssImportMessage, setCssImportMessage] = useState<string | null>(null)
  const [mode, setMode] = useState<'light' | 'dark'>('light')
  const [direction, setDirection] = useState<NonNullable<LayoutOptions['direction']>>('TB')
  const [detailPanelPosition, setDetailPanelPosition] = useState<DetailPanelPosition>('right')
  const [showDetailPanel, setShowDetailPanel] = useState(true)
  const [glass, setGlass] = useState(false)
  const [colorizeNodes, setColorizeNodes] = useState(false)
  const [exportScale, setExportScale] = useState(2)
  const [paddingPx, setPaddingPx] = useState(32)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const { graph, error } = useMemo(() => {
    if (inputFormat === 'folder') {
      return { graph: folderGraph, error: folderGraph ? null : 'Choose a folder to load its structure.' }
    }
    try {
      const parse = inputFormat === 'json' ? fromJson : inputFormat === 'tree' ? fromTreeText : fromYaml
      return { graph: parse(textSource), error: null as string | null }
    } catch (e) {
      return { graph: null, error: e instanceof Error ? e.message : String(e) }
    }
  }, [inputFormat, textSource, folderGraph])

  const graphCategories = useMemo(
    () => Array.from(new Set((graph?.nodes ?? []).map((n) => n.category).filter((c): c is string => Boolean(c)))),
    [graph],
  )

  // Maps extracted colors onto the graph's actual categories in order —
  // matching by name where a CSS variable happens to share one (e.g. a
  // `--core` custom property landing on the "core" category), otherwise
  // filling remaining categories in the order they were declared.
  function importCssPalette(): void {
    const extracted = extractCssColors(cssImportSource)
    if (extracted.length === 0) {
      setCssImportMessage('No color values found — paste CSS custom properties (--name: #hex;) or a colors: {...} object.')
      return
    }
    const byName = new Map(extracted.map((c) => [c.name.toLowerCase(), c.value]))
    const leftover = extracted.map((c) => c.value).filter((v) => !graphCategories.some((cat) => byName.get(cat.toLowerCase()) === v))
    let leftoverIndex = 0
    const next = { ...categoryColorMap }
    for (const category of graphCategories) {
      const matched = byName.get(category.toLowerCase())
      next[category] = matched ?? leftover[leftoverIndex++ % leftover.length] ?? extracted[0]!.value
    }
    setCategoryColorMap(next)
    setPaletteSource('explicit')
    setCssImportMessage(`Applied ${extracted.length} color${extracted.length === 1 ? '' : 's'} to ${graphCategories.length} categor${graphCategories.length === 1 ? 'y' : 'ies'}.`)
  }

  // Keep the named color map in sync with whatever categories are actually
  // in the graph right now: fill in a color for newly-seen categories,
  // leave existing assignments (including ones the person hand-picked)
  // untouched.
  useEffect(() => {
    setCategoryColorMap((prev) => {
      const missing = graphCategories.filter((c) => !(c in prev))
      if (missing.length === 0) return prev
      const next = { ...prev }
      missing.forEach((category, i) => {
        next[category] = FALLBACK_PALETTE[(Object.keys(prev).length + i) % FALLBACK_PALETTE.length]!
      })
      return next
    })
  }, [graphCategories])

  const theme: DiagramTheme = useMemo(() => {
    if (paletteSource === 'preset') return themePresets[presetName]
    if (paletteSource === 'explicit') return generateTheme({ categoryColors: categoryColorMap, tintNeutrals })
    return generateTheme({ seedHue, hueStep, chroma, categoryCount, tintNeutrals })
  }, [paletteSource, presetName, categoryColorMap, seedHue, hueStep, chroma, categoryCount, tintNeutrals])

  const [customBackground, setCustomBackground] = useState<string | null>(null)
  const [customBorder, setCustomBorder] = useState<string | null>(null)

  // Independent of palette choice: overrides just the active mode's
  // background/border, leaving categories/surface/etc. from the theme alone.
  const displayTheme: DiagramTheme = useMemo(() => {
    if (!customBackground && !customBorder) return theme
    return {
      ...theme,
      [mode]: {
        ...theme[mode],
        ...(customBackground ? { background: customBackground } : {}),
        ...(customBorder ? { border: customBorder } : {}),
      },
    }
  }, [theme, mode, customBackground, customBorder])

  const svg = useMemo(() => {
    if (!graph) return null
    return renderSvg(graph, {
      theme: displayTheme,
      mode,
      layoutMode,
      layout: { direction },
      padding: paddingPx,
      colorizeNodes,
    })
  }, [graph, displayTheme, mode, layoutMode, direction, paddingPx, colorizeNodes])

  const [codeFramework, setCodeFramework] = useState<'react' | 'element'>('react')
  const [codeCopied, setCodeCopied] = useState(false)

  const codeSnippet = useMemo(() => {
    if (!graph) return null
    const options = {
      layoutMode,
      direction,
      theme: displayTheme,
      mode,
      colorizeNodes,
      glass,
      showDetailPanel,
      detailPanelPosition,
      padding: paddingPx,
    }
    return codeFramework === 'react' ? generateReactSnippet(graph, options) : generateElementSnippet(graph, options)
  }, [
    graph,
    codeFramework,
    layoutMode,
    direction,
    displayTheme,
    mode,
    colorizeNodes,
    glass,
    showDetailPanel,
    detailPanelPosition,
    paddingPx,
  ])

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, sans-serif', color: '#1F2328' }}>
      <style>{RESPONSIVE_CSS}</style>

      <button
        type="button"
        className="dk-menu-button"
        aria-label="Open params"
        onClick={() => setIsDrawerOpen(true)}
        style={{
          fontSize: 13,
          padding: '8px 10px',
          border: '1px solid #DADCE0',
          borderRadius: 6,
          background: '#fff',
          cursor: 'pointer',
          boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
        }}
      >
        ☰ Params
      </button>

      <div
        className={`dk-scrim${isDrawerOpen ? ' dk-scrim-visible' : ''}`}
        onClick={() => setIsDrawerOpen(false)}
      />

      <div
        className={`dk-panel${isDrawerOpen ? ' dk-panel-open' : ''}`}
        style={{
          flexShrink: 0,
          borderRight: '1px solid #DADCE0',
          padding: 20,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          background: '#fff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <h1 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>diagram-kit playground</h1>
            <p style={{ fontSize: 12, color: '#5B6270', margin: '4px 0 0' }}>
              Params on the left, live preview on the right.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close params"
            onClick={() => setIsDrawerOpen(false)}
            className="dk-menu-button"
            style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#5B6270' }}
          >
            ✕
          </button>
        </div>

        <Section title="Data" defaultOpen>
          <Field label="Sample" hint="Loads example source together with the input format and layout mode it demonstrates.">
            <select
              value={selectedSample}
              onChange={(e) => {
                const sample = SAMPLES[e.target.value]
                if (!sample) return
                setSelectedSample(e.target.value)
                setInputFormat(sample.format)
                setTextSource(sample.source)
                setLayoutMode(sample.layoutMode)
              }}
            >
              {Object.keys(SAMPLES).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Input format"
            hint={
              inputFormat === 'folder'
                ? "Reads a real folder client-side (the browser's folder picker) — no server, no node:fs."
                : inputFormat === 'tree'
                  ? "Paste the `tree` CLI's box-drawing output, or a plain indented list — either parses."
                  : inputFormat === 'json'
                    ? 'Same graph spec as YAML, just JSON.'
                    : 'Hand-authored { nodes, edges } graph spec.'
            }
          >
            <ToggleGroup
              value={inputFormat}
              options={['yaml', 'json', 'tree', 'folder'] as const}
              onChange={(format) => {
                setInputFormat(format)
                const sampleName = DEFAULT_SAMPLE_FOR_FORMAT[format]
                if (!sampleName) return
                const sample = SAMPLES[sampleName]!
                setSelectedSample(sampleName)
                setTextSource(sample.source)
                setLayoutMode(sample.layoutMode)
              }}
            />
          </Field>

          {inputFormat === 'folder' ? (
            <Field label="Folder">
              <label
                style={{
                  display: 'inline-flex',
                  width: 'fit-content',
                  padding: '6px 10px',
                  fontSize: 12,
                  border: '1px solid #DADCE0',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                Choose folder…
                <input
                  type="file"
                  // @ts-expect-error non-standard attributes, Chromium/Firefox only
                  webkitdirectory=""
                  directory=""
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const files = e.target.files
                    if (!files || files.length === 0) return
                    const tree = treeFromFileList(files)
                    setFolderGraph(fromTree(tree))
                    setFolderName((files[0] as unknown as { webkitRelativePath: string }).webkitRelativePath.split('/')[0] ?? null)
                    setLayoutMode('structural')
                  }}
                />
              </label>
              {folderName && (
                <span style={{ fontSize: 12, color: '#5B6270', marginLeft: 8 }}>Loaded "{folderName}"</span>
              )}
            </Field>
          ) : (
            <Field label={`Graph source (${inputFormat})`}>
              <textarea
                value={textSource}
                onChange={(e) => setTextSource(e.target.value)}
                rows={12}
                spellCheck={false}
                style={{ fontFamily: 'monospace', fontSize: 11, padding: 8, resize: 'vertical' }}
              />
            </Field>
          )}
          {error && <p style={{ fontSize: 12, color: '#A5473F', margin: 0 }}>{error}</p>}

          <Field
            label="Layout mode"
            hint={
              layoutMode === 'graph'
                ? 'Real dagre auto-layout; edges drawn as routed lines or block arrows.'
                : layoutMode === 'structural'
                  ? 'Nested boxes from parent/child containment. No connector lines — nesting is the relationship.'
                  : 'Flat sequential list, no hierarchy, no connectors.'
            }
          >
            <ToggleGroup value={layoutMode} options={['graph', 'structural', 'stack'] as const} onChange={setLayoutMode} />
          </Field>
        </Section>

        <Section title="Appearance">
          <Field label="Mode">
            <ToggleGroup value={mode} options={['light', 'dark'] as const} onChange={setMode} />
          </Field>

          <Field
            label="Background color"
            hint={`Overrides just the ${mode} theme's background — categories, surface, and border stay whatever the palette set.`}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="color"
                value={customBackground ?? theme[mode].background}
                onChange={(e) => setCustomBackground(e.target.value)}
                style={{ width: 28, height: 24, padding: 0, border: 'none', background: 'none', flexShrink: 0 }}
              />
              <input
                type="text"
                value={customBackground ?? theme[mode].background}
                onChange={(e) => setCustomBackground(e.target.value)}
                style={{ flex: 1, fontSize: 12, fontFamily: 'monospace', padding: '2px 6px', minWidth: 0 }}
              />
              {customBackground && (
                <button
                  type="button"
                  onClick={() => setCustomBackground(null)}
                  style={{ fontSize: 11, padding: '4px 8px', border: '1px solid #DADCE0', borderRadius: 4, background: 'none', cursor: 'pointer' }}
                >
                  Reset
                </button>
              )}
            </div>
          </Field>

          <Field
            label="Border color"
            hint={`Overrides just the ${mode} theme's neutral border — with "Apply palette to entity backgrounds" on, category-colored borders still win.`}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="color"
                value={customBorder ?? theme[mode].border}
                onChange={(e) => setCustomBorder(e.target.value)}
                style={{ width: 28, height: 24, padding: 0, border: 'none', background: 'none', flexShrink: 0 }}
              />
              <input
                type="text"
                value={customBorder ?? theme[mode].border}
                onChange={(e) => setCustomBorder(e.target.value)}
                style={{ flex: 1, fontSize: 12, fontFamily: 'monospace', padding: '2px 6px', minWidth: 0 }}
              />
              {customBorder && (
                <button
                  type="button"
                  onClick={() => setCustomBorder(null)}
                  style={{ fontSize: 11, padding: '4px 8px', border: '1px solid #DADCE0', borderRadius: 4, background: 'none', cursor: 'pointer' }}
                >
                  Reset
                </button>
              )}
            </div>
          </Field>

          <Field label="Glass effect" hint="Frosted, translucent chips and panel over a soft gradient backdrop.">
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <input type="checkbox" checked={glass} onChange={(e) => setGlass(e.target.checked)} />
              Enable glassmorphism
            </label>
          </Field>

          <Field
            label="Entity colors"
            hint={
              colorizeNodes
                ? "Entities are tinted with their category's color — the palette applies to the shapes themselves, not just the accent dot."
                : 'Entities stay neutral (e.g. dark text on light/white) regardless of the palette — only the small accent dot shows category.'
            }
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <input
                type="checkbox"
                checked={colorizeNodes}
                onChange={(e) => setColorizeNodes(e.target.checked)}
              />
              Apply palette to entity backgrounds
            </label>
          </Field>

          <Field label={`Padding (${paddingPx}px)`} hint="Margin around the diagram, in steps of 8px.">
            <Slider value={paddingPx} onChange={setPaddingPx} min={0} max={128} step={8} format={(v) => `${v}px`} />
          </Field>
        </Section>

        <Section title="Palette">
          <Field label="Palette source">
            <ToggleGroup
              value={paletteSource}
              options={['preset', 'generated', 'explicit'] as const}
              onChange={setPaletteSource}
            />
          </Field>

          {paletteSource === 'preset' && (
            <Field label="Preset" hint="A curated theme — Tailwind/shadcn-style accents, the real Dracula palette, or generated moods inspired by daisyUI theme names.">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(Object.keys(themePresets) as ThemePresetName[]).map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setPresetName(name)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 8px',
                      fontSize: 12,
                      borderRadius: 4,
                      border: `1px solid ${presetName === name ? '#3B6EA5' : '#DADCE0'}`,
                      background: presetName === name ? '#3B6EA511' : 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <span>{name}</span>
                    <PresetSwatches theme={themePresets[name]} />
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  setCategoryColorMap(themePresets[presetName].light.categoryColors ?? {})
                  setPaletteSource('explicit')
                }}
                style={{
                  marginTop: 6,
                  fontSize: 11,
                  padding: '4px 8px',
                  border: '1px solid #DADCE0',
                  borderRadius: 4,
                  background: 'none',
                  cursor: 'pointer',
                  alignSelf: 'flex-start',
                }}
              >
                Customize from this preset →
              </button>
            </Field>
          )}

          {paletteSource === 'generated' && (
            <>
              <Field
                label={`Seed hue (${seedHue}°)`}
                hint="Starting point on the color wheel. 0=red, 60=yellow, 120=green, 180=cyan, 250=blue, 300=magenta."
              >
                <Slider value={seedHue} onChange={setSeedHue} min={0} max={360} step={1} format={(v) => `${v}°`} />
              </Field>
              <Field
                label={`Hue step (${hueStep}°)`}
                hint="Degrees between each generated category's hue. Small = closely related colors; large = more contrast between categories."
              >
                <Slider value={hueStep} onChange={setHueStep} min={10} max={180} step={1} format={(v) => `${v}°`} />
              </Field>
              <Field
                label={`Chroma (${chroma.toFixed(2)})`}
                hint="Colorfulness of generated colors. Low = muted/pastel, high = vivid/neon."
              >
                <Slider value={chroma} onChange={setChroma} min={0.02} max={0.3} step={0.01} format={(v) => v.toFixed(2)} />
              </Field>
              <Field
                label={`Category count (${categoryCount})`}
                hint="How many distinct colors to pre-generate before they start repeating for extra categories."
              >
                <Slider value={categoryCount} onChange={setCategoryCount} min={2} max={16} step={1} />
              </Field>
            </>
          )}

          {paletteSource === 'explicit' && (
            <Field
              label="Category colors"
              hint="One color per category actually present in the graph above — not an arbitrary sequential list."
            >
              <NamedColorList colors={categoryColorMap} onChange={setCategoryColorMap} />
            </Field>
          )}

          {paletteSource === 'explicit' && (
            <Field
              label="Import from CSS"
              hint="Paste CSS custom properties (--brand: #3b82f6;, Tailwind v4's @theme block) or a tailwind.config colors: {...} object. Colors get matched to categories by name where they match, then filled in order."
            >
              <textarea
                value={cssImportSource}
                onChange={(e) => {
                  setCssImportSource(e.target.value)
                  setCssImportMessage(null)
                }}
                placeholder={':root {\n  --brand: #3b82f6;\n  --accent: #f43f5e;\n}'}
                rows={5}
                spellCheck={false}
                style={{ fontFamily: 'monospace', fontSize: 11, padding: 8, resize: 'vertical' }}
              />
              <button
                type="button"
                onClick={importCssPalette}
                disabled={!cssImportSource.trim()}
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  padding: '4px 10px',
                  border: '1px solid #DADCE0',
                  borderRadius: 4,
                  background: 'none',
                  cursor: 'pointer',
                  alignSelf: 'flex-start',
                }}
              >
                Extract &amp; apply colors
              </button>
              {cssImportMessage && (
                <p style={{ fontSize: 11, color: '#5B6270', margin: '4px 0 0' }}>{cssImportMessage}</p>
              )}
            </Field>
          )}

          {paletteSource !== 'preset' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <input type="checkbox" checked={tintNeutrals} onChange={(e) => setTintNeutrals(e.target.checked)} />
              Tint neutrals with seed hue
            </label>
          )}
        </Section>

        <Section title="Layout & detail panel">
          {layoutMode === 'graph' && (
            <Field label="Layout direction">
              <select value={direction} onChange={(e) => setDirection(e.target.value as typeof direction)}>
                {DIRECTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Field
            label="Detail panel (drawer)"
            hint="The popup that opens with a node's longer description when you click it."
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 6 }}>
              <input
                type="checkbox"
                checked={showDetailPanel}
                onChange={(e) => setShowDetailPanel(e.target.checked)}
              />
              Show detail panel on click
            </label>
            {showDetailPanel && (
              <select
                value={detailPanelPosition}
                onChange={(e) => setDetailPanelPosition(e.target.value as DetailPanelPosition)}
              >
                {POSITIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </Section>

        <Section title="Export" defaultOpen>
          <Field label="Export">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                disabled={!svg}
                onClick={() => svg && downloadSvg(svg)}
                style={{ fontSize: 12, padding: '6px 10px', border: '1px solid #DADCE0', borderRadius: 4, cursor: 'pointer' }}
              >
                Download SVG
              </button>
              <button
                type="button"
                disabled={!svg}
                onClick={() => svg && downloadPng(svg, exportScale)}
                style={{ fontSize: 12, padding: '6px 10px', border: '1px solid #DADCE0', borderRadius: 4, cursor: 'pointer' }}
              >
                Download PNG
              </button>
              <select value={exportScale} onChange={(e) => setExportScale(Number(e.target.value))} style={{ fontSize: 12 }}>
                <option value={1}>1x</option>
                <option value={2}>2x</option>
                <option value={3}>3x</option>
              </select>
            </div>
          </Field>

          <Field
            label="Code"
            hint={
              codeFramework === 'react'
                ? 'A React component using @diagram-kit/react, with the current graph, theme, and settings baked in.'
                : "Works in Vue, Angular, plain HTML, or anywhere else — it's a real Custom Element (@diagram-kit/element) once registered."
            }
          >
            <ToggleGroup value={codeFramework} options={['react', 'element'] as const} onChange={setCodeFramework} />
            {codeSnippet && (
              <div style={{ position: 'relative', marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(codeSnippet).then(() => {
                      setCodeCopied(true)
                      setTimeout(() => setCodeCopied(false), 1500)
                    })
                  }}
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    fontSize: 11,
                    padding: '3px 8px',
                    border: '1px solid #DADCE0',
                    borderRadius: 4,
                    background: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  {codeCopied ? 'Copied!' : 'Copy'}
                </button>
                <pre
                  style={{
                    margin: 0,
                    maxHeight: 280,
                    overflow: 'auto',
                    fontSize: 10.5,
                    lineHeight: 1.5,
                    fontFamily: 'monospace',
                    background: '#1E2126',
                    color: '#D6DBE0',
                    padding: '10px 12px',
                    borderRadius: 6,
                  }}
                >
                  <code>{codeSnippet}</code>
                </pre>
              </div>
            )}
          </Field>
        </Section>
      </div>

      <div style={{ flex: 1, overflow: 'auto', background: displayTheme[mode].background, padding: paddingPx }}>
        {graph && (
          <DiagramView
            graph={graph}
            layoutMode={layoutMode}
            layout={{ direction }}
            theme={displayTheme}
            mode={mode}
            showDetailPanel={showDetailPanel}
            detailPanelPosition={detailPanelPosition}
            glass={glass}
            colorizeNodes={colorizeNodes}
          />
        )}
      </div>
    </div>
  )
}
