import { getSupabaseServerClient } from "../../../../lib/supabase/server"
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

export async function getFocusPageView(
  userId?: string,
  selectedItemId?: string
): Promise<FocusPageViewData> {
  const routeData = await getFocusRouteData(userId)
  const supabase = getSupabaseServerClient()

  const activeItem = routeData.activeItem ? toItemViewModel(routeData.activeItem) : null
  const waitingItems = routeData.waitingItems.map(toItemViewModel)
  const offeredItems = routeData.offeredItems.map(toItemViewModel)
  const selectableItems = [activeItem, ...waitingItems, ...offeredItems].filter(
    (item): item is Item => Boolean(item)
  )
  const selectedItem =
    (selectedItemId ? selectableItems.find((item) => item.id === selectedItemId) : null) ??
    activeItem ??
    waitingItems[0] ??
    offeredItems[0] ??
    null

  const selectedProjectId = selectedItem?.projectId ?? null
  const selectedMilestoneId = selectedItem?.milestoneId ?? null

  const projectCatalog = routeData.selectedUserId
    ? await getProjectCatalogRouteData(routeData.selectedUserId)
    : null

  const projectIds = (projectCatalog?.projects ?? []).map((project) => project.id)
  const { data: milestoneRows } =
    projectIds.length > 0
      ? await supabase
          .from("milestones")
          .select("id,project_id,name,description")
          .in("project_id", projectIds)
      : { data: [] }

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
      scope: project.visibilityScope === "personal" ? "personal" : "team",
      headInfo: `Due: ${project.dueAt ?? "n/a"} | Items: ${project.itemCount}`,
      milestones: projectMilestones.map((milestone) => ({
        id: milestone.id,
        title: milestone.name?.trim() || `Milestone ${milestone.id}`,
        summary: milestone.description?.trim() || "No milestone description.",
        status: toMilestoneStatus(selectedMilestoneId, milestone.id),
      })),
    }
  })

  const selectedProject =
    (selectedProjectId
      ? availableProjects.find((project) => project.id === selectedProjectId)
      : null) ?? null
  const selectedMilestone =
    (selectedMilestoneId
      ? selectedProject?.milestones.find((milestone) => milestone.id === selectedMilestoneId)
      : null) ?? null

  const selectableItemIds = selectableItems.map((item) => item.id)
  const stepsByItemId = new Map<string, number>()
  const tagsByItemId = new Map<string, string[]>()
  const alarmByItemId = new Map<string, string>()

  if (selectableItemIds.length > 0) {
    const { data: stepRows, error: stepError } = await supabase
      .from("steps")
      .select("item_id")
      .in("item_id", selectableItemIds)

    if (!stepError) {
      for (const row of stepRows ?? []) {
        const itemId = typeof row.item_id === "string" ? row.item_id : null
        if (!itemId) {
          continue
        }
        stepsByItemId.set(itemId, (stepsByItemId.get(itemId) ?? 0) + 1)
      }
    }

    const { data: itemTagRows, error: itemTagsError } = await supabase
      .from("item_tags")
      .select("item_id,tag_id")
      .in("item_id", selectableItemIds)

    if (!itemTagsError) {
      const tagIds = Array.from(
        new Set(
          (itemTagRows ?? [])
            .map((row) => (typeof row.tag_id === "string" ? row.tag_id : null))
            .filter((id): id is string => Boolean(id))
        )
      )
      const { data: tagRows, error: tagsError } =
        tagIds.length > 0
          ? await supabase.from("tags").select("id,name").in("id", tagIds)
          : { data: [], error: null }

      if (!tagsError) {
        const tagNameById = new Map<string, string>()
        for (const tagRow of tagRows ?? []) {
          const tagId = typeof tagRow.id === "string" ? tagRow.id : null
          const tagName = typeof tagRow.name === "string" ? tagRow.name : null
          if (tagId && tagName) {
            tagNameById.set(tagId, tagName)
          }
        }

        for (const row of itemTagRows ?? []) {
          const itemId = typeof row.item_id === "string" ? row.item_id : null
          const tagId = typeof row.tag_id === "string" ? row.tag_id : null
          const tagName = tagId ? tagNameById.get(tagId) : null
          if (!itemId || !tagName) {
            continue
          }
          const existing = tagsByItemId.get(itemId) ?? []
          tagsByItemId.set(itemId, [...existing, tagName])
        }
      }
    }

    const { data: sessionRows, error: sessionError } = await supabase
      .from("active_focus_sessions")
      .select("item_id,interval_minutes,next_trigger_at")
      .in("item_id", selectableItemIds)

    if (!sessionError) {
      for (const row of sessionRows ?? []) {
        const itemId = typeof row.item_id === "string" ? row.item_id : null
        const intervalMinutes =
          typeof row.interval_minutes === "number" ? `${row.interval_minutes} min` : "Alarm set"
        if (!itemId) {
          continue
        }
        alarmByItemId.set(itemId, intervalMinutes)
      }
    }
  }

  const projectById = new Map(availableProjects.map((project) => [project.id, project]))
  function enrichItem(item: Item): Item {
    const project = item.projectId ? projectById.get(item.projectId) : null
    const milestone =
      project && item.milestoneId
        ? project.milestones.find((row) => row.id === item.milestoneId)
        : null
    const tagList = tagsByItemId.get(item.id) ?? []

    return {
      ...item,
      projectName: project?.name ?? undefined,
      milestoneName: milestone?.title ?? undefined,
      tags: tagList,
      alarmLabel: alarmByItemId.get(item.id) ?? undefined,
      stepsCount: stepsByItemId.get(item.id) ?? 0,
    }
  }

  return {
    filters: routeData.users.map((user) => ({ id: user.id, label: user.name })),
    selectedUserId: routeData.selectedUserId,
    availableProjects,
    availableAssignees: routeData.users.map((user) => ({
      id: user.id,
      label: user.id === routeData.selectedUserId ? `Self (${user.name})` : user.name,
    })),
    activeItem: activeItem ? enrichItem(activeItem) : null,
    waitingItems: waitingItems.map(enrichItem),
    offeredItems: offeredItems.map(enrichItem),
    selectedItem: selectedItem ? enrichItem(selectedItem) : null,
    selectedProject,
    selectedMilestone,
  }
}
