import type { Milestone } from "./milestone"

export type ProjectScope = "team" | "private"

export interface Project {
  id: string
  name: string
  summary: string
  scope: ProjectScope
  headInfo: string
  milestones: Milestone[]
}
