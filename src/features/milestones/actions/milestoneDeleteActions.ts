"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { deleteMilestoneCascade } from "../../../../lib/focus-engine/deleteMilestoneCascade"
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

function toMilestonesPath(userId: string, projectId: string) {
  return `/milestones?userId=${encodeURIComponent(userId)}&projectId=${encodeURIComponent(projectId)}`
}

export async function deleteMilestoneCascadeAction(formData: FormData) {
  try {
    const actingUserId = assertField(formData, "actingUserId")
    const milestoneId = assertField(formData, "milestoneId")
    const projectId = assertField(formData, "projectId")

    await deleteMilestoneCascade({ milestoneId, actingUserId })

    revalidatePath("/focus")
    revalidatePath("/projects")
    revalidatePath("/milestones")
    redirect(toMilestonesPath(actingUserId, projectId))
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error
    }

    throw new Error(mapFocusEngineErrorToUserMessage(toFocusEngineError(error)))
  }
}
