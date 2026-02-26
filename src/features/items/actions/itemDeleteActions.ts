"use server"

import { revalidatePath } from "next/cache"
import { deleteItem } from "../../../../lib/focus-engine/deleteItem"
import { toFocusEngineError } from "../../../../lib/focus-engine/errors"
import { mapFocusEngineErrorToUserMessage } from "../../focus/actions/errorMapping"

function assertField(formData: FormData, fieldName: string) {
  const value = String(formData.get(fieldName) ?? "").trim()
  if (!value) {
    throw new Error(`Missing required field "${fieldName}".`)
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

export async function deleteItemAction(formData: FormData) {
  try {
    const actingUserId = assertField(formData, "actingUserId")
    const itemId = assertField(formData, "itemId")

    await deleteItem({ itemId, actingUserId })

    // Cache invalidation happens in background - optimistic update already on client
    revalidateInBackground(["/focus", "/projects", "/milestones"])
    // Return success without redirecting - optimistic client update already removed the item
    return { success: true, actingUserId, itemId }
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error
    }

    throw new Error(mapFocusEngineErrorToUserMessage(toFocusEngineError(error)))
  }
}
