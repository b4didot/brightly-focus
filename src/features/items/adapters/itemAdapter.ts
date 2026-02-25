export type DbItem = {
  id: string
  title?: string | null
  description?: string | null
  state?: string | null
  execution_owner_id?: string | null
  owner_id?: string | null
  user_id?: string | null
  project_id?: string | null
  milestone_id?: string | null
  waiting_position?: number | null
  queue_order?: number | null
  due_at?: string | null
  dueAt?: string | null
  completed_at?: string | null
  completedAt?: string | null
  [key: string]: unknown
}

export type ItemView = {
  id: string
  title: string
  description: string | null
  state: string | null
  ownerId: string | null
  projectId: string | null
  milestoneId: string | null
  waitingPosition: number | null
  dueAt: string | null
  completedAt: string | null
}

export function toItemView(item: DbItem): ItemView {
  return {
    id: item.id,
    title: item.title?.trim() || `Item ${item.id}`,
    description: item.description?.trim() || null,
    state: item.state ?? null,
    ownerId: item.execution_owner_id ?? item.owner_id ?? item.user_id ?? null,
    projectId: item.project_id ?? null,
    milestoneId: item.milestone_id ?? null,
    waitingPosition: item.waiting_position ?? item.queue_order ?? null,
    dueAt: item.due_at ?? item.dueAt ?? null,
    completedAt: item.completed_at ?? item.completedAt ?? null,
  }
}
