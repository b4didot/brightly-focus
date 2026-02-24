import type { ReactNode } from "react"
import { ProjectCard } from "@/components/molecules"
import { SectionContainer } from "@/components/layouts"
import type { Project } from "@/types"
import styles from "./organisms.module.css"

interface ProjectWindowPanelProps {
  project: Project | null
  title?: string
  children?: ReactNode
}

export function ProjectWindowPanel({
  project,
  title = "Project panel",
  children,
}: ProjectWindowPanelProps) {
  return (
    <SectionContainer title={title} tone="context">
      {project ? (
        <>
          <ProjectCard project={project} />
          {children}
        </>
      ) : (
        <p className={styles.placeholderText}>No project linked.</p>
      )}
    </SectionContainer>
  )
}
