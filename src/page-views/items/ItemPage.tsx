"use client"

import { FilterBar } from "@/components/molecules"
import { CompletedListPanel, ContextTabBar, ContextTabBody, ItemQueuePanel, ItemWindowPanel, useContextPanelState } from "@/components/organisms"
import { AppSidebar, PageContainer, SplitLayout, TopBar } from "@/components/layouts"
import { getItemPageView } from "@/features/items/view"

export function ItemPage() {
  const data = getItemPageView()
  const { isOpen: isContextOpen, activeTabId, handleTabClick } = useContextPanelState(data.selectedItem?.id ?? null)

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
        rightHeader={<ContextTabBar activeTabId={activeTabId} isOpen={isContextOpen} onTabClick={handleTabClick} />}
        rightContext={
          isContextOpen ? (
            <ContextTabBody activeTabId={activeTabId} project={data.selectedProject} milestone={data.selectedMilestone} />
          ) : null
        }
        rightBottom={<ItemWindowPanel item={data.selectedItem} />}
        isContextOpen={isContextOpen}
      />
    </PageContainer>
  )
}
