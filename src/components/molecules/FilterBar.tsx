"use client"

import { useState } from "react"
import { Button, InputField, Label } from "@/components/atoms"
import type { FilterOption, SortingOption } from "@/types"
import styles from "./molecules.module.css"

type AddItemAction = (formData: FormData) => void | Promise<void>

interface AddItemConfig {
  userId: string | null
  action?: AddItemAction
}

interface FilterBarProps {
  filters: FilterOption[]
  sorting?: SortingOption[]
  selectedFilterId?: string
  selectedSortingId?: string
  addItem?: AddItemConfig
}

export function FilterBar({
  filters,
  sorting,
  selectedFilterId,
  selectedSortingId,
  addItem,
}: FilterBarProps) {
  const [isAddOpen, setIsAddOpen] = useState(false)
  const filterValue = selectedFilterId ?? filters[0]?.id ?? ""
  const sortingValue = selectedSortingId ?? sorting?.[0]?.id ?? ""

  return (
    <div className={styles.filterBar}>
      <div className={styles.filterGroup}>
        <Label text="Filters" />
        <InputField
          value={filterValue}
          options={filters}
          ariaLabel="Filters"
        />
      </div>
      {sorting && sorting.length > 0 ? (
        <div className={styles.filterGroup}>
          <Label text="Sorting" />
          <InputField
            value={sortingValue}
            options={sorting}
            ariaLabel="Sorting"
          />
        </div>
      ) : null}
      {addItem ? (
        <div className={styles.addArea}>
          <Button label={isAddOpen ? "Close" : "Add"} variant="secondary" onClick={() => setIsAddOpen((value) => !value)} />
          {isAddOpen ? (
            <div className={styles.addPopCard}>
              <h4 className={styles.popTitle}>Add Item</h4>
              <form action={addItem.action} className={styles.popForm}>
                <input type="hidden" name="userId" value={addItem.userId ?? ""} />
                <label className={styles.fieldLabel}>
                  Title
                  <input className={styles.popInput} name="title" maxLength={160} required />
                </label>
                <label className={styles.fieldLabel}>
                  Description
                  <textarea className={styles.popInput} name="description" rows={3} maxLength={1000} />
                </label>
                <div className={styles.popActions}>
                  <Button label="Cancel" variant="secondary" onClick={() => setIsAddOpen(false)} />
                  <Button label="Create" type="submit" disabled={!addItem.userId} />
                </div>
              </form>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
