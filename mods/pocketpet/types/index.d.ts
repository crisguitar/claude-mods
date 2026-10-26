export type Stage = 'egg' | 'baby' | 'child' | 'teen' | 'adult' | 'senior' | 'dead'
export type Call = { kind: 'hungry' | 'unhappy' | 'sleepy' | 'sick' | 'fake'; since: number; isMarked: boolean }
export type Game = { round: number; wins: number; last: string }

export type Species = 'cat' | 'dog' | 'octopus' | 'crab' | 'dragon'

export type Pet = {
  /** bumped on every save; the newest copy wins when sessions share the pet */
  rev: number
  name: string
  species: Species
  stage: Stage
  /** care quality at the last evolution: 'good' | 'ok' | 'bad' */
  kind: 'good' | 'ok' | 'bad'
  bornAt: number
  stageAt: number
  lastAt: number
  hunger: number
  happy: number
  weight: number
  discipline: number
  mistakes: number
  poop: number
  isSick: boolean
  sickSince: number
  doses: number
  isLightsOff: boolean
  call: Call | null
  game: Game | null
  /** minutes the pet has spent at zero hearts, and sleeping with the lights on */
  starveMin: number
  sadMin: number
  litMin: number
  /** minute accumulators toward the next heart lost / poop */
  hungerAcc: number
  happyAcc: number
  poopAcc: number
  msg: string
  cause: string
}

/** `at` is the frame of the last click on the pet, `n` counts clicks (picks the reaction) */
export type Poke = { at: number; n: number }

export type View = { pet: Pet | null; frame: number; isOpen: boolean; isStats: boolean; poke: Poke | null }

declare module 'claude-code' {
  interface PluginState {
    pocketpet: { view: View }
  }
}
