// Prints every species at every stage, then an adult's moods, in colour: node --experimental-strip-types mods/pocketpet/preview.ts [species]
import { SPECIES, hatch } from './hooks/game.ts'
import { colorOf, sprite } from './hooks/sprites.ts'
import type { Pet } from './types/index.d.ts'

const rgb = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(';')
const stages = ['egg', 'baby', 'child', 'teen', 'adult', 'senior'] as const
const only = process.argv[2]

const table = (labels: string[], arts: string[][], color: string) => {
  console.log(`\x1b[2m${labels.map(s => s.padEnd(14)).join('')}\x1b[0m`)
  for (let r = 0; r < 4; r++) console.log(arts.map(a => `\x1b[38;2;${rgb(color)}m${a[r]!.padEnd(14)}\x1b[0m`).join(''))
}

for (const species of SPECIES.filter(s => !only || s === only)) {
  console.log(`\n\x1b[1m${species}\x1b[0m`)
  const pet = (patch: Partial<Pet>): Pet => ({ ...hatch(0, 'x', species), ...patch })
  table([...stages], stages.map(stage => sprite(pet({ stage }), 0, false)), colorOf(pet({})))
  const adult = pet({ stage: 'adult' })
  table(
    ['smile', 'step', 'blink', 'petted', 'asleep', 'sad'],
    [
      sprite(adult, 0, false),
      sprite(adult, 1, false),
      sprite(adult, 3, false),
      sprite(adult, 0, false, true),
      sprite(adult, 0, true),
      sprite({ ...adult, hunger: 0 }, 0, false),
    ],
    colorOf(adult),
  )
}
