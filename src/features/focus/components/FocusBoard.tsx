import type { FocusRouteData } from "../types/viewModels"
import {
  acceptItemAction,
  activateItemAction,
  completeItemAction,
  createUserItemAction,
  reorderWaitingItemAction,
} from "../actions/focusActions"
import { deleteItemAction } from "../../items/actions/itemDeleteActions"

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function FocusBoard({ data }: { data: FocusRouteData }) {
  return (
    <div className="page-shell">
      <header className="top-bar">
        <div>
          <h1>Brightly: Focus</h1>
          <p>Execution state changes are enforced through the Focus Engine.</p>
        </div>
        <form method="get">
          <label>
            Acting as
            <select name="userId" defaultValue={data.selectedUserId ?? ""}>
              {data.users.length === 0 ? (
                <option value="">No users found</option>
              ) : (
                data.users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                    {user.role ? ` (${user.role})` : ""}
                  </option>
                ))
              )}
            </select>
          </label>
          <button type="submit" className="solid" style={{ marginTop: "0.5rem" }}>
            Switch
          </button>
        </form>
      </header>

      <main className="layout-grid">
        <section className="panel">
          <h2>My Focus</h2>
          <p className="muted">{data.selectedUser?.name ?? "No user selected"}</p>

          <div className="stack">
            <h3>Active</h3>
            {data.activeItem ? (
              <div className="item-card">
                <p>{data.activeItem.title}</p>
                <form action={completeItemAction}>
                  <input type="hidden" name="userId" value={data.selectedUserId ?? ""} />
                  <input type="hidden" name="itemId" value={data.activeItem.id} />
                  <button type="submit" className="solid">
                    Complete
                  </button>
                </form>
              </div>
            ) : (
              <p className="empty">No active item.</p>
            )}
          </div>

          <div className="stack">
            <h3>Offered</h3>
            {data.offeredItems.length === 0 ? (
              <p className="empty">No offered items.</p>
            ) : (
              data.offeredItems.map((item) => (
                <div key={item.id} className="item-card">
                  <p>{item.title}</p>
                  <form action={acceptItemAction}>
                    <input type="hidden" name="userId" value={data.selectedUserId ?? ""} />
                    <input type="hidden" name="itemId" value={item.id} />
                    <button type="submit">Accept</button>
                  </form>
                  <form action={deleteItemAction}>
                    <input type="hidden" name="actingUserId" value={data.selectedUserId ?? ""} />
                    <input type="hidden" name="itemId" value={item.id} />
                    <button type="submit">Delete</button>
                  </form>
                </div>
              ))
            )}
          </div>

          <div className="stack">
            <h3>Waiting Queue</h3>
            {data.waitingItems.length === 0 ? (
              <p className="empty">No waiting items.</p>
            ) : (
              data.waitingItems.map((item, index) => (
                <div key={item.id} className="item-card">
                  <p>
                    {index + 1}. {item.title}
                  </p>
                  <div className="actions">
                    <form action={activateItemAction}>
                      <input type="hidden" name="userId" value={data.selectedUserId ?? ""} />
                      <input type="hidden" name="itemId" value={item.id} />
                      <button type="submit">Start Focus</button>
                    </form>
                    <form action={reorderWaitingItemAction}>
                      <input type="hidden" name="userId" value={data.selectedUserId ?? ""} />
                      <input type="hidden" name="itemId" value={item.id} />
                      <input type="hidden" name="direction" value="up" />
                      <button type="submit" disabled={index === 0}>
                        Up
                      </button>
                    </form>
                    <form action={reorderWaitingItemAction}>
                      <input type="hidden" name="userId" value={data.selectedUserId ?? ""} />
                      <input type="hidden" name="itemId" value={item.id} />
                      <input type="hidden" name="direction" value="down" />
                      <button type="submit" disabled={index === data.waitingItems.length - 1}>
                        Down
                      </button>
                    </form>
                    <form action={deleteItemAction}>
                      <input type="hidden" name="actingUserId" value={data.selectedUserId ?? ""} />
                      <input type="hidden" name="itemId" value={item.id} />
                      <button type="submit">Delete</button>
                    </form>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="stack">
            <h3>Create Item</h3>
            <p className="empty">New items are added to the top of your waiting queue.</p>
            <form action={createUserItemAction} className="stack">
              <input type="hidden" name="userId" value={data.selectedUserId ?? ""} />
              <input type="text" name="title" placeholder="Item title" maxLength={160} required />
              <textarea
                name="description"
                placeholder="Description (optional)"
                rows={3}
                maxLength={1000}
                style={{
                  resize: "vertical",
                  border: "1px solid var(--line)",
                  borderRadius: "0.6rem",
                  background: "var(--surface)",
                  color: "var(--ink)",
                  padding: "0.55rem 0.7rem",
                }}
              />
              <button type="submit" className="solid" disabled={!data.selectedUserId}>
                Add to Waiting
              </button>
            </form>
          </div>
        </section>

        <section className="panel">
          <h2>Recent Completed</h2>
          <p className="muted">Latest completed items for selected user</p>
          <div className="stack">
            {data.completedItems.length === 0 ? (
              <p className="empty">No completed history yet.</p>
            ) : (
              data.completedItems.map((item) => (
                <div key={item.id} className="history-row">
                  <span>{item.title}</span>
                  <span>{item.completedAt ? formatDate(item.completedAt) : "n/a"}</span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="panel">
          <h2>Navigation</h2>
          <div className="stack">
            <a href={`/team${data.selectedUserId ? `?userId=${encodeURIComponent(data.selectedUserId)}` : ""}`}>
              Team Visibility
            </a>
            <a
              href={`/projects${data.selectedUserId ? `?userId=${encodeURIComponent(data.selectedUserId)}` : ""}`}
            >
              Projects
            </a>
            <a
              href={`/milestones${data.selectedUserId ? `?userId=${encodeURIComponent(data.selectedUserId)}` : ""}`}
            >
              Milestones
            </a>
            <a
              href={`/history${data.selectedUserId ? `?userId=${encodeURIComponent(data.selectedUserId)}` : ""}`}
            >
              History
            </a>
          </div>
        </section>
      </main>
    </div>
  )
}
