import type { ItemView } from "../../items/adapters/itemAdapter"
import type { UserView } from "../../users/adapters/userAdapter"

export type FocusRouteData = {
  users: UserView[]
  selectedUserId: string | null
  selectedUser: UserView | null
  activeItem: ItemView | null
  offeredItems: ItemView[]
  waitingItems: ItemView[]
  completedItems: ItemView[]
}

export type EnrichedItemData = {
  itemId: string
  projectName?: string
  milestoneName?: string
  tags: string[]
  stepsCount: number
  alarmLabel?: string
}
