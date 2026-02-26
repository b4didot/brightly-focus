"use client"

import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { ArrowDownToDot, ArrowUpFromDot, Trash2 } from "lucide-react"
import { Button } from "@/components/atoms"
import { SectionContainer } from "@/components/layouts"
import contextStyles from "@/components/organisms/contextPanel.module.css"
import {
  createProjectStructureAction,
  updateProjectDescriptionAction,
} from "@/features/projects/actions/projectStructureActions"
import { createProjectCommentAction } from "@/features/projects/actions/projectCommentsActions"
import {
  createProjectMilestoneItemAction,
  updateProjectMilestoneItemAction,
} from "@/features/projects/actions/projectItemActions"
import type {
  ProjectCommentNode,
  ProjectContextTab,
  ProjectDetailItem,
  ProjectsWorkspaceData,
  SelectedProjectDetail,
} from "@/features/projects/queries/projectsWorkspaceQueries"
import styles from "./projectsWorkspace.module.css"

type DraftStep = { id: string; name: string; isCompleted: boolean }
type CreateDraft = { title: string; description: string; dueAt: string; executionOwnerId: string; steps: DraftStep[] }
type EditDraft = { title: string; description: string; dueAt: string; steps: DraftStep[] }
type ActiveModal = { type: "none" } | { type: "create"; milestoneId: string } | { type: "detail"; milestoneId: string; itemId: string }
type ProjectMilestoneDraft = { name: string; description: string }

function formatProgress(progress: { completed: number; total: number } | null) {
  if (!progress) return "No linked items"
  const percent = Math.round((progress.completed / progress.total) * 100)
  return `${progress.completed}/${progress.total} (${percent}%)`
}

function progressWidth(progress: { completed: number; total: number } | null) {
  if (!progress) return 0
  return Math.max(0, Math.min(100, Math.round((progress.completed / progress.total) * 100)))
}

function toTabLabel(tab: ProjectContextTab) {
  if (tab === "milestones") return "Milestones"
  if (tab === "comments") return "Comments"
  return "Details"
}

function buildParams({ userId, projectId, scopeFilter, tab, create }: { userId: string | null; projectId?: string | null; scopeFilter?: string; tab?: string; create?: string }) {
  const params = new URLSearchParams()
  if (userId) params.set("userId", userId)
  if (projectId) params.set("projectId", projectId)
  if (scopeFilter) params.set("scopeFilter", scopeFilter)
  if (tab) params.set("tab", tab)
  if (create) params.set("create", create)
  return params.toString()
}

function toDatetimeLocal(value: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

function fromDatetimeLocal(value: string) {
  return value.trim() ? new Date(value).toISOString() : null
}

function formatDueAt(value: string | null) {
  if (!value) return "n/a"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "n/a"
  return date.toLocaleString()
}

function makeCreateDraft(project: SelectedProjectDetail | null): CreateDraft {
  return { title: "", description: "", dueAt: "", executionOwnerId: project?.defaultUserId ?? "", steps: [] }
}

function makeEditDraft(item: ProjectDetailItem): EditDraft {
  return {
    title: item.title,
    description: item.description ?? "",
    dueAt: toDatetimeLocal(item.dueAt),
    steps: item.steps.map((step) => ({ id: step.id, name: step.name, isCompleted: step.isCompleted })),
  }
}

function createStep(index: number): DraftStep {
  return { id: `step-${Date.now()}-${index}`, name: "", isCompleted: false }
}

function mergeItem(project: SelectedProjectDetail, milestoneId: string, item: ProjectDetailItem) {
  const milestones = project.milestones.map((milestone) => {
    if (milestone.id !== milestoneId) return milestone
    const index = milestone.items.findIndex((current) => current.id === item.id)
    const items = [...milestone.items]
    if (index < 0) items.unshift(item)
    else items[index] = item
    const completedCount = items.filter((current) => current.state === "completed").length
    return { ...milestone, items, itemCount: items.length, completedCount, progress: items.length ? { completed: completedCount, total: items.length } : null }
  })
  const allItems = milestones.flatMap((milestone) => milestone.items)
  const completedCount = allItems.filter((itemRow) => itemRow.state === "completed").length
  return { ...project, milestones, progress: allItems.length ? { completed: completedCount, total: allItems.length } : null }
}

function CommentTree({ comments, actingUserId, projectId }: { comments: ProjectCommentNode[]; actingUserId: string | null; projectId: string }) {
  return (
    <div className={styles.replyList}>
      {comments.map((comment) => (
        <div key={comment.id} className={styles.commentRow}>
          <p className={styles.commentMeta}>{comment.authorName} - {new Date(comment.createdAt).toLocaleString()}</p>
          <p className={styles.commentBody}>{comment.body}</p>
          {actingUserId ? (
            <form action={createProjectCommentAction} className={styles.commentForm}>
              <input type="hidden" name="actingUserId" value={actingUserId} />
              <input type="hidden" name="projectId" value={projectId} />
              <input type="hidden" name="parentCommentId" value={comment.id} />
              <textarea name="body" rows={2} required maxLength={2000} className={styles.commentInput} />
              <Button label="Reply" type="submit" variant="secondary" />
            </form>
          ) : null}
          {comment.replies.length > 0 ? <CommentTree comments={comment.replies} actingUserId={actingUserId} projectId={projectId} /> : null}
        </div>
      ))}
    </div>
  )
}

export function ProjectPageContent({ data, showCreateForm }: { data: ProjectsWorkspaceData; showCreateForm: boolean }) {
  const router = useRouter()
  const [isContextOpen, setIsContextOpen] = useState(true)
  const [activeTab, setActiveTab] = useState<ProjectContextTab>(data.activeTab)
  const [expandedMilestoneIds, setExpandedMilestoneIds] = useState<Set<string>>(new Set())
  const [modal, setModal] = useState<ActiveModal>({ type: "none" })
  const [createDraft, setCreateDraft] = useState<CreateDraft>(() => makeCreateDraft(data.selectedProject))
  const [detailDraft, setDetailDraft] = useState<EditDraft | null>(null)
  const [projectView, setProjectView] = useState<SelectedProjectDetail | null>(data.selectedProject)
  const [projectMilestones, setProjectMilestones] = useState<ProjectMilestoneDraft[]>([{ name: "", description: "" }])
  const [modalError, setModalError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const selectedProject = projectView
  const selectedUserId = data.selectedUserId
  const selectedProjectId = data.selectedProjectId

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProjectView(data.selectedProject)
    setCreateDraft(makeCreateDraft(data.selectedProject))
    setDetailDraft(null)
    setModal({ type: "none" })
    setModalError(null)
  }, [data.selectedProject])

  useEffect(() => {
    if (modal.type === "none") return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) {
        setModal({ type: "none" })
        setModalError(null)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [modal, isPending])

  useEffect(() => {
    if (!showCreateForm) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProjectMilestones([{ name: "", description: "" }])
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        router.push(`/projects?${buildParams({ userId: selectedUserId, projectId: selectedProjectId, scopeFilter: data.scopeFilter, tab: activeTab })}`)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [showCreateForm, router, selectedUserId, selectedProjectId, data.scopeFilter, activeTab])

  const currentMilestone = useMemo(() => {
    if (!selectedProject || modal.type === "none") return null
    return selectedProject.milestones.find((milestone) => milestone.id === modal.milestoneId) ?? null
  }, [modal, selectedProject])

  const currentItem = useMemo(() => {
    if (modal.type !== "detail" || !currentMilestone) return null
    return currentMilestone.items.find((item) => item.id === modal.itemId) ?? null
  }, [modal, currentMilestone])

  function handleProjectChange(projectId: string) {
    router.push(`/projects?${buildParams({ userId: selectedUserId, projectId, scopeFilter: data.scopeFilter, tab: activeTab, create: showCreateForm ? "1" : undefined })}`)
  }

  function handleTabClick(nextTab: ProjectContextTab) {
    if (nextTab === activeTab && isContextOpen) { setIsContextOpen(false); return }
    setIsContextOpen(true)
    setActiveTab(nextTab)
    router.push(`/projects?${buildParams({ userId: selectedUserId, projectId: selectedProjectId, scopeFilter: data.scopeFilter, tab: nextTab, create: showCreateForm ? "1" : undefined })}`)
  }

  function toggleMilestone(milestoneId: string) {
    setExpandedMilestoneIds((current) => {
      const next = new Set(current)
      if (next.has(milestoneId)) next.delete(milestoneId)
      else next.add(milestoneId)
      return next
    })
  }

  function closeProjectCreateModal() {
    router.push(`/projects?${buildParams({ userId: selectedUserId, projectId: selectedProjectId, scopeFilter: data.scopeFilter, tab: activeTab })}`)
  }

  function addProjectMilestoneInput() {
    setProjectMilestones((current) => [...current, { name: "", description: "" }])
  }

  function removeProjectMilestoneInput(index: number) {
    setProjectMilestones((current) => {
      if (current.length <= 1) return current
      return current.filter((_, rowIndex) => rowIndex !== index)
    })
  }

  function moveProjectMilestoneUp(index: number) {
    setProjectMilestones((current) => {
      if (current.length <= 1 || index <= 0) return current
      const next = [...current]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next
    })
  }

  function moveProjectMilestoneDown(index: number) {
    setProjectMilestones((current) => {
      if (current.length <= 1 || index >= current.length - 1) return current
      const next = [...current]
      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
      return next
    })
  }

  function updateProjectMilestoneInput(index: number, field: "name" | "description", value: string) {
    setProjectMilestones((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row))
    )
  }

  function closeModal() { if (!isPending) { setModal({ type: "none" }); setModalError(null) } }
  function openCreate(milestoneId: string) { if (selectedProject) { setCreateDraft(makeCreateDraft(selectedProject)); setModalError(null); setModal({ type: "create", milestoneId }) } }
  function openDetail(milestoneId: string, itemId: string) {
    const item = selectedProject?.milestones.find((m) => m.id === milestoneId)?.items.find((i) => i.id === itemId)
    if (!item) return
    setDetailDraft(makeEditDraft(item)); setModalError(null); setModal({ type: "detail", milestoneId, itemId })
  }

  function updateSteps(draft: CreateDraft | EditDraft | null, updater: (steps: DraftStep[]) => DraftStep[]) {
    if (!draft) return draft
    return { ...draft, steps: updater(draft.steps) }
  }

  function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedProject || !selectedUserId || modal.type !== "create") return
    const fd = new FormData()
    fd.set("actingUserId", selectedUserId)
    fd.set("projectId", selectedProject.id)
    fd.set("milestoneId", modal.milestoneId)
    fd.set("title", createDraft.title)
    fd.set("executionOwnerId", createDraft.executionOwnerId)
    if (createDraft.description.trim()) fd.set("description", createDraft.description.trim())
    const dueAt = fromDatetimeLocal(createDraft.dueAt)
    if (dueAt) fd.set("dueAt", dueAt)
    createDraft.steps.forEach((step) => step.name.trim() && fd.append("stepName", step.name.trim()))
    setModalError(null)
    startTransition(async () => {
      try {
        const result = await createProjectMilestoneItemAction(fd)
        setProjectView((current) => (current ? mergeItem(current, result.milestoneId, result.item) : current))
        setModal({ type: "none" })
      } catch (error) { setModalError(error instanceof Error ? error.message : "Failed to create item.") }
    })
  }

  function handleDetailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedProject || !selectedUserId || modal.type !== "detail" || !detailDraft) return
    const fd = new FormData()
    fd.set("actingUserId", selectedUserId)
    fd.set("projectId", selectedProject.id)
    fd.set("milestoneId", modal.milestoneId)
    fd.set("itemId", modal.itemId)
    fd.set("title", detailDraft.title)
    if (detailDraft.description.trim()) fd.set("description", detailDraft.description.trim())
    const dueAt = fromDatetimeLocal(detailDraft.dueAt)
    if (dueAt) fd.set("dueAt", dueAt)
    detailDraft.steps.forEach((step) => step.name.trim() && fd.append("stepName", step.name.trim()))
    setModalError(null)
    startTransition(async () => {
      try {
        const result = await updateProjectMilestoneItemAction(fd)
        setProjectView((current) => (current ? mergeItem(current, result.milestoneId, result.item) : current))
        setModal({ type: "none" })
      } catch (error) { setModalError(error instanceof Error ? error.message : "Failed to update item.") }
    })
  }

  return (
    <div className={styles.shell}>
      <SectionContainer title="Project List" tone="secondary" scrollable={false}>
        <div className={styles.listPanelBody}><div className={styles.listHeader}>
        </div><div className={styles.rowList}>
          {data.projectList.length === 0 ? <p className={styles.emptyText}>No projects in this scope.</p> : data.projectList.map((project) => (
            <button key={project.id} type="button" className={[styles.projectRow, selectedProjectId === project.id ? styles.projectRowActive : ""].filter(Boolean).join(" ")} onClick={() => handleProjectChange(project.id)}>
              <div className={styles.rowTop}><p className={styles.rowName}>{project.name}</p><span className={styles.badge}>{project.visibilityScope}</span></div>
              <div className={styles.progressTrack}><div className={styles.progressFill} style={{ width: `${progressWidth(project.progress)}%` }} /></div>
              <p className={styles.progressText}>{formatProgress(project.progress)}</p>{project.teamName ? <p className={styles.teamName}>{project.teamName}</p> : null}
            </button>
          ))}
        </div></div>
      </SectionContainer>

      <div className={styles.rightColumn}><div className={contextStyles.tabBody}>
        <div className={contextStyles.tabBar} role="tablist" aria-label="Project context tabs">{(["details", "milestones", "comments"] as const).map((tabId) => {
          const isActive = activeTab === tabId
          return <button key={tabId} type="button" role="tab" aria-selected={isActive} className={[contextStyles.tabButton, isActive ? contextStyles.tabButtonActive : ""].filter(Boolean).join(" ")} onClick={() => handleTabClick(tabId)}>{toTabLabel(tabId)}</button>
        })}</div>

        {isContextOpen ? <SectionContainer title="Project Context" tone="context" hideTitle><div className={styles.tabBody}>
          {(activeTab === "details" || activeTab === "milestones") && selectedProject ? <>
            <div className={styles.detailGrid}><div className={styles.metaCard}><p className={styles.metaLabel}>Project Name</p><p className={styles.metaValue}>{selectedProject.name}</p></div><div className={styles.metaCard}><p className={styles.metaLabel}>Team</p><p className={styles.metaValue}>{selectedProject.teamName ?? "No Team"}</p></div><div className={styles.metaCard}><p className={styles.metaLabel}>Visibility</p><p className={styles.metaValue}>{selectedProject.visibilityScope}</p></div><div className={styles.metaCard}><p className={styles.metaLabel}>Derived Project Progress</p><p className={styles.metaValue}>{formatProgress(selectedProject.progress)}</p></div></div>
            <SectionContainer title="Project Description" tone="workspace"><div className={styles.replyList}><form action={updateProjectDescriptionAction} className={styles.commentForm}><input type="hidden" name="actingUserId" value={selectedUserId ?? ""} /><input type="hidden" name="projectId" value={selectedProject.id} /><textarea name="description" className={styles.descriptionArea} defaultValue={selectedProject.description ?? ""} rows={5} maxLength={4000} /><div className={styles.descriptionActions}><Button label="Save Description" type="submit" /></div></form></div></SectionContainer>
            <div className={styles.replyList}>{selectedProject.milestones.map((milestone) => { const expanded = expandedMilestoneIds.has(milestone.id); return <div key={milestone.id} className={styles.contextCard}><button type="button" className={styles.accordionButton} onClick={() => toggleMilestone(milestone.id)}><span>{milestone.name}</span><span>{expanded ? "Hide" : "Show"}</span></button><div className={styles.milestoneHeader}><p className={styles.progressText}>Progress: {formatProgress(milestone.progress)}</p><Button label="Add Item" variant="secondary" onClick={() => openCreate(milestone.id)} /></div>{expanded ? <><p className={styles.itemMeta}>Description: {milestone.description ?? "n/a"}</p><div className={styles.itemList}>{milestone.items.length === 0 ? <p className={styles.emptyText}>No items in this milestone.</p> : milestone.items.map((item) => <button key={item.id} type="button" className={styles.itemRowButton} onClick={() => openDetail(milestone.id, item.id)}><div className={styles.itemRow}><p className={styles.itemTitle}>{item.title}</p><p className={styles.itemMeta}>Owner: {item.ownerName} - <span className={styles.stateBadge}>{item.state}</span> - Progress: {formatProgress(item.stepProgress)} - Due: {formatDueAt(item.dueAt)}</p></div></button>)}</div></> : null}</div> })}</div>
          </> : null}
          {(activeTab === "details" || activeTab === "milestones") && !selectedProject ? <p className={styles.emptyText}>Select a project to view details.</p> : null}
          {activeTab === "comments" ? (selectedProject ? <div className={styles.replyList}>{selectedUserId ? <form action={createProjectCommentAction} className={styles.commentForm}><input type="hidden" name="actingUserId" value={selectedUserId} /><input type="hidden" name="projectId" value={selectedProject.id} /><textarea name="body" rows={3} maxLength={2000} required className={styles.commentInput} /><Button label="Add Comment" type="submit" /></form> : null}{data.comments.length > 0 ? <CommentTree comments={data.comments} actingUserId={selectedUserId} projectId={selectedProject.id} /> : <p className={styles.emptyText}>No comments yet.</p>}</div> : <p className={styles.emptyText}>Select a project to view comments.</p>) : null}
        </div></SectionContainer> : null}
      </div></div>

      {modal.type !== "none" ? <div className={styles.modalLayer} role="dialog" aria-modal="true" aria-label="Project item dialog"><div className={styles.modalBackdrop} onClick={closeModal} /><div className={styles.modalCard}><button type="button" className={styles.closeButton} onClick={closeModal} disabled={isPending}>X</button>
        {modal.type === "create" && currentMilestone ? <><h4 className={styles.popTitle}>Add Item - {currentMilestone.name}</h4><form onSubmit={handleCreateSubmit} className={styles.popForm}><label className={styles.fieldLabel}>Title<input className={styles.popInput} maxLength={160} required value={createDraft.title} onChange={(e) => setCreateDraft((c) => ({ ...c, title: e.target.value }))} /></label><label className={styles.fieldLabel}>Execution Owner<select className={styles.popInput} value={createDraft.executionOwnerId} onChange={(e) => setCreateDraft((c) => ({ ...c, executionOwnerId: e.target.value }))}>{data.users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label><label className={styles.fieldLabel}>Description<textarea className={styles.popInput} rows={4} maxLength={1000} value={createDraft.description} onChange={(e) => setCreateDraft((c) => ({ ...c, description: e.target.value }))} /></label><label className={styles.fieldLabel}>Due At<input className={styles.popInput} type="datetime-local" value={createDraft.dueAt} onChange={(e) => setCreateDraft((c) => ({ ...c, dueAt: e.target.value }))} /></label><div className={styles.stepEditorHeader}><p className={styles.metaLabel}>Steps</p><Button label="Add Step" variant="secondary" onClick={() => setCreateDraft((c) => updateSteps(c, (s) => [...s, createStep(s.length)]) as CreateDraft)} /></div>{createDraft.steps.map((step, i) => <div key={step.id} className={styles.stepRow}><input className={styles.popInput} value={step.name} onChange={(e) => setCreateDraft((c) => updateSteps(c, (s) => s.map((row, idx) => idx === i ? { ...row, name: e.target.value } : row)) as CreateDraft)} placeholder={`Step ${i + 1}`} maxLength={200} /><div className={styles.stepActions}><Button label="Up" variant="secondary" onClick={() => setCreateDraft((c) => updateSteps(c, (s) => { const n=[...s]; if (i>0) [n[i-1],n[i]]=[n[i],n[i-1]]; return n }) as CreateDraft)} disabled={i===0} /><Button label="Down" variant="secondary" onClick={() => setCreateDraft((c) => updateSteps(c, (s) => { const n=[...s]; if (i<n.length-1) [n[i+1],n[i]]=[n[i],n[i+1]]; return n }) as CreateDraft)} disabled={i===createDraft.steps.length-1} /><Button label="Remove" variant="secondary" onClick={() => setCreateDraft((c) => updateSteps(c, (s) => s.filter((_, idx) => idx !== i)) as CreateDraft)} /></div></div>)}{modalError ? <p className={styles.errorText}>{modalError}</p> : null}<div className={styles.popActions}><Button label="Create Item" type="submit" disabled={isPending || !createDraft.title.trim() || !createDraft.executionOwnerId.trim()} className={styles.modalActionButton} /><Button label="Cancel" variant="secondary" onClick={closeModal} className={styles.modalActionButton} disabled={isPending} /></div></form></> : null}
        {modal.type === "detail" && currentItem && detailDraft ? <><h4 className={styles.popTitle}>Item Details - {currentItem.title}</h4><form onSubmit={handleDetailSubmit} className={styles.popForm}><label className={styles.fieldLabel}>Title<input className={styles.popInput} maxLength={160} required value={detailDraft.title} disabled={currentItem.state === "completed"} onChange={(e) => setDetailDraft((c) => c ? { ...c, title: e.target.value } : c)} /></label><label className={styles.fieldLabel}>Description<textarea className={styles.popInput} rows={4} maxLength={1000} value={detailDraft.description} disabled={currentItem.state === "completed"} onChange={(e) => setDetailDraft((c) => c ? { ...c, description: e.target.value } : c)} /></label><label className={styles.fieldLabel}>Due At<input className={styles.popInput} type="datetime-local" value={detailDraft.dueAt} disabled={currentItem.state === "completed"} onChange={(e) => setDetailDraft((c) => c ? { ...c, dueAt: e.target.value } : c)} /></label><div className={styles.stepEditorHeader}><p className={styles.metaLabel}>Steps</p><Button label="Add Step" variant="secondary" onClick={() => setDetailDraft((c) => updateSteps(c, (s) => [...s, createStep(s.length)]))} disabled={currentItem.state === "completed"} /></div>{detailDraft.steps.map((step, i) => <div key={step.id} className={styles.stepRow}><input className={styles.popInput} value={step.name} readOnly={currentItem.state === "completed"} onChange={(e) => setDetailDraft((c) => updateSteps(c, (s) => s.map((row, idx) => idx === i ? { ...row, name: e.target.value } : row)))} placeholder={`Step ${i + 1}`} maxLength={200} /><div className={styles.stepActions}><Button label="Up" variant="secondary" onClick={() => setDetailDraft((c) => updateSteps(c, (s) => { const n=[...s]; if (i>0) [n[i-1],n[i]]=[n[i],n[i-1]]; return n }))} disabled={currentItem.state === "completed" || i===0} /><Button label="Down" variant="secondary" onClick={() => setDetailDraft((c) => updateSteps(c, (s) => { const n=[...s]; if (i<n.length-1) [n[i+1],n[i]]=[n[i],n[i+1]]; return n }))} disabled={currentItem.state === "completed" || i===detailDraft.steps.length-1} /><Button label="Remove" variant="secondary" onClick={() => setDetailDraft((c) => updateSteps(c, (s) => s.filter((_, idx) => idx !== i)))} disabled={currentItem.state === "completed"} /></div></div>)}<p className={styles.itemMeta}>State: <span className={styles.stateBadge}>{currentItem.state}</span></p>{modalError ? <p className={styles.errorText}>{modalError}</p> : null}<div className={styles.popActions}><Button label={currentItem.state === "completed" ? "Close" : "Save"} type={currentItem.state === "completed" ? "button" : "submit"} onClick={currentItem.state === "completed" ? closeModal : undefined} disabled={isPending} className={styles.modalActionButton} /><Button label="Cancel" variant="secondary" onClick={closeModal} className={styles.modalActionButton} disabled={isPending} /></div></form></> : null}
      </div></div> : null}

      {showCreateForm ? <div className={styles.modalLayer} role="dialog" aria-modal="true" aria-label="Create project dialog"><div className={styles.modalBackdrop} onClick={closeProjectCreateModal} /><div className={styles.modalCard}><button type="button" className={styles.closeButton} onClick={closeProjectCreateModal}>X</button>
        <h4 className={styles.popTitle}>Create Project</h4>
        {selectedUserId ? (
          <form action={createProjectStructureAction} className={styles.popForm}>
            <input type="hidden" name="actingUserId" value={selectedUserId} />
            <input type="hidden" name="teamId" value={data.selectedTeamId ?? ""} />
            <label className={styles.fieldLabel}>Project Name<input name="name" required maxLength={200} className={styles.popInput} /></label>
            <div className={styles.modalFieldRow}>
              <label className={styles.fieldLabel}>Visibility<select name="visibilityScope" className={styles.popInput} defaultValue="team"><option value="team">Team</option><option value="private">Private</option></select></label>
              <label className={styles.fieldLabel}>Assignee<select name="defaultUserId" className={styles.popInput} defaultValue={selectedUserId}>{data.users.map((user) => (<option key={user.id} value={user.id}>{user.name}</option>))}</select></label>
            </div>
            <div className={styles.modalFieldRow}>
              <label className={styles.fieldLabel}>Tag (Project Tags)<input name="projectTag" maxLength={120} className={styles.popInput} placeholder="e.g. Product, Growth" /></label>
              <label className={styles.fieldLabel}>Due Date and Time<input name="dueAt" type="datetime-local" className={styles.popInput} /></label>
            </div>
            <label className={styles.fieldLabel}>Project Description<textarea name="description" rows={4} maxLength={2000} className={styles.popInput} /></label>
            <div className={styles.modalSeparator} />
            {projectMilestones.map((milestone, index) => (
              <div key={`project-milestone-${index}`} className={styles.milestoneDraftCard}>
                <div className={styles.milestoneDraftHeader}>
                  <p className={styles.metaLabel}>Milestone {index + 1}</p>
                  <div className={styles.milestoneIconActions}>
                    <button
                      type="button"
                      className={styles.milestoneIconButton}
                      aria-label={`Move milestone ${index + 1} up`}
                      title="Move Milestone Up"
                      onClick={() => moveProjectMilestoneUp(index)}
                      disabled={projectMilestones.length === 1 || index === 0}
                    >
                      <ArrowUpFromDot strokeWidth={2.5} />
                    </button>
                    <button
                      type="button"
                      className={styles.milestoneIconButton}
                      aria-label={`Move milestone ${index + 1} down`}
                      title="Move Milestone Down"
                      onClick={() => moveProjectMilestoneDown(index)}
                      disabled={projectMilestones.length === 1 || index === projectMilestones.length - 1}
                    >
                      <ArrowDownToDot strokeWidth={2.5} />
                    </button>
                    <button
                      type="button"
                      className={`${styles.milestoneIconButton} ${styles.milestoneDeleteButton}`}
                      aria-label={`Delete milestone ${index + 1}`}
                      title="Delete Milestone"
                      onClick={() => removeProjectMilestoneInput(index)}
                      disabled={projectMilestones.length === 1}
                    >
                      <Trash2 strokeWidth={2.3} />
                    </button>
                  </div>
                </div>
                <input
                  name="milestoneName"
                  required={index === 0}
                  maxLength={200}
                  className={styles.popInput}
                  placeholder={`Milestone ${index + 1}`}
                  value={milestone.name}
                  onChange={(event) => updateProjectMilestoneInput(index, "name", event.target.value)}
                />
                <textarea
                  name="milestoneDescription"
                  rows={3}
                  maxLength={1000}
                  className={styles.popInput}
                  placeholder={`Milestone ${index + 1} description`}
                  value={milestone.description}
                  onChange={(event) => updateProjectMilestoneInput(index, "description", event.target.value)}
                />
                <div className={styles.modalSeparator} />
              </div>
            ))}
            <Button label="Add Milestone" variant="secondary" onClick={addProjectMilestoneInput} className={styles.fullWidthButton} />
            <div className={styles.popActions}>
              <Button label="Create Project" type="submit" className={styles.modalActionButton} />
              <Button label="Cancel" variant="secondary" onClick={closeProjectCreateModal} className={styles.modalActionButton} />
            </div>
          </form>
        ) : (
          <div className={styles.popForm}>
            <p className={styles.emptyText}>Select a user to create a project.</p>
            <div className={styles.popActions}>
              <Button label="Close" variant="secondary" onClick={closeProjectCreateModal} className={styles.modalActionButton} />
            </div>
          </div>
        )}
      </div></div> : null}
    </div>
  )
}
