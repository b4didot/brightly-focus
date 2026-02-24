import { getSupabaseServerClient } from "../supabase/server"
import { FocusEngineError, toFocusEngineError } from "./errors"
import { requireNonEmptyString } from "./guards"
import { getNextWaitingPosition, normalizeWaitingQueue } from "./queue"

type FocusItem = {
  id: string
  state: string
  execution_owner_id: string
  waiting_position: number | null
  [key: string]: unknown
}

export async function createUserItem({
  userId,
  title,
  description,
}: {
  userId: string
  title: string
  description?: string
}) {
  try {
    const normalizedUserId = requireNonEmptyString(userId, "userId")
    const normalizedTitle = requireNonEmptyString(title, "title")
    const normalizedDescription = description?.trim() ? description.trim() : null
    const supabase = getSupabaseServerClient()

    const { data: waitingRows, error: waitingRowsError } = await supabase
      .from("items")
      .select("id,waiting_position")
      .eq("execution_owner_id", normalizedUserId)
      .eq("state", "waiting")
      .order("waiting_position", { ascending: true })

    if (waitingRowsError) {
      throw new FocusEngineError(
        "DB_ERROR",
        `Failed to load waiting queue for user "${normalizedUserId}" before create: ${waitingRowsError.message}`
      )
    }

    const nextWaitingPosition = await getNextWaitingPosition(supabase, normalizedUserId)

    const { data: createdItem, error: createError } = await supabase
      .from("items")
      .insert({
        execution_owner_id: normalizedUserId,
        state: "waiting",
        waiting_position: nextWaitingPosition,
        completed_at: null,
        title: normalizedTitle,
        description: normalizedDescription,
      })
      .select("*")
      .maybeSingle()

    if (createError) {
      if (createError.message.toLowerCase().includes("milestone_id")) {
        throw new FocusEngineError(
          "DB_ERROR",
          "Database contract still requires milestone_id. To allow standalone user-created items, update the schema constraint for items.milestone_id.",
          false
        )
      }
      throw new FocusEngineError(
        "DB_ERROR",
        `Failed to create item for user "${normalizedUserId}": ${createError.message}`
      )
    }

    if (!createdItem) {
      throw new FocusEngineError(
        "DB_ERROR",
        `Item creation for user "${normalizedUserId}" returned no row.`
      )
    }

    // Move the new row to a unique "top temp" position before normalization.
    const positions = (waitingRows ?? [])
      .map((row) => row.waiting_position)
      .filter((value): value is number => typeof value === "number")
    positions.push(nextWaitingPosition)
    const currentMin = positions.length > 0 ? Math.min(...positions) : 0
    const topTempPosition = currentMin - positions.length - 100

    const { data: movedToTopTemp, error: topTempError } = await supabase
      .from("items")
      .update({ waiting_position: topTempPosition })
      .eq("id", createdItem.id)
      .eq("execution_owner_id", normalizedUserId)
      .eq("state", "waiting")
      .eq("waiting_position", nextWaitingPosition)
      .select("id")
      .maybeSingle()

    if (topTempError) {
      throw new FocusEngineError(
        "QUEUE_CONFLICT",
        `Failed to move new item "${createdItem.id}" to queue top for user "${normalizedUserId}": ${topTempError.message}`,
        true
      )
    }

    if (!movedToTopTemp) {
      throw new FocusEngineError(
        "QUEUE_CONFLICT",
        `New item "${createdItem.id}" changed during create-item queue placement.`,
        true
      )
    }

    await normalizeWaitingQueue(supabase, normalizedUserId)
    const { data: refreshed, error: refreshedError } = await supabase
      .from("items")
      .select("*")
      .eq("id", createdItem.id)
      .maybeSingle()

    if (refreshedError || !refreshed) {
      throw new FocusEngineError(
        "DB_ERROR",
        `Created item "${createdItem.id}" could not be reloaded after queue normalization.`
      )
    }

    return refreshed as FocusItem
  } catch (error) {
    throw toFocusEngineError(error)
  }
}
