import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react'
import type { PaginationMeta } from '../features/applications/api'

type Props = {
  meta: PaginationMeta
  onPageChange: (page: number) => void
}

const buttonClasses =
  'inline-flex items-center gap-1 border border-ink-30 px-2.5 py-1.5 text-ink-80 hover:border-ink-50 hover:bg-ink-10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-ink-30 disabled:hover:bg-transparent'

export function Pagination({ meta, onPageChange }: Props) {
  const { current_page: page, last_page: lastPage, total, from, to } = meta

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      {/* Counts, not just page numbers: "showing 1-25 of 63" answers how much
          is left, which a page number alone does not. */}
      <p className="text-ink-70">
        {total === 0 ? 'No applications' : `Showing ${from}–${to} of ${total}`}
      </p>

      {lastPage > 1 && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className={buttonClasses}
          >
            <CaretLeftIcon weight="light" size={16} />
            Previous
          </button>

          <span className="font-mono text-ink-70">
            {page} / {lastPage}
          </span>

          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= lastPage}
            className={buttonClasses}
          >
            Next
            <CaretRightIcon weight="light" size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
