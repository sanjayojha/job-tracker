import { useCallback } from 'react'
import { useSearchParams } from 'react-router'
import { WarningCircleIcon } from '@phosphor-icons/react'
import { Pagination } from '../../components/Pagination'
import { ApplicationFilters } from './ApplicationFilters'
import { ApplicationsTable } from './ApplicationsTable'
import { useApplications } from './api'
import { DEFAULT_DIRECTION, DEFAULT_SORT } from './columns'

export function ApplicationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const search = searchParams.get('search') ?? ''
  const status = searchParams.get('status') ?? ''
  const companyId = searchParams.get('company_id') ?? ''
  const sort = searchParams.get('sort') ?? DEFAULT_SORT
  const direction = searchParams.get('direction') ?? DEFAULT_DIRECTION
  const page = searchParams.get('page') ?? ''

  const { data, isPending, isError, error, isFetching } = useApplications({
    search,
    status,
    company_id: companyId,
    sort,
    direction,
    page,
  })

  /**
   * Filter state lives in the URL, not component state: the back button works,
   * a filtered view can be bookmarked or shared, and a reload does not silently
   * drop the filters someone is looking at.
   */
  const applyFilters = useCallback(
    (patch: Record<string, string>) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current)

          for (const [key, value] of Object.entries(patch)) {
            if (value) {
              next.set(key, value)
            } else {
              next.delete(key)
            }
          }

          // Any filter change invalidates the current page number -- page 3 of
          // the old result set is usually past the end of the new one.
          next.delete('page')

          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const clearFilters = useCallback(() => {
    setSearchParams({}, { replace: true })
  }, [setSearchParams])

  const toggleSort = useCallback(
    (sortKey: string) => {
      const nextDirection = sortKey === sort && direction === 'desc' ? 'asc' : 'desc'

      applyFilters({ sort: sortKey, direction: nextDirection })
    },
    [sort, direction, applyFilters],
  )

  const changePage = useCallback(
    (nextPage: number) => {
      setSearchParams((current) => {
        const next = new URLSearchParams(current)
        next.set('page', String(nextPage))
        return next
      })
    },
    [setSearchParams],
  )

  const hasFilters = Boolean(search || status || companyId)

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-lg font-semibold tracking-tight text-ink-100">Applications</h1>
        {/* Only while refetching over existing data -- the first load has its
            own state below, and showing both would say the same thing twice. */}
        {isFetching && !isPending && <span className="text-ink-50">Updating…</span>}
      </div>

      <ApplicationFilters
        search={search}
        status={status}
        companyId={companyId}
        onChange={applyFilters}
        onClear={clearFilters}
      />

      {isPending && (
        <div className="border border-ink-20 bg-white px-3 py-8 text-center text-ink-70">
          Loading applications…
        </div>
      )}

      {isError && (
        <div className="flex items-start gap-2 border border-critical-60 bg-critical-10 px-3 py-3">
          <WarningCircleIcon weight="light" size={18} className="mt-0.5 shrink-0 text-critical-70" />
          <div>
            <p className="font-medium text-ink-100">Could not load applications</p>
            <p className="text-ink-70">
              {error instanceof Error ? error.message : 'Unknown error.'} Check the API is running,
              then reload.
            </p>
          </div>
        </div>
      )}

      {data && data.data.length === 0 && (
        // Two different empty states. "Nothing matches your filters" and "you
        // have not logged anything yet" need different next actions, and
        // conflating them makes an empty search look like data loss.
        <div className="border border-ink-20 bg-white px-3 py-10 text-center">
          <p className="font-medium text-ink-100">
            {hasFilters ? 'No applications match these filters' : 'No applications yet'}
          </p>
          <p className="mt-1 text-ink-70">
            {hasFilters
              ? 'Try a different status, company, or search term.'
              : 'Applications you log will appear here.'}
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-3 border border-ink-30 px-2.5 py-1.5 text-ink-80 hover:border-ink-50 hover:bg-ink-10"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {data && data.data.length > 0 && (
        <>
          <ApplicationsTable
            applications={data.data}
            sort={sort}
            direction={direction}
            onSort={toggleSort}
          />
          <Pagination meta={data.meta} onPageChange={changePage} />
        </>
      )}
    </div>
  )
}
