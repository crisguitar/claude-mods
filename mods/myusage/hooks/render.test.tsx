import { expect, mock, test } from 'claude-code/testing'

test('the card validates and draws on the terminal', async ($, on) => {
  mock.clock(on)
  on('session.model', () => ({ value: 'claude-sonnet-5-5' }))
  on('session.usage', () =>
    ({
      value: {
        startedAt: 0,
        context: { window: 1_000_000, percent: 42 },
        rateLimits: [{ kind: 'five_hour', percentUsed: 25, resetsAt: '2026-10-10T01:30:00Z' }],
        cost: { usd: 27.23 },
      },
    }) as never,
  )
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  // another mod's band sits below ours in the chain
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>other mod</Text>
  })
  await $.session.start({ cwd: '/w', surface: null, isInteractive: true } as never)
  const ui = await $.ui.mount({
    plugin: 'myusage', surface: 'terminal', component: 'AbovePrompt',
    props: { hasSurvey: false, isWorking: true, maxRows: 20, bodyColumns: 120, scroll: { offset: 0, bodyRows: 19 }, view: {} },
  } as never)
  expect(await ui.find({ type: 'Text', text: /ctx/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /other mod/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /usage/ })).toBeDefined()
  await ui.unmount()
})
