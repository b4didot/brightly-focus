import { createClient } from "@supabase/supabase-js"

type SupabaseQueryCounter = {
  onRequest: (url: string) => void
}

export function getSupabaseServerClient(options?: { queryCounter?: SupabaseQueryCounter }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable.")
  }

  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable.")
  }

  const queryCounter = options?.queryCounter
  const customFetch: typeof fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
    queryCounter?.onRequest(url)
    return fetch(input, init)
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    global: {
      fetch: customFetch,
    },
  })
}
