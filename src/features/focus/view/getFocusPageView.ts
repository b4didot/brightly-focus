import { getSupabaseServerClient } from "../../../../lib/supabase/server"
import { getFocusRouteData } from "../queries/focusQueries"
import type { FocusPageViewData, Item, ItemStatus, Milestone, Project } from "@/types"

type DbProject = {
  id: string
  name?: string | null
  description?: string | null
  visibility_scope?: string | null
  due_at?: string | null
  default_user_id?: string | null
}

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
}): Item {
  return {
    id: item.id,
    title: item.title,
    summary: toItemSummary(item.description),
    status: toItemStatus(item.state),
    projectId: item.projectId ?? undefined,
    milestoneId: item.milestoneId ?? undefined,
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

  let selectedProject: Project | null = null
  let selectedMilestone: Milestone | null = null

  if (selectedProjectId || selectedMilestoneId) {
    const supabase = getSupabaseServerClient()

    if (selectedProjectId) {
      const { data: projectRow } = await supabase
        .from("projects")
        .select("id,name,description,visibility_scope,due_at,default_user_id")
        .eq("id", selectedProjectId)
        .maybeSingle()

      const { data: milestoneRows } = await supabase
        .from("milestones")
        .select("id,project_id,name,description")
        .eq("project_id", selectedProjectId)

      const typedMilestones = (milestoneRows ?? []) as DbMilestone[]

      if (projectRow) {
        const typedProject = projectRow as DbProject
        selectedProject = {
          id: typedProject.id,
          name: typedProject.name?.trim() || `Project ${typedProject.id}`,
          summary: typedProject.description?.trim() || "No project description.",
          scope: typedProject.visibility_scope === "personal" ? "personal" : "team",
          headInfo: `Default User: ${typedProject.default_user_id ?? "n/a"} | Due: ${typedProject.due_at ?? "n/a"}`,
          milestones: typedMilestones.map((milestone) => ({
            id: milestone.id,
            title: milestone.name?.trim() || `Milestone ${milestone.id}`,
            summary: milestone.description?.trim() || "No milestone description.",
            status: toMilestoneStatus(selectedMilestoneId, milestone.id),
          })),
        }
      }

      if (selectedMilestoneId) {
        const matchedMilestone = typedMilestones.find((milestone) => milestone.id === selectedMilestoneId)
        if (matchedMilestone) {
          selectedMilestone = {
            id: matchedMilestone.id,
            title: matchedMilestone.name?.trim() || `Milestone ${matchedMilestone.id}`,
            summary: matchedMilestone.description?.trim() || "No milestone description.",
            status: "active",
          }
        }
      }
    }
  }

  return {
    filters: routeData.users.map((user) => ({ id: user.id, label: user.name })),
    selectedUserId: routeData.selectedUserId,
    activeItem,
    waitingItems,
    offeredItems,
    selectedItem,
    selectedProject,
    selectedMilestone,
  }
}
