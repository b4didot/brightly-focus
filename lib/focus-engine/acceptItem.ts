type FocusItem = {
  id: string
  state: string
  execution_owner_id: string
  waiting_position: number | null
  [key: string]: unknown
}

type SupabaseQueryResult<T> = {
  data: T | null
  error: { message: string } | null
}

type SupabaseClientLike = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: unknown) => unknown
      order: (column: string, options?: { ascending?: boolean }) => unknown
      limit: (count: number) => unknown
      maybeSingle: () => Promise<SupabaseQueryResult<FocusItem>>
    }
    update: (values: Record<string, unknown>) => {
      eq: (column: string, value: unknown) => {
        eq: (column: string, value: unknown) => {
          select: (columns: string) => {
            maybeSingle: () => Promise<SupabaseQueryResult<FocusItem>>
          }
        }
      }
    }
  }
}

type TransactionRunner = <T>(
  callback: (client: SupabaseClientLike) => Promise<T>
) => Promise<T>

type SupabaseModuleLike = {
  withTransaction?: TransactionRunner
  runInTransaction?: TransactionRunner
  getSupabaseServerClient?: () => SupabaseClientLike
  createServerClient?: () => SupabaseClientLike
  createClient?: () => SupabaseClientLike
  supabase?: SupabaseClientLike
  client?: SupabaseClientLike
}

const SERVER_CLIENT_MODULE_CANDIDATES = [
  "../supabase/server",
  "../../src/lib/supabase/server",
  "../../lib/supabase/server",
  "../supabase/client",
  "../../src/lib/supabase/client",
  "../../lib/supabase/client",
]

async function loadSupabaseModule(): Promise<SupabaseModuleLike> {
  for (const candidate of SERVER_CLIENT_MODULE_CANDIDATES) {
    try {
      const loaded = (await import(candidate)) as SupabaseModuleLike
      return loaded
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error(
    "Supabase server client utility was not found. Expected a module such as src/lib/supabase/server."
  )
}

function resolveSupabaseClient(mod: SupabaseModuleLike): SupabaseClientLike {
  if (mod.getSupabaseServerClient) {
    return mod.getSupabaseServerClient()
  }

  if (mod.createServerClient) {
    return mod.createServerClient()
  }

  if (mod.createClient) {
    return mod.createClient()
  }

  if (mod.supabase) {
    return mod.supabase
  }

  if (mod.client) {
    return mod.client
  }

  throw new Error(
    "No Supabase client export found. Expected getSupabaseServerClient, createServerClient, createClient, supabase, or client."
  )
}

function resolveTransactionRunner(
  mod: SupabaseModuleLike,
  client: SupabaseClientLike
): TransactionRunner {
  if (!client || typeof client.from !== "function") {
    throw new Error("Supabase client is invalid or missing the query interface.")
  }

  if (mod.withTransaction) {
    return mod.withTransaction
  }

  if (mod.runInTransaction) {
    return mod.runInTransaction
  }

  throw new Error(
    "No transaction helper export found. acceptItem requires withTransaction or runInTransaction from your Supabase server utility."
  )
}

function requireString(value: string, fieldName: string): string {
  if (!value || typeof value !== "string") {
    throw new Error(`${fieldName} is required and must be a non-empty string.`)
  }

  return value
}

export async function acceptItem({
  itemId,
  userId,
}: {
  itemId: string
  userId: string
}) {
  const normalizedItemId = requireString(itemId, "itemId")
  const normalizedUserId = requireString(userId, "userId")

  const supabaseModule = await loadSupabaseModule()
  const supabaseClient = resolveSupabaseClient(supabaseModule)
  const withTransaction = resolveTransactionRunner(supabaseModule, supabaseClient)

  return withTransaction(async (tx) => {
    const itemQuery = tx.from("items").select("*").eq("id", normalizedItemId)
    const itemResult = await (itemQuery as { maybeSingle: () => Promise<SupabaseQueryResult<FocusItem>> }).maybeSingle()

    if (itemResult.error) {
      throw new Error(`Failed to load item "${normalizedItemId}": ${itemResult.error.message}`)
    }

    const item = itemResult.data

    if (!item) {
      throw new Error(`Item "${normalizedItemId}" does not exist.`)
    }

    if (item.state !== "offered") {
      throw new Error(
        `Illegal transition for item "${normalizedItemId}": expected state "offered" but found "${item.state}".`
      )
    }

    if (item.execution_owner_id !== normalizedUserId) {
      throw new Error(
        `Item "${normalizedItemId}" is owned by "${item.execution_owner_id}", not "${normalizedUserId}".`
      )
    }

    const waitingQuery = tx
      .from("items")
      .select("waiting_position")
      .eq("execution_owner_id", normalizedUserId)
      .eq("state", "waiting")
      .order("waiting_position", { ascending: false })
      .limit(1)

    const waitingResult = await (waitingQuery as {
      maybeSingle: () => Promise<SupabaseQueryResult<Pick<FocusItem, "waiting_position">>>
    }).maybeSingle()

    if (waitingResult.error) {
      throw new Error(
        `Failed to determine next waiting position for user "${normalizedUserId}": ${waitingResult.error.message}`
      )
    }

    const currentMax = waitingResult.data?.waiting_position ?? 0
    const nextWaitingPosition = currentMax + 1

    const updateResult = await tx
      .from("items")
      .update({
        state: "waiting",
        waiting_position: nextWaitingPosition,
      })
      .eq("id", normalizedItemId)
      .eq("state", "offered")
      .eq("execution_owner_id", normalizedUserId)
      .select("*")
      .maybeSingle()

    if (updateResult.error) {
      throw new Error(
        `Failed to accept item "${normalizedItemId}": ${updateResult.error.message}`
      )
    }

    if (!updateResult.data) {
      throw new Error(
        `Item "${normalizedItemId}" could not be accepted because its state or ownership changed during the transaction.`
      )
    }

    return updateResult.data
  })
}
