import { atom, read, update } from 'claude-code'
import type { EngineInterface as Engine, Register } from 'claude-code'

import type { Pet, View } from '../types'
import { act, advance, ageDays, callText, hatch, hearts, isAsleep, rename, statusText } from './game'
import type { Action } from './game'
import { sprite } from './sprites'

const view = atom(
  { plugin: 'pocketpet', key: 'view' } as const,
  { pet: null, frame: 0, isOpen: true, isStats: false } as View,
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

const HELP = [
  '/pet                show status',
  '/pet feed | snack | play | left | right | medicine | clean | light | scold',
  '/pet status | name <n> | show | hide | new',
].join('\n')

const save = async ($: Engine, pet: Pet) => {
  await $.store.set('pet', pet as never)
}

/** Apply `fn` to the pet, advanced to now; returns the new pet. */
const mutate = async ($: Engine, fn: (p: Pet, now: number) => Pet): Promise<Pet | null> => {
  const now = await $.clock.now()
  let out: Pet | null = null
  await update($, view, v => {
    if (!v.pet) return v
    out = fn(advance(v.pet, now), now)
    return { ...v, pet: out }
  })
  if (out) await save($, out)
  return out
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'pet', description: 'Care for your pocket pet', argumentHint: '[feed|snack|play|medicine|clean|light|scold|status|name|new|hide|show]' })
    const now = await $.clock.now()
    const stored = (await $.store.get('pet')) as Pet | undefined
    const pet = stored ? advance(stored, now) : hatch(now)
    await update($, view, v => ({ ...v, pet }))
    await save($, pet)

    let ticks = 0
    $.clock.every(TICK, async () => {
      const t = await $.clock.now()
      ticks++
      let before: Pet | null = null
      let after: Pet | null = null
      await update($, view, v => {
        before = v.pet
        after = v.pet ? advance(v.pet, t) : null
        return { ...v, frame: v.frame + 1, pet: after }
      })
      const a = after as Pet | null
      const b = before as Pet | null
      if (a && b && !b.call && a.call && a.call.kind !== 'fake') await $.ui.toast(`${a.name} ${callText(a)}!`)
      if (a && b && b.stage !== a.stage) await $.ui.toast(a.msg)
      if (a && ticks % SAVE_EVERY === 0) await save($, a)
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
      const cur = (await read($, view)).pet
      if (cur && cur.stage !== 'dead' && rest[0] !== 'force') return { text: `${cur.name} is still alive. Use "/pet new force" to start over anyway.` }
      const pet = hatch(now, cur?.name)
      await update($, view, v => ({ ...v, pet }))
      await save($, pet)
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

    const art = sprite(p, v.frame, asleep && p.isLightsOff)
    const dark = p.isLightsOff && !dead
    const call = callText(p)
    const level = (n: number) => (n <= 1 ? 'error' : n === 2 ? 'warning' : 'claude')

    const buttons = dead
      ? [<Button key="new" variant="primary" onPress={() => void $.command.run({ command: 'pet', args: 'new' })}>New egg</Button>]
      : p.game
        ? [
            <Button key="left" variant="primary" hotkey="l" onPress={run('left')}>Left</Button>,
            <Button key="right" variant="primary" hotkey="r" onPress={run('right')}>Right</Button>,
          ]
        : [
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
        <Box flexDirection="column" borderStyle="round" borderColor={dead ? 'subtle' : call ? 'warning' : 'claude'} paddingX={1}>
          <Box justifyContent="space-between">
            <Text wrap="truncate-end">
              <Text color="claude" bold>{p.name}</Text>
              <Text dimColor>{` · ${p.stage} · ${ageDays(p, now)}d`}</Text>
              {asleep && !dead && p.stage !== 'egg' ? <Text dimColor> · zzz</Text> : null}
            </Text>
            <Button key="hide" plain dimColor onPress={set({ isOpen: false })}>hide</Button>
          </Box>
          <Box gap={2}>
            <Box flexDirection="column">
              {art.map(line => <Text color={dark ? 'subtle' : 'claude'}>{line}</Text>)}
            </Box>
            <Box flexDirection="column">
              <Text>
                <Text dimColor>hunger </Text><Text color={level(p.hunger)}>{hearts(p.hunger)}</Text>
                <Text dimColor>   happy </Text><Text color={level(p.happy)}>{hearts(p.happy)}</Text>
                {p.poop > 0 ? <Text color="warning">{`  poop ${'●'.repeat(p.poop)}`}</Text> : null}
                {p.isSick ? <Text color="error" bold>  sick</Text> : null}
              </Text>
              {call && !dead ? <Text color="warning" bold>{`! ${p.name} ${call}`}</Text> : null}
              {v.isStats ? <Text dimColor>{`weight ${p.weight} · discipline ${p.discipline}% · mistakes ${p.mistakes}`}</Text> : null}
              <Text dimColor wrap="truncate-end">{p.msg}</Text>
            </Box>
          </Box>
          <Box gap={1} flexWrap="wrap">{buttons}</Box>
        </Box>
      </Box>
      </Box>
    )
  })
}
