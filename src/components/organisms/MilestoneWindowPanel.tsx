import { MilestoneCard } from "@/components/molecules"
import { SectionContainer } from "@/components/layouts"
import type { Milestone } from "@/types"
import styles from "./organisms.module.css"

interface MilestoneWindowPanelProps {
  milestone: Milestone | null
  title?: string
}

export function MilestoneWindowPanel({ milestone, title = "Milestone Panel" }: MilestoneWindowPanelProps) {
  return (
    <SectionContainer title={title} tone="context">
      {milestone ? <MilestoneCard milestone={milestone} /> : <p className={styles.placeholderText}>No milestone linked.</p>}
    </SectionContainer>
  )
}
