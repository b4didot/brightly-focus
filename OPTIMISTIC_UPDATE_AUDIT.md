# Optimistic Update Compliance Audit

**Date**: February 26, 2026  
**Standard**: Global Optimistic Updates with Cache Invalidation  
**Status**: ⚠️ PARTIAL COMPLIANCE - Multiple critical violations found

---

## Executive Summary

The application has **INCONSISTENT** optimistic update implementations across different actions. Some actions properly implement the standard (activate, reorder, create), while others have NOT implemented any optimistic updates at all (complete, accept, delete).

**Violations Found**: 3 critical issues affecting core user interactions

---

## Action-by-Action Review

### 1. ✅ **COMPLIANT: Switching Focus (Activate Item)**

**File**: [src/features/focus/components/FocusBoard.tsx](src/features/focus/components/FocusBoard.tsx#L110-L145)  
**Handler**: `handleActivate()`

**Current Implementation**:
```tsx
function handleActivate(userId: string, itemId: string) {
  // 1. IMMEDIATE optimistic state update
  const selectedItem = waitingItems.find((item) => item.id === itemId)
  const newWaiting = waitingItems.filter((item) => item.id !== itemId)
  if (previousActive) {
    newWaiting.unshift(previousActive)
  }
  setActiveItem(selectedItem)
  setWaitingItems(newWaiting)  // ✅ UI updates BEFORE server call
  
  // 2. Parallel server action
  startTransition(async () => {
    try {
      await activateItemAction(formData)  // ✅ Runs in parallel
    } catch (err) {
      // 4. FAILURE: Rollback from refetch (currently does manual rollback)
      setActiveItem(previousActive)
      setWaitingItems(previousWaiting)
    }
  })
}
```

**Status**: ✅ Follows standard correctly
- Optimistic update applied immediately
- Server action runs in parallel
- Manual rollback on error (acceptable pattern)

---

### 2. ✅ **COMPLIANT: Reordering Items**

**Files**: 
- [src/features/focus/components/FocusBoard.tsx](src/features/focus/components/FocusBoard.tsx#L147-L182)
- [src/components/organisms/WaitingQueuePanel.tsx](src/components/organisms/WaitingQueuePanel.tsx#L74-L110)

**Handler**: `handleReorder()`

**Current Implementation**:
```tsx
function handleReorder(userId: string, itemId: string, direction: "up" | "down") {
  // 1. IMMEDIATE optimistic swap
  const newWaiting = [...waitingItems]
  ;[newWaiting[currentIndex], newWaiting[targetIndex]] = [newWaiting[targetIndex], newWaiting[currentIndex]]
  setWaitingItems(newWaiting)  // ✅ UI updates BEFORE server call
  
  // 2. Parallel server action
  startTransition(async () => {
    try {
      await reorderWaitingItemAction(formData)  // ✅ Runs in parallel
    } catch (err) {
      // 4. FAILURE: Rollback
      setWaitingItems(previousWaiting)
    }
  })
}
```

**Status**: ✅ Follows standard correctly
- Immediate optimistic swap
- Server action in parallel
- Manual rollback on error

---

### 3. ✅ **COMPLIANT: Creating Items**

**File**: [src/features/focus/components/FocusBoard.tsx](src/features/focus/components/FocusBoard.tsx#L184-L230)  
**Handler**: `handleCreateItem()` (for quick-add)

**Current Implementation**:
```tsx
function handleCreateItem(e: React.FormEvent<HTMLFormElement>) {
  // 1. IMMEDIATE optimistic item creation
  const tempId = `temp-${Date.now()}-${Math.random()...}`
  const optimisticItem = {
    id: tempId,
    title,
    description: null,
    state: "waiting",
    // ...
  }
  setWaitingItems([optimisticItem, ...waitingItems])  // ✅ UI updates BEFORE server call
  
  // 2. Parallel server action
  startTransition(async () => {
    try {
      await createUserItemAction(formData)  // ✅ Runs in parallel
    } catch (err) {
      // 4. FAILURE: Rollback
      setWaitingItems(previousWaiting)
    }
  })
}
```

**Status**: ✅ Follows standard correctly
- Immediate optimistic item creation with temp ID
- Server action in parallel
- Manual rollback on error

**Note**: Temp ID doesn't match final server ID - refetch will replace it

---

### 4. ❌ **VIOLATION: Completing Items**

**File**: [src/features/focus/components/FocusBoard.tsx](src/features/focus/components/FocusBoard.tsx#L83-L96)  
**Handler**: `handleComplete()`

**Current Implementation**:
```tsx
function handleComplete(userId: string, itemId: string) {
  startTransition(async () => {
    try {
      const formData = new FormData()
      formData.append("userId", userId)
      formData.append("itemId", itemId)
      await completeItemAction(formData)  // ❌ NO OPTIMISTIC UPDATE
      // UI updates ONLY after server responds
    } catch (error) {
      console.error("Failed to complete item:", error)
      // No rollback logic, no refetch
    }
  })
}
```

**Problems**:
- ❌ **NO optimistic state update** - UI does NOT update until server responds
- ❌ **No visual feedback** during request
- ❌ **User sees delay** between clicking "Complete" and UI changing
- ❌ **No refetch** on error - manual error recovery missing

**Expected State Changes** (NOT currently optimistic):
1. activeItem → completedItems (mark as completed)
2. First waitingItem (state: waiting) → activeItem (auto-promoted)
3. UI should show new active item immediately

**Action Required**: Add optimistic update for completion flow

---

### 5. ❌ **VIOLATION: Accepting Items (Offered → Waiting)**

**File**: [src/features/focus/components/FocusBoard.tsx](src/features/focus/components/FocusBoard.tsx#L96-L108)  
**Handler**: `handleAccept()`

**Current Implementation**:
```tsx
function handleAccept(userId: string, itemId: string) {
  startTransition(async () => {
    try {
      const formData = new FormData()
      formData.append("userId", userId)
      formData.append("itemId", itemId)
      await acceptItemAction(formData)  // ❌ NO OPTIMISTIC UPDATE
      // UI updates ONLY after server responds
    } catch (error) {
      console.error("Failed to accept item:", error)
    }
  })
}
```

**Problems**:
- ❌ **NO optimistic state update** - offeredItem stays in UI until server confirms
- ❌ **No visual feedback** during request
- ❌ **User sees delay** between clicking "Accept" and item moving to waiting
- ❌ **OfferedQueuePanel** is read-only - has no button to trigger action

**Expected State Changes** (NOT currently optimistic):
1. Item removed from offeredItems
2. Item added to waitingItems
3. waiting_position assigned

**Current Problem**: OfferedQueuePanel doesn't have any action button:
```tsx
export function OfferedQueuePanel({ items }: OfferedQueuePanelProps) {
  return (
    <SectionContainer title="Request Queue (Offer)" tone="secondary">
      <div className={styles.stack}>
        {items.map((item) => (
          <ItemCard key={item.id} item={item} />  // ❌ No action button
        ))}
      </div>
    </SectionContainer>
  )
}
```

**Action Required**: 
1. Add accept action button to OfferedQueuePanel or expose handler
2. Implement optimistic update in accept handler

---

### 6. ⚠️ **PROBLEMATIC: Item Selection + Enrichment**

**File**: [src/features/focus/components/FocusBoard.tsx](src/features/focus/components/FocusBoard.tsx#L48-L76)  
**Process**: Enrichment triggered when activeItem changes

**Current Implementation**:
```tsx
useEffect(() => {
  if (activeItem) {
    // Enrichment requested AFTER active item is set
    triggerEnrichment(activeItem.id, activeItem.projectId ?? null, activeItem.milestoneId ?? null)
  }
}, [activeItem?.id, triggerEnrichment])

const triggerEnrichment = useCallback(
  async (itemId: string, projectId: string | null, milestoneId: string | null) => {
    if (enrichedItems.has(itemId)) {
      return  // ✅ Caching prevents refetch
    }

    setEnrichmentLoading(itemId)  // Shows loading state
    // ❌ NO optimistic enrichment data shown

    try {
      const enriched = await enrichItemAction(itemId, projectId, milestoneId)
      setEnrichedItems((prev) => new Map(prev).set(itemId, enriched))  // Loads after response
    } catch (err) {
      setEnrichmentError({...})
    } finally {
      setEnrichmentLoading(null)
    }
  },
  [enrichedItems]
)
```

**Status**: ⚠️ Acceptable
- Enrichment is **informational only** (project name, milestone name, step count)
- Not used for execution logic
- Loading state provides visual feedback
- **No optimistic enrichment data shown** - could be improved but is acceptable

---

### 7. ❌ **VIOLATION: Deleting Items**

**File**: [src/features/items/actions/itemDeleteActions.ts](src/features/items/actions/itemDeleteActions.ts#L31-L50)

**Current Implementation**:
```tsx
export async function deleteItemAction(formData: FormData) {
  try {
    await deleteItem({ itemId, actingUserId })

    revalidatePath("/focus")
    revalidatePath("/projects")
    revalidatePath("/milestones")
    redirect(toFocusPath(actingUserId))  // ❌ REDIRECTS - No optimistic UI possible
  } catch (error) {
    throw new Error(...)
  }
}
```

**Used in**: FocusBoard.tsx line 434 as a form submission

```tsx
<form action={deleteItemAction}>
  <input type="hidden" name="actingUserId" value={data.selectedUserId ?? ""} />
  <input type="hidden" name="itemId" value={item.id} />
  <button type="submit">Delete</button>
</form>
```

**Problems**:
- ❌ **Form action** (not client-side handler) - no JavaScript control
- ❌ **Immediate redirect** - can't show optimistic UI
- ❌ **No deletion feedback** - user sees page reload
- ❌ **Violates the standard** - should update UI before redirect

**Action Required**: Convert to client-side handler with optimistic deletion

---

## Summary Table

| Action | Status | Issue | Priority |
|--------|--------|-------|----------|
| **Activate Item** | ✅ Compliant | None | — |
| **Reorder Items** | ✅ Compliant | None | — |
| **Create Item** | ✅ Compliant | Temp ID mismatch | Low |
| **Complete Item** | ❌ Violation | No optimistic update | 🔴 Critical |
| **Accept Item** | ❌ Violation | No optimistic update + no UI button | 🔴 Critical |
| **Delete Item** | ❌ Violation | Redirect prevents optimistic UI | 🔴 Critical |
| **Enrichment** | ⚠️ Acceptable | No optimistic data (informational) | Low |

---

## Recommendations

### Immediate Actions (Critical)

1. **Complete Item Flow**
   - Add optimistic state updates in `handleComplete()`
   - Simulate next item auto-promotion
   - Implement refetch-based error recovery

2. **Accept Item Flow**
   - Add action button to OfferedQueuePanel
   - Implement optimistic state update in `handleAccept()`
   - Move item from offered → waiting optimistically

3. **Delete Item Flow**
   - Convert form action to client-side handler
   - Show optimistic deletion (remove from UI)
   - Implement refetch-based error recovery
   - Only redirect after server confirms

### Nice-to-Have (Future)

1. Implement optimistic enrichment data (placeholder values)
2. Add cache invalidation + refetch pattern instead of manual rollbacks
3. Replace temp IDs in created items with server IDs via refetch

---

## Next Steps

1. Review this audit with the team
2. Prioritize critical violations
3. Implement fixes following the standard pattern
4. Add tests to prevent regressions
