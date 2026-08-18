import { StatusBadge } from '../../components/StatusBadge'
import { formatDate, formatRelativeDays } from '../../lib/dates'
import type { StatusHistoryEntry } from './api'

/**
 * The audit trail, newest first.
 *
 * Every move the app has ever made is recorded server-side; until now none of
 * it was visible. Newest first because the recent history is what anyone is
 * actually asking about, even though the API returns it oldest first.
 */
export function StatusHistory({ entries }: { entries: StatusHistoryEntry[] }) {
  const newestFirst = [...entries].reverse()

  return (
    <section className="border border-ink-20 bg-white p-4">
      <h2 className="font-medium text-ink-100">History</h2>

      {newestFirst.length === 0 ? (
        // Only reachable for rows written straight to the database, bypassing
        // the action that opens the trail.
        <p className="mt-2 text-ink-60">No recorded changes.</p>
      ) : (
        <ol className="mt-3 space-y-3">
          {newestFirst.map((entry) => (
            <li key={entry.id} className="flex flex-wrap items-baseline gap-2 border-l-2 border-ink-20 pl-3">
              <span className="font-mono text-ink-70">{formatDate(entry.created_at)}</span>
              <span className="text-ink-50">{formatRelativeDays(entry.created_at)}</span>

              <span className="flex items-center gap-1.5">
                {entry.from_status ? (
                  <StatusBadge status={entry.from_status} />
                ) : (
                  // The opening row: nothing preceded the application.
                  <span className="text-ink-60">Logged as</span>
                )}
                {entry.from_status && <span className="text-ink-50">→</span>}
                <StatusBadge status={entry.to_status} />
              </span>

              {entry.note && <p className="w-full text-ink-70">{entry.note}</p>}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
