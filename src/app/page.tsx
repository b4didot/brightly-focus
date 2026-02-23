import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { acceptItem } from "../../lib/focus-engine/acceptItem";
import { activateItem } from "../../lib/focus-engine/activateItem";
import { completeItem } from "../../lib/focus-engine/completeItem";
import { reorderWaitingItem } from "../../lib/focus-engine/reorderWaitingItem";
import { getSupabaseServerClient } from "../../lib/supabase/server";

type SearchParams = {
  userId?: string;
};

type DbUser = {
  id: string;
  name?: string | null;
  role?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  email?: string | null;
  [key: string]: unknown;
};

type DbItem = {
  id: string;
  title?: string | null;
  state?: string | null;
  execution_owner_id?: string | null;
  owner_id?: string | null;
  user_id?: string | null;
  waiting_position?: number | null;
  queue_order?: number | null;
  completed_at?: string | null;
  completedAt?: string | null;
  [key: string]: unknown;
};

function asDisplayName(user: DbUser) {
  const candidate =
    user.name ??
    user.full_name ??
    user.display_name ??
    user.email;

  return typeof candidate === "string" && candidate.trim() ? candidate.trim() : user.id;
}

function asItemTitle(item: DbItem) {
  return item.title?.trim() || `Item ${item.id}`;
}

function getItemOwnerId(item: DbItem) {
  return item.execution_owner_id ?? item.owner_id ?? item.user_id ?? null;
}

function getItemState(item: DbItem) {
  return item.state ?? null;
}

function getItemWaitingPosition(item: DbItem) {
  return item.waiting_position ?? item.queue_order ?? null;
}

function getItemCompletedAt(item: DbItem) {
  return item.completed_at ?? item.completedAt ?? null;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function sortByCompletedAtDesc(items: DbItem[]) {
  return [...items].sort((a, b) => {
    const left = getItemCompletedAt(a) ?? "";
    const right = getItemCompletedAt(b) ?? "";
    return right.localeCompare(left);
  });
}

function toFocusRedirectPath(userId: string) {
  return `/?userId=${encodeURIComponent(userId)}`;
}

async function acceptItemAction(formData: FormData) {
  "use server";

  const userId = String(formData.get("userId") ?? "").trim();
  const itemId = String(formData.get("itemId") ?? "").trim();

  await acceptItem({ itemId, userId });
  revalidatePath("/");
  redirect(toFocusRedirectPath(userId));
}

async function activateItemAction(formData: FormData) {
  "use server";

  const userId = String(formData.get("userId") ?? "").trim();
  const itemId = String(formData.get("itemId") ?? "").trim();

  await activateItem({ itemId, userId });
  revalidatePath("/");
  redirect(toFocusRedirectPath(userId));
}

async function completeItemAction(formData: FormData) {
  "use server";

  const userId = String(formData.get("userId") ?? "").trim();
  const itemId = String(formData.get("itemId") ?? "").trim();

  await completeItem({ itemId, userId });
  revalidatePath("/");
  redirect(toFocusRedirectPath(userId));
}

async function reorderWaitingItemAction(formData: FormData) {
  "use server";

  const userId = String(formData.get("userId") ?? "").trim();
  const itemId = String(formData.get("itemId") ?? "").trim();
  const direction = String(formData.get("direction") ?? "").trim();

  await reorderWaitingItem({
    itemId,
    userId,
    direction: direction as "up" | "down",
  });
  revalidatePath("/");
  redirect(toFocusRedirectPath(userId));
}

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const supabase = getSupabaseServerClient();

  const { data: usersData, error: usersError } = await supabase
    .from("users")
    .select("*");

  if (usersError) {
    throw new Error(`Failed to load users: ${usersError.message}`);
  }

  const users = ((usersData ?? []) as DbUser[]).sort((a, b) => asDisplayName(a).localeCompare(asDisplayName(b)));
  const selectedUserId = params.userId && users.some((user) => user.id === params.userId) ? params.userId : users[0]?.id;

  const { data: itemsData, error: itemsError } = await supabase
    .from("items")
    .select("*");

  if (itemsError) {
    throw new Error(`Failed to load items: ${itemsError.message}`);
  }

  const items = (itemsData ?? []) as DbItem[];
  const selectedUser = users.find((user) => user.id === selectedUserId) ?? null;

  const selectedItems = selectedUserId
    ? items.filter((item) => getItemOwnerId(item) === selectedUserId)
    : [];

  const activeItem = selectedItems.find((item) => getItemState(item) === "active") ?? null;
  const offeredItems = [...selectedItems]
    .filter((item) => getItemState(item) === "offered")
    .sort(
      (a, b) =>
        (getItemWaitingPosition(a) ?? Number.MAX_SAFE_INTEGER) -
        (getItemWaitingPosition(b) ?? Number.MAX_SAFE_INTEGER)
    );
  const waitingItems = [...selectedItems]
    .filter((item) => getItemState(item) === "waiting")
    .sort(
      (a, b) =>
        (getItemWaitingPosition(a) ?? Number.MAX_SAFE_INTEGER) -
        (getItemWaitingPosition(b) ?? Number.MAX_SAFE_INTEGER)
    );
  const completedItems = sortByCompletedAtDesc(
    selectedItems.filter((item) => getItemState(item) === "completed")
  ).slice(0, 5);

  const teamProfiles = users.filter((user) => user.role !== "admin");

  return (
    <div className="page-shell">
      <header className="top-bar">
        <div>
          <h1>Brightly: Focus Queue Core</h1>
          <p>DB-backed view with live state transitions via Focus Engine.</p>
        </div>
        <form method="get">
          <label>
            Acting as
            <select name="userId" defaultValue={selectedUserId}>
              {users.length === 0 ? (
                <option value="">No users found</option>
              ) : (
                users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {asDisplayName(user)}
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
          <p className="muted">{selectedUser ? asDisplayName(selectedUser) : "No user selected"}</p>

          <div className="stack">
            <h3>Active</h3>
            {activeItem ? (
              <div className="item-card">
                <p>{asItemTitle(activeItem)}</p>
                <form action={completeItemAction}>
                  <input type="hidden" name="userId" value={selectedUserId ?? ""} />
                  <input type="hidden" name="itemId" value={activeItem.id} />
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
            {offeredItems.length === 0 ? (
              <p className="empty">No offered items.</p>
            ) : (
              offeredItems.map((item) => (
                <div key={item.id} className="item-card">
                  <p>{asItemTitle(item)}</p>
                  <form action={acceptItemAction}>
                    <input type="hidden" name="userId" value={selectedUserId ?? ""} />
                    <input type="hidden" name="itemId" value={item.id} />
                    <button type="submit">Accept</button>
                  </form>
                </div>
              ))
            )}
          </div>

          <div className="stack">
            <h3>Waiting Queue</h3>
            {waitingItems.length === 0 ? (
              <p className="empty">No waiting items.</p>
            ) : (
              waitingItems.map((item, index) => (
                <div key={item.id} className="item-card">
                  <p>
                    {index + 1}. {asItemTitle(item)}
                  </p>
                  <div className="actions">
                    <form action={activateItemAction}>
                      <input type="hidden" name="userId" value={selectedUserId ?? ""} />
                      <input type="hidden" name="itemId" value={item.id} />
                      <button type="submit">Start Focus</button>
                    </form>
                    <form action={reorderWaitingItemAction}>
                      <input type="hidden" name="userId" value={selectedUserId ?? ""} />
                      <input type="hidden" name="itemId" value={item.id} />
                      <input type="hidden" name="direction" value="up" />
                      <button type="submit" disabled={index === 0}>
                        Up
                      </button>
                    </form>
                    <form action={reorderWaitingItemAction}>
                      <input type="hidden" name="userId" value={selectedUserId ?? ""} />
                      <input type="hidden" name="itemId" value={item.id} />
                      <input type="hidden" name="direction" value="down" />
                      <button type="submit" disabled={index === waitingItems.length - 1}>
                        Down
                      </button>
                    </form>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="panel">
          <h2>Recent Completed</h2>
          <p className="muted">Latest completed items for selected user</p>
          <div className="stack">
            {completedItems.length === 0 ? (
              <p className="empty">No completed history yet.</p>
            ) : (
              completedItems.map((item) => (
                <div key={item.id} className="history-row">
                  <span>{asItemTitle(item)}</span>
                  <span>
                    {getItemCompletedAt(item) ? formatDate(getItemCompletedAt(item) as string) : "n/a"}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="panel">
          <h2>Team Visibility (Read-Only)</h2>
          {teamProfiles.length === 0 ? (
            <p className="empty">No user profiles found.</p>
          ) : (
            <div className="stack">
              {teamProfiles.map((profile) => {
                const profileItems = items.filter((item) => getItemOwnerId(item) === profile.id);
                const profileActive = profileItems.find((item) => getItemState(item) === "active");
                const profileWaiting = [...profileItems]
                  .filter((item) => getItemState(item) === "waiting")
                  .sort(
                    (a, b) =>
                      (getItemWaitingPosition(a) ?? Number.MAX_SAFE_INTEGER) -
                      (getItemWaitingPosition(b) ?? Number.MAX_SAFE_INTEGER)
                  );
                const profileCompleted = sortByCompletedAtDesc(
                  profileItems.filter((item) => getItemState(item) === "completed")
                ).slice(0, 3);

                return (
                  <div key={profile.id} className="visibility-card">
                    <h3>{asDisplayName(profile)}</h3>
                    <p>
                      <strong>Active:</strong> {profileActive ? asItemTitle(profileActive) : "None"}
                    </p>
                    <p>
                      <strong>Waiting:</strong>{" "}
                      {profileWaiting.length === 0
                        ? "None"
                        : profileWaiting.map((item) => asItemTitle(item)).join(" | ")}
                    </p>
                    <p>
                      <strong>Recent Completed:</strong>{" "}
                      {profileCompleted.length === 0
                        ? "None"
                        : profileCompleted.map((item) => asItemTitle(item)).join(" | ")}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
