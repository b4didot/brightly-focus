import { getSupabaseServerClient } from "../supabase/server"
import { FocusEngineError, toFocusEngineError } from "./errors"
import {
  deleteItemDependentsAndRow,
  hasOriginDependents,
  normalizeOwnersWaitingQueues,
  type DeletionSummary,
} from "./deleteShared"
import { requireNonEmptyString } from "./guards"

type DbItem = {
  id: string
  execution_owner_id: string
  state: string
  waiting_position: number | null
}

export async function deleteItem({
  itemId,
  actingUserId,
}: {
  itemId: string
  actingUserId: string
}): Promise<DeletionSummary> {
  try {
    const normalizedItemId = requireNonEmptyString(itemId, "itemId")
    const normalizedActingUserId = requireNonEmptyString(actingUserId, "actingUserId")
    const supabase = getSupabaseServerClient()

    const { data: item, error: itemError } = await supabase
      .from("items")
      .select("id,execution_owner_id,state,waiting_position")
      .eq("id", normalizedItemId)
      .maybeSingle()

    if (itemError) {
      throw new FocusEngineError("DELETE_DB_ERROR", `Failed to load item: ${itemError.message}`)
    }

    if (!item) {
      throw new FocusEngineError("NOT_FOUND", `Item "${normalizedItemId}" does not exist.`)
    }

    const row = item as DbItem

    if (row.execution_owner_id !== normalizedActingUserId) {
      throw new FocusEngineError(
        "DELETE_NOT_ALLOWED_PERMISSION",
        "You can only delete your own items."
      )
    }

    const blockedByOrigin = await hasOriginDependents([row.id])
    if (blockedByOrigin.has(row.id)) {
      throw new FocusEngineError(
        "DELETE_NOT_ALLOWED_ORIGIN_REF",
        `Item "${row.id}" cannot be deleted because it is referenced as an origin.`
      )
    }

    const result = await deleteItemDependentsAndRow(row)
    if (result.wasWaiting) {
      await normalizeOwnersWaitingQueues([result.affectedOwnerId])
    }

    return {
      deletedItemsCount: result.deletedItemsCount,
      deletedStepsCount: result.deletedStepsCount,
      deletedTagsCount: result.deletedTagsCount,
      deletedMilestonesCount: 0,
      deletedProject: false,
    }
  } catch (error) {
    throw toFocusEngineError(error)
  }
}
