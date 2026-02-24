"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
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

function toFocusPath(userId: string) {
  return `/focus?userId=${encodeURIComponent(userId)}`
}

export async function deleteItemAction(formData: FormData) {
  try {
    const actingUserId = assertField(formData, "actingUserId")
    const itemId = assertField(formData, "itemId")

    await deleteItem({ itemId, actingUserId })

    revalidatePath("/focus")
    revalidatePath("/projects")
    revalidatePath("/milestones")
    redirect(toFocusPath(actingUserId))
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error
    }

    throw new Error(mapFocusEngineErrorToUserMessage(toFocusEngineError(error)))
  }
}
