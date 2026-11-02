export type LimitRow = { kind: string; percentUsed: number; resetsAt?: string }
export type LimitsSnapshot = {
  limits: LimitRow[]
  contextPercent?: number
  costUsd?: number
  measuredAt?: number
}

declare module 'claude-code' {
  interface PluginState {
    limits: { snapshot: Shaped<LimitsSnapshot> }
  }
}
