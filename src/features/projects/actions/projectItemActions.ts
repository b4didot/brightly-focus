"use server"

import { revalidatePath } from "next/cache"
import { createAssignedMilestoneItem } from "../../../../lib/focus-engine/createAssignedMilestoneItem"
import { toFocusEngineError } from "../../../../lib/focus-engine/errors"
import { getSupabaseServerClient } from "../../../../lib/supabase/server"
import { mapFocusEngineErrorToUserMessage } from "../../focus/actions/errorMapping"

type ItemModalStep = {
  id: string
  name: string
  isCompleted: boolean
}

type ProjectDetailItemPayload = {
  id: string
  title: string
  description: string | null
  ownerName: string
  executionOwnerId: string
  milestoneId: string
  state: "offered" | "waiting" | "active" | "completed"
  stepProgress: { completed: number; total: number } | null
  dueAt: string | null
  steps: ItemModalStep[]
}

function assertField(formData: FormData, fieldName: string) {
  const value = String(formData.get(fieldName) ?? "").trim()
  if (!value) {
    throw new Error(`Missing required field "${fieldName}".`)
  }
  return value
}

function optionalField(formData: FormData, fieldName: string) {
  const value = String(formData.get(fieldName) ?? "").trim()
  return value.length > 0 ? value : null
}

function parseDueAt(value: string | null) {
  if (!value) {
    return null
  }
  if (Number.isNaN(Date.parse(value))) {
    throw new Error("dueAt must be a valid date-time value.")
  }
  return value
}

function toStepNames(formData: FormData) {
  return formData
    .getAll("stepName")
    .map((value) => String(value ?? "").trim())
    .filter((value) => value.length > 0)
}

function asItemState(value: string | null | undefined): "offered" | "waiting" | "active" | "completed" {
  if (value === "offered" || value === "waiting" || value === "active" || value === "completed") {
    return value
  }
  return "waiting"
}

function ratioOrNull(completed: number, total: number) {
  if (total <= 0) {
    return null
  }
  return { completed, total }
}

function isNextRedirectError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false
  }
  const maybeDigest = (error as { digest?: unknown }).digest
  return typeof maybeDigest === "string" && maybeDigest.includes("NEXT_REDIRECT")
}

function revalidateInBackground(paths: string[]) {
  setTimeout(() => {
    paths.forEach((path) => revalidatePath(path))
  }, 0)
}

async function assertProjectScope({
  supabase,
  actingUserId,
  projectId,
}: {
  supabase: ReturnType<typeof getSupabaseServerClient>
  actingUserId: string
  projectId: string
}) {
  const { data: actingUser, error: actingUserError } = await supabase
    .from("users")
    .select("id,organization_id,team_id")
    .eq("id", actingUserId)
    .maybeSingle()

  if (actingUserError) {
    throw new Error(`Failed to validate acting user: ${actingUserError.message}`)
  }
  if (!actingUser) {
    throw new Error(`Acting user "${actingUserId}" does not exist.`)
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id,organization_id,team_id,created_by_user_id,visibility_scope")
    .eq("id", projectId)
    .maybeSingle()

  if (projectError) {
    throw new Error(`Failed to load project: ${projectError.message}`)
  }
  if (!project) {
    throw new Error(`Project "${projectId}" does not exist.`)
  }

  const sameOrgTeam = project.organization_id === actingUser.organization_id && project.team_id === actingUser.team_id
  if (!sameOrgTeam) {
    throw new Error("Only same-team members can modify project items.")
  }

  if (project.visibility_scope === "private" && project.created_by_user_id !== actingUser.id) {
    throw new Error("Only the project owner can modify private project items.")
  }
}

async function buildItemPayload({
  supabase,
  itemId,
  fallbackMilestoneId,
}: {
  supabase: ReturnType<typeof getSupabaseServerClient>
  itemId: string
  fallbackMilestoneId: string
}): Promise<ProjectDetailItemPayload> {
  const { data: itemRow, error: itemError } = await supabase
    .from("items")
    .select("id,title,description,state,due_at,milestone_id,execution_owner_id")
    .eq("id", itemId)
    .maybeSingle()

  if (itemError) {
    throw new Error(`Failed to load item: ${itemError.message}`)
  }
  if (!itemRow) {
    throw new Error(`Item "${itemId}" does not exist.`)
  }

  const { data: ownerRow, error: ownerError } = await supabase
    .from("users")
    .select("id,first_name,last_name")
    .eq("id", itemRow.execution_owner_id)
    .maybeSingle()

  if (ownerError) {
    throw new Error(`Failed to load owner: ${ownerError.message}`)
  }

  const ownerName = ownerRow
    ? `${String(ownerRow.first_name ?? "").trim()} ${String(ownerRow.last_name ?? "").trim()}`.trim() || ownerRow.id
    : itemRow.execution_owner_id

  const { data: stepsRowsRaw, error: stepsError } = await supabase
    .from("steps")
    .select("id,name,is_completed,created_at")
    .eq("item_id", itemId)
    .order("created_at", { ascending: true })

  if (stepsError) {
    throw new Error(`Failed to load item steps: ${stepsError.message}`)
  }

  const stepsRows = (stepsRowsRaw ?? []) as Array<{ id: string; name: string | null; is_completed: boolean | null }>
  const steps = stepsRows.map((step) => ({
    id: step.id,
    name: step.name?.trim() || `Step ${step.id}`,
    isCompleted: Boolean(step.is_completed),
  }))
  const completedSteps = steps.filter((step) => step.isCompleted).length

  return {
    id: itemRow.id,
    title: itemRow.title?.trim() || `Item ${itemRow.id}`,
    description: itemRow.description?.trim() || null,
    ownerName,
    executionOwnerId: itemRow.execution_owner_id,
    milestoneId: itemRow.milestone_id ?? fallbackMilestoneId,
    state: asItemState(itemRow.state),
    stepProgress: ratioOrNull(completedSteps, steps.length),
    dueAt: itemRow.due_at,
    steps,
  }
}

export async function createProjectMilestoneItemAction(formData: FormData) {
  try {
    const actingUserId = assertField(formData, "actingUserId")
    const projectId = assertField(formData, "projectId")
    const milestoneId = assertField(formData, "milestoneId")
    const title = assertField(formData, "title")
    const description = optionalField(formData, "description")
    const dueAt = parseDueAt(optionalField(formData, "dueAt"))
    const executionOwnerId = optionalField(formData, "executionOwnerId") ?? undefined
    const stepNames = toStepNames(formData)

    const supabase = getSupabaseServerClient()
    await assertProjectScope({ supabase, actingUserId, projectId })

    const created = await createAssignedMilestoneItem({
      actingUserId,
      projectId,
      milestoneId,
      title,
      description: description ?? undefined,
      dueAt: dueAt ?? undefined,
      executionOwnerId,
    })

    if (stepNames.length > 0) {
      const { error: stepInsertError } = await supabase
        .from("steps")
        .insert(stepNames.map((stepName) => ({ item_id: created.id, name: stepName })))
      if (stepInsertError) {
        throw new Error(`Failed to create steps: ${stepInsertError.message}`)
      }
    }

    const item = await buildItemPayload({ supabase, itemId: created.id, fallbackMilestoneId: milestoneId })
    revalidateInBackground(["/projects"])
    return { success: true, milestoneId, item }
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error
    }
    throw new Error(mapFocusEngineErrorToUserMessage(toFocusEngineError(error)))
  }
}

export async function updateProjectMilestoneItemAction(formData: FormData) {
  try {
    const actingUserId = assertField(formData, "actingUserId")
    const projectId = assertField(formData, "projectId")
    const milestoneId = assertField(formData, "milestoneId")
    const itemId = assertField(formData, "itemId")
    const title = assertField(formData, "title")
    const description = optionalField(formData, "description")
    const dueAt = parseDueAt(optionalField(formData, "dueAt"))
    const stepNames = toStepNames(formData)

    const supabase = getSupabaseServerClient()
    await assertProjectScope({ supabase, actingUserId, projectId })

    const { data: itemRow, error: itemError } = await supabase
      .from("items")
      .select("id,milestone_id,state")
      .eq("id", itemId)
      .maybeSingle()

    if (itemError) {
      throw new Error(`Failed to load item: ${itemError.message}`)
    }
    if (!itemRow) {
      throw new Error(`Item "${itemId}" does not exist.`)
    }
    if (itemRow.milestone_id !== milestoneId) {
      throw new Error("Item does not belong to the selected milestone.")
    }
    if (itemRow.state === "completed") {
      throw new Error("Completed items are immutable.")
    }

    const { error: updateError } = await supabase
      .from("items")
      .update({
        title,
        description,
        due_at: dueAt,
      })
      .eq("id", itemId)

    if (updateError) {
      throw new Error(`Failed to update item: ${updateError.message}`)
    }

    const { error: deleteStepsError } = await supabase.from("steps").delete().eq("item_id", itemId)
    if (deleteStepsError) {
      throw new Error(`Failed to replace steps: ${deleteStepsError.message}`)
    }

    if (stepNames.length > 0) {
      const { error: insertStepsError } = await supabase
        .from("steps")
        .insert(stepNames.map((stepName) => ({ item_id: itemId, name: stepName })))
      if (insertStepsError) {
        throw new Error(`Failed to create steps: ${insertStepsError.message}`)
      }
    }

    const item = await buildItemPayload({ supabase, itemId, fallbackMilestoneId: milestoneId })
    revalidateInBackground(["/projects"])
    return { success: true, milestoneId, item }
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error
    }
    throw error
  }
}
