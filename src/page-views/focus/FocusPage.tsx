import { FilterBar } from "@/components/molecules"
import {
  ActiveItemPanel,
  ItemWindowPanel,
  MilestoneWindowPanel,
  OfferedQueuePanel,
  ProjectWindowPanel,
  WaitingQueuePanel,
} from "@/components/organisms"
import { AppSidebar, PageContainer, SplitLayout, TopBar } from "@/components/layouts"
import { getFocusPageView } from "@/features/focus/view"

export function FocusPage() {
  const data = getFocusPageView()

  return (
    <PageContainer
      sidebar={<AppSidebar navLabels={["Nav 1", "Nav 2", "Nav 3"]} />}
      topBar={
        <TopBar>
          <FilterBar filters={data.filters} />
        </TopBar>
      }
    >
      <SplitLayout
        leftRowTemplate="1.2fr 3.2fr 1.2fr"
        leftSections={[
          <ActiveItemPanel key="active" item={data.activeItem} />,
          <WaitingQueuePanel key="waiting" items={data.waitingItems} />,
          <OfferedQueuePanel key="offered" items={data.offeredItems} />,
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
