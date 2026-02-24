"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { acceptItem } from "../../../../lib/focus-engine/acceptItem"
import { activateItem } from "../../../../lib/focus-engine/activateItem"
import { completeItem } from "../../../../lib/focus-engine/completeItem"
import { toFocusEngineError } from "../../../../lib/focus-engine/errors"
import { reorderWaitingItem } from "../../../../lib/focus-engine/reorderWaitingItem"
import { mapFocusEngineErrorToUserMessage } from "./errorMapping"

function toFocusPath(userId: string) {
  return `/focus?userId=${encodeURIComponent(userId)}`
}

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

export async function acceptItemAction(formData: FormData) {
  try {
    const userId = assertField(formData, "userId")
    const itemId = assertField(formData, "itemId")
    await acceptItem({ itemId, userId })
    revalidatePath("/focus")
    redirect(toFocusPath(userId))
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
    revalidatePath("/focus")
    redirect(toFocusPath(userId))
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
    revalidatePath("/focus")
    redirect(toFocusPath(userId))
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
    revalidatePath("/focus")
    redirect(toFocusPath(userId))
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error
    }
    throw new Error(mapFocusEngineErrorToUserMessage(toFocusEngineError(error)))
  }
}
