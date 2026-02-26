import { FilterBar } from "@/components/molecules"
import { TopBar } from "@/components/layouts"
import { createUserItemAction } from "@/features/focus/actions/focusActions"
import { getFocusPageView } from "@/features/focus/view"
import { FocusPageContent } from "./FocusPageContent"

export async function FocusPage({
  userId,
  selectedItemId,
}: {
  userId?: string
  selectedItemId?: string
}) {
  const data = await getFocusPageView(userId, selectedItemId)

  return (
    <>
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
      <FocusPageContent
        activeItem={data.activeItem}
        waitingItems={data.waitingItems}
        selectedProject={data.selectedProject}
        selectedMilestone={data.selectedMilestone}
        selectedItem={data.selectedItem}
        selectedUserId={data.selectedUserId}
        selectedItemId={data.selectedItem?.id ?? null}
      />
    </>
  )
}
