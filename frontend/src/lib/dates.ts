/**
 * Date formatting for a dense list.
 *
 * Everything here is deliberately plain: no date library. The app needs two
 * formats and neither justifies a dependency.
 */

const relativeTime = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

/** `12 Aug 2026`, or an em dash when there is no date to show. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'

  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? '—' : dateFormat.format(date)
}

/**
 * `12 days ago`, `yesterday`, `today`.
 *
 * Compared at whole-day granularity rather than by elapsed hours: a change
 * made last night reads as "yesterday", not "14 hours ago", which is how
 * someone scanning their own applications thinks about it.
 */
export function formatRelativeDays(value: string | null | undefined): string {
  if (!value) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  const startOfDay = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  const days = Math.round((startOfDay(date) - startOfDay(new Date())) / 86_400_000)

  return days === 0 ? 'today' : relativeTime.format(days, 'day')
}

/** Whole days since a timestamp, for sorting and for `title` tooltips. */
export function daysSince(value: string | null | undefined): number | null {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000))
}
