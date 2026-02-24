import { ProjectCard } from "@/components/molecules"
import { SectionContainer } from "@/components/layouts"
import type { Project } from "@/types"
import styles from "./organisms.module.css"

interface ProjectQueuePanelProps {
  title: string
  projects: Project[]
}

export function ProjectQueuePanel({ title, projects }: ProjectQueuePanelProps) {
  return (
    <SectionContainer title={title} tone="secondary">
      <div className={styles.stack}>
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
        {projects.length === 0 ? <p className={styles.placeholderText}>No projects.</p> : null}
      </div>
    </SectionContainer>
  )
}
