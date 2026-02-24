import type { Item } from "./item"
import type { Milestone } from "./milestone"
import type { Project } from "./project"

export interface FilterOption {
  id: string
  label: string
}

export interface SortingOption {
  id: string
  label: string
}

export interface FocusPageViewData {
  filters: FilterOption[]
  selectedUserId: string | null
  activeItem: Item | null
  waitingItems: Item[]
  offeredItems: Item[]
  selectedItem: Item | null
  selectedProject: Project | null
  selectedMilestone: Milestone | null
}

export interface ItemPageViewData {
  filters: FilterOption[]
  sorting: SortingOption[]
  queueItems: Item[]
  completedItems: Item[]
  selectedItem: Item | null
  selectedProject: Project | null
  selectedMilestone: Milestone | null
}

export interface ProjectPageViewData {
  filters: FilterOption[]
  sorting: SortingOption[]
  teamProjects: Project[]
  personalProjects: Project[]
  selectedProject: Project | null
}
