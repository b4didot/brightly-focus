"use client";

import { FormEvent, useMemo, useReducer, useState } from "react";

type Role = "user" | "admin";
type ItemState = "active" | "waiting" | "pending_acceptance" | "needs_info" | "completed";
type AssignmentStatus = "pending_acceptance" | "accepted" | "needs_info" | "declined";
type EventType = "assigned" | "accepted" | "declined" | "switched" | "completed";

type User = {
  id: string;
  name: string;
  role: Role;
};

type Item = {
  id: string;
  title: string;
  ownerId: string;
  createdBy: string;
  state: ItemState;
  queueOrder: number | null;
  completedAt?: string;
};

type Assignment = {
  id: string;
  itemId: string;
  assignerId: string;
  assigneeId: string;
  status: AssignmentStatus;
  updatedAt: string;
};

type ItemEvent = {
  id: string;
  itemId: string;
  actorId: string;
  type: EventType;
  at: string;
  note?: string;
};

type AppState = {
  users: User[];
  items: Item[];
  assignments: Assignment[];
  events: ItemEvent[];
  currentUserId: string;
};

type Action =
  | { type: "SET_CURRENT_USER"; userId: string }
  | { type: "CREATE_ITEM"; ownerId: string; actorId: string; title: string }
  | { type: "ADMIN_ASSIGN"; assignerId: string; assigneeId: string; title: string }
  | { type: "START_FOCUS"; actorId: string; itemId: string }
  | { type: "COMPLETE_ACTIVE"; actorId: string }
  | { type: "MOVE_WAITING"; actorId: string; itemId: string; direction: "up" | "down" }
  | { type: "ACCEPT_ASSIGNMENT"; actorId: string; assignmentId: string }
  | { type: "DECLINE_ASSIGNMENT"; actorId: string; assignmentId: string };

const initialState: AppState = {
  currentUserId: "user-1",
  users: [
    { id: "user-1", name: "John Arias", role: "user" },
    { id: "user-2", name: "Mia Reyes", role: "user" },
    { id: "admin-1", name: "Avery Cole", role: "admin" },
  ],
  items: [
    { id: "item-1", title: "Ship auth error fix", ownerId: "user-1", createdBy: "user-1", state: "active", queueOrder: null },
    { id: "item-2", title: "Prepare sprint notes", ownerId: "user-1", createdBy: "user-1", state: "waiting", queueOrder: 0 },
    { id: "item-3", title: "Refactor inbox API", ownerId: "user-1", createdBy: "admin-1", state: "waiting", queueOrder: 1 },
    { id: "item-4", title: "Landing page QA", ownerId: "user-2", createdBy: "user-2", state: "active", queueOrder: null },
    { id: "item-5", title: "Analytics event audit", ownerId: "user-2", createdBy: "admin-1", state: "waiting", queueOrder: 0 },
    { id: "item-6", title: "Finalize billing copy", ownerId: "user-1", createdBy: "user-1", state: "completed", queueOrder: null, completedAt: "2026-02-20T09:00:00.000Z" },
    { id: "item-7", title: "Handoff legal review", ownerId: "user-1", createdBy: "admin-1", state: "pending_acceptance", queueOrder: null },
  ],
  assignments: [
    {
      id: "assignment-1",
      itemId: "item-7",
      assignerId: "admin-1",
      assigneeId: "user-1",
      status: "pending_acceptance",
      updatedAt: "2026-02-22T08:00:00.000Z",
    },
  ],
  events: [
    { id: "event-1", itemId: "item-6", actorId: "user-1", type: "completed", at: "2026-02-20T09:00:00.000Z" },
    { id: "event-2", itemId: "item-7", actorId: "admin-1", type: "assigned", at: "2026-02-22T08:00:00.000Z" },
  ],
};

function nowIso() {
  return new Date().toISOString();
}

function nextId(prefix: string, existing: { id: string }[]) {
  const current = existing.length + 1;
  return `${prefix}-${current}`;
}

function getUser(state: AppState, userId: string) {
  return state.users.find((u) => u.id === userId);
}

function getWaitingItems(items: Item[], ownerId: string) {
  return items
    .filter((item) => item.ownerId === ownerId && item.state === "waiting")
    .sort((a, b) => (a.queueOrder ?? Number.MAX_SAFE_INTEGER) - (b.queueOrder ?? Number.MAX_SAFE_INTEGER));
}

function getActiveItem(items: Item[], ownerId: string) {
  return items.find((item) => item.ownerId === ownerId && item.state === "active");
}

function reindexWaiting(items: Item[], ownerId: string) {
  const waiting = getWaitingItems(items, ownerId);
  waiting.forEach((item, index) => {
    item.queueOrder = index;
  });
}

function insertWaitingOnTop(items: Item[], ownerId: string, itemId: string) {
  items.forEach((item) => {
    if (item.ownerId === ownerId && item.state === "waiting" && item.id !== itemId) {
      item.queueOrder = (item.queueOrder ?? 0) + 1;
    }
  });
  const target = items.find((item) => item.id === itemId);
  if (!target) {
    return;
  }
  target.state = "waiting";
  target.queueOrder = 0;
  delete target.completedAt;
  reindexWaiting(items, ownerId);
}

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_CURRENT_USER":
      return { ...state, currentUserId: action.userId };

    case "CREATE_ITEM": {
      const owner = getUser(state, action.ownerId);
      if (!owner) {
        return state;
      }
      const title = action.title.trim();
      if (!title) {
        return state;
      }
      const newItem: Item = {
        id: nextId("item", state.items),
        title,
        ownerId: action.ownerId,
        createdBy: action.actorId,
        state: "waiting",
        queueOrder: 0,
      };
      const items = state.items.map((item) => ({ ...item }));
      items.forEach((item) => {
        if (item.ownerId === action.ownerId && item.state === "waiting") {
          item.queueOrder = (item.queueOrder ?? 0) + 1;
        }
      });
      items.push(newItem);
      reindexWaiting(items, action.ownerId);
      return { ...state, items };
    }

    case "ADMIN_ASSIGN": {
      const assigner = getUser(state, action.assignerId);
      const assignee = getUser(state, action.assigneeId);
      if (!assigner || assigner.role !== "admin" || !assignee) {
        return state;
      }
      const title = action.title.trim();
      if (!title) {
        return state;
      }

      const newItem: Item = {
        id: nextId("item", state.items),
        title,
        ownerId: action.assigneeId,
        createdBy: action.assignerId,
        state: "pending_acceptance",
        queueOrder: null,
      };

      const assignment: Assignment = {
        id: nextId("assignment", state.assignments),
        itemId: newItem.id,
        assignerId: action.assignerId,
        assigneeId: action.assigneeId,
        status: "pending_acceptance",
        updatedAt: nowIso(),
      };

      const event: ItemEvent = {
        id: nextId("event", state.events),
        itemId: newItem.id,
        actorId: action.assignerId,
        type: "assigned",
        at: nowIso(),
      };

      return {
        ...state,
        items: [...state.items, newItem],
        assignments: [...state.assignments, assignment],
        events: [...state.events, event],
      };
    }

    case "START_FOCUS": {
      const items = state.items.map((item) => ({ ...item }));
      const actor = getUser(state, action.actorId);
      const selected = items.find((item) => item.id === action.itemId);
      if (!actor || !selected || selected.ownerId !== actor.id || selected.state !== "waiting") {
        return state;
      }

      const currentActive = items.find((item) => item.ownerId === actor.id && item.state === "active");
      selected.state = "active";
      selected.queueOrder = null;

      if (currentActive && currentActive.id !== selected.id) {
        currentActive.state = "waiting";
        currentActive.queueOrder = 0;
        items.forEach((item) => {
          if (item.ownerId === actor.id && item.state === "waiting" && item.id !== currentActive.id) {
            item.queueOrder = (item.queueOrder ?? 0) + 1;
          }
        });
      }

      reindexWaiting(items, actor.id);
      const event: ItemEvent = {
        id: nextId("event", state.events),
        itemId: selected.id,
        actorId: action.actorId,
        type: "switched",
        at: nowIso(),
      };
      return { ...state, items, events: [...state.events, event] };
    }

    case "COMPLETE_ACTIVE": {
      const actor = getUser(state, action.actorId);
      if (!actor) {
        return state;
      }
      const items = state.items.map((item) => ({ ...item }));
      const activeItem = items.find((item) => item.ownerId === actor.id && item.state === "active");
      if (!activeItem) {
        return state;
      }

      activeItem.state = "completed";
      activeItem.queueOrder = null;
      activeItem.completedAt = nowIso();

      const waiting = getWaitingItems(items, actor.id);
      const next = waiting[0];
      if (next) {
        next.state = "active";
        next.queueOrder = null;
      }
      reindexWaiting(items, actor.id);

      const event: ItemEvent = {
        id: nextId("event", state.events),
        itemId: activeItem.id,
        actorId: action.actorId,
        type: "completed",
        at: nowIso(),
      };
      return { ...state, items, events: [...state.events, event] };
    }

    case "MOVE_WAITING": {
      const actor = getUser(state, action.actorId);
      if (!actor) {
        return state;
      }
      const items = state.items.map((item) => ({ ...item }));
      const item = items.find((candidate) => candidate.id === action.itemId);
      if (!item || item.ownerId !== actor.id || item.state !== "waiting") {
        return state;
      }

      const waiting = getWaitingItems(items, actor.id);
      const index = waiting.findIndex((entry) => entry.id === item.id);
      if (index < 0) {
        return state;
      }
      const targetIndex = action.direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= waiting.length) {
        return state;
      }
      const target = waiting[targetIndex];
      const originalOrder = item.queueOrder ?? index;
      item.queueOrder = target.queueOrder ?? targetIndex;
      target.queueOrder = originalOrder;
      reindexWaiting(items, actor.id);
      return { ...state, items };
    }

    case "ACCEPT_ASSIGNMENT": {
      const actor = getUser(state, action.actorId);
      if (!actor) {
        return state;
      }

      const assignments = state.assignments.map((assignment) => ({ ...assignment }));
      const items = state.items.map((item) => ({ ...item }));
      const assignment = assignments.find((entry) => entry.id === action.assignmentId);
      if (!assignment || assignment.assigneeId !== actor.id || assignment.status !== "pending_acceptance") {
        return state;
      }
      const item = items.find((entry) => entry.id === assignment.itemId);
      if (!item || item.ownerId !== actor.id || item.state !== "pending_acceptance") {
        return state;
      }

      assignment.status = "accepted";
      assignment.updatedAt = nowIso();
      insertWaitingOnTop(items, actor.id, item.id);

      const event: ItemEvent = {
        id: nextId("event", state.events),
        itemId: item.id,
        actorId: actor.id,
        type: "accepted",
        at: nowIso(),
      };

      return { ...state, assignments, items, events: [...state.events, event] };
    }

    case "DECLINE_ASSIGNMENT": {
      const actor = getUser(state, action.actorId);
      if (!actor) {
        return state;
      }

      const assignments = state.assignments.map((assignment) => ({ ...assignment }));
      const items = state.items.map((item) => ({ ...item }));
      const assignment = assignments.find((entry) => entry.id === action.assignmentId);
      if (!assignment || assignment.assigneeId !== actor.id || assignment.status !== "pending_acceptance") {
        return state;
      }
      const item = items.find((entry) => entry.id === assignment.itemId);
      if (!item || item.ownerId !== actor.id || item.state !== "pending_acceptance") {
        return state;
      }

      assignment.status = "needs_info";
      assignment.updatedAt = nowIso();
      item.state = "needs_info";
      item.queueOrder = null;

      const event: ItemEvent = {
        id: nextId("event", state.events),
        itemId: item.id,
        actorId: actor.id,
        type: "declined",
        at: nowIso(),
      };

      return { ...state, assignments, items, events: [...state.events, event] };
    }

    default:
      return state;
  }
}

function ItemCard({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="item-card">
      <p>{title}</p>
      {right}
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function Home() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [newTitle, setNewTitle] = useState("");
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentTarget, setAssignmentTarget] = useState("user-1");

  const currentUser = useMemo(
    () => state.users.find((user) => user.id === state.currentUserId) ?? state.users[0],
    [state.currentUserId, state.users],
  );

  const myActive = useMemo(() => getActiveItem(state.items, currentUser.id), [state.items, currentUser.id]);
  const myWaiting = useMemo(() => getWaitingItems(state.items, currentUser.id), [state.items, currentUser.id]);
  const myCompleted = useMemo(
    () =>
      state.items
        .filter((item) => item.ownerId === currentUser.id && item.state === "completed")
        .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
        .slice(0, 5),
    [state.items, currentUser.id],
  );

  const myPendingAssignments = useMemo(
    () =>
      state.assignments.filter(
        (assignment) =>
          assignment.assigneeId === currentUser.id &&
          (assignment.status === "pending_acceptance" || assignment.status === "needs_info"),
      ),
    [state.assignments, currentUser.id],
  );

  const userProfiles = state.users.filter((user) => user.role === "user");

  function onCreateItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    dispatch({ type: "CREATE_ITEM", actorId: currentUser.id, ownerId: currentUser.id, title: newTitle });
    setNewTitle("");
  }

  function onCreateAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    dispatch({
      type: "ADMIN_ASSIGN",
      assignerId: currentUser.id,
      assigneeId: assignmentTarget,
      title: assignmentTitle,
    });
    setAssignmentTitle("");
  }

  return (
    <div className="page-shell">
      <header className="top-bar">
        <div>
          <h1>Brightly: Focus Queue Core</h1>
          <p>One active item. User-owned queue. Visibility without control.</p>
        </div>
        <label>
          Acting as
          <select value={currentUser.id} onChange={(event) => dispatch({ type: "SET_CURRENT_USER", userId: event.target.value })}>
            {state.users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.role})
              </option>
            ))}
          </select>
        </label>
      </header>

      <main className="layout-grid">
        <section className="panel">
          <h2>My Focus</h2>
          <p className="muted">{currentUser.name}</p>

          <div className="stack">
            <h3>Active</h3>
            {myActive ? (
              <ItemCard
                title={myActive.title}
                right={
                  <button
                    type="button"
                    className="solid"
                    onClick={() => dispatch({ type: "COMPLETE_ACTIVE", actorId: currentUser.id })}
                  >
                    Complete
                  </button>
                }
              />
            ) : (
              <p className="empty">No active item. Start focus from waiting.</p>
            )}
          </div>

          <div className="stack">
            <h3>Waiting Queue</h3>
            {myWaiting.length === 0 ? (
              <p className="empty">No waiting items.</p>
            ) : (
              myWaiting.map((item, index) => (
                <ItemCard
                  key={item.id}
                  title={`${index + 1}. ${item.title}`}
                  right={
                    <div className="actions">
                      <button type="button" onClick={() => dispatch({ type: "START_FOCUS", actorId: currentUser.id, itemId: item.id })}>
                        Start Focus
                      </button>
                      <button type="button" onClick={() => dispatch({ type: "MOVE_WAITING", actorId: currentUser.id, itemId: item.id, direction: "up" })}>
                        Up
                      </button>
                      <button
                        type="button"
                        onClick={() => dispatch({ type: "MOVE_WAITING", actorId: currentUser.id, itemId: item.id, direction: "down" })}
                      >
                        Down
                      </button>
                    </div>
                  }
                />
              ))
            )}
          </div>

          <form className="input-row" onSubmit={onCreateItem}>
            <input
              placeholder="Add a new waiting item"
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              maxLength={120}
            />
            <button type="submit" className="solid">
              Add Item
            </button>
          </form>
        </section>

        <section className="panel">
          <h2>Assignments Inbox</h2>
          {myPendingAssignments.length === 0 ? (
            <p className="empty">No pending assignments.</p>
          ) : (
            <div className="stack">
              {myPendingAssignments.map((assignment) => {
                const item = state.items.find((entry) => entry.id === assignment.itemId);
                const assigner = state.users.find((entry) => entry.id === assignment.assignerId);
                if (!item || !assigner) {
                  return null;
                }
                return (
                  <div key={assignment.id} className="inbox-card">
                    <p>{item.title}</p>
                    <span>From {assigner.name}</span>
                    <span>Status: {assignment.status}</span>
                    {assignment.status === "pending_acceptance" ? (
                      <div className="actions">
                        <button
                          type="button"
                          className="solid"
                          onClick={() => dispatch({ type: "ACCEPT_ASSIGNMENT", actorId: currentUser.id, assignmentId: assignment.id })}
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => dispatch({ type: "DECLINE_ASSIGNMENT", actorId: currentUser.id, assignmentId: assignment.id })}
                        >
                          Decline
                        </button>
                      </div>
                    ) : (
                      <span className="warn">Waiting for clarifying info from assigner.</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="stack">
            <h3>Recent Completed</h3>
            {myCompleted.length === 0 ? (
              <p className="empty">No completed history yet.</p>
            ) : (
              myCompleted.map((item) => (
                <div key={item.id} className="history-row">
                  <span>{item.title}</span>
                  <span>{item.completedAt ? formatDate(item.completedAt) : "n/a"}</span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="panel">
          <h2>Team Visibility (Admin Read-Only)</h2>
          {currentUser.role === "admin" ? (
            <>
              <form className="admin-form" onSubmit={onCreateAssignment}>
                <h3>Create Assignment</h3>
                <label>
                  Assignee
                  <select value={assignmentTarget} onChange={(event) => setAssignmentTarget(event.target.value)}>
                    {userProfiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Item title
                  <input
                    placeholder="Assignment title"
                    value={assignmentTitle}
                    onChange={(event) => setAssignmentTitle(event.target.value)}
                    maxLength={120}
                  />
                </label>
                <button type="submit" className="solid">
                  Assign
                </button>
              </form>

              <div className="stack">
                {userProfiles.map((profile) => {
                  const active = getActiveItem(state.items, profile.id);
                  const waiting = getWaitingItems(state.items, profile.id);
                  const completed = state.items
                    .filter((item) => item.ownerId === profile.id && item.state === "completed")
                    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
                    .slice(0, 3);

                  return (
                    <div key={profile.id} className="visibility-card">
                      <h3>{profile.name}</h3>
                      <p>
                        <strong>Active:</strong> {active ? active.title : "None"}
                      </p>
                      <p>
                        <strong>Waiting:</strong> {waiting.length === 0 ? "None" : waiting.map((item) => item.title).join(" | ")}
                      </p>
                      <p>
                        <strong>Recent Completed:</strong>{" "}
                        {completed.length === 0 ? "None" : completed.map((item) => item.title).join(" | ")}
                      </p>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="empty">Read-only team visibility is available only while acting as an admin.</p>
          )}
        </section>
      </main>
    </div>
  );
}
