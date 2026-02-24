import { FilterBar } from "@/components/molecules"
import {
  CompletedListPanel,
  ItemQueuePanel,
  ItemWindowPanel,
  MilestoneWindowPanel,
  ProjectWindowPanel,
} from "@/components/organisms"
import { AppSidebar, PageContainer, SplitLayout, TopBar } from "@/components/layouts"
import { getItemPageView } from "@/features/items/view"

export function ItemPage() {
  const data = getItemPageView()

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
          <ItemQueuePanel key="queue" title="Active + waiting queue" items={data.queueItems} />,
          <CompletedListPanel key="completed" items={data.completedItems} />,
        ]}
        rightTopSections={[
          <ProjectWindowPanel key="project" project={data.selectedProject} />,
          <MilestoneWindowPanel key="milestone" milestone={data.selectedMilestone} />,
        ]}
        rightBottom={<ItemWindowPanel item={data.selectedItem} />}
      />
    </PageContainer>
  )
}
