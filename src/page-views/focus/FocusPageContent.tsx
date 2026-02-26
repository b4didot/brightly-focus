"use client"

import { useState, useCallback, useTransition, useEffect } from "react"
import { ActiveItemPanel, ContextTabBar, ContextTabBody, ItemWindowPanel, WaitingQueuePanel, useContextPanelState } from "@/components/organisms"
import { SplitLayout } from "@/components/layouts"
import type { Item, Project, Milestone } from "@/types"
import { activateItemAction, completeItemAction, reorderWaitingItemAction } from "@/features/focus/actions/focusActions"
import { deleteItemAction } from "@/features/items/actions/itemDeleteActions"

interface FocusPageContentProps {
  activeItem: Item | null
  waitingItems: Item[]
  selectedProject: Project | null
  selectedMilestone: Milestone | null
  selectedUserId: string | null
  selectedItemId: string | null
}

export function FocusPageContent({
  activeItem: serverActiveItem,
  waitingItems: serverWaitingItems,
  selectedProject,
  selectedMilestone,
  selectedUserId,
  selectedItemId,
}: FocusPageContentProps) {
  // Optimistic state for active item and waiting queue
  const [optimisticActiveItem, setOptimisticActiveItem] = useState<Item | null>(serverActiveItem)
  const [optimisticWaitingItems, setOptimisticWaitingItems] = useState<Item[]>(serverWaitingItems)
  const [optimisticSelectedItemId, setOptimisticSelectedItemId] = useState<string | null>(selectedItemId)
  const [error, setError] = useState<string | null>(null)
  const [processingItemId, setProcessingItemId] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const { isOpen: isContextOpen, activeTabId, handleTabClick } = useContextPanelState()

  const focusableItems = [optimisticActiveItem, ...optimisticWaitingItems].filter(
    (item): item is Item => Boolean(item)
  )
  const resolvedSelectedItem =
    (optimisticSelectedItemId
      ? focusableItems.find((item) => item.id === optimisticSelectedItemId)
      : null) ??
    optimisticActiveItem ??
    focusableItems[0] ??
    null
  const optimisticActiveItemId = optimisticActiveItem?.id ?? null

  useEffect(() => {
    setOptimisticSelectedItemId(selectedItemId)
  }, [selectedItemId])

  useEffect(() => {
    setOptimisticActiveItem(serverActiveItem)
    setOptimisticWaitingItems(serverWaitingItems)
  }, [serverActiveItem, serverWaitingItems])

  useEffect(() => {
    if (!optimisticSelectedItemId) return
    const stillExists = focusableItems.some((item) => item.id === optimisticSelectedItemId)
    if (!stillExists) {
      setOptimisticSelectedItemId(optimisticActiveItemId)
    }
  }, [optimisticSelectedItemId, focusableItems, optimisticActiveItemId])

  // Sync optimistic state when server data changes (e.g., user switch)
  const handleActivate = useCallback(
    (itemId: string) => {
      // Find the item being activated from waiting queue
      const selectedWaitingItem = optimisticWaitingItems.find((item) => item.id === itemId)
      if (!selectedWaitingItem) return

      // Compute optimistic state transition
      const newActiveItem = {
        ...selectedWaitingItem,
        status: "active" as const,
      }
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
      setOptimisticSelectedItemId(newActiveItem.id)
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

  const handleComplete = useCallback(
    (itemId: string) => {
      const isActiveItem = optimisticActiveItem?.id === itemId
      if (!isActiveItem) return

      const previousActive = optimisticActiveItem
      const previousWaiting = optimisticWaitingItems
      const nextActive =
        optimisticWaitingItems.length > 0
          ? {
              ...optimisticWaitingItems[0],
              status: "active" as const,
            }
          : null
      const nextWaiting = optimisticWaitingItems.length > 0 ? optimisticWaitingItems.slice(1) : []

      setOptimisticActiveItem(nextActive)
      setOptimisticWaitingItems(nextWaiting)
      setOptimisticSelectedItemId(nextActive?.id ?? null)
      setError(null)
      setProcessingItemId(itemId)

      startTransition(async () => {
        try {
          const formData = new FormData()
          formData.append("userId", selectedUserId ?? "")
          formData.append("itemId", itemId)
          await completeItemAction(formData)
        } catch (err) {
          setOptimisticActiveItem(previousActive)
          setOptimisticWaitingItems(previousWaiting)
          setError(err instanceof Error ? err.message : "Failed to complete item")
          console.error("Failed to complete item:", err)
        } finally {
          setProcessingItemId(null)
        }
      })
    },
    [optimisticActiveItem, optimisticWaitingItems, selectedUserId]
  )

  const handleDelete = useCallback(
    (itemId: string) => {
      const previousActive = optimisticActiveItem
      const previousWaiting = optimisticWaitingItems

      const isActiveItem = optimisticActiveItem?.id === itemId
      const isWaitingItem = optimisticWaitingItems.some((item) => item.id === itemId)
      if (!isActiveItem && !isWaitingItem) return

      const nextActive = isActiveItem
        ? (optimisticWaitingItems.length > 0
            ? {
                ...optimisticWaitingItems[0],
                status: "active" as const,
              }
            : null)
        : optimisticActiveItem
      const nextWaiting = isActiveItem
        ? (optimisticWaitingItems.length > 0 ? optimisticWaitingItems.slice(1) : [])
        : optimisticWaitingItems.filter((item) => item.id !== itemId)

      setOptimisticActiveItem(nextActive)
      setOptimisticWaitingItems(nextWaiting)
      setOptimisticSelectedItemId(nextActive?.id ?? null)
      setError(null)
      setProcessingItemId(itemId)

      startTransition(async () => {
        try {
          const formData = new FormData()
          formData.append("actingUserId", selectedUserId ?? "")
          formData.append("itemId", itemId)
          await deleteItemAction(formData)
        } catch (err) {
          setOptimisticActiveItem(previousActive)
          setOptimisticWaitingItems(previousWaiting)
          setError(err instanceof Error ? err.message : "Failed to delete item")
          console.error("Failed to delete item:", err)
        } finally {
          setProcessingItemId(null)
        }
      })
    },
    [optimisticActiveItem, optimisticWaitingItems, selectedUserId]
  )

  return (
    <SplitLayout
      leftRowTemplate="minmax(0, 30fr) minmax(0, 70fr)"
      leftSections={[
        <ActiveItemPanel
          key="active"
          item={optimisticActiveItem}
          selectedUserId={selectedUserId}
          selectedItemId={optimisticSelectedItemId}
        />,
        <WaitingQueuePanel
          key="waiting"
          items={optimisticWaitingItems}
          selectedUserId={selectedUserId}
          selectedItemId={optimisticSelectedItemId}
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
      rightBottom={
        <ItemWindowPanel
          item={resolvedSelectedItem}
          canComplete={Boolean(selectedUserId && resolvedSelectedItem?.id === optimisticActiveItem?.id)}
          canDelete={Boolean(selectedUserId && resolvedSelectedItem)}
          isProcessing={processingItemId === resolvedSelectedItem?.id}
          onComplete={optimisticActiveItem ? () => handleComplete(optimisticActiveItem.id) : undefined}
          onDelete={resolvedSelectedItem ? () => handleDelete(resolvedSelectedItem.id) : undefined}
        />
      }
      isContextOpen={isContextOpen}
    />
  )
}
