export const ALLOWED_TRANSITIONS = {
  offered: ["waiting"],
  waiting: ["active"],
  active: ["waiting", "completed"],
  completed: [],
} as const

export type ItemState = keyof typeof ALLOWED_TRANSITIONS

export function isAllowedTransition(from: string, to: string) {
  const allowed = (ALLOWED_TRANSITIONS[from as ItemState] ?? []) as readonly string[]
  return allowed.includes(to)
}
