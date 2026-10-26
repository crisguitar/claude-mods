import { atom, read, update } from 'claude-code'
import type { EngineInterface as Engine, Register } from 'claude-code'

import type { Pet, Species, View } from '../types'
import { SPECIES, act, advance, ageDays, callText, hatch, hearts, isAsleep, rename, statusText } from './game'
import type { Action } from './game'
import { colorOf, sprite } from './sprites'

/** Dracula palette */
const PURPLE = '#bd93f9'
const ORANGE = '#ffb86c'
const RED = '#ff5555'

const view = atom(
  { plugin: 'pocketpet', key: 'view' } as const,
  { pet: null, frame: 0, isOpen: true, isStats: false, poke: null } as View,
)

const TICK = 1500
const SAVE_EVERY = 20 // ticks

const ALIASES: Record<string, Action> = {
  feed: 'feed', meal: 'feed', eat: 'feed',
  snack: 'snack', candy: 'snack',
  play: 'play', game: 'play',
  left: 'left', l: 'left', right: 'right', r: 'right',
  medicine: 'medicine', med: 'medicine', heal: 'medicine',
  clean: 'clean', toilet: 'clean', flush: 'clean',
  light: 'light', lights: 'light', sleep: 'light',
  scold: 'scold', discipline: 'scold',
}

/** What the pet does when clicked, by click count; eggs, sleepers and sick pets react differently. */
const REACTIONS = ['giggles', 'wiggles happily', 'wants more pets', 'does a little hop', 'is delighted', 'nuzzles you']
const POKE_FRAMES = 3

const HELP = [
  '/pet                show status',
  '/pet feed | snack | play | left | right | medicine | clean | light | scold',
  '/pet status | name <n> | show | hide | new [cat|dog|octopus|crab|dragon]',
].join('\n')

/** Every write bumps `rev`, so a session can tell whose copy of the pet is newer. */
const stamp = (p: Pet): Pet => ({ ...p, rev: (p.rev ?? 0) + 1 })

/** Other sessions share one saved pet: take theirs when it is newer than ours. */
const newest = async ($: Engine, mem: Pet | null): Promise<Pet | null> => {
  const saved = (await $.store.get('pet')) as Pet | undefined
  if (saved && (!mem || (saved.rev ?? 0) >= (mem.rev ?? 0))) return { ...saved, species: saved.species ?? 'cat' }
  return mem
}

/** Stamp, save and show `pet`; returns the stamped copy. */
const commit = async ($: Engine, pet: Pet): Promise<Pet> => {
  const out = stamp(pet)
  await $.store.set('pet', out as never)
  await update($, view, v => ({ ...v, pet: out }))
  return out
}

/** Apply `fn` to the newest pet, advanced to now; returns the saved result. */
const mutate = async ($: Engine, fn: (p: Pet, now: number) => Pet): Promise<Pet | null> => {
  const now = await $.clock.now()
  const base = await newest($, (await read($, view)).pet)
  if (!base) return null
  return commit($, fn(advance(base, now), now))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'pet', description: 'Care for your pocket pet', argumentHint: '[feed|snack|play|medicine|clean|light|scold|status|name|new|hide|show]' })
    const now = await $.clock.now()
    const stored = await newest($, null)
    await commit($, stored ? advance(stored, now) : hatch(now))

    let ticks = 0
    $.clock.every(TICK, async () => {
      const t = await $.clock.now()
      ticks++
      const before = await newest($, (await read($, view)).pet)
      let after = before ? advance(before, t) : null
      if (after && ticks % SAVE_EVERY === 0) after = await commit($, after)
      else await update($, view, v => ({ ...v, frame: v.frame + 1, pet: after }))
      if (after && before && !before.call && after.call && after.call.kind !== 'fake') await $.ui.toast(`${after.name} ${callText(after)}!`)
      if (after && before && before.stage !== after.stage) await $.ui.toast(after.msg)
    })

    return next(e)
  })

  on('command.run', { command: 'pet' }, async ($, e) => {
    const [word = '', ...rest] = e.args.trim().split(/\s+/)
    const cmd = word.toLowerCase()
    const now = await $.clock.now()

    if (cmd === 'help' || cmd === '?') return { text: HELP }
    if (cmd === 'show' || cmd === 'hide') {
      await update($, view, v => ({ ...v, isOpen: cmd === 'show' }))
      return { text: cmd === 'show' ? 'Pet shown.' : 'Pet hidden. /pet show brings it back.' }
    }
    if (cmd === 'new') {
      const cur = await newest($, (await read($, view)).pet)
      if (cur && cur.stage !== 'dead' && !rest.includes('force')) return { text: `${cur.name} is still alive. Use "/pet new force" (optionally with cat|dog|octopus|crab|dragon) to start over anyway.` }
      const want = rest.find(w => (SPECIES as string[]).includes(w.toLowerCase()))?.toLowerCase() as Species | undefined
      const pet = await commit($, { ...hatch(now, cur?.name, want), rev: cur?.rev ?? 0 })
      return { text: pet.msg }
    }
    if (cmd === 'name') {
      const name = rest.join(' ').trim()
      if (!name) return { text: 'Usage: /pet name <name>' }
      const pet = await mutate($, p => rename(p, name))
      return { text: pet?.msg ?? 'No pet yet.' }
    }
    if (cmd === '' || cmd === 'status' || cmd === 'stats') {
      const pet = await mutate($, p => p)
      return { text: pet ? `${statusText(pet, now)}\n\n${HELP}` : 'No pet yet.' }
    }

    const action = ALIASES[cmd]
    if (!action) return { text: `Unknown action "${cmd}".\n${HELP}` }
    const pet = await mutate($, (p, t) => act(p, action, t).pet)
    return { text: pet?.msg ?? 'No pet yet.' }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const v = await read($, view)
    if (!v.pet) return next(e)
    // other mods hook this band too: draw what sits below, then our card
    const below = await next(e)
    const { Box, Text, Button } = $.ui.resolve(e)
    const p = v.pet
    const now = await $.clock.now()
    const asleep = isAsleep(p, now)
    const dead = p.stage === 'dead'

    const run = (action: Action) => async () => {
      await mutate($, (cur, t) => act(cur, action, t).pet)
    }
    const set = (patch: Partial<View>) => () => void update($, view, cur => ({ ...cur, ...patch }))

    if (!v.isOpen) {
      return (
        <Box flexDirection="column">
          {below}
          <Box paddingRight={1}>
            <Box borderStyle="round" borderColor="subtle" paddingX={1} gap={1}>
              <Text dimColor>{p.name}{p.call ? ' !' : ''}</Text>
              <Button key="show" onPress={set({ isOpen: true })}>Show</Button>
            </Box>
          </Box>
        </Box>
      )
    }

    const poked = !!v.poke && v.frame - v.poke.at < POKE_FRAMES && !dead
    const joy = poked && !asleep && p.stage !== 'egg' && !p.isSick
    const pokeMsg = !poked || !v.poke ? null
      : p.stage === 'egg' ? 'The egg wobbles.'
      : asleep ? `${p.name} mumbles in its sleep... zzz`
      : p.isSick ? `${p.name} whimpers.`
      : `♥ ${p.name} ${REACTIONS[v.poke.n % REACTIONS.length]}!`
    // a poked pet bounces side to side while it reacts
    const shake = poked ? (v.frame - (v.poke?.at ?? 0)) % 2 === 0 ? ' ' : '' : ''
    const art = sprite(p, poked ? v.frame + 1 : v.frame, asleep && p.isLightsOff, joy).map(l => shake + l)
    const poke = () => void update($, view, cur => ({ ...cur, poke: { at: cur.frame, n: (cur.poke?.n ?? 0) + 1 } }))
    const dark = p.isLightsOff && !dead
    const call = callText(p)
    const level = (n: number) => (n <= 1 ? RED : n === 2 ? ORANGE : PURPLE)

    const buttons = dead
      ? [<Button key="new" variant="primary" onPress={() => void $.command.run({ command: 'pet', args: 'new' })}>New egg</Button>]
      : p.game
        ? [
            <Button key="left" variant="primary" hotkey="l" onPress={run('left')}>Left</Button>,
            <Button key="right" variant="primary" hotkey="r" onPress={run('right')}>Right</Button>,
          ]
        : [
            <Button key="pet" hotkey="a" onPress={poke}>Pet</Button>,
            <Button key="feed" hotkey="f" onPress={run('feed')}>Meal</Button>,
            <Button key="snack" hotkey="s" onPress={run('snack')}>Snack</Button>,
            <Button key="play" hotkey="p" onPress={run('play')}>Play</Button>,
            <Button key="medicine" hotkey="m" onPress={run('medicine')}>Medicine</Button>,
            <Button key="clean" hotkey="c" onPress={run('clean')}>Clean</Button>,
            <Button key="light" hotkey="o" onPress={run('light')}>{p.isLightsOff ? 'Light on' : 'Light off'}</Button>,
            <Button key="scold" hotkey="d" onPress={run('scold')}>Scold</Button>,
            <Button key="stats" hotkey="t" onPress={set({ isStats: !v.isStats })}>Status</Button>,
          ]

    return (
      <Box flexDirection="column">
        {below}
      <Box paddingRight={1}>
        <Box flexDirection="column" borderStyle="round" borderColor={dead ? 'subtle' : call ? ORANGE : PURPLE} paddingX={1}>
          <Box justifyContent="space-between">
            <Text wrap="truncate-end">
              <Text color={PURPLE} bold>{p.name}</Text>
              <Text dimColor>{` · ${p.stage === 'egg' ? 'egg' : `${p.species} ${p.stage}`} · ${ageDays(p, now)}d`}</Text>
              {asleep && !dead && p.stage !== 'egg' ? <Text dimColor> · zzz</Text> : null}
            </Text>
            <Button key="hide" plain dimColor onPress={set({ isOpen: false })}>hide</Button>
          </Box>
          <Box gap={2}>
            <Box flexDirection="column">
              <Text color={dark || dead ? 'subtle' : colorOf(p)}>{art.join('\n')}</Text>
            </Box>
            <Box flexDirection="column">
              <Text>
                <Text dimColor>hunger </Text><Text color={level(p.hunger)}>{hearts(p.hunger)}</Text>
                <Text dimColor>   happy </Text><Text color={level(p.happy)}>{hearts(p.happy)}</Text>
                {p.poop > 0 ? <Text color={ORANGE}>{`  poop ${'●'.repeat(p.poop)}`}</Text> : null}
                {p.isSick ? <Text color={RED} bold>  sick</Text> : null}
              </Text>
              {call && !dead ? <Text color={ORANGE} bold>{`! ${p.name} ${call}`}</Text> : null}
              {v.isStats ? <Text dimColor>{`weight ${p.weight} · discipline ${p.discipline}% · mistakes ${p.mistakes}`}</Text> : null}
              <Text dimColor wrap="truncate-end">{pokeMsg ?? p.msg}</Text>
            </Box>
          </Box>
          <Box gap={1} flexWrap="wrap" marginTop={1}>{buttons}</Box>
        </Box>
      </Box>
      </Box>
    )
  })
}
