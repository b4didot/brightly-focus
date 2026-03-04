"use client"

import { useState, useCallback, useTransition, useEffect, useMemo } from "react"
import {
  ActiveItemPanel,
  ContextTabBar,
  ContextTabBody,
  ItemWindowPanel,
  WaitingQueuePanel,
  useContextPanelState,
} from "@/components/organisms"
import { SplitLayout } from "@/components/layouts"
import type { Item, Project } from "@/types"
import {
  activateItemAction,
  completeItemAction,
  getItemEnrichmentAction,
  reorderWaitingItemAction,
  selectItemAction,
} from "@/features/focus/actions/focusActions"
import { deleteItemAction } from "@/features/items/actions/itemDeleteActions"

interface FocusPageContentProps {
  activeItem: Item | null
  waitingItems: Item[]
  availableProjects: Project[]
  selectedUserId: string | null
  selectedItemId: string | null
}

function mergeEnrichment(baseItem: Item, enrichedItem: Item | null): Item {
  if (!enrichedItem || enrichedItem.id !== baseItem.id) {
    return baseItem
  }

  return {
    ...baseItem,
    summary: enrichedItem.summary,
    projectName: enrichedItem.projectName ?? baseItem.projectName,
    milestoneName: enrichedItem.milestoneName ?? baseItem.milestoneName,
    tags: enrichedItem.tags,
    alarmLabel: enrichedItem.alarmLabel,
    stepsCount: enrichedItem.stepsCount,
  }
}

function replaceSelectedItemInUrl(userId: string | null, itemId: string | null) {
  if (typeof window === "undefined") {
    return
  }

  const params = new URLSearchParams(window.location.search)
  if (userId) {
    params.set("userId", userId)
  } else {
    params.delete("userId")
  }

  if (itemId) {
    params.set("selectedItemId", itemId)
  } else {
    params.delete("selectedItemId")
  }

  const query = params.toString()
  const url = query ? `/focus?${query}` : "/focus"
  window.history.replaceState(null, "", url)
}

export function FocusPageContent({
  activeItem: serverActiveItem,
  waitingItems: serverWaitingItems,
  availableProjects,
  selectedUserId,
  selectedItemId,
}: FocusPageContentProps) {
  const [optimisticActiveItem, setOptimisticActiveItem] = useState<Item | null>(serverActiveItem)
  const [optimisticWaitingItems, setOptimisticWaitingItems] = useState<Item[]>(serverWaitingItems)
  const [optimisticSelectedItemId, setOptimisticSelectedItemId] = useState<string | null>(selectedItemId)
  const [enrichedItemsById, setEnrichedItemsById] = useState<Map<string, Item>>(new Map())
  const [enrichmentLoadingItemId, setEnrichmentLoadingItemId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processingItemId, setProcessingItemId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const { isOpen: isContextOpen, activeTabId, handleTabClick } = useContextPanelState()

  const focusableItems = useMemo(
    () => [optimisticActiveItem, ...optimisticWaitingItems].filter((item): item is Item => Boolean(item)),
    [optimisticActiveItem, optimisticWaitingItems]
  )
  const resolvedSelectedItem =
    (optimisticSelectedItemId ? focusableItems.find((item) => item.id === optimisticSelectedItemId) : null) ??
    optimisticActiveItem ??
    focusableItems[0] ??
    null
  const optimisticActiveItemId = optimisticActiveItem?.id ?? null
  const selectedEnrichedItem = resolvedSelectedItem ? enrichedItemsById.get(resolvedSelectedItem.id) ?? null : null
  const displayedSelectedItem = resolvedSelectedItem
    ? mergeEnrichment(resolvedSelectedItem, selectedEnrichedItem)
    : null
  const displayedActiveItem =
    optimisticActiveItem && displayedSelectedItem?.id === optimisticActiveItem.id
      ? displayedSelectedItem
      : optimisticActiveItem
  const selectedProject =
    (displayedSelectedItem?.projectId
      ? availableProjects.find((project) => project.id === displayedSelectedItem.projectId)
      : null) ?? null
  const selectedMilestone =
    (displayedSelectedItem?.milestoneId
      ? selectedProject?.milestones.find((milestone) => milestone.id === displayedSelectedItem.milestoneId)
      : null) ?? null

  useEffect(() => {
    setOptimisticSelectedItemId(selectedItemId)
  }, [selectedItemId])

  useEffect(() => {
    setOptimisticActiveItem(serverActiveItem)
    setOptimisticWaitingItems(serverWaitingItems)
  }, [serverActiveItem, serverWaitingItems])

  useEffect(() => {
    setEnrichedItemsById(new Map())
    setEnrichmentLoadingItemId(null)
  }, [selectedUserId])

  useEffect(() => {
    if (!optimisticSelectedItemId) return
    const stillExists = focusableItems.some((item) => item.id === optimisticSelectedItemId)
    if (!stillExists) {
      setOptimisticSelectedItemId(optimisticActiveItemId)
      replaceSelectedItemInUrl(selectedUserId, optimisticActiveItemId)
    }
  }, [optimisticSelectedItemId, focusableItems, optimisticActiveItemId, selectedUserId])

  const requestEnrichment = useCallback(
    (itemId: string) => {
      if (!selectedUserId || enrichedItemsById.has(itemId)) {
        return
      }

      setEnrichmentLoadingItemId(itemId)
      startTransition(async () => {
        try {
          const enriched = await getItemEnrichmentAction({ userId: selectedUserId, itemId })
          setEnrichedItemsById((prev) => {
            const next = new Map(prev)
            next.set(itemId, enriched)
            return next
          })
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to enrich selected item")
        } finally {
          setEnrichmentLoadingItemId((current) => (current === itemId ? null : current))
        }
      })
    },
    [enrichedItemsById, selectedUserId, startTransition]
  )

  useEffect(() => {
    if (!resolvedSelectedItem?.id) {
      return
    }
    requestEnrichment(resolvedSelectedItem.id)
  }, [resolvedSelectedItem?.id, requestEnrichment])

  const selectItem = useCallback(
    (itemId: string) => {
      if (optimisticSelectedItemId === itemId) {
        return
      }

      const previousSelectedId = optimisticSelectedItemId
      setOptimisticSelectedItemId(itemId)
      replaceSelectedItemInUrl(selectedUserId, itemId)
      setError(null)

      if (!selectedUserId) {
        return
      }

      startTransition(async () => {
        try {
          await selectItemAction({ userId: selectedUserId, itemId })
        } catch (err) {
          setOptimisticSelectedItemId(previousSelectedId)
          replaceSelectedItemInUrl(selectedUserId, previousSelectedId)
          setError(err instanceof Error ? err.message : "Failed to select item")
        }
      })

      requestEnrichment(itemId)
    },
    [optimisticSelectedItemId, requestEnrichment, selectedUserId, startTransition]
  )

  const handleActivate = useCallback(
    (itemId: string) => {
      const selectedWaitingItem = optimisticWaitingItems.find((item) => item.id === itemId)
      if (!selectedWaitingItem) return

      const newActiveItem = {
        ...selectedWaitingItem,
        status: "active" as const,
      }
      const newWaitingItems = optimisticWaitingItems.filter((item) => item.id !== itemId)

      if (optimisticActiveItem) {
        newWaitingItems.unshift({
          ...optimisticActiveItem,
          status: "waiting",
        })
      }

      setOptimisticActiveItem(newActiveItem)
      setOptimisticWaitingItems(newWaitingItems)
      setOptimisticSelectedItemId(newActiveItem.id)
      replaceSelectedItemInUrl(selectedUserId, newActiveItem.id)
      setError(null)
      setProcessingItemId(itemId)

      startTransition(async () => {
        try {
          const formData = new FormData()
          formData.append("userId", selectedUserId ?? "")
          formData.append("itemId", itemId)
          await activateItemAction(formData)
        } catch (err) {
          setOptimisticActiveItem(serverActiveItem)
          setOptimisticWaitingItems(serverWaitingItems)
          setError(err instanceof Error ? err.message : "Failed to activate item")
        } finally {
          setProcessingItemId(null)
        }
      })
    },
    [optimisticActiveItem, optimisticWaitingItems, serverActiveItem, serverWaitingItems, selectedUserId, startTransition]
  )

  const handleReorder = useCallback(
    (itemId: string, direction: "up" | "down") => {
      const currentIndex = optimisticWaitingItems.findIndex((item) => item.id === itemId)
      if (currentIndex === -1) return

      const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
      if (targetIndex < 0 || targetIndex >= optimisticWaitingItems.length) return

      const newWaitingItems = [...optimisticWaitingItems]
      ;[newWaitingItems[currentIndex], newWaitingItems[targetIndex]] = [
        newWaitingItems[targetIndex],
        newWaitingItems[currentIndex],
      ]
      setOptimisticWaitingItems(newWaitingItems)
      setError(null)
      setProcessingItemId(itemId)

      startTransition(async () => {
        try {
          const formData = new FormData()
          formData.append("userId", selectedUserId ?? "")
          formData.append("itemId", itemId)
          formData.append("direction", direction)
          await reorderWaitingItemAction(formData)
        } catch (err) {
          setOptimisticWaitingItems(serverWaitingItems)
          setError(err instanceof Error ? err.message : "Failed to reorder item")
        } finally {
          setProcessingItemId(null)
        }
      })
    },
    [optimisticWaitingItems, serverWaitingItems, selectedUserId, startTransition]
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
      replaceSelectedItemInUrl(selectedUserId, nextActive?.id ?? null)
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
        } finally {
          setProcessingItemId(null)
        }
      })
    },
    [optimisticActiveItem, optimisticWaitingItems, selectedUserId, startTransition]
  )

  const handleDelete = useCallback(
    (itemId: string) => {
      const previousActive = optimisticActiveItem
      const previousWaiting = optimisticWaitingItems

      const isWaitingItem = optimisticWaitingItems.some((item) => item.id === itemId)
      if (!isWaitingItem) return

      const nextActive = optimisticActiveItem
      const nextWaiting = optimisticWaitingItems.filter((item) => item.id !== itemId)

      setOptimisticActiveItem(nextActive)
      setOptimisticWaitingItems(nextWaiting)
      setOptimisticSelectedItemId(nextActive?.id ?? null)
      replaceSelectedItemInUrl(selectedUserId, nextActive?.id ?? null)
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
        } finally {
          setProcessingItemId(null)
        }
      })
    },
    [optimisticActiveItem, optimisticWaitingItems, selectedUserId, startTransition]
  )

  return (
    <SplitLayout
      leftRowTemplate="minmax(0, 30fr) minmax(0, 70fr)"
      leftSections={[
        <ActiveItemPanel
          key="active"
          item={displayedActiveItem}
          selectedUserId={selectedUserId}
          selectedItemId={optimisticSelectedItemId}
          onSelectItem={selectItem}
        />,
        <WaitingQueuePanel
          key="waiting"
          items={optimisticWaitingItems}
          selectedUserId={selectedUserId}
          selectedItemId={optimisticSelectedItemId}
          onActivate={handleActivate}
          onReorder={handleReorder}
          onSelectItem={selectItem}
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
          item={displayedSelectedItem}
          canComplete={Boolean(selectedUserId && displayedSelectedItem?.id === optimisticActiveItem?.id)}
          canDelete={Boolean(selectedUserId && displayedSelectedItem?.status === "waiting")}
          isProcessing={
            processingItemId === displayedSelectedItem?.id ||
            enrichmentLoadingItemId === displayedSelectedItem?.id ||
            isPending
          }
          onComplete={optimisticActiveItem ? () => handleComplete(optimisticActiveItem.id) : undefined}
          onDelete={
            displayedSelectedItem && displayedSelectedItem.status === "waiting"
              ? () => handleDelete(displayedSelectedItem.id)
              : undefined
          }
        />
      }
      isContextOpen={isContextOpen}
    />
  )
}
