"use client"

import { useState, useCallback, useTransition } from "react"
import { ActiveItemPanel, ContextTabBar, ContextTabBody, ItemWindowPanel, WaitingQueuePanel, useContextPanelState } from "@/components/organisms"
import { SplitLayout } from "@/components/layouts"
import type { Item, Project, Milestone } from "@/types"
import { activateItemAction, reorderWaitingItemAction } from "@/features/focus/actions/focusActions"

interface FocusPageContentProps {
  activeItem: Item | null
  waitingItems: Item[]
  selectedProject: Project | null
  selectedMilestone: Milestone | null
  selectedItem: Item | null
  selectedUserId: string | null
  selectedItemId: string | null
}

export function FocusPageContent({
  activeItem: serverActiveItem,
  waitingItems: serverWaitingItems,
  selectedProject,
  selectedMilestone,
  selectedItem,
  selectedUserId,
  selectedItemId,
}: FocusPageContentProps) {
  // Optimistic state for active item and waiting queue
  const [optimisticActiveItem, setOptimisticActiveItem] = useState<Item | null>(serverActiveItem)
  const [optimisticWaitingItems, setOptimisticWaitingItems] = useState<Item[]>(serverWaitingItems)
  const [error, setError] = useState<string | null>(null)
  const [processingItemId, setProcessingItemId] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const { isOpen: isContextOpen, activeTabId, handleTabClick } = useContextPanelState()

  // Sync optimistic state when server data changes (e.g., user switch)
  const handleActivate = useCallback(
    (itemId: string) => {
      // Find the item being activated from waiting queue
      const selectedWaitingItem = optimisticWaitingItems.find((item) => item.id === itemId)
      if (!selectedWaitingItem) return

      // Compute optimistic state transition
      const newActiveItem = selectedWaitingItem
      const newWaitingItems = optimisticWaitingItems.filter((item) => item.id !== itemId)

      // If there was a previous active item, move it to front of waiting queue
      if (optimisticActiveItem) {
        newWaitingItems.unshift({
          ...optimisticActiveItem,
          status: "waiting",
        })
      }

      // Apply optimistic updates immediately
      setOptimisticActiveItem(newActiveItem)
      setOptimisticWaitingItems(newWaitingItems)
      setError(null)
      setProcessingItemId(itemId)

      // Call server action in background
      startTransition(async () => {
        try {
          const formData = new FormData()
          formData.append("userId", selectedUserId ?? "")
          formData.append("itemId", itemId)
          await activateItemAction(formData)
          // Server action now returns success; optimistic state is already applied
          // On refetch (via revalidateTag), new data will be fetched
        } catch (err) {
          // Rollback on error
          setOptimisticActiveItem(serverActiveItem)
          setOptimisticWaitingItems(serverWaitingItems)
          setError(err instanceof Error ? err.message : "Failed to activate item")
          console.error("Failed to activate item:", err)
        } finally {
          setProcessingItemId(null)
        }
      })
    },
    [optimisticActiveItem, optimisticWaitingItems, serverActiveItem, serverWaitingItems, selectedUserId]
  )

  const handleReorder = useCallback(
    (itemId: string, direction: "up" | "down") => {
      // Find the item and its current index
      const currentIndex = optimisticWaitingItems.findIndex((item) => item.id === itemId)
      if (currentIndex === -1) return

      // Calculate target index
      const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
      if (targetIndex < 0 || targetIndex >= optimisticWaitingItems.length) return

      // Optimistically swap items
      const newWaitingItems = [...optimisticWaitingItems]
      ;[newWaitingItems[currentIndex], newWaitingItems[targetIndex]] = [
        newWaitingItems[targetIndex],
        newWaitingItems[currentIndex],
      ]
      setOptimisticWaitingItems(newWaitingItems)
      setError(null)
      setProcessingItemId(itemId)

      // Call server action in background
      startTransition(async () => {
        try {
          const formData = new FormData()
          formData.append("userId", selectedUserId ?? "")
          formData.append("itemId", itemId)
          formData.append("direction", direction)
          await reorderWaitingItemAction(formData)
        } catch (err) {
          // Rollback on error
          setOptimisticWaitingItems(serverWaitingItems)
          setError(err instanceof Error ? err.message : "Failed to reorder item")
          console.error("Failed to reorder item:", err)
        } finally {
          setProcessingItemId(null)
        }
      })
    },
    [optimisticWaitingItems, serverWaitingItems, selectedUserId]
  )

  return (
    <SplitLayout
      leftRowTemplate="minmax(0, 30fr) minmax(0, 70fr)"
      leftSections={[
        <ActiveItemPanel
          key="active"
          item={optimisticActiveItem}
          selectedUserId={selectedUserId}
          selectedItemId={selectedItemId}
        />,
        <WaitingQueuePanel
          key="waiting"
          items={optimisticWaitingItems}
          selectedUserId={selectedUserId}
          selectedItemId={selectedItemId}
          onActivate={handleActivate}
          onReorder={handleReorder}
          error={error}
          processingItemId={processingItemId}
        />,
      ]}
      rightHeader={<ContextTabBar activeTabId={activeTabId} onTabClick={handleTabClick} />}
      rightContext={
        isContextOpen ? (
          <ContextTabBody activeTabId={activeTabId} project={selectedProject} milestone={selectedMilestone} />
        ) : null
      }
      rightBottom={<ItemWindowPanel item={selectedItem} />}
      isContextOpen={isContextOpen}
    />
  )
}
