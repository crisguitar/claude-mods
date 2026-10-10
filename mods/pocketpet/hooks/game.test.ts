import { describe, expect, test } from 'claude-code/testing'

import type { Pet } from '../types'
import { act, advance, hatch } from './game'

const MIN = 60_000
// 2026-03-02 12:00 local: daytime, well away from bedtime
const noon = new Date(2026, 2, 2, 12, 0, 0).getTime()
const never = () => 0.999
const always = () => 0

const child = (now = noon): Pet => ({ ...hatch(now, 'Momo'), stage: 'child' as const, stageAt: now })

describe('life', () => {
  test('an egg hatches after a few minutes', async () => {
    const p = advance(hatch(noon), noon + 4 * MIN, never)
    expect(p.stage).toBe('baby')
  })

  test('hunger and happiness fall, then the pet calls', async () => {
    const p = advance(child(), noon + 5 * 60 * MIN, never)
    expect(p.hunger).toBe(0)
    expect(p.call?.kind).toBe('hungry')
    expect(p.mistakes).toBeGreaterThan(0)
  })

  test('starving to the limit kills the pet', async () => {
    let p = child()
    for (let i = 0; i < 6; i++) p = advance(p, noon + (i + 1) * 5 * 60 * MIN, never)
    expect(p.stage).toBe('dead')
    expect(p.cause).toBe('starvation')
  })

  test('sub-minute ticks do not lose time', async () => {
    let p = child()
    for (let i = 1; i <= 120; i++) p = advance(p, noon + i * 30_000, never)
    expect(p.lastAt).toBe(noon + 60 * MIN)
    expect(p.hunger).toBe(1) // 60 min at 20 min per heart: 4 → 1
  })

  test('lights off lets the pet sleep through the night', async () => {
    const night = new Date(2026, 2, 2, 23, 0, 0).getTime()
    const base = child(night)
    const dark = act(base, 'light', night).pet
    const slept = advance(dark, night + 2 * 60 * MIN, never)
    expect(slept.hunger).toBe(4)
    const lit = advance(base, night + 2 * 60 * MIN, never)
    expect(lit.call?.kind).toBe('sleepy')
  })
})

describe('care', () => {
  test('feeding fills a heart and answers the hunger call', async () => {
    const hungry = advance(child(), noon + 5 * 60 * MIN, never)
    const fed = act({ ...hungry, hunger: 0 }, 'feed', noon + 5 * 60 * MIN).pet
    expect(fed.hunger).toBe(1)
    expect(fed.call).toBeNull()
  })

  test('a full pet refuses a meal', async () => {
    const r = act(child(), 'feed', noon)
    expect(r.ok).toBe(false)
    expect(r.pet.msg).toMatch(/full/)
  })

  test('medicine needs two doses', async () => {
    const sick = { ...child(), isSick: true, sickSince: noon }
    const one = act(sick, 'medicine', noon).pet
    expect(one.isSick).toBe(true)
    expect(act(one, 'medicine', noon).pet.isSick).toBe(false)
  })

  test('clean removes poop', async () => {
    expect(act({ ...child(), poop: 3 }, 'clean', noon).pet.poop).toBe(0)
  })

  test('scolding a fake call raises discipline', async () => {
    const fake = { ...child(), call: { kind: 'fake' as const, since: noon, isMarked: false } }
    const p = act(fake, 'scold', noon).pet
    expect(p.call).toBeNull()
    expect(p.discipline).toBe(25)
  })

  test('the guessing game pays out on 3 of 5', async () => {
    let p = { ...child(), happy: 1 }
    p = act(p, 'play', noon).pet
    for (let i = 0; i < 5; i++) p = act(p, 'left', noon, always).pet // pet always looks left
    expect(p.game).toBeNull()
    expect(p.happy).toBe(2)
  })

  test('a dead pet cannot be cared for', async () => {
    const dead = { ...child(), stage: 'dead' as const }
    expect(act(dead, 'feed', noon).ok).toBe(false)
  })
})
