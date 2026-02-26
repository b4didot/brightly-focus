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

function toProjectsPath({
  userId,
  projectId,
}: {
  userId: string
  projectId: string
}) {
  return `/projects?userId=${encodeURIComponent(userId)}&projectId=${encodeURIComponent(projectId)}&tab=comments`
}

function isNextRedirectError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false
  }

  const maybeDigest = (error as { digest?: unknown }).digest
  return typeof maybeDigest === "string" && maybeDigest.includes("NEXT_REDIRECT")
}

export async function createProjectCommentAction(formData: FormData) {
  try {
    const actingUserId = assertField(formData, "actingUserId")
    const projectId = assertField(formData, "projectId")
    const body = assertField(formData, "body")
    const parentCommentId = optionalField(formData, "parentCommentId")

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
      .select("id,organization_id,team_id,created_by_user_id,visibility_scope")
      .eq("id", projectId)
      .maybeSingle()

    if (projectError) {
      throw new Error(`Failed to load project: ${projectError.message}`)
    }

    if (!project) {
      throw new Error(`Project "${projectId}" does not exist.`)
    }

    const sameOrgTeam =
      project.organization_id === actingUser.organization_id && project.team_id === actingUser.team_id
    if (!sameOrgTeam) {
      throw new Error("You cannot comment on projects outside your team.")
    }

    if (project.visibility_scope === "private" && project.created_by_user_id !== actingUser.id) {
      throw new Error("You cannot comment on a private project you do not own.")
    }

    if (parentCommentId) {
      const { data: parent, error: parentError } = await supabase
        .from("project_comments")
        .select("id,project_id")
        .eq("id", parentCommentId)
        .maybeSingle()

      if (parentError) {
        throw new Error(`Failed to validate parent comment: ${parentError.message}`)
      }

      if (!parent || parent.project_id !== projectId) {
        throw new Error("Parent comment is invalid for this project.")
      }
    }

    const { error: insertError } = await supabase
      .from("project_comments")
      .insert({
        project_id: projectId,
        author_user_id: actingUserId,
        parent_comment_id: parentCommentId,
        body,
      })

    if (insertError) {
      throw new Error(`Failed to create comment: ${insertError.message}`)
    }

    revalidatePath("/projects")
    redirect(toProjectsPath({ userId: actingUserId, projectId }))
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error
    }

    throw error
  }
}
