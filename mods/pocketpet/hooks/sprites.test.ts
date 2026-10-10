import { describe, expect, test } from 'claude-code/testing'

import type { Pet } from '../types'
import { SPECIES, hatch } from './game'
import { WIDTH, sprite } from './sprites'

const stages = ['egg', 'baby', 'child', 'teen', 'adult', 'senior', 'dead'] as const

describe('sprites', () => {
  test('every species draws three lines at every stage and mood', async () => {
    for (const species of SPECIES) {
      for (const stage of stages) {
        for (const kind of ['good', 'ok', 'bad'] as const) {
          const p: Pet = { ...hatch(0, 'x', species), stage, kind }
          for (const frame of [0, 1, 3]) {
            const art = sprite(p, frame, false)
            expect(art.length).toBe(3)
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

  test('species look different at the same stage', async () => {
    const forms = new Set(SPECIES.map(s => sprite({ ...hatch(0, 'x', s), stage: 'adult' }, 0, false).join('\n')))
    expect(forms.size).toBe(SPECIES.length)
  })
})
