import { describe, expect, it } from 'vitest'
import { estimateTextWidth, estimateNodeWidth, truncateLabel } from './textWidth.js'

describe('estimateTextWidth', () => {
  it('grows with string length', () => {
    expect(estimateTextWidth('aaaa')).toBeGreaterThan(estimateTextWidth('aa'))
  })

  it('returns 0 for an empty string', () => {
    expect(estimateTextWidth('')).toBe(0)
  })

  it('scales with font size', () => {
    expect(estimateTextWidth('hello', 24)).toBeGreaterThan(estimateTextWidth('hello', 12))
  })
})

describe('estimateNodeWidth', () => {
  it('never returns less than minWidth for a short label', () => {
    expect(estimateNodeWidth('A', undefined, { minWidth: 140 })).toBe(140)
  })

  it('grows past minWidth for a long label', () => {
    const width = estimateNodeWidth('A Very Long Label That Should Not Fit In The Default Box', undefined, {
      minWidth: 140,
      maxWidth: 500,
    })
    expect(width).toBeGreaterThan(140)
  })

  it('never exceeds maxWidth', () => {
    const width = estimateNodeWidth('A Very Long Label That Should Not Fit In The Default Box At All', undefined, {
      minWidth: 140,
      maxWidth: 200,
    })
    expect(width).toBeLessThanOrEqual(200)
  })

  it('accounts for badge text too', () => {
    const withoutBadge = estimateNodeWidth('Node', undefined, { minWidth: 0, maxWidth: 1000 })
    const withBadge = estimateNodeWidth('Node', 'a fairly long badge', { minWidth: 0, maxWidth: 1000 })
    expect(withBadge).toBeGreaterThan(withoutBadge)
  })
})

describe('truncateLabel', () => {
  it('returns the label unchanged if it already fits', () => {
    expect(truncateLabel('short', 1000)).toBe('short')
  })

  it('shortens and appends an ellipsis when it does not fit', () => {
    const result = truncateLabel('a very long label that will not fit in a small box', 60)
    expect(result.endsWith('…')).toBe(true)
    expect(result.length).toBeLessThan('a very long label that will not fit in a small box'.length)
  })

  it('never returns something wider than maxWidth once truncated', () => {
    const maxWidth = 50
    const result = truncateLabel('an extremely long label used to test truncation behavior', maxWidth)
    expect(estimateTextWidth(result)).toBeLessThanOrEqual(maxWidth)
  })
})
