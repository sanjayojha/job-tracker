import { ArrowDownIcon, ArrowUpIcon } from '@phosphor-icons/react'
import { StatusBadge } from '../../components/StatusBadge'
import { daysSince, formatDate, formatRelativeDays } from '../../lib/dates'
import type { Application } from './api'
import { COLUMNS } from './columns'

type Props = {
  applications: Application[]
  sort: string
  direction: string
  onSort: (sortKey: string) => void
}

const headerBase =
  'border-b border-ink-30 px-3 py-2 text-left text-xs font-semibold tracking-wide text-ink-70 uppercase'

export function ApplicationsTable({ applications, sort, direction, onSort }: Props) {
  return (
    // Wide content scrolls inside its own container so the page body never
    // scrolls horizontally on a narrow window.
    <div className="overflow-x-auto border border-ink-20 bg-white">
      <table className="w-full min-w-3xl border-collapse">
        <thead>
          <tr className="bg-ink-10">
            {COLUMNS.map((column) => {
              const isSorted = column.sortKey !== undefined && column.sortKey === sort
              const alignment = column.numeric ? 'text-right' : 'text-left'

              if (!column.sortKey) {
                return (
                  <th key={column.key} scope="col" className={`${headerBase} ${alignment}`}>
                    {column.label}
                  </th>
                )
              }

              return (
                <th
                  key={column.key}
                  scope="col"
                  // Tells assistive tech the current sort, which the arrow
                  // only conveys visually.
                  aria-sort={
                    isSorted ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'
                  }
                  className={`${headerBase} ${alignment} p-0`}
                >
                  <button
                    type="button"
                    onClick={() => onSort(column.sortKey!)}
                    className={`flex w-full items-center gap-1 px-3 py-2 hover:text-ink-100 ${
                      column.numeric ? 'justify-end' : 'justify-start'
                    } ${isSorted ? 'text-ink-100' : ''}`}
                  >
                    {column.label}
                    {isSorted &&
                      (direction === 'asc' ? (
                        <ArrowUpIcon weight="light" size={14} />
                      ) : (
                        <ArrowDownIcon weight="light" size={14} />
                      ))}
                  </button>
                </th>
              )
            })}
          </tr>
        </thead>

        <tbody>
          {applications.map((application) => {
            const quietDays = daysSince(application.status_changed_at)

            return (
              <tr key={application.id} className="border-b border-ink-20 last:border-b-0 hover:bg-ink-10">
                <td className="px-3 py-2 text-ink-70">{application.company?.name ?? '—'}</td>
                <td className="px-3 py-2 font-medium text-ink-100">{application.title}</td>
                <td className="px-3 py-2">
                  <StatusBadge status={application.status} />
                </td>
                {/* Mono for figures, so dates line up down the column. */}
                <td className="px-3 py-2 text-right font-mono text-ink-70">
                  {formatDate(application.applied_at)}
                </td>
                <td
                  className="px-3 py-2 text-right font-mono text-ink-70"
                  title={
                    quietDays === null ? undefined : `${quietDays} day${quietDays === 1 ? '' : 's'} since the last status change`
                  }
                >
                  {formatRelativeDays(application.status_changed_at)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
