/**
 * The table's columns, and which of them the API can actually sort by.
 *
 * `sortKey` is deliberately absent where the server has no matching sort:
 * `company` is a joined name and `status_changed_at` is a relation, and
 * neither is in the endpoint's sort allow-list. Rendering a sort affordance
 * that silently does nothing is worse than not offering one.
 */
export type Column = {
  key: string
  label: string
  sortKey?: string
  /** Right-aligned figures, so they line up down the column. */
  numeric?: boolean
}

export const COLUMNS: Column[] = [
  { key: 'company', label: 'Company' },
  { key: 'title', label: 'Role', sortKey: 'title' },
  { key: 'status', label: 'Status', sortKey: 'status' },
  { key: 'applied_at', label: 'Applied', sortKey: 'applied_at', numeric: true },
  { key: 'status_changed_at', label: 'Last moved', numeric: true },
]

export const DEFAULT_SORT = 'applied_at'
export const DEFAULT_DIRECTION = 'desc'
