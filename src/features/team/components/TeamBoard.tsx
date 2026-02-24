import Link from "next/link"
import type { ItemView } from "../../items/adapters/itemAdapter"
import type { UserView } from "../../users/adapters/userAdapter"

export function TeamBoard({
  users,
  items,
}: {
  users: UserView[]
  items: ItemView[]
}) {
  const teamProfiles = users.filter((user) => user.role !== "admin")

  return (
    <div className="page-shell">
      <header className="top-bar">
        <div>
          <h1>Brightly: Team Visibility</h1>
          <p>Read-only visibility into team focus state.</p>
        </div>
        <Link href="/focus">Back to Focus</Link>
      </header>

      <main className="layout-grid">
        <section className="panel" style={{ gridColumn: "1 / -1" }}>
          <h2>Team Visibility (Read-Only)</h2>
          {teamProfiles.length === 0 ? (
            <p className="empty">No user profiles found.</p>
          ) : (
            <div className="stack">
              {teamProfiles.map((profile) => {
                const profileItems = items.filter((item) => item.ownerId === profile.id)
                const active = profileItems.find((item) => item.state === "active")
                const waiting = [...profileItems]
                  .filter((item) => item.state === "waiting")
                  .sort(
                    (a, b) =>
                      (a.waitingPosition ?? Number.MAX_SAFE_INTEGER) -
                      (b.waitingPosition ?? Number.MAX_SAFE_INTEGER)
                  )
                const completed = [...profileItems]
                  .filter((item) => item.state === "completed")
                  .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
                  .slice(0, 5)

                return (
                  <div key={profile.id} className="visibility-card">
                    <h3>{profile.name}</h3>
                    <p>
                      <strong>Active:</strong> {active ? active.title : "None"}
                    </p>
                    <p>
                      <strong>Waiting:</strong>{" "}
                      {waiting.length === 0 ? "None" : waiting.map((item) => item.title).join(" | ")}
                    </p>
                    <p>
                      <strong>Recent Completed:</strong>{" "}
                      {completed.length === 0
                        ? "None"
                        : completed.map((item) => item.title).join(" | ")}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
