import { getSupabaseServerClient } from "../supabase/server"
import { FocusEngineError, toFocusEngineError } from "./errors"
import {
  deleteItemDependentsAndRow,
  hasOriginDependents,
  normalizeOwnersWaitingQueues,
  type DeletionSummary,
} from "./deleteShared"
import { requireNonEmptyString } from "./guards"

type DbUser = {
  id: string
  organization_id: string
  team_id: string | null
}

type DbProject = {
  id: string
  organization_id: string
  team_id: string
  default_user_id: string
  visibility_scope: string | null
}

type DbMilestone = {
  id: string
  project_id: string
}

type DbItem = {
  id: string
  execution_owner_id: string
  state: string
  waiting_position: number | null
}

export async function deleteMilestoneCascade({
  milestoneId,
  actingUserId,
}: {
  milestoneId: string
  actingUserId: string
}): Promise<DeletionSummary> {
  try {
    const normalizedMilestoneId = requireNonEmptyString(milestoneId, "milestoneId")
    const normalizedActingUserId = requireNonEmptyString(actingUserId, "actingUserId")
    const supabase = getSupabaseServerClient()

    const { data: actor, error: actorError } = await supabase
      .from("users")
      .select("id,organization_id,team_id")
      .eq("id", normalizedActingUserId)
      .maybeSingle()

    if (actorError) {
      throw new FocusEngineError("DELETE_DB_ERROR", `Failed to validate actor: ${actorError.message}`)
    }

    if (!actor) {
      throw new FocusEngineError("NOT_FOUND", `Acting user "${normalizedActingUserId}" does not exist.`)
    }

    const actorRow = actor as DbUser

    const { data: milestone, error: milestoneError } = await supabase
      .from("milestones")
      .select("id,project_id")
      .eq("id", normalizedMilestoneId)
      .maybeSingle()

    if (milestoneError) {
      throw new FocusEngineError("DELETE_DB_ERROR", `Failed to load milestone: ${milestoneError.message}`)
    }

    if (!milestone) {
      throw new FocusEngineError("NOT_FOUND", `Milestone "${normalizedMilestoneId}" does not exist.`)
    }

    const milestoneRow = milestone as DbMilestone

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id,organization_id,team_id,default_user_id,visibility_scope")
      .eq("id", milestoneRow.project_id)
      .maybeSingle()

    if (projectError) {
      throw new FocusEngineError("DELETE_DB_ERROR", `Failed to load project: ${projectError.message}`)
    }

    if (!project) {
      throw new FocusEngineError(
        "NOT_FOUND",
        `Project for milestone "${normalizedMilestoneId}" does not exist.`
      )
    }

    const projectRow = project as DbProject

    if (projectRow.default_user_id !== normalizedActingUserId) {
      throw new FocusEngineError(
        "DELETE_NOT_ALLOWED_PERMISSION",
        "Only the project owner can delete this milestone."
      )
    }

    if (
      projectRow.organization_id !== actorRow.organization_id ||
      projectRow.team_id !== actorRow.team_id
    ) {
      throw new FocusEngineError(
        "DELETE_NOT_ALLOWED_PERMISSION",
        "You can only delete milestones inside your organization/team."
      )
    }

    const { data: itemsData, error: itemsError } = await supabase
      .from("items")
      .select("id,execution_owner_id,state,waiting_position")
      .eq("milestone_id", milestoneRow.id)

    if (itemsError) {
      throw new FocusEngineError("DELETE_DB_ERROR", `Failed to load milestone items: ${itemsError.message}`)
    }

    const items = (itemsData ?? []) as DbItem[]
    const itemIds = items.map((item) => item.id)
    const blockedByOrigin = await hasOriginDependents(itemIds)

    const originBlocked = items.filter((item) => blockedByOrigin.has(item.id))
    if (originBlocked.length > 0) {
      throw new FocusEngineError(
        "DELETE_NOT_ALLOWED_ORIGIN_REF",
        `Cannot delete milestone because ${originBlocked.length} item(s) are referenced as origin.`
      )
    }

    let deletedItemsCount = 0
    let deletedStepsCount = 0
    let deletedTagsCount = 0
    const ownersToNormalize = new Set<string>()

    for (const item of items) {
      const result = await deleteItemDependentsAndRow(item)
      deletedItemsCount += result.deletedItemsCount
      deletedStepsCount += result.deletedStepsCount
      deletedTagsCount += result.deletedTagsCount
      if (result.wasWaiting) {
        ownersToNormalize.add(result.affectedOwnerId)
      }
    }

    await normalizeOwnersWaitingQueues(ownersToNormalize)

    const { error: milestoneDeleteError } = await supabase
      .from("milestones")
      .delete()
      .eq("id", milestoneRow.id)

    if (milestoneDeleteError) {
      throw new FocusEngineError(
        "DELETE_DB_ERROR",
        `Failed to delete milestone: ${milestoneDeleteError.message}`
      )
    }

    return {
      deletedItemsCount,
      deletedStepsCount,
      deletedTagsCount,
      deletedMilestonesCount: 1,
      deletedProject: false,
    }
  } catch (error) {
    throw toFocusEngineError(error)
  }
}
