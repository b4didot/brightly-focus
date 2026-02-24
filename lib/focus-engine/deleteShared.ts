import { getSupabaseServerClient } from "../supabase/server"
import { FocusEngineError } from "./errors"
import { normalizeWaitingQueue } from "./queue"

export type DeletionSummary = {
  deletedItemsCount: number
  deletedStepsCount: number
  deletedTagsCount: number
  deletedMilestonesCount: number
  deletedProject: boolean
}

type DbItem = {
  id: string
  execution_owner_id: string
  state: string
  waiting_position: number | null
}

function isMissingRelationError(message: string) {
  const normalized = message.toLowerCase()
  return normalized.includes("relation") && normalized.includes("does not exist")
}

async function deleteIfTableExists({
  table,
  column,
  value,
}: {
  table: string
  column: string
  value: string
}) {
  const supabase = getSupabaseServerClient()
  const result = await supabase.from(table).delete().eq(column, value)
  if (result.error && !isMissingRelationError(result.error.message)) {
    throw new FocusEngineError(
      "DELETE_DB_ERROR",
      `Failed to delete from ${table}: ${result.error.message}`
    )
  }

  return result.error ? 0 : 1
}

export async function hasOriginDependents(itemIds: string[]) {
  if (itemIds.length === 0) {
    return new Set<string>()
  }

  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("items")
    .select("origin_item_id")
    .in("origin_item_id", itemIds)

  if (error) {
    throw new FocusEngineError(
      "DELETE_DB_ERROR",
      `Failed to validate origin references: ${error.message}`
    )
  }

  const blocked = new Set<string>()
  for (const row of data ?? []) {
    if (typeof row.origin_item_id === "string") {
      blocked.add(row.origin_item_id)
    }
  }

  return blocked
}

export async function deleteItemDependentsAndRow(item: DbItem) {
  let deletedStepsCount = 0
  let deletedTagsCount = 0

  await deleteIfTableExists({ table: "active_focus_sessions", column: "item_id", value: item.id })

  const tagsDeleted = await deleteIfTableExists({ table: "item_tags", column: "item_id", value: item.id })
  if (tagsDeleted > 0) {
    deletedTagsCount += tagsDeleted
  }

  const stepsDeleted = await deleteIfTableExists({ table: "steps", column: "item_id", value: item.id })
  if (stepsDeleted > 0) {
    deletedStepsCount += stepsDeleted
  }

  const supabase = getSupabaseServerClient()
  const { error: itemDeleteError } = await supabase.from("items").delete().eq("id", item.id)
  if (itemDeleteError) {
    throw new FocusEngineError(
      "DELETE_DB_ERROR",
      `Failed to delete item "${item.id}": ${itemDeleteError.message}`
    )
  }

  return {
    deletedItemsCount: 1,
    deletedStepsCount,
    deletedTagsCount,
    deletedMilestonesCount: 0,
    deletedProject: false,
    affectedOwnerId: item.execution_owner_id,
    wasWaiting: item.state === "waiting",
  }
}

export async function normalizeOwnersWaitingQueues(ownerIds: Iterable<string>) {
  const supabase = getSupabaseServerClient()
  for (const ownerId of ownerIds) {
    await normalizeWaitingQueue(supabase, ownerId)
  }
}
