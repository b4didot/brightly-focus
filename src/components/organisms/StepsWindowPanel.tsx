import { SectionContainer } from "@/components/layouts"
import styles from "./organisms.module.css"

export function StepsWindowPanel() {
  return (
    <SectionContainer title="Steps" tone="context">
      <p className={styles.placeholderText}>No steps yet.</p>
    </SectionContainer>
  )
}
