import { getSupabaseServerClient } from "../supabase/server"
import { FocusEngineError, toFocusEngineError } from "./errors"
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
}

type DbMilestone = {
  id: string
  project_id: string
}

export async function createAssignedMilestoneItem({
  actingUserId,
  projectId,
  milestoneId,
  title,
  description,
  dueAt,
  executionOwnerId,
}: {
  actingUserId: string
  projectId: string
  milestoneId: string
  title: string
  description?: string
  dueAt?: string
  executionOwnerId?: string
}) {
  try {
    const normalizedActingUserId = requireNonEmptyString(actingUserId, "actingUserId")
    const normalizedProjectId = requireNonEmptyString(projectId, "projectId")
    const normalizedMilestoneId = requireNonEmptyString(milestoneId, "milestoneId")
    const normalizedTitle = requireNonEmptyString(title, "title")
    const normalizedDescription = description?.trim() ? description.trim() : null
    const normalizedDueAt = dueAt?.trim() ? dueAt.trim() : null

    if (normalizedDueAt && Number.isNaN(Date.parse(normalizedDueAt))) {
      throw new FocusEngineError("VALIDATION_ERROR", "dueAt must be a valid date-time value.")
    }

    const supabase = getSupabaseServerClient()

    const { data: actingUser, error: actingUserError } = await supabase
      .from("users")
      .select("id,organization_id,team_id")
      .eq("id", normalizedActingUserId)
      .maybeSingle()

    if (actingUserError) {
      throw new FocusEngineError(
        "DB_ERROR",
        `Failed to load acting user "${normalizedActingUserId}": ${actingUserError.message}`
      )
    }

    if (!actingUser) {
      throw new FocusEngineError("NOT_FOUND", `Acting user "${normalizedActingUserId}" does not exist.`)
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id,organization_id,team_id,default_user_id")
      .eq("id", normalizedProjectId)
      .maybeSingle()

    if (projectError) {
      throw new FocusEngineError(
        "DB_ERROR",
        `Failed to load project "${normalizedProjectId}": ${projectError.message}`
      )
    }

    if (!project) {
      throw new FocusEngineError("NOT_FOUND", `Project "${normalizedProjectId}" does not exist.`)
    }

    const projectRow = project as DbProject
    const actingUserRow = actingUser as DbUser

    if (
      actingUserRow.organization_id !== projectRow.organization_id ||
      actingUserRow.team_id !== projectRow.team_id
    ) {
      throw new FocusEngineError(
        "OWNERSHIP_MISMATCH",
        "You can only manage projects in your own organization/team scope."
      )
    }

    const { data: milestone, error: milestoneError } = await supabase
      .from("milestones")
      .select("id,project_id")
      .eq("id", normalizedMilestoneId)
      .eq("project_id", projectRow.id)
      .maybeSingle()

    if (milestoneError) {
      throw new FocusEngineError(
        "DB_ERROR",
        `Failed to load milestone "${normalizedMilestoneId}": ${milestoneError.message}`
      )
    }

    if (!milestone) {
      throw new FocusEngineError(
        "NOT_FOUND",
        `Milestone "${normalizedMilestoneId}" does not exist in project "${projectRow.id}".`
      )
    }

    const milestoneRow = milestone as DbMilestone
    if (milestoneRow.project_id !== projectRow.id) {
      throw new FocusEngineError(
        "VALIDATION_ERROR",
        `Milestone "${normalizedMilestoneId}" is not linked to project "${projectRow.id}".`
      )
    }

    const resolvedOwnerId = executionOwnerId?.trim() || projectRow.default_user_id

    const { data: owner, error: ownerError } = await supabase
      .from("users")
      .select("id,organization_id,team_id")
      .eq("id", resolvedOwnerId)
      .maybeSingle()

    if (ownerError) {
      throw new FocusEngineError(
        "DB_ERROR",
        `Failed to load execution owner "${resolvedOwnerId}": ${ownerError.message}`
      )
    }

    if (!owner) {
      throw new FocusEngineError("NOT_FOUND", `Execution owner "${resolvedOwnerId}" does not exist.`)
    }

    const ownerRow = owner as DbUser
    if (ownerRow.organization_id !== projectRow.organization_id || ownerRow.team_id !== projectRow.team_id) {
      throw new FocusEngineError(
        "VALIDATION_ERROR",
        "Execution owner must belong to the same organization/team as the project."
      )
    }

    const { data: insertedItem, error: insertError } = await supabase
      .from("items")
      .insert({
        milestone_id: milestoneRow.id,
        execution_owner_id: ownerRow.id,
        state: "offered",
        waiting_position: null,
        completed_at: null,
        title: normalizedTitle,
        description: normalizedDescription,
        due_at: normalizedDueAt,
      })
      .select("*")
      .maybeSingle()

    if (insertError) {
      throw new FocusEngineError("DB_ERROR", `Failed to create linked item: ${insertError.message}`)
    }

    if (!insertedItem) {
      throw new FocusEngineError("DB_ERROR", "Linked item creation returned no row.")
    }

    return insertedItem
  } catch (error) {
    throw toFocusEngineError(error)
  }
}
