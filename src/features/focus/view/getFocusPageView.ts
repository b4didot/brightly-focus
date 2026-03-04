import { getSupabaseServerClient } from "../../../../lib/supabase/server"
import { withQueryCounter } from "../../../../lib/supabase/queryCounter"
import { getFocusRouteData } from "../queries/focusQueries"
import { getProjectCatalogRouteData } from "@/features/projects/queries/projectCatalogQueries"
import type { FocusPageViewData, Item, ItemStatus, Project } from "@/types"

type DbMilestone = {
  id: string
  project_id: string
  name?: string | null
  description?: string | null
}

function toItemStatus(value: string | null): ItemStatus {
  if (value === "active" || value === "waiting" || value === "offered" || value === "completed") {
    return value
  }
  return "waiting"
}

function toItemSummary(value: string | null) {
  return value && value.length > 0 ? value : "No description provided."
}

function toItemViewModel(item: {
  id: string
  title: string
  description: string | null
  state: string | null
  projectId: string | null
  milestoneId: string | null
  dueAt: string | null
}): Item {
  return {
    id: item.id,
    title: item.title,
    summary: toItemSummary(item.description),
    status: toItemStatus(item.state),
    projectId: item.projectId ?? undefined,
    milestoneId: item.milestoneId ?? undefined,
    dueDateTime: item.dueAt ?? undefined,
  }
}

function toMilestoneStatus(selectedMilestoneId: string | null, milestoneId: string) {
  return selectedMilestoneId === milestoneId ? "active" : "planned"
}

function attachContextNames(items: Item[], projectById: Map<string, Project>) {
  return items.map((item) => {
    const project = item.projectId ? projectById.get(item.projectId) : null
    const milestone =
      project && item.milestoneId
        ? project.milestones.find((milestoneRow) => milestoneRow.id === item.milestoneId)
        : null

    return {
      ...item,
      projectName: project?.name,
      milestoneName: milestone?.title,
    }
  })
}

export async function getFocusPageView(
  userId?: string,
  selectedItemId?: string
): Promise<FocusPageViewData> {
  return withQueryCounter({ label: "focus.getFocusPageView", threshold: 3 }, async (queryCounter) => {
    const routeData = await getFocusRouteData(userId, { queryCounter })
    const supabase = getSupabaseServerClient({ queryCounter })

    const activeItemBase = routeData.activeItem ? toItemViewModel(routeData.activeItem) : null
    const waitingItemsBase = routeData.waitingItems.map(toItemViewModel)
    const offeredItemsBase = routeData.offeredItems.map(toItemViewModel)
    const selectableItems = [activeItemBase, ...waitingItemsBase, ...offeredItemsBase].filter(
      (item): item is Item => Boolean(item)
    )
    const selectedItemBase =
      (selectedItemId ? selectableItems.find((item) => item.id === selectedItemId) : null) ??
      activeItemBase ??
      waitingItemsBase[0] ??
      offeredItemsBase[0] ??
      null

    const selectedMilestoneId = selectedItemBase?.milestoneId ?? null

    const projectCatalog = routeData.selectedUserId
      ? await getProjectCatalogRouteData(routeData.selectedUserId, { queryCounter })
      : null

    const projectIds = (projectCatalog?.projects ?? []).map((project) => project.id)
    const { data: milestoneRows, error: milestoneError } =
      projectIds.length > 0
        ? await supabase
            .from("milestones")
            .select("id,project_id,name,description")
            .in("project_id", projectIds)
        : { data: [], error: null }

    if (milestoneError) {
      throw new Error(`Failed to load project milestones: ${milestoneError.message}`)
    }

    const milestonesByProject = new Map<string, DbMilestone[]>()
    for (const milestone of (milestoneRows ?? []) as DbMilestone[]) {
      const rows = milestonesByProject.get(milestone.project_id) ?? []
      rows.push(milestone)
      milestonesByProject.set(milestone.project_id, rows)
    }

    const availableProjects: Project[] = (projectCatalog?.projects ?? []).map((project) => {
      const projectMilestones = milestonesByProject.get(project.id) ?? []
      return {
        id: project.id,
        name: project.name,
        summary: project.description ?? "No project description.",
        scope: project.visibilityScope === "private" ? "private" : "team",
        headInfo: `Due: ${project.dueAt ?? "n/a"} | Items: ${project.itemCount}`,
        milestones: projectMilestones.map((milestone) => ({
          id: milestone.id,
          title: milestone.name?.trim() || `Milestone ${milestone.id}`,
          summary: milestone.description?.trim() || "No milestone description.",
          status: toMilestoneStatus(selectedMilestoneId, milestone.id),
        })),
      }
    })

    const projectById = new Map(availableProjects.map((project) => [project.id, project]))
    const activeItem = activeItemBase ? attachContextNames([activeItemBase], projectById)[0] : null
    const waitingItems = attachContextNames(waitingItemsBase, projectById)
    const offeredItems = attachContextNames(offeredItemsBase, projectById)
    const selectableHydrated: Item[] = [...waitingItems, ...offeredItems]
    if (activeItem) {
      selectableHydrated.unshift(activeItem)
    }
    const selectedItem =
      (selectedItemBase ? selectableHydrated.find((item) => item.id === selectedItemBase.id) : null) ?? null

    const selectedProject =
      (selectedItem?.projectId
        ? availableProjects.find((project) => project.id === selectedItem.projectId)
        : null) ?? null
    const selectedMilestone =
      (selectedItem?.milestoneId
        ? selectedProject?.milestones.find((milestone) => milestone.id === selectedItem.milestoneId)
        : null) ?? null

    return {
      filters: routeData.users.map((user) => ({ id: user.id, label: user.name })),
      selectedUserId: routeData.selectedUserId,
      availableProjects,
      availableAssignees: routeData.users.map((user) => ({
        id: user.id,
        label: user.id === routeData.selectedUserId ? `Self (${user.name})` : user.name,
      })),
      activeItem,
      waitingItems,
      offeredItems,
      selectedItem,
      selectedProject,
      selectedMilestone,
    }
  })
}
