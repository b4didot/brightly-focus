"use server"

import { revalidatePath } from "next/cache"
import { getSupabaseServerClient } from "../../../../lib/supabase/server"
import { acceptItem } from "../../../../lib/focus-engine/acceptItem"
import { activateItem } from "../../../../lib/focus-engine/activateItem"
import { completeItem } from "../../../../lib/focus-engine/completeItem"
import { createUserItem } from "../../../../lib/focus-engine/createUserItem"
import { declineItem } from "../../../../lib/focus-engine/declineItem"
import { toFocusEngineError } from "../../../../lib/focus-engine/errors"
import { reorderWaitingItem } from "../../../../lib/focus-engine/reorderWaitingItem"
import { withQueryCounter } from "../../../../lib/supabase/queryCounter"
import { mapFocusEngineErrorToUserMessage } from "./errorMapping"
import type { EnrichedItemData } from "../types/viewModels"
import { getItemEnrichmentQuery } from "../queries/itemEnrichmentQuery"

function assertField(formData: FormData, name: string) {
  const value = String(formData.get(name) ?? "").trim()
  if (!value) {
    throw new Error(`Missing required field "${name}".`)
  }

  return value
}

function isNextRedirectError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false
  }

  const maybeDigest = (error as { digest?: unknown }).digest
  return typeof maybeDigest === "string" && maybeDigest.includes("NEXT_REDIRECT")
}

/**
 * Schedule cache invalidation to run after the response is sent.
 * This prevents blocking the response while still ensuring cache is invalidated.
 * @param paths - Array of paths to revalidate
 */
function revalidateInBackground(paths: string[]) {
  // Use setTimeout with 0 delay to queue revalidation after response is sent
  // This is safe because the response has already been serialized by the time this executes
  setTimeout(() => {
    paths.forEach(path => revalidatePath(path))
  }, 0)
}

export async function acceptItemAction(formData: FormData) {
  try {
    const userId = assertField(formData, "userId")
    const itemId = assertField(formData, "itemId")
    await acceptItem({ itemId, userId })
    // Cache invalidation happens in background - optimistic update already on client
    revalidateInBackground(["/focus"])
    return { success: true, userId, itemId }
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error
    }
    throw new Error(mapFocusEngineErrorToUserMessage(toFocusEngineError(error)))
  }
}

export async function declineItemAction(formData: FormData) {
  try {
    const userId = assertField(formData, "userId")
    const itemId = assertField(formData, "itemId")
    await declineItem({ itemId, userId })
    revalidateInBackground(["/focus"])
    return { success: true, userId, itemId }
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error
    }
    throw new Error(mapFocusEngineErrorToUserMessage(toFocusEngineError(error)))
  }
}

export async function activateItemAction(formData: FormData) {
  try {
    const userId = assertField(formData, "userId")
    const itemId = assertField(formData, "itemId")
    await activateItem({ itemId, userId })
    // Cache invalidation happens in background - optimistic update already on client
    revalidateInBackground(["/focus"])
    return { success: true, userId, itemId }
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error
    }
    throw new Error(mapFocusEngineErrorToUserMessage(toFocusEngineError(error)))
  }
}

export async function completeItemAction(formData: FormData) {
  try {
    const userId = assertField(formData, "userId")
    const itemId = assertField(formData, "itemId")
    await completeItem({ itemId, userId })
    // Cache invalidation happens in background - optimistic update already on client
    revalidateInBackground(["/focus"])
    return { success: true, userId, itemId }
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error
    }
    throw new Error(mapFocusEngineErrorToUserMessage(toFocusEngineError(error)))
  }
}

export async function reorderWaitingItemAction(formData: FormData) {
  try {
    const userId = assertField(formData, "userId")
    const itemId = assertField(formData, "itemId")
    const direction = assertField(formData, "direction")
    await reorderWaitingItem({ itemId, userId, direction: direction as "up" | "down" })
    // Cache invalidation happens in background - optimistic update already on client
    revalidateInBackground(["/focus"])
    return { success: true, userId, itemId, direction }
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error
    }
    throw new Error(mapFocusEngineErrorToUserMessage(toFocusEngineError(error)))
  }
}

export async function createUserItemAction(formData: FormData) {
  try {
    const userId = assertField(formData, "userId")
    const title = assertField(formData, "title")
    const description = String(formData.get("description") ?? "").trim()
    await createUserItem({ userId, title, description })
    // Cache invalidation happens in background - optimistic update already on client
    revalidateInBackground(["/focus"])
    return { success: true, userId, title, description }
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error
    }
    throw new Error(mapFocusEngineErrorToUserMessage(toFocusEngineError(error)))
  }
}

export async function enrichItemAction(
  itemId: string,
  _projectId: string | null,
  _milestoneId: string | null
): Promise<EnrichedItemData> {
  try {
    void _projectId
    void _milestoneId
    const supabase = getSupabaseServerClient()
    const { data: itemData, error: itemError } = await supabase
      .from("items")
      .select("id,execution_owner_id")
      .eq("id", itemId)
      .single()

    if (itemError || !itemData?.execution_owner_id) {
      throw new Error(`Failed to enrich item: ${itemError?.message ?? "Item not found"}`)
    }

    const enriched = await withQueryCounter(
      { label: "focus.enrichItemAction", threshold: 3 },
      async (queryCounter) => {
        const countedSupabase = getSupabaseServerClient({ queryCounter })
        return getItemEnrichmentQuery({
          supabase: countedSupabase,
          userId: itemData.execution_owner_id,
          itemId,
        })
      }
    )

    return {
      itemId,
      projectName: enriched.projectName,
      milestoneName: enriched.milestoneName,
      tags: enriched.tags ?? [],
      stepsCount: enriched.stepsCount ?? 0,
      alarmLabel: enriched.alarmLabel,
    }
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error
    }
    throw new Error(`Failed to enrich item: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

export async function selectItemAction({ userId, itemId }: { userId: string; itemId: string }) {
  try {
    const normalizedUserId = userId.trim()
    const normalizedItemId = itemId.trim()

    if (!normalizedUserId) {
      throw new Error("Missing required field \"userId\".")
    }
    if (!normalizedItemId) {
      throw new Error("Missing required field \"itemId\".")
    }

    const result = await withQueryCounter(
      { label: "focus.selectItemAction", threshold: 3 },
      async (queryCounter) => {
        const supabase = getSupabaseServerClient({ queryCounter })
        const { data, error } = await supabase
          .from("items")
          .select("id,state")
          .eq("id", normalizedItemId)
          .eq("execution_owner_id", normalizedUserId)
          .single()

        if (error || !data) {
          throw new Error(
            `Failed to select item "${normalizedItemId}" for user "${normalizedUserId}": ${error?.message ?? "Item not found"}`
          )
        }

        return { itemId: data.id as string, state: data.state as string }
      }
    )

    console.info(
      JSON.stringify({
        event: "focus.item_selected",
        userId: normalizedUserId,
        itemId: result.itemId,
        state: result.state,
        at: new Date().toISOString(),
      })
    )

    return result
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error
    }
    throw new Error(error instanceof Error ? error.message : "Failed to select item")
  }
}

export async function getItemEnrichmentAction({ userId, itemId }: { userId: string; itemId: string }) {
  try {
    const normalizedUserId = userId.trim()
    const normalizedItemId = itemId.trim()

    if (!normalizedUserId) {
      throw new Error("Missing required field \"userId\".")
    }
    if (!normalizedItemId) {
      throw new Error("Missing required field \"itemId\".")
    }

    return withQueryCounter(
      { label: "focus.getItemEnrichmentAction", threshold: 3 },
      async (queryCounter) => {
        const supabase = getSupabaseServerClient({ queryCounter })
        return getItemEnrichmentQuery({
          supabase,
          userId: normalizedUserId,
          itemId: normalizedItemId,
        })
      }
    )
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error
    }
    throw new Error(error instanceof Error ? error.message : "Failed to enrich selected item")
  }
}
