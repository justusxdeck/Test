import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { LimitRow, LimitsSnapshot } from '../types'

const PANE = 'limits'
const TITLE = 'Limits'
const snapshot = atom(
  { plugin: 'limits', key: 'snapshot' } as const,
  { limits: [] } as LimitsSnapshot,
  { shape: 'snapshot-1' },
)

const LABELS: Record<string, string> = {
  five_hour: 'Session (5 Std.)',
  seven_day: 'Woche (7 Tage)',
  spend_limit: 'Ausgabenlimit',
}

const label = (kind: string) => LABELS[kind] ?? kind
const order = (kind: string) =>
  kind === 'five_hour' ? 0 : kind === 'seven_day' ? 1 : 2

const bar = (percent: number, width: number) => {
  const filled = Math.round((Math.min(100, Math.max(0, percent)) / 100) * width)
  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

const tone = (percent: number) =>
  percent >= 90 ? 'error' : percent >= 70 ? 'warning' : 'success'

const until = (resetsAt: string | undefined, now: number) => {
  if (!resetsAt) return ''
  const at = Date.parse(resetsAt)
  if (Number.isNaN(at)) return ''
  const minutes = Math.max(0, Math.round((at - now) / 60000))
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const mins = minutes % 60
  if (days > 0) return `Reset in ${days} T ${hours} Std.`
  if (hours > 0) return `Reset in ${hours} Std. ${mins} Min.`
  return `Reset in ${mins} Min.`
}

async function remember(
  $: EngineInterface,
  figures: {
    rateLimits: LimitRow[]
    context: { percent?: number }
    cost?: { usd: number }
  },
) {
  const fresh: LimitsSnapshot = {
    limits: figures.rateLimits.map(r => ({
      kind: r.kind,
      percentUsed: r.percentUsed,
      resetsAt: r.resetsAt,
    })),
    contextPercent: figures.context.percent,
    costUsd: figures.cost?.usd,
    measuredAt: await $.clock.now(),
  }
  await update($, snapshot, () => fresh)
  $.ui.status(statusText(fresh))
}

function statusText(data: LimitsSnapshot): string | undefined {
  const parts = [...data.limits]
    .sort((a, b) => order(a.kind) - order(b.kind))
    .map(r => `${short(r.kind)} ${r.percentUsed}%`)
  if (data.contextPercent !== undefined) parts.push(`Kontext ${data.contextPercent}%`)
  return parts.length ? `Limits: ${parts.join(' · ')}` : undefined
}

function short(kind: string): string {
  return kind === 'five_hour' ? 'Session' : kind === 'seven_day' ? 'Woche' : kind
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'limits',
      description: 'Panel mit Session-Limit und Wochenlimit öffnen',
    })
    const started = await next(e)
    void $.ui.open({ id: PANE, title: TITLE })
    try {
      await remember($, await $.session.usage())
    } catch {
      // keine Zahlen beim Start: das Panel wartet auf die erste Antwort
    }
    return started
  })

  on('command.run', { command: 'limits' }, async $ => {
    const opened = await $.ui.open({ id: PANE, title: TITLE })
    let figures = ''
    try {
      const usage = await $.session.usage()
      await remember($, usage)
      figures = statusText(await read($, snapshot)) ?? 'noch keine Limit-Daten'
    } catch (err) {
      figures = `Zahlen nicht lesbar: ${String(err)}`
    }
    const surfaces = (await $.session.surfaces()).join(', ') || 'keine'
    const placed = opened.isPlaced
      ? 'Panel ist platziert.'
      : `Panel nicht platziert (${'reason' in opened ? String(opened.reason) : 'unbekannt'}).`
    return { text: `${placed} Oberfläche: ${surfaces}. ${figures}` }
  })

  on('session.measure', async ($, e, next) => {
    await remember($, e)
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const data = await read($, snapshot)
    const now = await $.clock.now()
    const width = Math.max(8, Math.min(24, (e.props?.bodyColumns ?? 30) - 8))
    const rows = [...data.limits].sort((a, b) => order(a.kind) - order(b.kind))

    return (
      <Box flexDirection="column" gap={1}>
        {rows.length === 0 && (
          <Text dimColor>
            Noch keine Limit-Daten. Sie erscheinen nach der nächsten Antwort von
            Claude.
          </Text>
        )}
        {rows.map(row => (
          <Box flexDirection="column">
            <Text bold>{label(row.kind)}</Text>
            <Text color={tone(row.percentUsed)}>
              {bar(row.percentUsed, width)} {row.percentUsed}%
            </Text>
            {row.resetsAt && <Text dimColor>{until(row.resetsAt, now)}</Text>}
          </Box>
        ))}
        {data.contextPercent !== undefined && (
          <Box flexDirection="column">
            <Text bold>Kontext dieser Session</Text>
            <Text color={tone(data.contextPercent)}>
              {bar(data.contextPercent, width)} {data.contextPercent}%
            </Text>
          </Box>
        )}
        {data.costUsd !== undefined && (
          <Text dimColor>Kosten dieser Session: ${data.costUsd.toFixed(2)}</Text>
        )}
      </Box>
    )
  })
}
