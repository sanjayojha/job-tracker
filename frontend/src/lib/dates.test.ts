import { afterEach, describe, expect, it, vi } from 'vitest'
import { daysSince, formatDate, formatRelativeDays } from './dates'

afterEach(() => {
  vi.useRealTimers()
})

/**
 * Freezes the clock so "today" is a fixed point rather than whenever CI runs.
 *
 * Built in local time, not from a UTC string, and every input below is built
 * the same way. `formatRelativeDays` compares local calendar days on purpose --
 * a change at 23:00 UTC is already "today" for anyone east of UTC -- so a test
 * written against fixed UTC instants passes or fails depending on the machine's
 * timezone. Constructing both sides locally keeps the assertion about the
 * behaviour rather than about where the test happens to run.
 */
function freezeAtLocal(year: number, month: number, day: number, hour = 9) {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(year, month - 1, day, hour))
}

/** A local-time instant, as the API would serialise it. */
function localIso(year: number, month: number, day: number, hour = 9) {
  return new Date(year, month - 1, day, hour).toISOString()
}

describe('formatDate', () => {
  it('formats a date as day, short month, year', () => {
    expect(formatDate('2026-08-14')).toBe('14 Aug 2026')
  })

  it('renders an em dash when there is no date', () => {
    // A wishlist entry has no applied date, and an empty cell reads as a bug.
    expect(formatDate(null)).toBe('—')
    expect(formatDate(undefined)).toBe('—')
  })

  it('renders an em dash rather than "Invalid Date" for junk', () => {
    expect(formatDate('not-a-date')).toBe('—')
  })
})

describe('formatRelativeDays', () => {
  it('says "today" for the same calendar day', () => {
    freezeAtLocal(2026, 8, 17, 9)

    // Eight hours earlier, but the same calendar day -- the case that made
    // whole-day comparison necessary rather than elapsed hours.
    expect(formatRelativeDays(localIso(2026, 8, 17, 1))).toBe('today')
  })

  it('says "yesterday" for the previous calendar day', () => {
    freezeAtLocal(2026, 8, 17, 9)

    // Ten hours earlier in elapsed time, but a different calendar day.
    // Reporting that as "10 hours ago" is not how someone scanning their own
    // applications thinks about it.
    expect(formatRelativeDays(localIso(2026, 8, 16, 23))).toBe('yesterday')
  })

  it('counts whole days back', () => {
    freezeAtLocal(2026, 8, 17, 9)

    expect(formatRelativeDays(localIso(2026, 8, 5, 9))).toBe('12 days ago')
  })

  it('renders an em dash when the status has never moved', () => {
    expect(formatRelativeDays(null)).toBe('—')
  })
})

describe('daysSince', () => {
  it('returns whole elapsed days', () => {
    freezeAtLocal(2026, 8, 17, 9)

    expect(daysSince(localIso(2026, 8, 5, 9))).toBe(12)
  })

  it('never returns a negative count for a future timestamp', () => {
    freezeAtLocal(2026, 8, 17, 9)

    expect(daysSince(localIso(2026, 8, 20, 9))).toBe(0)
  })

  it('returns null when there is nothing to measure from', () => {
    expect(daysSince(null)).toBeNull()
  })
})
