import type { Pet, Stage } from '../types'

export const WIDTH = 12

const pad = (s: string) => s.padEnd(WIDTH)

type Limbs = Record<'child' | 'teen' | 'adult' | 'senior', string>
type Art = {
  small: (f: string) => string[]
  /** `a` is the accessory the adult wears: '*' well cared for, '' average, '!' naughty */
  big: (f: string, a: string, stage: Stage) => string[]
  limbs: Limbs
}

const SPECIES: Record<string, Art> = {
  cat: {
    small: f => ['/\\_/\\', `(${f})`, ' "-" '],
    big: (f, a) => [` ${a || ' '}/\\_/\\${a || ' '}`, `=( ${f} )=`],
    limbs: { child: ' (")(") ', teen: ' /|_|\\ ', adult: ' /|_|\\~ ', senior: ' /| |\\ ' },
  },
  dog: {
    small: f => [' ,___, ', `d(${f})b`, " '---' "],
    big: (f, a) => [` ,${a || '-'}---${a || '-'}, `, `d( ${f} )b`],
    limbs: { child: ' U"""""U ', teen: ' /|___|\\ ', adult: ' /|___|\\/ ', senior: ' /|   |\\ ' },
  },
  octopus: {
    small: f => [' .---. ', `(${f})`, ' /\\/\\/\\ '],
    big: (f, a) => [` .${a || '-'}---${a || '-'}. `, `( ${f} )`],
    limbs: { child: ' /\\/\\/\\ ', teen: ' \\/\\/\\/\\/ ', adult: '/|/|\\|\\|\\', senior: ' ~/~/~/~ ' },
  },
  crab: {
    small: f => ['\\(' + f + ')/', ' "   " ', ''],
    big: (f, a) => [`${a || 'V'}  ___  ${a || 'V'}`, `\\\\( ${f} )//`],
    limbs: { child: ' /\\ /\\ ', teen: '/\\/ \\/\\', adult: '<\\/\\ /\\/>', senior: ' /\\   /\\ ' },
  },
  dragon: {
    small: f => ['  ^ ^  ', `(${f})~`, ' /___\\ '],
    big: (f, a, stage) => [
      ` ${a || '^'}/^\\${a || '^'}`,
      stage === 'child' ? `(( ${f} ))>` : `<<( ${f} )>>`,
    ],
    limbs: { child: ' (_)(_) ', teen: ' /|_|\\~ ', adult: ' /|_|\\=~', senior: ' /| |\\ ' },
  },
}

export const SPECIES_LIST = Object.keys(SPECIES)

/** Art for the pet's species, stage and mood; `frame` alternates for the idle animation. */
export const sprite = (p: Pet, frame: number, asleep: boolean): string[] => {
  if (p.stage === 'dead') return [' .---. ', ' | RIP | ', ' |_____| '].map(pad)
  if (p.stage === 'egg') return (frame % 2 ? [' .-. ', '( . )', " '-' "] : ['  .-. ', ' (   )', "  '-' "]).map(pad)

  const sad = p.hunger === 0 || p.happy === 0 || p.call !== null
  const blink = frame % 4 === 3
  const e = asleep ? '-' : p.isSick ? '@' : blink ? '-' : sad ? 'T' : 'o'
  const score = p.hunger + p.happy
  const m = asleep ? '_' : p.isSick ? '~' : score >= 6 ? 'u' : score >= 3 ? '_' : 'n'
  const face = `${e}${m}${e}`

  const art = SPECIES[p.species] ?? SPECIES.cat!
  let lines: string[]
  if (p.stage === 'baby') {
    lines = art.small(face)
  } else if (p.stage === 'child') {
    lines = [...art.small(face).slice(0, 2), art.limbs.child]
  } else {
    const acc = p.stage === 'adult' ? (p.kind === 'good' ? '*' : p.kind === 'bad' ? '!' : '') : ''
    const limb = art.limbs[p.stage as keyof Limbs]
    lines = [...art.big(face, p.stage === 'senior' ? '~' : acc, p.stage), limb]
  }
  while (lines.length < 3) lines.push('')
  return lines.map(l => pad(frame % 2 ? ` ${l}` : l))
}
