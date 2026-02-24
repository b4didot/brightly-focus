import { Badge } from "@/components/atoms"
import type { Milestone } from "@/types"
import styles from "./molecules.module.css"

interface MilestoneCardProps {
  milestone: Milestone
}

export function MilestoneCard({ milestone }: MilestoneCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.cardRow}>
        <h4 className={styles.cardTitle}>{milestone.title}</h4>
        <Badge text={milestone.status} />
      </div>
      <p className={styles.cardText}>{milestone.summary}</p>
    </article>
  )
}
