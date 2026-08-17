import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { apiFetch } from '../../lib/api'
import type { ApplicationStatus } from './status'

export type Company = {
  id: number
  name: string
  website: string | null
  notes: string | null
}

export type Application = {
  id: number
  title: string
  status: ApplicationStatus
  applied_at: string | null
  source_url: string | null
  notes: string | null
  company?: Company
  /** When the status last moved. Null only for rows with no audit trail. */
  status_changed_at?: string | null
  created_at: string
  updated_at: string
}

export type PaginationMeta = {
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number | null
  to: number | null
}

type ApplicationsResponse = {
  data: Application[]
  meta: PaginationMeta
}

/**
 * Filters map one-to-one onto the API's query parameters.
 *
 * Filtering, sorting and pagination are all server-side, so this object is the
 * whole query -- there is no client-side narrowing to keep in step with it, and
 * the list stays correct once it is longer than a page.
 */
export type ApplicationFilters = {
  status?: string
  company_id?: string
  search?: string
  sort?: string
  direction?: string
  page?: string
}

/** Single source of truth for cache keys, so invalidation cannot drift. */
export const applicationKeys = {
  all: ['applications'] as const,
  list: (filters: ApplicationFilters) => ['applications', 'list', filters] as const,
}

function toQueryString(filters: ApplicationFilters): string {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(filters)) {
    // An empty string is "no filter", not "match empty" -- sending it would
    // make the API search for nothing and return nothing.
    if (value) {
      params.set(key, value)
    }
  }

  const query = params.toString()

  return query ? `?${query}` : ''
}

export function useApplications(filters: ApplicationFilters) {
  return useQuery({
    queryKey: applicationKeys.list(filters),
    queryFn: () => apiFetch<ApplicationsResponse>(`/applications${toQueryString(filters)}`),
    // Every filter change is a new cache key. Without this the table would
    // blank out and the layout would jump on each keystroke of the search box;
    // holding the previous page keeps the list readable while the next loads.
    placeholderData: keepPreviousData,
  })
}
