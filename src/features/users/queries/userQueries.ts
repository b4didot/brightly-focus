import { getSupabaseServerClient } from "../../../../lib/supabase/server"
import { toUserView, type DbUser } from "../adapters/userAdapter"

export async function getUsers() {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase.from("users").select("*")

  if (error) {
    throw new Error(`Failed to load users: ${error.message}`)
  }

  return ((data ?? []) as DbUser[]).map(toUserView).sort((a, b) => a.name.localeCompare(b.name))
}
