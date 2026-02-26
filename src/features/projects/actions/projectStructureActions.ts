"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getSupabaseServerClient } from "../../../../lib/supabase/server"

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

function parseVisibilityScope(value: string) {
  if (value !== "team" && value !== "private") {
    throw new Error('visibilityScope must be either "team" or "private".')
  }

  return value
}

function normalizeDueAt(value: string | null) {
  if (!value) {
    return null
  }

  if (Number.isNaN(Date.parse(value))) {
    throw new Error("dueAt must be a valid date-time value.")
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

function isMissingColumnError(message: string) {
  const normalized = message.toLowerCase()
  return (
    (normalized.includes("column") && normalized.includes("does not exist")) ||
    (normalized.includes("could not find") && normalized.includes("schema cache"))
  )
}

function requiresProjectContextColumns({
  description,
  dueAt,
  visibilityScope,
}: {
  description: string | null
  dueAt: string | null
  visibilityScope: string
}) {
  return Boolean(description) || Boolean(dueAt) || visibilityScope !== "team"
}

export async function createProjectStructureAction(formData: FormData) {
  try {
    const actingUserId = assertField(formData, "actingUserId")
    const teamId = assertField(formData, "teamId")
    const name = assertField(formData, "name")
    const milestoneNames = formData
      .getAll("milestoneName")
      .map((value) => String(value ?? "").trim())
      .filter((value) => value.length > 0)
    const milestoneDescriptions = formData
      .getAll("milestoneDescription")
      .map((value) => String(value ?? "").trim())
    const legacyFirstMilestoneName = optionalField(formData, "firstMilestoneName")
    const resolvedMilestoneNames = milestoneNames.length > 0
      ? milestoneNames
      : (legacyFirstMilestoneName ? [legacyFirstMilestoneName] : [])
    if (resolvedMilestoneNames.length === 0) {
      throw new Error('Missing required field "milestoneName".')
    }
    const visibilityScope = parseVisibilityScope(assertField(formData, "visibilityScope"))
    const description = optionalField(formData, "description")
    const dueAt = normalizeDueAt(optionalField(formData, "dueAt"))

    const explicitDefaultUserId = optionalField(formData, "defaultUserId")

    const supabase = getSupabaseServerClient()

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

    if (actingUser.team_id !== teamId) {
      throw new Error("Acting user does not belong to the selected team.")
    }

    const resolvedDefaultUserId =
      visibilityScope === "private" ? actingUserId : (explicitDefaultUserId ?? actingUserId)

    const { data: defaultUser, error: defaultUserError } = await supabase
      .from("users")
      .select("id,organization_id,team_id")
      .eq("id", resolvedDefaultUserId)
      .maybeSingle()

    if (defaultUserError) {
      throw new Error(`Failed to validate default user: ${defaultUserError.message}`)
    }

    if (!defaultUser) {
      throw new Error(`Default user "${resolvedDefaultUserId}" does not exist.`)
    }

    if (
      defaultUser.organization_id !== actingUser.organization_id ||
      defaultUser.team_id !== actingUser.team_id
    ) {
      throw new Error("Default user must belong to the same organization/team as the project.")
    }

    if (visibilityScope === "private" && defaultUser.id !== actingUser.id) {
      throw new Error("Private projects must use the creator as the default user.")
    }

    const basePayload = {
      organization_id: actingUser.organization_id,
      team_id: actingUser.team_id,
      default_user_id: defaultUser.id,
      created_by_user_id: actingUser.id,
      name,
    }
    const contextualPayload = {
      ...basePayload,
      description,
      due_at: dueAt,
      visibility_scope: visibilityScope,
    }

    let createResult = await supabase
      .from("projects")
      .insert(contextualPayload)
      .select("id")
      .maybeSingle()

    if (createResult.error && isMissingColumnError(createResult.error.message)) {
      if (requiresProjectContextColumns({ description, dueAt, visibilityScope })) {
        throw new Error(
          "Project context fields are not available in the current database schema. Apply the latest migration to use description, due date, or private scope."
        )
      }
      createResult = await supabase.from("projects").insert(basePayload).select("id").maybeSingle()
    }

    const { data: createdProject, error: createProjectError } = createResult
    if (createProjectError) {
      throw new Error(`Failed to create project: ${createProjectError.message}`)
    }

    if (!createdProject) {
      throw new Error("Project creation returned no row.")
    }

    const milestonePayload = resolvedMilestoneNames.map((milestoneName, index) => ({
      project_id: createdProject.id,
      name: milestoneName,
      description: milestoneDescriptions[index] ? milestoneDescriptions[index] : null,
    }))
    const legacyMilestonePayload = resolvedMilestoneNames.map((milestoneName) => ({
      project_id: createdProject.id,
      name: milestoneName,
    }))

    let firstMilestoneResult = await supabase.from("milestones").insert(milestonePayload)

    if (firstMilestoneResult.error && isMissingColumnError(firstMilestoneResult.error.message)) {
      firstMilestoneResult = await supabase.from("milestones").insert(legacyMilestonePayload)
    }

    if (firstMilestoneResult.error) {
      await supabase.from("projects").delete().eq("id", createdProject.id)
      throw new Error(
        `Failed to create milestones for project "${createdProject.id}": ${firstMilestoneResult.error.message}`
      )
    }

    revalidatePath("/projects")
    revalidatePath("/milestones")
    redirect(toProjectsPath(actingUserId))
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error
    }

    throw error
  }
}

export async function updateProjectStructureAction(formData: FormData) {
  try {
    const actingUserId = assertField(formData, "actingUserId")
    const projectId = assertField(formData, "projectId")
    const name = assertField(formData, "name")
    const visibilityScope = parseVisibilityScope(assertField(formData, "visibilityScope"))
    const description = optionalField(formData, "description")
    const dueAt = normalizeDueAt(optionalField(formData, "dueAt"))
    const defaultUserId = optionalField(formData, "defaultUserId")

    const supabase = getSupabaseServerClient()

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
      .select("id,organization_id,team_id,default_user_id,created_by_user_id")
      .eq("id", projectId)
      .maybeSingle()

    if (projectError) {
      throw new Error(`Failed to load project: ${projectError.message}`)
    }

    if (!project) {
      throw new Error(`Project "${projectId}" does not exist.`)
    }

    if (project.organization_id !== actingUser.organization_id || project.team_id !== actingUser.team_id) {
      throw new Error("Only same-team members can edit this project.")
    }

    const resolvedDefaultUserId =
      visibilityScope === "private" ? project.created_by_user_id : (defaultUserId ?? project.default_user_id)

    const { data: defaultUser, error: defaultUserError } = await supabase
      .from("users")
      .select("id,organization_id,team_id")
      .eq("id", resolvedDefaultUserId)
      .maybeSingle()

    if (defaultUserError) {
      throw new Error(`Failed to validate default user: ${defaultUserError.message}`)
    }

    if (!defaultUser) {
      throw new Error(`Default user "${resolvedDefaultUserId}" does not exist.`)
    }

    if (defaultUser.organization_id !== project.organization_id || defaultUser.team_id !== project.team_id) {
      throw new Error("Default user must belong to the same organization/team as the project.")
    }

    if (visibilityScope === "private" && defaultUser.id !== project.created_by_user_id) {
      throw new Error("Private projects must use the creator as the default user.")
    }

    const baseUpdatePayload = {
      name,
      default_user_id: resolvedDefaultUserId,
    }
    const contextualUpdatePayload = {
      ...baseUpdatePayload,
      description,
      due_at: dueAt,
      visibility_scope: visibilityScope,
    }

    let updateResult = await supabase
      .from("projects")
      .update(contextualUpdatePayload)
      .eq("id", projectId)

    if (updateResult.error && isMissingColumnError(updateResult.error.message)) {
      if (requiresProjectContextColumns({ description, dueAt, visibilityScope })) {
        throw new Error(
          "Project context fields are not available in the current database schema. Apply the latest migration to update description, due date, or private scope."
        )
      }
      updateResult = await supabase.from("projects").update(baseUpdatePayload).eq("id", projectId)
    }

    if (updateResult.error) {
      throw new Error(`Failed to update project: ${updateResult.error.message}`)
    }

    revalidatePath("/projects")
    revalidatePath("/milestones")
    revalidatePath("/focus")
    redirect(toProjectsPath(actingUserId))
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error
    }

    throw error
  }
}

export async function updateProjectDescriptionAction(formData: FormData) {
  try {
    const actingUserId = assertField(formData, "actingUserId")
    const projectId = assertField(formData, "projectId")
    const description = optionalField(formData, "description")

    const supabase = getSupabaseServerClient()

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
      .select("id,organization_id,team_id")
      .eq("id", projectId)
      .maybeSingle()

    if (projectError) {
      throw new Error(`Failed to load project: ${projectError.message}`)
    }

    if (!project) {
      throw new Error(`Project "${projectId}" does not exist.`)
    }

    if (project.organization_id !== actingUser.organization_id || project.team_id !== actingUser.team_id) {
      throw new Error("Only same-team members can edit this project.")
    }

    const { error: updateError } = await supabase
      .from("projects")
      .update({ description })
      .eq("id", projectId)

    if (updateError) {
      throw new Error(`Failed to update project description: ${updateError.message}`)
    }

    revalidatePath("/projects")
    redirect(`${toProjectsPath(actingUserId)}&projectId=${encodeURIComponent(projectId)}`)
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error
    }

    throw error
  }
}
