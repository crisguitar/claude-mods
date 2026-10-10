import { expect, mock, test } from 'claude-code/testing'

import { hatch } from './game'

const BAND = {
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 100, scroll: { offset: 0, bodyRows: 19 }, view: {} },
} as const

test('the pet card draws buttons and a button feeds the pet', async ($, on) => {
  const clock = mock.clock(on)
  const now = clock.now()
  const hungry = { ...hatch(now, 'Momo'), stage: 'child', stageAt: now, hunger: 1 }
  mock.store(on, { pet: hungry })
  on('command.register', () => ({ value: undefined }) as never)
  // another mod's band sits below ours in the chain
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>other mod</Text>
  })
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/w', surface: null, isInteractive: true } as never)
  const ui = await $.ui.mount({ plugin: 'pocketpet', surface: 'terminal', ...BAND } as never)
  expect(await ui.find({ type: 'Text', text: /Momo/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /other mod/ })).toBeDefined()
  expect(await ui.find({ key: 'feed' })).toBeDefined()
  await ui.press({ key: 'feed' })
  expect(await ui.find({ type: 'Text', text: /Nom nom/ })).toBeDefined()
  await ui.unmount()
})

test('/pet answers with the status', async ($, on) => {
  mock.clock(on)
  mock.store(on)
  on('command.register', () => ({ value: undefined }) as never)
  // another mod's band sits below ours in the chain
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>other mod</Text>
  })
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/w', surface: null, isInteractive: true } as never)
  const r = await $.command.run({ command: 'pet', args: 'status' } as never)
  expect(r.text).toMatch(/hunger/)
})
