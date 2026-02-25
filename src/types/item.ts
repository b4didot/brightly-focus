export type ItemStatus = "active" | "waiting" | "offered" | "completed"

export interface Item {
  id: string
  title: string
  summary: string
  status: ItemStatus
  projectId?: string
  milestoneId?: string
  projectName?: string
  milestoneName?: string
  tags?: string[]
  alarmLabel?: string
  dueDateTime?: string
  stepsCount?: number
}
