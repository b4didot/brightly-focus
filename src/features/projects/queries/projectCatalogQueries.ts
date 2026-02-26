import { getSupabaseServerClient } from "../../../../lib/supabase/server"
import { toUserView, type DbUser, type UserView } from "../../users/adapters/userAdapter"

type DbProject = {
  id: string
  organization_id: string
  team_id: string
  default_user_id: string
  created_by_user_id: string
  name?: string | null
  description?: string | null
  visibility_scope?: string | null
  due_at?: string | null
  created_at: string | null
}

type DbMilestone = {
  id: string
  project_id: string
}

type UserScope = {
  id: string
  organization_id: string
  team_id: string | null
}

export type ProjectCatalogItem = {
  id: string
  name: string
  description: string | null
  visibilityScope: "team" | "private"
  dueAt: string | null
  defaultUserId: string
  createdByUserId: string
  milestoneCount: number
  itemCount: number
}

export type ProjectCatalogRouteData = {
  users: UserView[]
  selectedUserId: string | null
  selectedUser: UserView | null
  selectedTeamId: string | null
  projects: ProjectCatalogItem[]
  analyticsProjects: ProjectCatalogItem[]
}

function asProjectName(value: string | null | undefined, id: string) {
  const normalized = value?.trim()
  return normalized && normalized.length > 0 ? normalized : `Project ${id}`
}

function asScope(value: string | null | undefined): "team" | "private" {
  return value === "private" ? "private" : "team"
}

export async function getProjectCatalogRouteData(userId?: string): Promise<ProjectCatalogRouteData> {
  const supabase = getSupabaseServerClient()

  const { data: usersData, error: usersError } = await supabase
    .from("users")
    .select("*")

  if (usersError) {
    throw new Error(`Failed to load users: ${usersError.message}`)
  }

  const userRows = (usersData ?? []) as (DbUser & UserScope)[]
  const users = userRows.map(toUserView).sort((a, b) => a.name.localeCompare(b.name))
  const selectedUserId = userId && users.some((user) => user.id === userId) ? userId : (users[0]?.id ?? null)
  const selectedUserScope = userRows.find((row) => row.id === selectedUserId) ?? null

  if (!selectedUserScope) {
    return {
      users,
      selectedUserId,
      selectedUser: users.find((user) => user.id === selectedUserId) ?? null,
      selectedTeamId: null,
      projects: [],
      analyticsProjects: [],
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

  const { data: milestonesData, error: milestonesError } = await supabase
    .from("milestones")
    .select("id,project_id")

  if (milestonesError) {
    throw new Error(`Failed to load milestones: ${milestonesError.message}`)
  }

  const { data: itemsData, error: itemsError } = await supabase.from("items").select("id,milestone_id")

  if (itemsError) {
    throw new Error(`Failed to load items for project catalog: ${itemsError.message}`)
  }

  const milestoneRows = (milestonesData ?? []) as DbMilestone[]
  const projectRows = (projectsData ?? []) as DbProject[]
  const milestoneByProject = new Map<string, string[]>()

  for (const milestone of milestoneRows) {
    const rows = milestoneByProject.get(milestone.project_id) ?? []
    rows.push(milestone.id)
    milestoneByProject.set(milestone.project_id, rows)
  }

  const itemCountByMilestone = new Map<string, number>()
  for (const item of itemsData ?? []) {
    const milestoneId = typeof item.milestone_id === "string" ? item.milestone_id : null
    if (!milestoneId) {
      continue
    }

    itemCountByMilestone.set(milestoneId, (itemCountByMilestone.get(milestoneId) ?? 0) + 1)
  }

  const projects = projectRows
    .filter((project) => {
      const scope = asScope(project.visibility_scope)
      return scope === "team" || project.created_by_user_id === selectedUserScope.id
    })
    .map((project) => {
      const milestoneIds = milestoneByProject.get(project.id) ?? []
      const itemCount = milestoneIds.reduce((sum, milestoneId) => sum + (itemCountByMilestone.get(milestoneId) ?? 0), 0)
      return {
        id: project.id,
        name: asProjectName(project.name, project.id),
        description: project.description?.trim() || null,
        visibilityScope: asScope(project.visibility_scope),
        dueAt: project.due_at ?? null,
        defaultUserId: project.default_user_id,
        createdByUserId: project.created_by_user_id,
        milestoneCount: milestoneIds.length,
        itemCount,
      } satisfies ProjectCatalogItem
    })

  return {
    users,
    selectedUserId,
    selectedUser: users.find((user) => user.id === selectedUserId) ?? null,
    selectedTeamId: selectedUserScope.team_id,
    projects,
    analyticsProjects: projects.filter((project) => project.visibilityScope === "team"),
  }
}
