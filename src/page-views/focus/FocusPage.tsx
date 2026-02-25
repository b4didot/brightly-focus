import { FilterBar } from "@/components/molecules"
import {
  ActiveItemPanel,
  ItemWindowPanel,
  MilestoneWindowPanel,
  ProjectWindowPanel,
  WaitingQueuePanel,
} from "@/components/organisms"
import { AppSidebar, PageContainer, SplitLayout, TopBar } from "@/components/layouts"
import { createUserItemAction } from "@/features/focus/actions/focusActions"
import { getFocusPageView } from "@/features/focus/view"

export async function FocusPage({
  userId,
  selectedItemId,
}: {
  userId?: string
  selectedItemId?: string
}) {
  const data = await getFocusPageView(userId, selectedItemId)

  return (
    <PageContainer
      sidebar={<AppSidebar navLabels={["Nav 1", "Nav 2", "Nav 3"]} />}
      topBar={
        <TopBar>
          <FilterBar
            filters={data.filters}
            selectedFilterId={data.selectedUserId ?? undefined}
            addItem={{
              userId: data.selectedUserId,
              action: createUserItemAction,
              projects: data.availableProjects,
              assignees: data.availableAssignees,
              selfUserId: data.selectedUserId,
            }}
          />
        </TopBar>
      }
    >
      <SplitLayout
        leftRowTemplate="minmax(0, 30fr) minmax(0, 70fr)"
        leftSections={[
          <ActiveItemPanel
            key="active"
            item={data.activeItem}
            selectedUserId={data.selectedUserId}
            selectedItemId={data.selectedItem?.id ?? null}
          />,
          <WaitingQueuePanel
            key="waiting"
            items={data.waitingItems}
            selectedUserId={data.selectedUserId}
            selectedItemId={data.selectedItem?.id ?? null}
          />,
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
