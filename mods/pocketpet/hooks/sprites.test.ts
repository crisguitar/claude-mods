import { describe, expect, test } from 'claude-code/testing'

import type { Pet } from '../types'
import { SPECIES, hatch } from './game'
import { WIDTH, sprite } from './sprites'

const stages = ['egg', 'baby', 'child', 'teen', 'adult', 'senior', 'dead'] as const

describe('sprites', () => {
  test('every species draws four lines at every stage and mood', async () => {
    for (const species of SPECIES) {
      for (const stage of stages) {
        for (const kind of ['good', 'ok', 'bad'] as const) {
          const p: Pet = { ...hatch(0, 'x', species), stage, kind }
          for (const frame of [0, 1, 3]) {
            const art = sprite(p, frame, false)
            expect(art.length).toBe(4)
            for (const line of art) expect(line.length).toBeLessThanOrEqual(WIDTH)
          }
        }
      }
    }
  })

  test('hatching picks a species at random, or the one asked for', async () => {
    expect(hatch(0, 'x', 'crab').species).toBe('crab')
    expect(hatch(0, 'x', undefined, () => 0).species).toBe('cat')
    expect(hatch(0, 'x', undefined, () => 0.99).species).toBe('dragon')
  })

  test('pets are drawn left-right symmetric', async () => {
    // a quadrant block mirrored swaps its left and right pixels
    const QUAD = ' ▘▝▀▖▌▞▛▗▚▐▜▄▙▟█'
    const flip = (ch: string) => {
      const i = QUAD.indexOf(ch)
      return i < 0 ? ch : QUAD[((i & 5) << 1) | ((i & 10) >> 1)]!
    }
    const mirror = (l: string) => [...l.trim()].reverse().map(flip).join('')
    for (const species of SPECIES) {
      for (const stage of ['egg', 'baby', 'child', 'teen', 'adult', 'senior', 'dead'] as const) {
        if (stage === 'egg') continue // the crack runs one way
        for (const line of sprite({ ...hatch(0, 'x', species), stage }, 0, false)) expect(mirror(line)).toBe(line.trim())
      }
    }
  })

  test('a pet looks different at every stage', async () => {
    for (const species of SPECIES) {
      const forms = new Set(stages.map(stage => sprite({ ...hatch(0, 'x', species), stage }, 0, false).join('\n')))
      expect(forms.size).toBe(stages.length)
    }
  })

  test('species look different at the same stage', async () => {
    const forms = new Set(SPECIES.map(s => sprite({ ...hatch(0, 'x', s), stage: 'adult' }, 0, false).join('\n')))
    expect(forms.size).toBe(SPECIES.length)
  })
})
