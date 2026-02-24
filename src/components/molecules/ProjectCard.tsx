import { Badge } from "@/components/atoms"
import type { Project } from "@/types"
import styles from "./molecules.module.css"

interface ProjectCardProps {
  project: Project
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.cardRow}>
        <h4 className={styles.cardTitle}>{project.name}</h4>
        <Badge text={project.scope} />
      </div>
      <p className={styles.cardText}>{project.summary}</p>
    </article>
  )
}
