import Link from "next/link"
import type { ItemView } from "../../items/adapters/itemAdapter"
import type { UserView } from "../../users/adapters/userAdapter"

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function HistoryBoard({
  users,
  selectedUserId,
  items,
}: {
  users: UserView[]
  selectedUserId: string | null
  items: ItemView[]
}) {
  return (
    <div className="page-shell">
      <header className="top-bar">
        <div>
          <h1>Brightly: History</h1>
          <p>Completed items feed per user.</p>
        </div>
        <Link href="/focus">Back to Focus</Link>
      </header>

      <main className="layout-grid">
        <section className="panel" style={{ gridColumn: "1 / -1" }}>
          <form method="get">
            <label>
              User
              <select name="userId" defaultValue={selectedUserId ?? ""}>
                {users.length === 0 ? (
                  <option value="">No users found</option>
                ) : (
                  users.map((user) => (
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

          <h2>Completed Items</h2>
          {items.length === 0 ? (
            <p className="empty">No completed items for this user.</p>
          ) : (
            <div className="stack">
              {items.map((item) => (
                <div key={item.id} className="history-row">
                  <span>{item.title}</span>
                  <span>{item.completedAt ? formatDate(item.completedAt) : "n/a"}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
