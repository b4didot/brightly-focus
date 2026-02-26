import { getSupabaseServerClient } from "../../../../lib/supabase/server"
import { toUserView, type DbUser, type UserView } from "../../users/adapters/userAdapter"

type DbUserScope = DbUser & {
  organization_id: string
  team_id: string | null
}

type DbTeam = {
  id: string
  name: string | null
}

type DbProject = {
  id: string
  organization_id: string
  team_id: string
  default_user_id: string
  created_by_user_id: string
  name: string | null
  description: string | null
  visibility_scope: string | null
  created_at: string | null
}

type DbProjectLegacy = Omit<DbProject, "created_by_user_id">

type DbMilestone = {
  id: string
  project_id: string
  name: string | null
  description: string | null
  created_at: string | null
}

type DbItem = {
  id: string
  milestone_id: string | null
  execution_owner_id: string
  title: string | null
  description: string | null
  state: string | null
  due_at: string | null
}

type DbStep = {
  id: string
  item_id: string
  name: string | null
  is_completed: boolean | null
}

type DbProjectComment = {
  id: string
  project_id: string
  author_user_id: string
  parent_comment_id: string | null
  body: string
  created_at: string
}

type ProgressRatio = {
  completed: number
  total: number
}

export type ProjectScopeFilter = "all" | "team" | "private"
export type ProjectContextTab = "details" | "milestones" | "comments"
export type ProjectVisibilityScope = "team" | "private"

export type ProjectListItem = {
  id: string
  name: string
  visibilityScope: ProjectVisibilityScope
  teamName: string | null
  progress: ProgressRatio | null
}

export type ProjectDetailItem = {
  id: string
  title: string
  description: string | null
  ownerName: string
  executionOwnerId: string
  milestoneId: string
  state: "offered" | "waiting" | "active" | "completed"
  stepProgress: ProgressRatio | null
  dueAt: string | null
  steps: Array<{
    id: string
    name: string
    isCompleted: boolean
  }>
}

export type ProjectDetailMilestone = {
  id: string
  name: string
  description: string | null
  progress: ProgressRatio | null
  itemCount: number
  completedCount: number
  items: ProjectDetailItem[]
}

export type ProjectCommentNode = {
  id: string
  authorName: string
  body: string
  createdAt: string
  replies: ProjectCommentNode[]
}

export type SelectedProjectDetail = {
  id: string
  name: string
  description: string | null
  visibilityScope: ProjectVisibilityScope
  teamName: string | null
  defaultUserName: string
  defaultUserId: string
  createdByUserId: string
  progress: ProgressRatio | null
  milestones: ProjectDetailMilestone[]
}

export type ProjectsWorkspaceData = {
  users: UserView[]
  selectedUserId: string | null
  selectedUser: UserView | null
  selectedTeamId: string | null
  scopeFilter: ProjectScopeFilter
  activeTab: ProjectContextTab
  projectList: ProjectListItem[]
  selectedProjectId: string | null
  selectedProject: SelectedProjectDetail | null
  comments: ProjectCommentNode[]
}

function asScope(value: string | null | undefined): ProjectVisibilityScope {
  return value === "private" || value === "personal" ? "private" : "team"
}

function asState(value: string | null | undefined): "offered" | "waiting" | "active" | "completed" {
  if (value === "offered" || value === "waiting" || value === "active" || value === "completed") {
    return value
  }

  return "waiting"
}

function normalizeName(value: string | null | undefined, prefix: string, id: string) {
  const normalized = value?.trim()
  return normalized && normalized.length > 0 ? normalized : `${prefix} ${id}`
}

function normalizeScopeFilter(value: string | undefined): ProjectScopeFilter {
  if (value === "team" || value === "private") {
    return value
  }

  return "all"
}

function normalizeTab(value: string | undefined): ProjectContextTab {
  if (value === "milestones" || value === "comments") {
    return value
  }

  return "details"
}

function ratioOrNull(completed: number, total: number): ProgressRatio | null {
  if (total <= 0) {
    return null
  }

  return { completed, total }
}

function isMissingProjectCreatorColumnError(error: { code?: string; message?: string } | null) {
  if (!error) {
    return false
  }

  return error.code === "42703" || (error.message ?? "").includes("projects.created_by_user_id")
}

function isMissingProjectCommentsTableError(error: { code?: string; message?: string } | null) {
  if (!error) {
    return false
  }

  return error.code === "42P01" || (error.message ?? "").includes("relation \"project_comments\" does not exist")
}

function isMissingMilestoneDescriptionColumnError(error: { code?: string; message?: string } | null) {
  if (!error) {
    return false
  }

  return error.code === "42703" || (error.message ?? "").includes("milestones.description")
}

function toCommentTree(rows: DbProjectComment[], userNameById: Map<string, string>): ProjectCommentNode[] {
  const nodeById = new Map<string, ProjectCommentNode>()
  const rootNodes: ProjectCommentNode[] = []

  for (const row of rows) {
    nodeById.set(row.id, {
      id: row.id,
      authorName: userNameById.get(row.author_user_id) ?? row.author_user_id,
      body: row.body,
      createdAt: row.created_at,
      replies: [],
    })
  }

  for (const row of rows) {
    const node = nodeById.get(row.id)
    if (!node) {
      continue
    }

    if (!row.parent_comment_id) {
      rootNodes.push(node)
      continue
    }

    const parent = nodeById.get(row.parent_comment_id)
    if (!parent) {
      rootNodes.push(node)
      continue
    }

    parent.replies.push(node)
  }

  return rootNodes
}

export async function getProjectsWorkspaceData({
  userId,
  projectId,
  scopeFilter,
  tab,
}: {
  userId?: string
  projectId?: string
  scopeFilter?: string
  tab?: string
}): Promise<ProjectsWorkspaceData> {
  const supabase = getSupabaseServerClient()
  const normalizedScopeFilter = normalizeScopeFilter(scopeFilter)
  const activeTab = normalizeTab(tab)

  const { data: usersData, error: usersError } = await supabase.from("users").select("*")
  if (usersError) {
    throw new Error(`Failed to load users: ${usersError.message}`)
  }

  const userRows = (usersData ?? []) as DbUserScope[]
  const users = userRows.map(toUserView).sort((a, b) => a.name.localeCompare(b.name))
  const selectedUserId = userId && users.some((user) => user.id === userId) ? userId : (users[0]?.id ?? null)
  const selectedUserScope = userRows.find((row) => row.id === selectedUserId) ?? null

  if (!selectedUserScope || !selectedUserScope.team_id) {
    return {
      users,
      selectedUserId,
      selectedUser: users.find((user) => user.id === selectedUserId) ?? null,
      selectedTeamId: selectedUserScope?.team_id ?? null,
      scopeFilter: normalizedScopeFilter,
      activeTab,
      projectList: [],
      selectedProjectId: null,
      selectedProject: null,
      comments: [],
    }
  }

  const { data: teamRows, error: teamError } = await supabase
    .from("teams")
    .select("id,name")
    .eq("id", selectedUserScope.team_id)
    .limit(1)

  if (teamError) {
    throw new Error(`Failed to load team: ${teamError.message}`)
  }

  const teamName = ((teamRows ?? []) as DbTeam[])[0]?.name?.trim() ?? null
  const userNameById = new Map(users.map((user) => [user.id, user.name]))

  let projectsData: DbProject[] = []
  {
    const selectWithCreator =
      "id,organization_id,team_id,default_user_id,created_by_user_id,name,description,visibility_scope,created_at"
    const { data, error } = await supabase
      .from("projects")
      .select(selectWithCreator)
      .eq("organization_id", selectedUserScope.organization_id)
      .eq("team_id", selectedUserScope.team_id)
      .order("created_at", { ascending: false })

    if (!error) {
      projectsData = (data ?? []) as DbProject[]
    } else if (isMissingProjectCreatorColumnError(error)) {
      const legacySelect = "id,organization_id,team_id,default_user_id,name,description,visibility_scope,created_at"
      const { data: legacyData, error: legacyError } = await supabase
        .from("projects")
        .select(legacySelect)
        .eq("organization_id", selectedUserScope.organization_id)
        .eq("team_id", selectedUserScope.team_id)
        .order("created_at", { ascending: false })

      if (legacyError) {
        throw new Error(`Failed to load projects: ${legacyError.message}`)
      }

      projectsData = ((legacyData ?? []) as DbProjectLegacy[]).map((project) => ({
        ...project,
        created_by_user_id: project.default_user_id,
      }))
    } else {
      throw new Error(`Failed to load projects: ${error.message}`)
    }
  }

  const visibleProjects = projectsData
    .filter((project) => asScope(project.visibility_scope) === "team" || project.created_by_user_id === selectedUserScope.id)
    .filter((project) => {
      if (normalizedScopeFilter === "all") {
        return true
      }
      return asScope(project.visibility_scope) === normalizedScopeFilter
    })

  const visibleProjectIds = visibleProjects.map((project) => project.id)
  let milestoneRowsRaw: unknown[] = []
  let milestonesError: { message: string; code?: string } | null = null
  if (visibleProjectIds.length > 0) {
    const milestoneQuery = await supabase
      .from("milestones")
      .select("id,project_id,name,description,created_at")
      .in("project_id", visibleProjectIds)
      .order("created_at", { ascending: true })
    milestoneRowsRaw = (milestoneQuery.data ?? []) as unknown[]
    milestonesError = milestoneQuery.error
  }

  let milestoneRowsRawFinal = milestoneRowsRaw
  let milestonesErrorFinal = milestonesError
  if (milestonesError && isMissingMilestoneDescriptionColumnError(milestonesError)) {
    const legacyMilestoneQuery = await supabase
      .from("milestones")
      .select("id,project_id,name,created_at")
      .in("project_id", visibleProjectIds)
      .order("created_at", { ascending: true })
    milestonesErrorFinal = legacyMilestoneQuery.error
    milestoneRowsRawFinal =
      ((legacyMilestoneQuery.data ?? []) as Array<Omit<DbMilestone, "description">>).map((row) => ({
        ...row,
        description: null,
      }))
  }

  if (milestonesErrorFinal) {
    throw new Error(`Failed to load milestones: ${milestonesErrorFinal.message}`)
  }

  const milestoneRows = (milestoneRowsRawFinal ?? []) as DbMilestone[]
  const milestoneIds = milestoneRows.map((row) => row.id)

  const { data: itemRowsRaw, error: itemsError } =
    milestoneIds.length > 0
      ? await supabase
          .from("items")
          .select("id,milestone_id,execution_owner_id,title,description,state,due_at")
          .in("milestone_id", milestoneIds)
      : { data: [], error: null }

  if (itemsError) {
    throw new Error(`Failed to load project items: ${itemsError.message}`)
  }

  const itemRows = ((itemRowsRaw ?? []) as DbItem[]).filter((item) => Boolean(item.milestone_id))
  const itemIds = itemRows.map((row) => row.id)

  const { data: stepRowsRaw, error: stepsError } =
    itemIds.length > 0
      ? await supabase
          .from("steps")
          .select("id,item_id,name,is_completed")
          .in("item_id", itemIds)
      : { data: [], error: null }

  if (stepsError) {
    throw new Error(`Failed to load item steps: ${stepsError.message}`)
  }

  const stepRows = (stepRowsRaw ?? []) as DbStep[]

  const itemCountsByMilestone = new Map<string, { total: number; completed: number }>()
  for (const item of itemRows) {
    if (!item.milestone_id) {
      continue
    }
    const current = itemCountsByMilestone.get(item.milestone_id) ?? { total: 0, completed: 0 }
    current.total += 1
    if (item.state === "completed") {
      current.completed += 1
    }
    itemCountsByMilestone.set(item.milestone_id, current)
  }

  const projectStatsById = new Map<string, { total: number; completed: number }>()
  const milestoneById = new Map(milestoneRows.map((milestone) => [milestone.id, milestone]))
  for (const item of itemRows) {
    if (!item.milestone_id) {
      continue
    }
    const milestone = milestoneById.get(item.milestone_id)
    if (!milestone) {
      continue
    }

    const current = projectStatsById.get(milestone.project_id) ?? { total: 0, completed: 0 }
    current.total += 1
    if (item.state === "completed") {
      current.completed += 1
    }
    projectStatsById.set(milestone.project_id, current)
  }

  const stepProgressByItemId = new Map<string, ProgressRatio | null>()
  const stepsByItemId = new Map<string, Array<{ id: string; name: string; isCompleted: boolean }>>()
  const stepCountsByItemId = new Map<string, { total: number; completed: number }>()
  for (const step of stepRows) {
    const stepList = stepsByItemId.get(step.item_id) ?? []
    stepList.push({
      id: step.id,
      name: normalizeName(step.name, "Step", step.id),
      isCompleted: Boolean(step.is_completed),
    })
    stepsByItemId.set(step.item_id, stepList)

    const current = stepCountsByItemId.get(step.item_id) ?? { total: 0, completed: 0 }
    current.total += 1
    if (step.is_completed) {
      current.completed += 1
    }
    stepCountsByItemId.set(step.item_id, current)
  }
  for (const item of itemRows) {
    const counts = stepCountsByItemId.get(item.id)
    stepProgressByItemId.set(item.id, counts ? ratioOrNull(counts.completed, counts.total) : null)
  }

  const milestonesByProjectId = new Map<string, DbMilestone[]>()
  for (const milestone of milestoneRows) {
    const list = milestonesByProjectId.get(milestone.project_id) ?? []
    list.push(milestone)
    milestonesByProjectId.set(milestone.project_id, list)
  }

  const itemsByMilestoneId = new Map<string, DbItem[]>()
  for (const item of itemRows) {
    if (!item.milestone_id) {
      continue
    }
    const list = itemsByMilestoneId.get(item.milestone_id) ?? []
    list.push(item)
    itemsByMilestoneId.set(item.milestone_id, list)
  }

  const projectList: ProjectListItem[] = visibleProjects.map((project) => {
    const stats = projectStatsById.get(project.id) ?? { total: 0, completed: 0 }
    return {
      id: project.id,
      name: normalizeName(project.name, "Project", project.id),
      visibilityScope: asScope(project.visibility_scope),
      teamName,
      progress: ratioOrNull(stats.completed, stats.total),
    }
  })

  const selectedProjectId =
    projectId && projectList.some((project) => project.id === projectId) ? projectId : (projectList[0]?.id ?? null)

  const selectedProjectRow = visibleProjects.find((project) => project.id === selectedProjectId) ?? null

  let comments: ProjectCommentNode[] = []
  let selectedProject: SelectedProjectDetail | null = null

  if (selectedProjectRow) {
    const milestones = milestonesByProjectId.get(selectedProjectRow.id) ?? []
    const projectProgress = projectStatsById.get(selectedProjectRow.id) ?? { total: 0, completed: 0 }
    const detailedMilestones: ProjectDetailMilestone[] = milestones.map((milestone) => {
      const milestoneItems = itemsByMilestoneId.get(milestone.id) ?? []
      const itemProgress = itemCountsByMilestone.get(milestone.id) ?? { total: 0, completed: 0 }
      return {
        id: milestone.id,
        name: normalizeName(milestone.name, "Milestone", milestone.id),
        description: milestone.description?.trim() || null,
        progress: ratioOrNull(itemProgress.completed, itemProgress.total),
        itemCount: itemProgress.total,
        completedCount: itemProgress.completed,
        items: milestoneItems.map((item) => ({
          id: item.id,
          title: normalizeName(item.title, "Item", item.id),
          description: item.description?.trim() || null,
          ownerName: userNameById.get(item.execution_owner_id) ?? item.execution_owner_id,
          executionOwnerId: item.execution_owner_id,
          milestoneId: milestone.id,
          state: asState(item.state),
          stepProgress: stepProgressByItemId.get(item.id) ?? null,
          dueAt: item.due_at,
          steps: stepsByItemId.get(item.id) ?? [],
        })),
      }
    })

    selectedProject = {
      id: selectedProjectRow.id,
      name: normalizeName(selectedProjectRow.name, "Project", selectedProjectRow.id),
      description: selectedProjectRow.description?.trim() || null,
      visibilityScope: asScope(selectedProjectRow.visibility_scope),
      teamName,
      defaultUserName: userNameById.get(selectedProjectRow.default_user_id) ?? selectedProjectRow.default_user_id,
      defaultUserId: selectedProjectRow.default_user_id,
      createdByUserId: selectedProjectRow.created_by_user_id,
      progress: ratioOrNull(projectProgress.completed, projectProgress.total),
      milestones: detailedMilestones,
    }

    const { data: commentRowsRaw, error: commentsError } = await supabase
      .from("project_comments")
      .select("id,project_id,author_user_id,parent_comment_id,body,created_at")
      .eq("project_id", selectedProjectRow.id)
      .order("created_at", { ascending: true })

    if (commentsError && !isMissingProjectCommentsTableError(commentsError)) {
      throw new Error(`Failed to load project comments: ${commentsError.message}`)
    }

    comments = commentsError ? [] : toCommentTree((commentRowsRaw ?? []) as DbProjectComment[], userNameById)
  }

  return {
    users,
    selectedUserId,
    selectedUser: users.find((user) => user.id === selectedUserId) ?? null,
    selectedTeamId: selectedUserScope.team_id,
    scopeFilter: normalizedScopeFilter,
    activeTab,
    projectList,
    selectedProjectId,
    selectedProject,
    comments,
  }
}
