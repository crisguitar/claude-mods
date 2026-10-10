import { atom, read, update } from 'claude-code'
import type { Register, SessionUsage } from 'claude-code'

import type { Limit, Usage } from '../types'

const usage = atom(
  { plugin: 'myusage', key: 'usage' } as const,
  { model: null, ctxPct: null, costUsd: null, fiveHour: null, week: null } as Usage,
)

const GAUGE = 8
const SEP = ' · '

const levelColor = (pct: number, warnAt: number, errAt: number) =>
  pct >= errAt ? 'error' : pct >= warnAt ? 'warning' : 'claude'

const gauge = (pct: number, width: number) => {
  const on = Math.min(width, Math.max(0, Math.round((pct * width) / 100)))
  return { on: '▰'.repeat(on), off: '▱'.repeat(width - on) }
}

const prettyModel = (id: string) => {
  const m = /^claude-([a-z]+)-(\d{1,2})(?:-(\d{1,2}))?(?:-\d{8})?(\[1m\])?$/.exec(id)
  if (!m || !m[1]) return id
  return `${m[1][0]?.toUpperCase()}${m[1].slice(1)} ${m[2]}${m[3] ? `.${m[3]}` : ''}${m[4] ? ' (1M)' : ''}`
}

const formatReset = (resetsAt: string, now: number) => {
  const minutes = Math.max(0, Math.round((Date.parse(resetsAt) - now) / 60000))
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const mins = minutes % 60
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

const fromUsage = (u: Pick<SessionUsage, 'context' | 'rateLimits' | 'cost'>): Partial<Usage> => {
  const find = (kind: string): Limit | null => {
    const r = u.rateLimits.find(l => l.kind === kind)
    return r ? { pct: r.percentUsed, resetsAt: r.resetsAt } : null
  }
  return {
    ctxPct: u.context.percent ?? null,
    costUsd: u.cost?.usd ?? null,
    fiveHour: find('five_hour'),
    week: find('seven_day'),
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const model = await $.session.model()
    const figures = fromUsage(await $.session.usage())
    await update($, usage, u => ({ ...u, ...figures, model: model || null }))

    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    const figures = fromUsage(e)
    await update($, usage, u => ({ ...u, ...figures }))

    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    if (!e.agentId) {
      await update($, usage, u => ({ ...u, model: e.model }))
    }

    return yield* next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) {
      return next(e)
    }

    const u = await read($, usage)
    const hasAny = u.ctxPct !== null || u.fiveHour !== null || u.week !== null
    if (!hasAny) {
      return next(e)
    }

    // other mods hook this band too: draw what sits below, then our card
    const below = await next(e)
    const { Box, Text } = $.ui.resolve(e)
    const now = await $.clock.now()
    const isWorking = e.props.isWorking

    const meter = (label: string, limit: Limit, color: string) => {
      const g = gauge(limit.pct, GAUGE)
      return [
        <Text dimColor>{label} </Text>,
        <Text color={color}>{g.on}</Text>,
        <Text color="subtle">{g.off}</Text>,
        <Text color={color === 'claude' ? undefined : color} bold>{` ${Math.round(limit.pct)}%`}</Text>,
        limit.resetsAt ? <Text dimColor>{` (resets in ${formatReset(limit.resetsAt, now)})`}</Text> : null,
      ]
    }

    const head = [
      u.model ? <Text color="claude" bold>{prettyModel(u.model)}</Text> : null,
      <Text color={isWorking ? 'claude' : undefined} dimColor={!isWorking}>{isWorking ? ' ● working' : ' ○ idle'}</Text>,
      u.ctxPct !== null
        ? [<Text dimColor>{SEP}</Text>, meter('ctx', { pct: u.ctxPct }, levelColor(u.ctxPct, 50, 80))]
        : null,
      u.costUsd !== null ? <Text dimColor>{`${SEP}$${u.costUsd.toFixed(2)}`}</Text> : null,
    ]

    const limits = [
      u.fiveHour ? meter('usage', u.fiveHour, levelColor(u.fiveHour.pct, 60, 85)) : null,
      u.fiveHour && u.week ? <Text dimColor>{SEP}</Text> : null,
      u.week ? meter('week', u.week, levelColor(u.week.pct, 60, 85)) : null,
    ]

    return (
      <Box flexDirection="column">
        {below}
        <Box paddingRight={1}>
          <Box flexDirection="column" borderStyle="round" borderColor="claude" paddingX={1}>
            <Text wrap="truncate-end">{head}</Text>
            {u.fiveHour || u.week ? <Text wrap="truncate-end">{limits}</Text> : null}
          </Box>
        </Box>
      </Box>
    )
  })
}
