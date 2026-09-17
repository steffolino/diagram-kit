import { describe, expect, it } from 'vitest'
import { pointsToSvgPath, blockArrowPoints, pointsToPolygon } from './path.js'

describe('pointsToSvgPath', () => {
  it('returns an empty string for no points', () => {
    expect(pointsToSvgPath([])).toBe('')
  })

  it('produces a single moveto for one point', () => {
    expect(pointsToSvgPath([{ x: 1, y: 2 }])).toBe('M 1 2')
  })

  it('starts with M and ends with L to the final point', () => {
    const path = pointsToSvgPath([
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 0 },
    ])
    expect(path.startsWith('M 0 0')).toBe(true)
    expect(path.endsWith('L 20 0')).toBe(true)
  })
})

describe('blockArrowPoints', () => {
  it('returns an empty array for fewer than 2 points', () => {
    expect(blockArrowPoints([{ x: 0, y: 0 }])).toEqual([])
  })

  it('returns an empty array for a zero-length segment', () => {
    expect(
      blockArrowPoints([
        { x: 5, y: 5 },
        { x: 5, y: 5 },
      ]),
    ).toEqual([])
  })

  it('produces a 7-point polygon (shaft + head) for a normal segment', () => {
    const points = blockArrowPoints([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ])
    expect(points).toHaveLength(7)
  })

  it('ends exactly at the segment endpoint (the arrow tip)', () => {
    const points = blockArrowPoints([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ])
    expect(points[3]).toEqual({ x: 100, y: 0 })
  })
})

describe('pointsToPolygon', () => {
  it('formats points as an SVG points attribute value', () => {
    expect(
      pointsToPolygon([
        { x: 1, y: 2 },
        { x: 3, y: 4 },
      ]),
    ).toBe('1,2 3,4')
  })

  it('returns an empty string for no points', () => {
    expect(pointsToPolygon([])).toBe('')
  })
})
