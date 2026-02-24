export type DbUser = {
  id: string
  first_name?: string | null
  last_name?: string | null
  email_address?: string | null
  mobile_number?: string | null
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
  firstName: string | null
  lastName: string | null
  emailAddress: string | null
  mobileNumber: string | null
  role: string | null
}

export function toUserView(user: DbUser): UserView {
  const combinedName =
    [user.first_name?.trim(), user.last_name?.trim()].filter(Boolean).join(" ").trim() || null
  const candidate = user.name ?? user.full_name ?? user.display_name ?? user.email
  const displayName =
    combinedName ??
    (typeof candidate === "string" && candidate.trim() ? candidate.trim() : user.id)

  return {
    id: user.id,
    name: displayName,
    firstName: user.first_name?.trim() || null,
    lastName: user.last_name?.trim() || null,
    emailAddress: user.email_address?.trim() || null,
    mobileNumber: user.mobile_number?.trim() || null,
    role: typeof user.role === "string" ? user.role : null,
  }
}
