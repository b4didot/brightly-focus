"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createAssignedMilestoneItem } from "../../../../lib/focus-engine/createAssignedMilestoneItem"
import { toFocusEngineError } from "../../../../lib/focus-engine/errors"
import { mapFocusEngineErrorToUserMessage } from "../../focus/actions/errorMapping"

function assertField(formData: FormData, fieldName: string) {
  const value = String(formData.get(fieldName) ?? "").trim()
  if (!value) {
    throw new Error(`Missing required field "${fieldName}".`)
  }

  return value
}

function optionalField(formData: FormData, fieldName: string) {
  const value = String(formData.get(fieldName) ?? "").trim()
  return value.length > 0 ? value : undefined
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

export async function createMilestoneLinkedItemAction(formData: FormData) {
  try {
    const actingUserId = assertField(formData, "actingUserId")
    const projectId = assertField(formData, "projectId")
    const milestoneId = assertField(formData, "milestoneId")
    const title = assertField(formData, "title")
    const description = optionalField(formData, "description")
    const dueAt = optionalField(formData, "dueAt")
    const executionOwnerId = optionalField(formData, "executionOwnerId")

    await createAssignedMilestoneItem({
      actingUserId,
      projectId,
      milestoneId,
      title,
      description,
      dueAt,
      executionOwnerId,
    })

    revalidatePath("/focus")
    revalidatePath("/milestones")
    revalidatePath("/projects")
    redirect(toMilestonesPath(actingUserId, projectId))
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error
    }

    throw new Error(mapFocusEngineErrorToUserMessage(toFocusEngineError(error)))
  }
}
