export type MilestoneStatus = "planned" | "active" | "done"

export interface Milestone {
  id: string
  title: string
  summary: string
  status: MilestoneStatus
}
