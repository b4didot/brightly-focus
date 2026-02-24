import { getSupabaseServerClient } from "../../../../lib/supabase/server"
import { toUserView, type DbUser, type UserView } from "../../users/adapters/userAdapter"

type DbUserScope = DbUser & {
  organization_id: string
  team_id: string | null
}

type DbProject = {
  id: string
  organization_id: string
  team_id: string
  default_user_id: string
  name?: string | null
  description?: string | null
  visibility_scope?: string | null
  due_at?: string | null
}

type DbMilestone = {
  id: string
  project_id: string
  name?: string | null
  description?: string | null
  created_at: string | null
}

export type MilestoneEditorProject = {
  id: string
  name: string
  description: string | null
  visibilityScope: "team" | "personal"
  dueAt: string | null
  defaultUserId: string
}

export type MilestoneEditorMilestone = {
  id: string
  name: string
  description: string | null
  createdAt: string | null
  itemCount: number
}

export type MilestoneEditorRouteData = {
  users: UserView[]
  selectedUserId: string | null
  selectedUser: UserView | null
  projects: MilestoneEditorProject[]
  selectedProjectId: string | null
  selectedProject: MilestoneEditorProject | null
  milestones: MilestoneEditorMilestone[]
}

function asScope(value: string | null | undefined): "team" | "personal" {
  return value === "personal" ? "personal" : "team"
}

function asName(value: string | null | undefined, fallbackPrefix: string, id: string) {
  const normalized = value?.trim()
  return normalized && normalized.length > 0 ? normalized : `${fallbackPrefix} ${id}`
}

export async function getMilestoneEditorRouteData({
  userId,
  projectId,
}: {
  userId?: string
  projectId?: string
}): Promise<MilestoneEditorRouteData> {
  const supabase = getSupabaseServerClient()

  const { data: usersData, error: usersError } = await supabase
    .from("users")
    .select("*")

  if (usersError) {
    throw new Error(`Failed to load users: ${usersError.message}`)
  }

  const userRows = (usersData ?? []) as DbUserScope[]
  const users = userRows.map(toUserView).sort((a, b) => a.name.localeCompare(b.name))
  const selectedUserId = userId && users.some((user) => user.id === userId) ? userId : (users[0]?.id ?? null)
  const selectedUserScope = userRows.find((row) => row.id === selectedUserId) ?? null

  if (!selectedUserScope) {
    return {
      users,
      selectedUserId,
      selectedUser: users.find((user) => user.id === selectedUserId) ?? null,
      projects: [],
      selectedProjectId: null,
      selectedProject: null,
      milestones: [],
    }
  }

  const { data: projectsData, error: projectsError } = await supabase
    .from("projects")
    .select("*")
    .eq("organization_id", selectedUserScope.organization_id)
    .eq("team_id", selectedUserScope.team_id)
    .order("created_at", { ascending: false })

  if (projectsError) {
    throw new Error(`Failed to load projects: ${projectsError.message}`)
  }

  const projects = ((projectsData ?? []) as DbProject[])
    .filter((project) => asScope(project.visibility_scope) === "team" || project.default_user_id === selectedUserScope.id)
    .map((project) => ({
      id: project.id,
      name: asName(project.name, "Project", project.id),
      description: project.description?.trim() || null,
      visibilityScope: asScope(project.visibility_scope),
      dueAt: project.due_at ?? null,
      defaultUserId: project.default_user_id,
    }))

  const selectedProjectId =
    projectId && projects.some((project) => project.id === projectId) ? projectId : (projects[0]?.id ?? null)

  if (!selectedProjectId) {
    return {
      users,
      selectedUserId,
      selectedUser: users.find((user) => user.id === selectedUserId) ?? null,
      projects,
      selectedProjectId,
      selectedProject: null,
      milestones: [],
    }
  }

  const { data: milestonesData, error: milestonesError } = await supabase
    .from("milestones")
    .select("*")
    .eq("project_id", selectedProjectId)
    .order("created_at", { ascending: true })

  if (milestonesError) {
    throw new Error(`Failed to load milestones: ${milestonesError.message}`)
  }

  const milestoneRows = (milestonesData ?? []) as DbMilestone[]
  const milestoneIds = milestoneRows.map((row) => row.id)

  const itemCountByMilestone = new Map<string, number>()
  if (milestoneIds.length > 0) {
    const { data: itemRows, error: itemsError } = await supabase
      .from("items")
      .select("id,milestone_id")
      .in("milestone_id", milestoneIds)

    if (itemsError) {
      throw new Error(`Failed to load milestone items: ${itemsError.message}`)
    }

    for (const row of itemRows ?? []) {
      const rowMilestoneId = typeof row.milestone_id === "string" ? row.milestone_id : null
      if (!rowMilestoneId) {
        continue
      }

      itemCountByMilestone.set(rowMilestoneId, (itemCountByMilestone.get(rowMilestoneId) ?? 0) + 1)
    }
  }

  return {
    users,
    selectedUserId,
    selectedUser: users.find((user) => user.id === selectedUserId) ?? null,
    projects,
    selectedProjectId,
    selectedProject: projects.find((project) => project.id === selectedProjectId) ?? null,
    milestones: milestoneRows.map((milestone) => ({
      id: milestone.id,
      name: asName(milestone.name, "Milestone", milestone.id),
      description: milestone.description?.trim() || null,
      createdAt: milestone.created_at,
      itemCount: itemCountByMilestone.get(milestone.id) ?? 0,
    })),
  }
}
