"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/atoms"
import type { ProjectContextTab, ProjectScopeFilter } from "@/features/projects/queries/projectsWorkspaceQueries"
import styles from "./projectsWorkspace.module.css"

function buildParams({
  userId,
  projectId,
  scopeFilter,
  tab,
  create,
}: {
  userId: string | null
  projectId?: string | null
  scopeFilter?: string
  tab?: string
  create?: string
}) {
  const params = new URLSearchParams()
  if (userId) params.set("userId", userId)
  if (projectId) params.set("projectId", projectId)
  if (scopeFilter) params.set("scopeFilter", scopeFilter)
  if (tab) params.set("tab", tab)
  if (create) params.set("create", create)
  return params.toString()
}

export function ProjectTopBar({
  selectedUserId,
  selectedProjectId,
  scopeFilter,
  activeTab,
  showCreateForm,
}: {
  selectedUserId: string | null
  selectedProjectId: string | null
  scopeFilter: ProjectScopeFilter
  activeTab: ProjectContextTab
  showCreateForm: boolean
}) {
  const router = useRouter()

  function onScopeChange(nextScope: string) {
    router.push(
      `/projects?${buildParams({
        userId: selectedUserId,
        scopeFilter: nextScope,
        tab: activeTab,
        create: showCreateForm ? "1" : undefined,
      })}`
    )
  }

  function onAddClick() {
    router.push(
      `/projects?${buildParams({
        userId: selectedUserId,
        projectId: selectedProjectId,
        scopeFilter,
        tab: activeTab,
        create: showCreateForm ? undefined : "1",
      })}`
    )
  }

  return (
    <div className={styles.topBarControls}>
      <div className={styles.topBarFilters}>
        <span className={styles.topBarFilterLabel}>Filters</span>
        <select
          aria-label="Project visibility filter"
          className={styles.topBarSelect}
          value={scopeFilter}
          onChange={(event) => onScopeChange(event.target.value)}
        >
          <option value="all">All</option>
          <option value="team">Team</option>
          <option value="private">Private</option>
        </select>
      </div>
      <Button label="Add" variant="secondary" onClick={onAddClick} />
    </div>
  )
}
