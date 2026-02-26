import type {
  FocusPageViewData,
  Item,
  ItemPageViewData,
  Milestone,
  Project,
  ProjectPageViewData,
} from "@/types"

const milestones: Milestone[] = [
  {
    id: "m1",
    title: "Draft Wireframe",
    summary: "Finalize user-view layout blocks.",
    status: "active",
  },
  {
    id: "m2",
    title: "UI Scaffolding",
    summary: "Compose reusable page sections.",
    status: "planned",
  },
]

const projects: Project[] = [
  {
    id: "p1",
    name: "Brightly Focus UI",
    summary: "User-view interface implementation.",
    scope: "team",
    headInfo: "Owner: Product Team | Cycle: Q1",
    milestones,
  },
  {
    id: "p2",
    name: "Personal UX Notes",
    summary: "Private backlog of refinements.",
    scope: "private",
    headInfo: "Owner: You | Cycle: Rolling",
    milestones: [milestones[1]],
  },
]

const items: Item[] = [
  {
    id: "i1",
    title: "Build focus layout containers",
    summary: "Create page container and split layout shells.",
    status: "active",
    projectId: "p1",
    milestoneId: "m1",
  },
  {
    id: "i2",
    title: "Compose queue panels",
    summary: "Waiting and offered item panel setup.",
    status: "waiting",
    projectId: "p1",
    milestoneId: "m2",
  },
  {
    id: "i3",
    title: "Publish reusable cards",
    summary: "Expose item/project/milestone cards.",
    status: "offered",
    projectId: "p1",
  },
  {
    id: "i4",
    title: "Old completed ticket",
    summary: "Legacy task for recreate action stub.",
    status: "completed",
    projectId: "p2",
  },
]

export const focusPagePlaceholderData: FocusPageViewData = {
  filters: [{ id: "all", label: "All" }],
  selectedUserId: "all",
  availableProjects: projects,
  availableAssignees: [{ id: "all", label: "Self" }],
  activeItem: items[0],
  waitingItems: [items[1]],
  offeredItems: [items[2]],
  selectedItem: items[0],
  selectedProject: projects[0],
  selectedMilestone: milestones[0],
}

export const itemPagePlaceholderData: ItemPageViewData = {
  filters: [
    { id: "all", label: "All" },
    { id: "team", label: "Team" },
  ],
  sorting: [
    { id: "priority", label: "Priority" },
    { id: "recent", label: "Most Recent" },
  ],
  queueItems: [items[0], items[1]],
  completedItems: [items[3]],
  selectedItem: items[1],
  selectedProject: projects[0],
  selectedMilestone: milestones[1],
}

export const projectPagePlaceholderData: ProjectPageViewData = {
  filters: [{ id: "all", label: "All Projects" }],
  sorting: [
    { id: "recent", label: "Most Recent" },
    { id: "name", label: "Name" },
  ],
  teamProjects: [projects[0]],
  personalProjects: [projects[1]],
  selectedProject: projects[0],
}
