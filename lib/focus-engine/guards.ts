import { FocusEngineError } from "./errors"
import { isAllowedTransition } from "./policy"

type FocusItem = {
  id: string
  state: string
  execution_owner_id: string
  waiting_position: number | null
  [key: string]: unknown
}

export function requireNonEmptyString(value: string, fieldName: string) {
  if (!value || typeof value !== "string") {
    throw new FocusEngineError(
      "VALIDATION_ERROR",
      `${fieldName} is required and must be a non-empty string.`
    )
  }

  return value
}

export async function requireItemExists(
  supabase: ReturnType<typeof import("../supabase/server").getSupabaseServerClient>,
  itemId: string
) {
  const { data: item, error } = await supabase
    .from("items")
    .select("*")
    .eq("id", itemId)
    .maybeSingle()

  if (error) {
    throw new FocusEngineError("DB_ERROR", `Failed to load item "${itemId}": ${error.message}`)
  }

  if (!item) {
    throw new FocusEngineError("NOT_FOUND", `Item "${itemId}" does not exist.`)
  }

  return item as FocusItem
}

export function requireOwnership(item: FocusItem, userId: string) {
  if (item.execution_owner_id !== userId) {
    throw new FocusEngineError(
      "OWNERSHIP_MISMATCH",
      `Item "${item.id}" is owned by "${item.execution_owner_id}", not "${userId}".`
    )
  }
}

export function requireState(item: FocusItem, requiredState: string) {
  if (item.state !== requiredState) {
    throw new FocusEngineError(
      "INVALID_STATE",
      `Illegal transition for item "${item.id}": expected state "${requiredState}" but found "${item.state}".`
    )
  }
}

export function requireAllowedTransition(from: string, to: string) {
  if (!isAllowedTransition(from, to)) {
    throw new FocusEngineError(
      "TRANSITION_NOT_ALLOWED",
      `Transition "${from}" -> "${to}" is not allowed by Focus Engine policy.`
    )
  }
}
