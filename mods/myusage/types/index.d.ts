export type Limit = { pct: number; resetsAt?: string }

export type Usage = {
  model: string | null
  ctxPct: number | null
  costUsd: number | null
  fiveHour: Limit | null
  week: Limit | null
}

declare module 'claude-code' {
  interface PluginState {
    myusage: { usage: Usage }
  }
}
