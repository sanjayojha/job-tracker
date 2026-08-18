import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
  /** The full trail, oldest first. Only the show endpoint loads it. */
  status_history?: StatusHistoryEntry[]
  created_at: string
  updated_at: string
}

/** One row of the audit trail. `from_status` is null on the opening row. */
export type StatusHistoryEntry = {
  id: number
  from_status: ApplicationStatus | null
  to_status: ApplicationStatus
  note: string | null
  created_at: string
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
  detail: (id: number) => ['applications', 'detail', id] as const,
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

/**
 * One application with its company and full status history. This is the only
 * endpoint that returns the trail, so it is the only place the audit view can
 * be built from.
 */
export function useApplication(id: number) {
  return useQuery({
    queryKey: applicationKeys.detail(id),
    queryFn: async () => {
      const { data } = await apiFetch<{ data: Application }>(`/applications/${id}`)
      return data
    },
  })
}

/**
 * Moves an application to another stage.
 *
 * This is the only way to change a status over HTTP -- the resource PATCH
 * refuses a `status` key -- so every move made here is recorded in the trail.
 * A move to the stage already held answers 422; the caller renders that
 * message rather than treating it as a failure of the request.
 */
export function useChangeStatus(id: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ status, note }: { status: ApplicationStatus; note?: string }) => {
      const { data } = await apiFetch<{ data: Application }>(`/applications/${id}/status`, {
        method: 'POST',
        body: note ? { status, note } : { status },
      })
      return data
    },
    onSuccess: (application) => {
      // The response already carries the new state and the appended trail, so
      // write it straight into the detail cache instead of refetching what was
      // just returned.
      queryClient.setQueryData(applicationKeys.detail(id), application)

      // The lists are a different matter: a status change moves this row
      // between filtered views and changes its "last moved" column, and the
      // dashboard aggregates it feeds are cached in Redis server-side.
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[1] === 'list',
      })
    },
  })
}

/**
 * Updates an application's fields.
 *
 * The body is only what changed -- see `changedFields`. A `status` key would
 * be rejected with a 422 naming the status endpoint, which is the point: the
 * audit trail cannot be bypassed by a field edit.
 */
export function useUpdateApplication(id: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (changes: Record<string, unknown>) => {
      const { data } = await apiFetch<{ data: Application }>(`/applications/${id}`, {
        method: 'PATCH',
        body: changes,
      })
      return data
    },
    onSuccess: (application) => {
      // PATCH does not load the status history, so writing the response
      // straight into the detail cache would blank the trail the screen is
      // showing. Keep the history that is already cached.
      queryClient.setQueryData<Application>(applicationKeys.detail(id), (current) => ({
        ...application,
        status_history: application.status_history ?? current?.status_history,
      }))

      // A retitled or recompanied application belongs in different filtered
      // and sorted views than it did a moment ago.
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[1] === 'list',
      })
    },
  })
}

/**
 * What the create form sends. Only `company_id` and `title` are required --
 * the 30-second rule is enforced by the shape of this type, not by hoping the
 * form stays short.
 */
export type NewApplication = {
  company_id: number
  title: string
  status?: ApplicationStatus
  applied_at?: string
  source_url?: string
  notes?: string
}

export function useCreateApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (application: NewApplication) => {
      const { data } = await apiFetch<{ data: Application }>('/applications', {
        method: 'POST',
        body: application,
      })
      return data
    },
    onSuccess: () => {
      // Every list is now wrong: the new row belongs in some of them, and the
      // filters and sort decide which. Invalidating the branch is cheaper to
      // reason about than working out where it lands.
      queryClient.invalidateQueries({ queryKey: applicationKeys.all })
    },
  })
}
