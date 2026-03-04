import type { Item } from "@/types"

type SupabaseClient = ReturnType<typeof import("../../../../lib/supabase/server").getSupabaseServerClient>

type EnrichmentRow = {
  id: string
  title: string | null
  description: string | null
  state: string | null
  due_at: string | null
  milestone_id: string | null
  steps?: Array<{ id: string }>
  milestone?: {
    id: string
    name: string | null
    project?: {
      id: string
      name: string | null
    } | null
  } | null
  item_tags?: Array<{
    tag?: {
      name: string | null
    } | null
  }>
  focus_session?:
    | {
        interval_minutes: number | null
      }
    | Array<{
        interval_minutes: number | null
      }>
    | null
}

function asStatus(value: string | null): Item["status"] {
  if (value === "active" || value === "waiting" || value === "offered" || value === "completed") {
    return value
  }
  return "waiting"
}

function toAlarmLabel(intervalMinutes: number | null | undefined) {
  if (typeof intervalMinutes === "number") {
    return `${intervalMinutes} min`
  }
  return undefined
}

function normalizeSummary(value: string | null) {
  return value?.trim() ? value : "No description provided."
}

function normalizeName(value: string | null | undefined) {
  return value?.trim() || undefined
}

export async function getItemEnrichmentQuery({
  supabase,
  userId,
  itemId,
}: {
  supabase: SupabaseClient
  userId: string
  itemId: string
}): Promise<Item> {
  // This query must remain single-round-trip. Do not introduce N+1.
  const { data, error } = await supabase
    .from("items")
    .select(`
      id,
      title,
      description,
      state,
      due_at,
      milestone_id,
      steps(id),
      milestone:milestones(
        id,
        name,
        project:projects(id,name)
      ),
      item_tags(
        tag:tags(name)
      ),
      focus_session:active_focus_sessions(interval_minutes)
    `)
    .eq("id", itemId)
    .eq("execution_owner_id", userId)
    .single()

  if (error || !data) {
    throw new Error(`Failed to enrich item: ${error?.message ?? "Item not found"}`)
  }

  const row = data as unknown as EnrichmentRow
  const project = row.milestone?.project ?? null
  const milestone = row.milestone ?? null
  const focusSession = Array.isArray(row.focus_session) ? row.focus_session[0] : row.focus_session
  const tags = (row.item_tags ?? [])
    .map((entry) => normalizeName(entry.tag?.name))
    .filter((tag): tag is string => Boolean(tag))

  return {
    id: row.id,
    title: normalizeName(row.title) ?? `Item ${row.id}`,
    summary: normalizeSummary(row.description),
    status: asStatus(row.state),
    dueDateTime: row.due_at ?? undefined,
    projectId: project?.id ?? undefined,
    milestoneId: milestone?.id ?? row.milestone_id ?? undefined,
    projectName: normalizeName(project?.name),
    milestoneName: normalizeName(milestone?.name),
    tags,
    stepsCount: row.steps?.length ?? 0,
    alarmLabel: toAlarmLabel(focusSession?.interval_minutes),
  }
}
