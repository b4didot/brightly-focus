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

function isNextRedirectError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false
  }

  const maybeDigest = (error as { digest?: unknown }).digest
  return typeof maybeDigest === "string" && maybeDigest.includes("NEXT_REDIRECT")
}

function toMilestonesPath(userId: string, projectId?: string) {
  const params = new URLSearchParams({ userId })
  if (projectId) {
    params.set("projectId", projectId)
  }

  return `/milestones?${params.toString()}`
}

function isMissingColumnError(message: string) {
  const normalized = message.toLowerCase()
  return (
    (normalized.includes("column") && normalized.includes("does not exist")) ||
    (normalized.includes("could not find") && normalized.includes("schema cache"))
  )
}

export async function createProjectMilestoneAction(formData: FormData) {
  try {
    const actingUserId = assertField(formData, "actingUserId")
    const projectId = assertField(formData, "projectId")
    const name = assertField(formData, "name")
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
      throw new Error("Only same-team members can add milestones to this project.")
    }

    let createResult = await supabase.from("milestones").insert({
      project_id: projectId,
      name,
      description,
    })

    if (createResult.error && isMissingColumnError(createResult.error.message)) {
      if (description) {
        throw new Error(
          "Milestone description is not available in the current database schema. Apply the latest migration to use milestone descriptions."
        )
      }
      createResult = await supabase.from("milestones").insert({
        project_id: projectId,
        name,
      })
    }

    if (createResult.error) {
      throw new Error(`Failed to create milestone: ${createResult.error.message}`)
    }

    revalidatePath("/projects")
    revalidatePath("/milestones")
    redirect(toMilestonesPath(actingUserId, projectId))
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error
    }

    throw error
  }
}

export async function updateProjectMilestoneAction(formData: FormData) {
  try {
    const actingUserId = assertField(formData, "actingUserId")
    const projectId = assertField(formData, "projectId")
    const milestoneId = assertField(formData, "milestoneId")
    const name = assertField(formData, "name")
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
      throw new Error("Only same-team members can edit milestones in this project.")
    }

    let updateResult = await supabase
      .from("milestones")
      .update({ name, description })
      .eq("id", milestoneId)
      .eq("project_id", projectId)

    if (updateResult.error && isMissingColumnError(updateResult.error.message)) {
      if (description) {
        throw new Error(
          "Milestone description is not available in the current database schema. Apply the latest migration to use milestone descriptions."
        )
      }
      updateResult = await supabase
        .from("milestones")
        .update({ name })
        .eq("id", milestoneId)
        .eq("project_id", projectId)
    }

    if (updateResult.error) {
      throw new Error(`Failed to update milestone: ${updateResult.error.message}`)
    }

    revalidatePath("/milestones")
    revalidatePath("/projects")
    redirect(toMilestonesPath(actingUserId, projectId))
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error
    }

    throw error
  }
}
