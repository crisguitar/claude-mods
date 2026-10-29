import type { Pet, Species } from '../types'

export const WIDTH = 12

const pad = (s: string) => s.padEnd(WIDTH)

/**
 * Pixel art after Clawd, the Claude Code mascot. Each text cell holds 2×2 pixels as a quadrant
 * block (▐▛███▜▌), so a 24×8 bitmap is 12 columns by 4 lines. Pixels are about twice as tall as
 * they are wide. Bodies start on an odd column so their edges fall mid-cell, as Clawd's do.
 *
 * '#' body, '.' empty, and face pixels that are holes only for some moods:
 * 'e' eye (always), 'l' lid (closed: e + l make a dash), 'h' happy (e + h make a ^),
 * 'm' mouth corner (any mouth), 's' smile (m + s make a ⊔), 'f' frown (m + f make a ⊓).
 */
type Frames = [string[], string[]]
type Art = { head: string[]; legs: Frames; child: string[]; childLegs: Frames; teen?: string[] }

const WALK: Frames = [['.....#.#........#.#.....'], ['....#..#........#..#....']]
const TODDLE: Frames = [['......#.#......#.#......'], ['.....#..#......#..#.....']]

/** The body every grown pet shares: Clawd's arms, eyes and mouth. */
const BODY = [
  '...##################...',
  '...###lel######lel###...',
  '.#####h#h#mffm#h#h#####.',
  '...#######mssm#######...',
  '...##################...',
]
const CHILD_BODY = [
  '....################....',
  '....##lel######lel##....',
  '....##h#h#mffm#h#h##....',
  '....######mssm######....',
  '....################....',
]
const NONE = '........................'

const SPECIES: Record<Species, Art> = {
  cat: {
    head: [
      '....#..............#....',
      '....###..........###....',
      ...BODY,
    ],
    legs: WALK,
    child: [NONE, '.....##..........##.....', ...CHILD_BODY],
    childLegs: TODDLE,
  },
  dog: {
    head: [
      NONE,
      '.###................###.',
      '########################',
      '##.###lel######lel###.##',
      '##.###h#h#mffm#h#h###.##',
      '##.#######mssm#######.##',
      '...##################...',
    ],
    // ears still short
    teen: [
      NONE,
      NONE,
      '.######################.',
      '##.###lel######lel###.##',
      '##.###h#h#mffm#h#h###.##',
      '...#######mssm#######...',
      '...##################...',
    ],
    legs: WALK,
    child: [
      NONE,
      NONE,
      '..####################..',
      '.##.##lel######lel##.##.',
      '.##.##h#h#mffm#h#h##.##.',
      '....######mssm######....',
      '....################....',
    ],
    childLegs: TODDLE,
  },
  octopus: {
    head: [
      '.......##########.......',
      '.....##############.....',
      '...###lel######lel###...',
      '...###h#h#mffm#h#h###...',
      '...#######mssm#######...',
      '...##################...',
    ],
    legs: [
      ['....##..##....##..##....', '...#...#........#...#...'],
      ['....##..##....##..##....', '......#...#..#...#......'],
    ],
    child: [
      NONE,
      '......############......',
      '....##lel######lel##....',
      '....##h#h#mffm#h#h##....',
      '....######mssm######....',
      '....################....',
    ],
    childLegs: [
      ['.....##..##..##..##.....', '....#...#......#...#....'],
      ['.....##..##..##..##.....', '.......#...##...#.......'],
    ],
  },
  crab: {
    head: [
      '#.#..................#.#',
      '###..................###',
      '.#.##################.#.',
      '.#.###lel######lel###.#.',
      '.#####h#h#mffm#h#h#####.',
      '...#######mssm#######...',
      '...##################...',
    ],
    legs: [['....#.#.#......#.#.#....'], ['...#.#.#........#.#.#...']],
    child: [
      NONE,
      '.###................###.',
      '..#.################.#..',
      '..#.##lel######lel##.#..',
      '..####h#h#mffm#h#h####..',
      '....######mssm######....',
      '....################....',
    ],
    childLegs: [['.....#.#.#....#.#.#.....'], ['....#.#.#......#.#.#....']],
  },
  dragon: {
    head: [
      '...#................#...',
      '....##............##....',
      '#..##################..#',
      '##.###lel######lel###.##',
      '######h#h#mffm#h#h######',
      '...#######mssm#######...',
      '...##################...',
    ],
    legs: WALK,
    child: [
      NONE,
      NONE,
      '.#..################..#.',
      '.##.##lel######lel##.##.',
      '.#####h#h#mffm#h#h#####.',
      '....######mssm######....',
      '....################....',
    ],
    childLegs: TODDLE,
  },
}

/** Each species has its own colour; Dracula palette. */
const COLORS: Record<Species, string> = {
  cat: '#ffb86c',
  dog: '#8be9fd',
  octopus: '#ff79c6',
  crab: '#50fa7b',
  dragon: '#ff5555',
}

export const colorOf = (p: Pet) => COLORS[p.species] ?? COLORS.cat

/** A baby is a tiny Clawd with a hint of what it will become. */
const BABY_FACE = ['.......##########.......', '.......#lel##lel#.......', '.......#h#h##h#h#.......']
const BABY: Record<Species, string[]> = {
  cat: ['.......#........#.......', ...BABY_FACE],
  dog: [NONE, '.....##############.....', '.....#.#lel##lel#.#.....', '.....#.#h#h##h#h#.#.....'],
  octopus: ['.........######.........', ...BABY_FACE],
  crab: ['......#..........#......', ...BABY_FACE],
  dragon: ['........#......#........', ...BABY_FACE],
}

const babyRows = (s: Species, frame: number): string[] => [
  NONE,
  NONE,
  ...(BABY[s] ?? BABY.cat),
  '.......##########.......',
  frame % 2 ? '.......#........#.......' : '........#......#........',
]

const EGG = [
  NONE,
  '..........####..........',
  '........#####.##........',
  '.......#######.##.......',
  '......#######.####......',
  '......############......',
  '.......##########.......',
  '.........######.........',
]
// tilts by a pixel at the top
const EGG_WOBBLE = [
  NONE,
  '...........####.........',
  '.........#####.##.......',
  '.......#######.##.......',
  '......#######.####......',
  '......############......',
  '.......##########.......',
  '.........######.........',
]

/** A headstone with a cross cut into it, on a wider plinth. */
const TOMB = [
  '.........######.........',
  '........########........',
  '.......####..####.......',
  '.......##......##.......',
  '.......####..####.......',
  '.......####..####.......',
  '.......##########.......',
  '.....##############.....',
]

type Eyes = 'open' | 'shut' | 'happy'
type Mouth = 'smile' | 'frown' | 'none'

/** Quadrant block for a 2×2 pixel cell, indexed by top-left 1, top-right 2, bottom-left 4, bottom-right 8. */
const QUAD = ' ▘▝▀▖▌▞▛▗▚▐▜▄▙▟█'

/** Rows of pixels -> text lines, centred into WIDTH columns. */
const render = (rows: string[], eyes: Eyes, mouth: Mouth): string[] => {
  const w = Math.max(...rows.map(r => r.length))
  const left = ' '.repeat(Math.floor((WIDTH - Math.ceil(w / 2)) / 2))
  const hole: Record<string, boolean> = {
    '.': true, e: true, l: eyes === 'shut', h: eyes === 'happy',
    m: mouth !== 'none', s: mouth === 'smile', f: mouth === 'frown',
  }
  const on = (r: number, c: number) => (hole[rows[r]?.[c] ?? '.'] ? 0 : 1)
  const out: string[] = []
  for (let r = 0; r < rows.length; r += 2) {
    let line = left
    for (let c = 0; c < w; c += 2) line += QUAD[on(r, c) + 2 * on(r, c + 1) + 4 * on(r + 1, c) + 8 * on(r + 1, c + 1)]
    out.push(line.trimEnd())
  }
  return out
}

/** Pixel-art lines for the pet's species, stage and mood; `frame` alternates for the idle animation. */
export const sprite = (p: Pet, frame: number, asleep: boolean, joy = false): string[] => {
  if (p.stage === 'dead') return render(TOMB, 'open', 'none').map(pad)
  if (p.stage === 'egg') return render(frame % 2 ? EGG_WOBBLE : EGG, 'shut', 'none').map(pad)

  const sad = p.hunger === 0 || p.happy === 0 || p.call !== null
  // seniors always have the squint of an old, content pet
  const eyes: Eyes = joy || (p.stage === 'senior' && !asleep) ? 'happy' : asleep || (frame % 4 === 3 && !p.isSick) ? 'shut' : 'open'
  const mouth: Mouth = joy ? 'smile' : asleep ? 'none' : sad || p.isSick ? 'frown' : p.hunger + p.happy >= 6 ? 'smile' : 'none'

  const art = SPECIES[p.species] ?? SPECIES.cat
  const alt = frame % 2
  let rows: string[]
  if (p.stage === 'baby') rows = babyRows(p.species, frame)
  else if (p.stage === 'child') rows = [...art.child, ...art.childLegs[alt]]
  else {
    // the leg frame of an old pet always leans
    rows = [...art.head, ...art.legs[p.stage === 'senior' ? 1 : alt]]
    // teens have only half grown their ears, horns, claws, tuft or dome
    if (p.stage === 'teen') rows = [NONE, ...(art.teen ?? rows).slice(1, art.head.length), ...rows.slice(art.head.length)]
  }
  return render(rows, eyes, mouth).map(pad)
}
