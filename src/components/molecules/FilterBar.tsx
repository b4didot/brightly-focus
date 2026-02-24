import { InputField, Label } from "@/components/atoms"
import type { FilterOption, SortingOption } from "@/types"
import styles from "./molecules.module.css"

interface FilterBarProps {
  filters: FilterOption[]
  sorting?: SortingOption[]
  selectedFilterId?: string
  selectedSortingId?: string
}

export function FilterBar({
  filters,
  sorting,
  selectedFilterId,
  selectedSortingId,
}: FilterBarProps) {
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
    </div>
  )
}
