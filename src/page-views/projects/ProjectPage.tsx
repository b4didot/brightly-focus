import { FilterBar } from "@/components/molecules"
import { ProjectDetailPanel, ProjectQueuePanel, ProjectWindowPanel } from "@/components/organisms"
import { AppSidebar, PageContainer, SplitLayout, TopBar } from "@/components/layouts"
import { getProjectPageView } from "@/features/projects/view"

export function ProjectPage() {
  const data = getProjectPageView()

  return (
    <PageContainer
      sidebar={<AppSidebar navLabels={["Nav 1", "Nav 2", "Nav 3"]} />}
      topBar={
        <TopBar>
          <FilterBar filters={data.filters} sorting={data.sorting} />
        </TopBar>
      }
    >
      <SplitLayout
        leftRowTemplate="minmax(168px, 28%) minmax(0, 1fr)"
        leftSections={[
          <ProjectQueuePanel key="team" title="Team Project Queue" projects={data.teamProjects} />,
          <ProjectQueuePanel key="personal" title="Personal Project Queue" projects={data.personalProjects} />,
        ]}
        rightTopColumns={1}
        rightTopSections={[
          <ProjectWindowPanel key="head" title="Project Head Info" project={data.selectedProject} />,
        ]}
        rightBottom={<ProjectDetailPanel project={data.selectedProject} />}
      />
    </PageContainer>
  )
}
