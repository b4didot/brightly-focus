"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createPortal } from "react-dom"
import { ArrowDownToDot, ArrowUpFromDot, Trash2 } from "lucide-react"
import { Button, InputField, Label } from "@/components/atoms"
import { acceptItemAction, declineItemAction } from "@/features/focus/actions/focusActions"
import type { FilterOption, Item, Project, SortingOption } from "@/types"
import styles from "./molecules.module.css"

type AddItemAction = (
  formData: FormData
) => void | Promise<void> | Promise<{ success: boolean; [key: string]: unknown }>

interface AddItemConfig {
  userId: string | null
  action?: AddItemAction
  projects: Project[]
  assignees: FilterOption[]
  selfUserId: string | null
}

interface FilterBarProps {
  filters: FilterOption[]
  sorting?: SortingOption[]
  selectedFilterId?: string
  selectedSortingId?: string
  addItem?: AddItemConfig
  offeredItems?: Item[]
  focusStateSummary?: {
    activeCount: number
    waitingCount: number
    offeredCount: number
  }
}

interface DraftItemState {
  name: string
  assignedUserId: string
  dueDate: string
  dueTime: string
  description: string
  projectId: string
  milestoneId: string
  tagId: string
  alarmId: string
}

interface DraftStepState {
  id: string
  name: string
  description: string
}

function toInitialDraft(selfUserId: string | null): DraftItemState {
  return {
    name: "",
    assignedUserId: selfUserId ?? "",
    dueDate: "",
    dueTime: "",
    description: "",
    projectId: "",
    milestoneId: "",
    tagId: "",
    alarmId: "",
  }
}

function isDraftChanged(
  draft: DraftItemState,
  initial: DraftItemState,
  steps: DraftStepState[],
  initialSteps: DraftStepState[]
) {
  const stepsChanged =
    steps.length !== initialSteps.length ||
    steps.some((step, index) => {
      const initialStep = initialSteps[index]
      return !initialStep || step.name !== initialStep.name || step.description !== initialStep.description
    })

  return (
    draft.name !== initial.name ||
    draft.assignedUserId !== initial.assignedUserId ||
    draft.dueDate !== initial.dueDate ||
    draft.dueTime !== initial.dueTime ||
    draft.description !== initial.description ||
    draft.projectId !== initial.projectId ||
    draft.milestoneId !== initial.milestoneId ||
    draft.tagId !== initial.tagId ||
    draft.alarmId !== initial.alarmId ||
    stepsChanged
  )
}

export function FilterBar({
  filters,
  sorting,
  selectedFilterId,
  selectedSortingId,
  addItem,
  offeredItems = [],
  focusStateSummary,
}: FilterBarProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isOffersOpen, setIsOffersOpen] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [draft, setDraft] = useState<DraftItemState>(toInitialDraft(addItem?.selfUserId ?? null))
  const [steps, setSteps] = useState<DraftStepState[]>([])
  const [localOfferedItems, setLocalOfferedItems] = useState<Item[]>(offeredItems)
  const [offersNotice, setOffersNotice] = useState<string | null>(null)
  const [offersError, setOffersError] = useState<string | null>(null)
  const [offersProcessingId, setOffersProcessingId] = useState<string | null>(null)
  const filterValue = selectedFilterId ?? filters[0]?.id ?? ""
  const sortingValue = selectedSortingId ?? sorting?.[0]?.id ?? ""

  useEffect(() => {
    setLocalOfferedItems(offeredItems)
    setOffersNotice(null)
    setOffersError(null)
    setOffersProcessingId(null)
  }, [offeredItems, selectedFilterId])

  function handleCreateItemSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!addItem?.action) return

    const action = addItem.action
    startTransition(async () => {
      try {
        const formData = new FormData(e.currentTarget)
        await action(formData)
        setDraft(toInitialDraft(addItem.selfUserId))
        setSteps([])
        setIsAddOpen(false)
      } catch (error) {
        console.error("Failed to create item:", error)
      }
    })
  }

  const initialDraft = useMemo(() => toInitialDraft(addItem?.selfUserId ?? null), [addItem?.selfUserId])
  const initialSteps = useMemo<DraftStepState[]>(() => [], [])
  const selectedProject = useMemo(
    () => addItem?.projects.find((project) => project.id === draft.projectId) ?? null,
    [addItem?.projects, draft.projectId]
  )
  const visibleMilestones = selectedProject?.milestones ?? []
  const hasDraftChanges = isDraftChanged(draft, initialDraft, steps, initialSteps)
  const canUseDOM = typeof window !== "undefined"

  function appendStep() {
    setSteps((current) => [
      ...current,
      {
        id: `step-${Date.now()}-${current.length}`,
        name: "",
        description: "",
      },
    ])
  }

  function moveStep(index: number, direction: "up" | "down") {
    setSteps((current) => {
      const targetIndex = direction === "up" ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= current.length) {
        return current
      }

      const next = [...current]
      const temp = next[index]
      next[index] = next[targetIndex]
      next[targetIndex] = temp
      return next
    })
  }

  function removeStep(index: number) {
    setSteps((current) => current.filter((_, rowIndex) => rowIndex !== index))
  }

  function openAddModal() {
    setIsOffersOpen(false)
    setDraft(initialDraft)
    setSteps(initialSteps)
    setShowCloseConfirm(false)
    setOffersNotice(null)
    setOffersError(null)
    setIsAddOpen(true)
  }

  function closeAddModal() {
    setIsAddOpen(false)
    setShowCloseConfirm(false)
    setDraft(initialDraft)
    setSteps(initialSteps)
  }

  function openOffersModal() {
    setIsAddOpen(false)
    setShowCloseConfirm(false)
    setDraft(initialDraft)
    setSteps(initialSteps)
    setOffersNotice(null)
    setOffersError(null)
    setIsOffersOpen(true)
  }

  function closeOffersModal() {
    setIsOffersOpen(false)
    setOffersProcessingId(null)
  }

  function requestClose() {
    if (hasDraftChanges) {
      setShowCloseConfirm(true)
      return
    }

    closeAddModal()
  }

  function handleAcceptOffer(itemId: string) {
    const previousOfferedItems = localOfferedItems
    const nextOfferedItems = localOfferedItems.filter((item) => item.id !== itemId)
    setLocalOfferedItems(nextOfferedItems)
    setOffersNotice(null)
    setOffersError(null)
    setOffersProcessingId(itemId)

    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.append("userId", selectedFilterId ?? "")
        formData.append("itemId", itemId)
        await acceptItemAction(formData)
        setOffersNotice("Offer accepted and moved to waiting.")
        router.refresh()
      } catch (error) {
        setLocalOfferedItems(previousOfferedItems)
        setOffersError(error instanceof Error ? error.message : "Failed to accept offer")
      } finally {
        setOffersProcessingId(null)
      }
    })
  }

  function handleDeclineOffer(itemId: string) {
    setOffersNotice(null)
    setOffersError(null)
    setOffersProcessingId(itemId)

    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.append("userId", selectedFilterId ?? "")
        formData.append("itemId", itemId)
        await declineItemAction(formData)
        setOffersNotice("Offer declined. It remains visible until clarified.")
      } catch (error) {
        setOffersError(error instanceof Error ? error.message : "Failed to decline offer")
      } finally {
        setOffersProcessingId(null)
      }
    })
  }

  return (
    <div className={styles.filterBar}>
      <div className={styles.filterGroup}>
        <Label text="Filters" />
        <InputField
          value={filterValue}
          options={filters}
          ariaLabel="Filters"
          onChange={(userId) => {
            const params = new URLSearchParams()
            params.set("userId", userId)
            router.push(`/focus?${params.toString()}`)
          }}
        />
      </div>
      {sorting && sorting.length > 0 ? (
        <div className={styles.filterGroup}>
          <Label text="Sorting" />
          <InputField value={sortingValue} options={sorting} ariaLabel="Sorting" />
        </div>
      ) : null}
      {addItem ? (
        <div className={styles.addArea}>
          <Button label="Add" variant="secondary" onClick={openAddModal} />
        </div>
      ) : null}
      {focusStateSummary ? (
        <div className={styles.offersArea}>
          <button
            type="button"
            className={styles.offersButton}
            onClick={openOffersModal}
            aria-label={`Open offers (${localOfferedItems.length})`}
            title="Open offers"
          >
            <span>Offers</span>
            <span className={styles.offersBadge}>{localOfferedItems.length}</span>
          </button>
        </div>
      ) : null}
      {canUseDOM && (isAddOpen || isOffersOpen)
        ? createPortal(
            <>
              {addItem && isAddOpen ? (
                <div className={styles.modalLayer}>
                  <div className={styles.modalBackdrop} />
                  <div className={styles.modalCard} role="dialog" aria-modal="true" aria-label="Create Item">
                    <button className={styles.closeButton} type="button" onClick={requestClose} aria-label="Close">
                      X
                    </button>

                    <h4 className={styles.popTitle}>Create Item</h4>
                    <form onSubmit={handleCreateItemSubmit} className={styles.popForm}>
                      <input type="hidden" name="userId" value={addItem.userId ?? ""} />

                      <label className={styles.fieldLabel}>
                        Name
                        <input
                          className={styles.popInput}
                          name="title"
                          maxLength={160}
                          required
                          value={draft.name}
                          onChange={(event) => setDraft((state) => ({ ...state, name: event.target.value }))}
                        />
                      </label>

                      <label className={styles.fieldLabel}>
                        Assigned
                        <select
                          className={styles.popInput}
                          name="assignedUserId"
                          value={draft.assignedUserId}
                          onChange={(event) =>
                            setDraft((state) => ({ ...state, assignedUserId: event.target.value }))
                          }
                        >
                          {addItem.assignees.length === 0 ? (
                            <option value="">No users</option>
                          ) : (
                            addItem.assignees.map((assignee) => (
                              <option key={assignee.id} value={assignee.id}>
                                {assignee.label}
                              </option>
                            ))
                          )}
                        </select>
                      </label>

                      <div className={styles.twoColumn}>
                        <label className={styles.fieldLabel}>
                          Project
                          <select
                            className={styles.popInput}
                            name="projectId"
                            value={draft.projectId}
                            onChange={(event) => {
                              const nextProjectId = event.target.value
                              const nextProject =
                                addItem.projects.find((project) => project.id === nextProjectId) ?? null
                              setDraft((state) => ({
                                ...state,
                                projectId: nextProjectId,
                                milestoneId: nextProject?.milestones[0]?.id ?? "",
                              }))
                            }}
                          >
                            {addItem.projects.length === 0 ? (
                              <option value="">No projects</option>
                            ) : (
                              addItem.projects.map((project) => (
                                <option key={project.id} value={project.id}>
                                  {project.name}
                                </option>
                              ))
                            )}
                          </select>
                        </label>

                        <label className={styles.fieldLabel}>
                          Milestone
                          <select
                            className={styles.popInput}
                            name="milestoneId"
                            value={draft.milestoneId}
                            disabled={!draft.projectId}
                            onChange={(event) =>
                              setDraft((state) => ({ ...state, milestoneId: event.target.value }))
                            }
                          >
                            {!draft.projectId ? (
                              <option value="">Select project first</option>
                            ) : visibleMilestones.length === 0 ? (
                              <option value="">No milestones</option>
                            ) : (
                              visibleMilestones.map((milestone) => (
                                <option key={milestone.id} value={milestone.id}>
                                  {milestone.title}
                                </option>
                              ))
                            )}
                          </select>
                        </label>
                      </div>

                      <div className={styles.twoColumn}>
                        <label className={styles.fieldLabel}>
                          Tags
                          <select
                            className={styles.popInput}
                            name="tagId"
                            value={draft.tagId}
                            onChange={(event) => setDraft((state) => ({ ...state, tagId: event.target.value }))}
                          >
                            <option value="">No options yet</option>
                          </select>
                        </label>

                        <label className={styles.fieldLabel}>
                          Alarm
                          <select
                            className={styles.popInput}
                            name="alarmId"
                            value={draft.alarmId}
                            onChange={(event) => setDraft((state) => ({ ...state, alarmId: event.target.value }))}
                          >
                            <option value="">No options yet</option>
                          </select>
                        </label>
                      </div>

                      <div className={styles.twoColumn}>
                        <label className={styles.fieldLabel}>
                          Due Date
                          <input
                            className={`${styles.popInput} ${styles.pickerInput}`}
                            type="date"
                            name="dueDate"
                            value={draft.dueDate}
                            onChange={(event) =>
                              setDraft((state) => ({ ...state, dueDate: event.target.value }))
                            }
                            onKeyDown={(event) => event.preventDefault()}
                            onPaste={(event) => event.preventDefault()}
                          />
                        </label>

                        <label className={styles.fieldLabel}>
                          Due Time
                          <input
                            className={`${styles.popInput} ${styles.pickerInput}`}
                            type="time"
                            name="dueTime"
                            value={draft.dueTime}
                            onChange={(event) =>
                              setDraft((state) => ({ ...state, dueTime: event.target.value }))
                            }
                            onKeyDown={(event) => event.preventDefault()}
                            onPaste={(event) => event.preventDefault()}
                          />
                        </label>
                      </div>

                      <label className={styles.fieldLabel}>
                        Description
                        <textarea
                          className={styles.popInput}
                          name="description"
                          rows={4}
                          maxLength={1000}
                          value={draft.description}
                          onChange={(event) =>
                            setDraft((state) => ({ ...state, description: event.target.value }))
                          }
                        />
                      </label>

                      {steps.map((step, index) => (
                        <div key={step.id} className={styles.stepBlock}>
                          <div className={styles.stepDivider} />
                          <div className={styles.stepHeader}>
                            <h5 className={styles.stepTitle}>Step {index + 1}</h5>
                            <div className={styles.stepMoveActions}>
                              <button
                                type="button"
                                className={styles.stepMoveButton}
                                onClick={() => moveStep(index, "up")}
                                disabled={index === 0}
                                aria-label="Move Step Up"
                                title="Move Step Up"
                              >
                                <ArrowUpFromDot strokeWidth={2.5} />
                              </button>
                              <button
                                type="button"
                                className={styles.stepMoveButton}
                                onClick={() => moveStep(index, "down")}
                                disabled={index === steps.length - 1}
                                aria-label="Move Step Down"
                                title="Move Step Down"
                              >
                                <ArrowDownToDot strokeWidth={2.5} />
                              </button>
                              <button
                                type="button"
                                className={`${styles.stepMoveButton} ${styles.stepRemoveButton}`}
                                onClick={() => removeStep(index)}
                                aria-label="Remove Step"
                                title="Remove Step"
                              >
                                <Trash2 strokeWidth={2.3} />
                              </button>
                            </div>
                          </div>
                          <div className={styles.stepFields}>
                            <label className={styles.fieldLabel}>
                              Step Name
                              <input
                                className={styles.popInput}
                                name={`step_name_${index}`}
                                maxLength={160}
                                value={step.name}
                                onChange={(event) =>
                                  setSteps((current) =>
                                    current.map((row, rowIndex) =>
                                      rowIndex === index ? { ...row, name: event.target.value } : row
                                    )
                                  )
                                }
                              />
                            </label>
                            <label className={styles.fieldLabel}>
                              Step Description
                              <textarea
                                className={styles.popInput}
                                name={`step_description_${index}`}
                                rows={2}
                                maxLength={1000}
                                value={step.description}
                                onChange={(event) =>
                                  setSteps((current) =>
                                    current.map((row, rowIndex) =>
                                      rowIndex === index ? { ...row, description: event.target.value } : row
                                    )
                                  )
                                }
                              />
                            </label>
                          </div>
                        </div>
                      ))}

                      <div className={styles.addStepRow}>
                        <Button
                          label="Add Step"
                          variant="secondary"
                          onClick={appendStep}
                          className={styles.addStepButton}
                        />
                      </div>

                      <div className={styles.popActions}>
                        <Button
                          label="Add"
                          type="submit"
                          disabled={!addItem.userId || !draft.name.trim() || isPending}
                          className={styles.modalActionButton}
                        />
                        <Button
                          label="Cancel"
                          variant="secondary"
                          onClick={requestClose}
                          className={styles.modalActionButton}
                        />
                      </div>
                    </form>

                    {showCloseConfirm ? (
                      <div className={styles.confirmBox}>
                        <p className={styles.confirmText}>You changed fields. Discard and close?</p>
                        <div className={styles.confirmActions}>
                          <Button label="No" variant="secondary" onClick={() => setShowCloseConfirm(false)} />
                          <Button label="Yes" onClick={closeAddModal} />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {isOffersOpen ? (
                <div className={styles.modalLayer}>
                  <div className={styles.modalBackdrop} />
                  <div className={styles.modalCard} role="dialog" aria-modal="true" aria-label="Offered items">
                    <button className={styles.closeButton} type="button" onClick={closeOffersModal} aria-label="Close">
                      X
                    </button>
                    <h4 className={styles.popTitle}>Offered Items</h4>
                    <div className={styles.stateSummary}>
                      <span>Active: {focusStateSummary?.activeCount ?? 0}</span>
                      <span>Waiting: {focusStateSummary?.waitingCount ?? 0}</span>
                      <span>Offered: {localOfferedItems.length}</span>
                    </div>
                    {offersNotice ? <p className={styles.offersNotice}>{offersNotice}</p> : null}
                    {offersError ? <p className={styles.offersError}>{offersError}</p> : null}
                    <div className={styles.offersList}>
                      {localOfferedItems.length === 0 ? (
                        <p className={styles.confirmText}>No offered items.</p>
                      ) : (
                        localOfferedItems.map((item) => (
                          <div key={item.id} className={styles.offerRow}>
                            <div className={styles.offerCopy}>
                              <p className={styles.offerTitle}>{item.title}</p>
                              <p className={styles.offerSummary}>{item.summary}</p>
                            </div>
                            <div className={styles.offerActions}>
                              <button
                                type="button"
                                className={styles.offerActionPrimary}
                                disabled={!selectedFilterId || offersProcessingId === item.id || isPending}
                                onClick={() => handleAcceptOffer(item.id)}
                              >
                                Accept
                              </button>
                              <button
                                type="button"
                                className={styles.offerActionSecondary}
                                disabled={!selectedFilterId || offersProcessingId === item.id || isPending}
                                onClick={() => handleDeclineOffer(item.id)}
                              >
                                Decline
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </>,
            document.body
          )
        : null}
    </div>
  )
}
