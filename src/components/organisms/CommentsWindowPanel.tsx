import { SectionContainer } from "@/components/layouts"
import styles from "./organisms.module.css"

export function CommentsWindowPanel() {
  return (
    <SectionContainer title="Comments" tone="context" hideTitle>
      <p className={styles.placeholderText}>No comments yet.</p>
    </SectionContainer>
  )
}
