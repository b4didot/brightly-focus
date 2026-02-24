"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { deleteProjectCascade } from "../../../../lib/focus-engine/deleteProjectCascade"
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

function toProjectsPath(userId: string) {
  return `/projects?userId=${encodeURIComponent(userId)}`
}

export async function deleteProjectCascadeAction(formData: FormData) {
  try {
    const actingUserId = assertField(formData, "actingUserId")
    const projectId = assertField(formData, "projectId")

    await deleteProjectCascade({ projectId, actingUserId })

    revalidatePath("/focus")
    revalidatePath("/projects")
    revalidatePath("/milestones")
    redirect(toProjectsPath(actingUserId))
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error
    }

    throw new Error(mapFocusEngineErrorToUserMessage(toFocusEngineError(error)))
  }
}
