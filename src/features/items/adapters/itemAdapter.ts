export type DbItem = {
  id: string
  title?: string | null
  state?: string | null
  execution_owner_id?: string | null
  owner_id?: string | null
  user_id?: string | null
  waiting_position?: number | null
  queue_order?: number | null
  completed_at?: string | null
  completedAt?: string | null
  [key: string]: unknown
}

export type ItemView = {
  id: string
  title: string
  state: string | null
  ownerId: string | null
  waitingPosition: number | null
  completedAt: string | null
}

export function toItemView(item: DbItem): ItemView {
  return {
    id: item.id,
    title: item.title?.trim() || `Item ${item.id}`,
    state: item.state ?? null,
    ownerId: item.execution_owner_id ?? item.owner_id ?? item.user_id ?? null,
    waitingPosition: item.waiting_position ?? item.queue_order ?? null,
    completedAt: item.completed_at ?? item.completedAt ?? null,
  }
}
