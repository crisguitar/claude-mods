import type { Pet, Species, Stage } from '../types'

export const MAX = 4
const MIN = 60_000
const HOUR = 60 * MIN

/** How long each stage lasts, in minutes of real time. */
const LENGTH: Record<Exclude<Stage, 'senior' | 'dead'>, number> = {
  egg: 3,
  baby: 60,
  child: 12 * 60,
  teen: 2 * 24 * 60,
  adult: 7 * 24 * 60,
}
const NEXT: Record<string, Stage> = { egg: 'baby', baby: 'child', child: 'teen', teen: 'adult', adult: 'senior' }
const LIFESPAN = 14 * 24 * 60

const CALL_GRACE = 15 // minutes before an unanswered call is a care mistake
const STARVE_DEATH = 4 * 60
const SAD_DEATH = 6 * 60
const SICK_DEATH = 3 * 60
const CATCH_UP = 5 * 60 // longest stretch simulated after the session was closed

export type Rng = () => number

export const isBedtime = (ms: number) => {
  const h = new Date(ms).getHours()
  return h >= 22 || h < 7
}

export const SPECIES: Species[] = ['cat', 'dog', 'octopus', 'crab', 'dragon']

export const hatch = (now: number, name = 'Pet', species?: Species, rng: Rng = Math.random): Pet => ({
  name, species: species ?? SPECIES[Math.floor(rng() * SPECIES.length)]!, stage: 'egg', kind: 'good', bornAt: now, stageAt: now, lastAt: now,
  hunger: MAX, happy: MAX, weight: 5, discipline: 0, mistakes: 0, poop: 0,
  isSick: false, sickSince: 0, doses: 0, isLightsOff: false, call: null, game: null,
  starveMin: 0, sadMin: 0, litMin: 0, hungerAcc: 0, happyAcc: 0, poopAcc: 0,
  msg: 'An egg! Something is moving inside...', cause: '',
})

export const ageDays = (p: Pet, now: number) => Math.floor((now - p.bornAt) / (24 * HOUR))

export const isAsleep = (p: Pet, now: number) => p.stage !== 'egg' && p.stage !== 'dead' && isBedtime(now)

const die = (p: Pet, cause: string): Pet => ({
  ...p, stage: 'dead', call: null, game: null, cause, msg: `${p.name} passed away (${cause}). /pet new for a new egg.`,
})

const kindOf = (p: Pet): Pet['kind'] =>
  p.mistakes <= 2 && p.discipline >= 25 ? 'good' : p.mistakes <= 5 ? 'ok' : 'bad'

const evolve = (p: Pet, to: Stage, now: number): Pet => {
  const next: Pet = { ...p, stage: to, stageAt: now }
  if (to === 'baby') return { ...next, msg: `${p.name} hatched!` }
  const kind = kindOf(p)
  return { ...next, kind, mistakes: to === 'senior' ? p.mistakes : 0, msg: `${p.name} grew into a ${to}${kind === 'bad' ? ' (a bit naughty)' : ''}!` }
}

/** Raise a call unless one is already up. */
const raise = (p: Pet, kind: NonNullable<Pet['call']>['kind'], now: number): Pet =>
  p.call ? p : { ...p, call: { kind, since: now, isMarked: false } }

/** One minute of the pet's life, at wall-clock time `now`. */
const minute = (p: Pet, now: number, rng: Rng): Pet => {
  if (p.stage === 'dead') return p
  let q = { ...p }

  const age = (now - q.bornAt) / MIN
  if (age > LIFESPAN) return die(q, 'old age')
  if (q.stage !== 'senior') {
    const len = LENGTH[q.stage as keyof typeof LENGTH]
    if ((now - q.stageAt) / MIN >= len) q = evolve(q, NEXT[q.stage]!, now)
  }
  if (q.stage === 'egg') return q

  // night: wake up at 07:00 with the lights on again
  const asleep = isBedtime(now)
  if (!asleep && q.isLightsOff) q = { ...q, isLightsOff: false }

  if (asleep && q.isLightsOff) {
    // sleeping in the dark: nothing wears down, and a sleepy call is answered
    q = { ...q, litMin: 0, call: q.call?.kind === 'sleepy' ? null : q.call }
  } else {
    if (asleep) {
      q = { ...q, litMin: q.litMin + 1 }
      if (q.litMin >= 10) q = raise(q, 'sleepy', now)
    }
    const baby = q.stage === 'baby'
    q.hungerAcc += 1
    q.happyAcc += 1
    q.poopAcc += 1
    if (q.hungerAcc >= (baby ? 12 : 20)) { q.hungerAcc = 0; q.hunger = Math.max(0, q.hunger - 1) }
    if (q.happyAcc >= (baby ? 15 : 25)) { q.happyAcc = 0; q.happy = Math.max(0, q.happy - 1) }
    if (!asleep && q.poopAcc >= 45) { q.poopAcc = 0; q.poop = Math.min(MAX, q.poop + 1) }

    q.starveMin = q.hunger === 0 ? q.starveMin + 1 : 0
    q.sadMin = q.happy === 0 ? q.sadMin + 1 : 0
    if (q.starveMin >= STARVE_DEATH) return die(q, 'starvation')
    if (q.sadMin >= SAD_DEATH) return die(q, 'loneliness')

    if (q.hunger === 0) q = raise(q, 'hungry', now)
    if (q.happy === 0) q = raise(q, 'unhappy', now)

    if (!q.isSick && q.poop >= 2 && rng() < 0.002 * q.poop) {
      q = { ...q, isSick: true, sickSince: now, doses: 0, msg: `${q.name} got sick!` }
      q = raise(q, 'sick', now)
    }
    // a call with nothing behind it: the pet just wants attention (scold it)
    if (!asleep && !q.call && !q.isSick && q.hunger > 0 && q.happy > 0 && rng() < 1 / 900) {
      q = raise(q, 'fake', now)
    }
  }

  if (q.isSick && (now - q.sickSince) / MIN >= SICK_DEATH) return die(q, 'illness')

  if (q.call && (now - q.call.since) / MIN >= CALL_GRACE) {
    if (q.call.kind === 'fake') q = { ...q, call: null }
    else if (!q.call.isMarked) q = { ...q, mistakes: q.mistakes + 1, call: { ...q.call, isMarked: true } }
  }
  return q
}

/** Bring the pet up to `now`; closed-session gaps are capped so a weekend away is survivable. */
export const advance = (p: Pet, now: number, rng: Rng = Math.random): Pet => {
  if (p.stage === 'dead' || now <= p.lastAt) return { ...p, lastAt: Math.max(p.lastAt, now) }
  const gap = Math.min(now - p.lastAt, CATCH_UP * MIN)
  const start = now - gap
  let q = p
  const steps = Math.floor(gap / MIN)
  for (let i = 1; i <= steps && q.stage !== 'dead'; i++) q = minute(q, start + i * MIN, rng)
  // sick/called timestamps are wall-clock: shift if we skipped time, so skipped hours don't count as neglect
  const skipped = now - p.lastAt - gap
  if (skipped > 0) {
    q = { ...q, sickSince: q.isSick ? q.sickSince + skipped : 0, call: q.call && { ...q.call, since: q.call.since + skipped } }
  }
  // keep the sub-minute remainder so frequent ticks do not lose time
  return { ...q, lastAt: p.lastAt + skipped + steps * MIN }
}

export type Action = 'feed' | 'snack' | 'play' | 'left' | 'right' | 'medicine' | 'clean' | 'light' | 'scold'
export type Outcome = { pet: Pet; ok: boolean }

const say = (p: Pet, msg: string, ok = false): Outcome => ({ pet: { ...p, msg }, ok })

export const act = (p: Pet, action: Action, now: number, rng: Rng = Math.random): Outcome => {
  if (p.stage === 'dead') return say(p, `${p.name} is gone. Start over with /pet new.`)
  if (p.stage === 'egg') return say(p, 'The egg is not ready yet. Wait for it to hatch.')
  const asleep = isAsleep(p, now)
  const clearCall = (q: Pet, kinds: string[]): Pet => (q.call && kinds.includes(q.call.kind) ? { ...q, call: null } : q)

  if (action === 'light') {
    const off = !p.isLightsOff
    return say({ ...p, isLightsOff: off, litMin: 0, call: off ? clearCall(p, ['sleepy']).call : p.call }, off ? 'Lights off.' : 'Lights on.', true)
  }
  if (asleep && p.isLightsOff) return say(p, `${p.name} is sleeping. Zzz... (turn the lights on to wake it)`)

  switch (action) {
    case 'feed': {
      if (p.hunger >= MAX) return say(p, `${p.name} is full.`)
      const q = clearCall({ ...p, hunger: p.hunger + 1, weight: p.weight + 1 }, ['hungry'])
      return say(q, 'Nom nom nom!', true)
    }
    case 'snack': {
      if (p.happy >= MAX) return say(p, `${p.name} does not want a snack right now.`)
      let q = clearCall({ ...p, happy: p.happy + 1, weight: p.weight + 2 }, ['unhappy'])
      if (!q.isSick && rng() < 0.08 * Math.max(1, q.weight / 10)) q = raise({ ...q, isSick: true, sickSince: now, doses: 0 }, 'sick', now)
      return say(q, q.isSick && !p.isSick ? 'Yum! ...but the snack made it feel sick.' : 'Yum! A tasty snack.', true)
    }
    case 'play': {
      if (p.isSick) return say(p, `${p.name} is too sick to play.`)
      return say({ ...p, game: { round: 0, wins: 0, last: '' } }, 'Guess where it looks: /pet left or /pet right (5 rounds).', true)
    }
    case 'left':
    case 'right': {
      if (!p.game) return say(p, 'Start a game first: /pet play')
      const pick = rng() < 0.5 ? 'left' : 'right'
      const won = pick === action
      const g = { round: p.game.round + 1, wins: p.game.wins + (won ? 1 : 0), last: `${won ? 'Yes!' : 'Nope.'} It looked ${pick}.` }
      if (g.round < 5) return say({ ...p, game: g }, `${g.last} (${g.wins}/${g.round})`, true)
      const win = g.wins >= 3
      let q: Pet = { ...p, game: null, weight: Math.max(1, p.weight - 1) }
      if (win) q = clearCall({ ...q, happy: Math.min(MAX, q.happy + 1) }, ['unhappy'])
      return say(q, `${g.last} Final ${g.wins}/5 — ${win ? 'you win! +1 happy' : 'you lose.'}`, true)
    }
    case 'medicine': {
      if (!p.isSick) return say(p, `${p.name} is not sick.`)
      if (p.doses + 1 < 2) return say({ ...p, doses: p.doses + 1 }, 'Ouch, bitter. One more dose should do it.', true)
      return say(clearCall({ ...p, isSick: false, sickSince: 0, doses: 0 }, ['sick']), `${p.name} feels better!`, true)
    }
    case 'clean': {
      if (p.poop === 0) return say(p, 'Nothing to clean.')
      return say({ ...p, poop: 0 }, 'Flush! All clean.', true)
    }
    case 'scold': {
      if (p.call?.kind === 'fake') {
        return say({ ...p, call: null, discipline: Math.min(100, p.discipline + 25) }, `${p.name} was just being naughty. Discipline up!`, true)
      }
      if (p.call) return say(p, `${p.name} has a real need — check what it wants.`)
      return say(p, `${p.name} did nothing wrong.`)
    }
  }
}

export const rename = (p: Pet, name: string): Pet => ({ ...p, name: name.slice(0, 16) || p.name, msg: `Name set to ${name.slice(0, 16)}.` })

export const hearts = (n: number) => [...'♥'.repeat(n), ...'♡'.repeat(MAX - n)].join(' ')

export const callText = (p: Pet): string | null => {
  const k = p.call?.kind
  return k === 'hungry' ? 'is hungry' : k === 'unhappy' ? 'is bored' : k === 'sleepy' ? 'wants lights off' : k === 'sick' ? 'is sick' : k === 'fake' ? 'wants attention' : null
}

export const statusText = (p: Pet, now: number) =>
  [
    `${p.name} — ${p.stage === 'egg' ? 'egg' : `${p.species} ${p.stage}`}${p.stage === 'dead' ? ` (${p.cause})` : ''}, age ${ageDays(p, now)}d`,
    `hunger ${hearts(p.hunger)}  happy ${hearts(p.happy)}  weight ${p.weight}`,
    `discipline ${p.discipline}%  care mistakes ${p.mistakes}  poop ${p.poop}${p.isSick ? '  SICK' : ''}`,
  ].join('\n')
