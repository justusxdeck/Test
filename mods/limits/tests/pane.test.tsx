import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'limits',
  component: 'Pane',
  requestId: 'limits',
  props: {
    title: 'Limits',
    isFocused: false,
    bodyColumns: 32,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 20 },
    view: {},
  },
} as const

test('das Panel zeigt Session- und Wochenlimit', async ($, on) => {
  on('clock.now', () => ({ value: Date.parse('2098-12-31T20:00:00Z') }))
  on('session.measure', (_, e) => ({ changed: e.changed }))
  await $.session.measure({
    context: { window: 200000, tokens: 50000, percent: 25 },
    rateLimits: [
      { kind: 'seven_day', percentUsed: 41.5, resetsAt: '2099-01-01T00:00:00Z' },
      { kind: 'five_hour', percentUsed: 93 },
    ],
    cost: { usd: 1.234 },
    changed: ['context', 'rateLimits', 'cost'],
  })

  for (const surface of ['desktop', 'terminal'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect((await ui.find({ type: 'Text', text: /Session \(5 Std\.\)/ }))?.text).toBe('Session (5 Std.)')
    expect((await ui.find({ type: 'Text', text: /93%/ }))?.text).toContain('93%')
    expect((await ui.find({ type: 'Text', text: /41\.5%/ }))?.text).toContain('41.5%')
    expect((await ui.find({ type: 'Text', text: /Kontext/ }))?.text).toBe('Kontext dieser Session')
    expect((await ui.find({ type: 'Text', text: /Kosten/ }))?.text).toBe('Kosten dieser Session: $1.23')
    expect((await ui.find({ type: 'Text', text: /Reset in/ }))?.text).toBe('Reset in 4 Std. 0 Min.')
    await ui.unmount()
  }
})

test('ohne Daten steht ein Hinweis da', async ($, on) => {
  on('clock.now', () => ({ value: 0 }))
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await ui.find({ type: 'Text' }))?.text).toContain('Noch keine Limit-Daten')
  await ui.unmount()
})
