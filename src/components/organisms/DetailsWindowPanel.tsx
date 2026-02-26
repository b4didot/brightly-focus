import { SectionContainer } from "@/components/layouts"
import styles from "./organisms.module.css"

export function DetailsWindowPanel() {
  return (
    <SectionContainer title="Details" tone="context">
      <p className={styles.placeholderText}>No details available.</p>
    </SectionContainer>
  )
}
