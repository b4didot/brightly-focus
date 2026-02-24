import { MilestoneCard } from "@/components/molecules"
import { SectionContainer } from "@/components/layouts"
import type { Project } from "@/types"
import styles from "./organisms.module.css"

interface ProjectDetailPanelProps {
  project: Project | null
}

export function ProjectDetailPanel({ project }: ProjectDetailPanelProps) {
  return (
    <SectionContainer title="Project Window">
      {project ? (
        <>
          <p className={styles.projectHead}>{project.headInfo}</p>
          <p className={styles.placeholderText}>{project.summary}</p>
          <SectionContainer title="Milestone Window">
            <div className={styles.stack}>
              {project.milestones.map((milestone) => (
                <MilestoneCard key={milestone.id} milestone={milestone} />
              ))}
            </div>
          </SectionContainer>
        </>
      ) : (
        <p className={styles.placeholderText}>No project selected.</p>
      )}
    </SectionContainer>
  )
}
