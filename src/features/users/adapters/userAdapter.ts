export type DbUser = {
  id: string
  name?: string | null
  role?: string | null
  full_name?: string | null
  display_name?: string | null
  email?: string | null
  [key: string]: unknown
}

export type UserView = {
  id: string
  name: string
  role: string | null
}

export function toUserView(user: DbUser): UserView {
  const candidate = user.name ?? user.full_name ?? user.display_name ?? user.email
  const displayName =
    typeof candidate === "string" && candidate.trim() ? candidate.trim() : user.id

  return {
    id: user.id,
    name: displayName,
    role: typeof user.role === "string" ? user.role : null,
  }
}
