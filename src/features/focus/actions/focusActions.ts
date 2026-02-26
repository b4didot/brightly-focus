"use server"

import { revalidatePath } from "next/cache"
import { getSupabaseServerClient } from "../../../../lib/supabase/server"
import { acceptItem } from "../../../../lib/focus-engine/acceptItem"
import { activateItem } from "../../../../lib/focus-engine/activateItem"
import { completeItem } from "../../../../lib/focus-engine/completeItem"
import { createUserItem } from "../../../../lib/focus-engine/createUserItem"
import { toFocusEngineError } from "../../../../lib/focus-engine/errors"
import { reorderWaitingItem } from "../../../../lib/focus-engine/reorderWaitingItem"
import { mapFocusEngineErrorToUserMessage } from "./errorMapping"
import type { EnrichedItemData } from "../types/viewModels"

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
  projectId: string | null,
  milestoneId: string | null
): Promise<EnrichedItemData> {
  try {
    const supabase = getSupabaseServerClient()

    // Fetch project info if item has a project
    let projectName: string | undefined
    if (projectId) {
      const { data: projectData } = await supabase
        .from("projects")
        .select("name")
        .eq("id", projectId)
        .single()

      projectName = projectData?.name
    }

    // Fetch milestone info if item has a milestone
    let milestoneName: string | undefined
    if (milestoneId && projectId) {
      const { data: milestoneData } = await supabase
        .from("milestones")
        .select("name")
        .eq("id", milestoneId)
        .eq("project_id", projectId)
        .single()

      milestoneName = milestoneData?.name
    }

    // Fetch steps count
    const { data: stepData, error: stepError } = await supabase
      .from("steps")
      .select("id", { count: "exact", head: true })
      .eq("item_id", itemId)

    const stepsCount = stepError ? 0 : stepData?.length ?? 0

    // Fetch tags
    let tags: string[] = []
    const { data: itemTagData } = await supabase
      .from("item_tags")
      .select("tag_id")
      .eq("item_id", itemId)

    if (itemTagData && itemTagData.length > 0) {
      const tagIds = itemTagData
        .map((row) => (typeof row.tag_id === "string" ? row.tag_id : null))
        .filter((id): id is string => Boolean(id))

      if (tagIds.length > 0) {
        const { data: tagNames } = await supabase.from("tags").select("name").in("id", tagIds)

        tags = (tagNames ?? [])
          .map((row) => (typeof row.name === "string" ? row.name : null))
          .filter((name): name is string => Boolean(name))
      }
    }

    // Fetch alarm info
    let alarmLabel: string | undefined
    const { data: sessionData } = await supabase
      .from("active_focus_sessions")
      .select("interval_minutes")
      .eq("item_id", itemId)
      .single()

    if (sessionData?.interval_minutes) {
      alarmLabel = `${sessionData.interval_minutes} min`
    } else if (sessionData) {
      alarmLabel = "Alarm set"
    }

    return {
      itemId,
      projectName,
      milestoneName,
      tags,
      stepsCount,
      alarmLabel,
    }
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error
    }
    throw new Error(`Failed to enrich item: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}
