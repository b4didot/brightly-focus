"use client"

import { useCallback, useEffect, useState, useSyncExternalStore } from "react"
import type { Project, Milestone } from "@/types"
import { CommentsWindowPanel } from "./CommentsWindowPanel"
import { DetailsWindowPanel } from "./DetailsWindowPanel"
import { MilestoneWindowPanel } from "./MilestoneWindowPanel"
import { ProjectWindowPanel } from "./ProjectWindowPanel"
import { StepsWindowPanel } from "./StepsWindowPanel"
import styles from "./contextPanel.module.css"

export type ContextTabId = "details" | "steps" | "project" | "milestone" | "comments"

interface ContextTabProps {
  project: Project | null
  milestone: Milestone | null
}

function DetailsTab() {
  return <DetailsWindowPanel />
}

function StepsTab() {
  return <StepsWindowPanel />
}

function CommentsTab() {
  return <CommentsWindowPanel />
}

function ProjectTab({ project }: ContextTabProps) {
  return <ProjectWindowPanel project={project} />
}

function MilestoneTab({ milestone }: ContextTabProps) {
  return <MilestoneWindowPanel milestone={milestone} />
}

export const TABS = [
  { id: "details", label: "Details", component: DetailsTab },
  { id: "steps", label: "Steps", component: StepsTab },
  { id: "project", label: "Project", component: ProjectTab },
  { id: "milestone", label: "Milestone", component: MilestoneTab },
  { id: "comments", label: "Comments", component: CommentsTab },
] as const

interface ContextPanelState {
  isOpen: boolean
  activeTabId: ContextTabId
}

const STORAGE_KEY = "brightly.contextPanel"
const DEFAULT_STATE: ContextPanelState = { isOpen: true, activeTabId: "details" }
const subscribeHydration = () => () => {}

function normalizeState(state: Partial<ContextPanelState> | null): ContextPanelState {
  if (!state) return DEFAULT_STATE
  const validIds: ContextTabId[] = TABS.map((tab) => tab.id)
  const activeTabId: ContextTabId =
    state.activeTabId && validIds.includes(state.activeTabId) ? state.activeTabId : "details"
  return {
    isOpen: typeof state.isOpen === "boolean" ? state.isOpen : DEFAULT_STATE.isOpen,
    activeTabId,
  }
}

function loadStoredState(): ContextPanelState {
  if (typeof window === "undefined") return DEFAULT_STATE
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_STATE
    return normalizeState(JSON.parse(raw))
  } catch (error) {
    console.warn("Failed to load context panel state:", error)
    return DEFAULT_STATE
  }
}

export function useContextPanelState() {
  const [state, setState] = useState<ContextPanelState>(() => loadStoredState())
  const hasHydrated = useSyncExternalStore(subscribeHydration, () => true, () => false)
  const renderState = hasHydrated ? state : DEFAULT_STATE

  const handleTabClick = useCallback((tabId: ContextTabId) => {
    setState((prev) => {
      if (!prev.isOpen) {
        return { isOpen: true, activeTabId: tabId }
      }
      if (prev.activeTabId === tabId) {
        return { ...prev, isOpen: false }
      }
      return { ...prev, activeTabId: tabId }
    })
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  return {
    isOpen: renderState.isOpen,
    activeTabId: renderState.activeTabId,
    handleTabClick,
  }
}

interface ContextTabBarProps {
  activeTabId: ContextTabId
  onTabClick: (tabId: ContextTabId) => void
}

export function ContextTabBar({ activeTabId, onTabClick }: ContextTabBarProps) {
  return (
    <div className={styles.tabBar} role="tablist" aria-label="Context tabs">
      {TABS.map((tab) => {
        const isActive = tab.id === activeTabId
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={[styles.tabButton, isActive ? styles.tabButtonActive : ""].filter(Boolean).join(" ")}
            onClick={() => onTabClick(tab.id)}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

interface ContextTabBodyProps {
  activeTabId: ContextTabId
  project: Project | null
  milestone: Milestone | null
}

export function ContextTabBody({ activeTabId, project, milestone }: ContextTabBodyProps) {
  const activeTab = TABS.find((tab) => tab.id === activeTabId) ?? TABS[0]
  const ActiveTabComponent = activeTab.component
  return (
    <div className={styles.tabBody} data-context-body="true">
      <ActiveTabComponent project={project} milestone={milestone} />
    </div>
  )
}
