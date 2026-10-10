import type { Pet } from '../types'

export const WIDTH = 9

const pad = (s: string) => s.padEnd(WIDTH)

/** Three lines of art for the pet's stage and mood; `frame` alternates for the idle animation. */
export const sprite = (p: Pet, frame: number, asleep: boolean): string[] => {
  if (p.stage === 'dead') return [' .---. ', ' | RIP | ', ' |_____| '].map(pad)
  if (p.stage === 'egg') return (frame % 2 ? [' .-. ', '( . )', " '-' "] : ['  .-. ', ' (   )', "  '-' "]).map(pad)

  const sad = p.hunger === 0 || p.happy === 0 || p.call !== null
  const blink = frame % 4 === 3
  const e = asleep ? '-' : p.isSick ? '@' : blink ? '-' : sad ? 'T' : 'o'
  const score = p.hunger + p.happy
  const m = asleep ? '_' : p.isSick ? '~' : score >= 6 ? 'u' : score >= 3 ? '_' : 'n'
  const face = `${e}${m}${e}`
  const crown = p.kind === 'good' ? '♛' : p.kind === 'bad' ? '!' : '·'

  const art: Record<string, string[]> = {
    baby: [' .-. ', `(${face})`, " '-' "],
    child: [' /\\_/\\ ', `( ${face} )`, ' (")(") '],
    teen: [' /\\_/\\ ', `=(${face})=`, ' /|_|\\ '],
    adult: [`  ${crown}${crown}${crown}  `, ` (${face}) `, ' /|_|\\ '],
    senior: [`  ~~~  `, ` (${face}) `, ' /| |\\ '],
  }
  const lines = art[p.stage] ?? art.baby!
  return lines.map(l => pad(frame % 2 ? ` ${l}` : l))
}
