import type { Application } from './api'

/**
 * The editable fields of an application, as the form holds them.
 *
 * Everything is a string except the company id, because that is what inputs
 * give back. `status` is deliberately absent: it is not editable through this
 * form at all -- moves go through the status endpoint so they reach the audit
 * trail, and `PATCH` rejects a `status` key outright.
 */
export type ApplicationFieldValues = {
  companyId: number | null
  title: string
  appliedAt: string
  sourceUrl: string
  notes: string
}

/** Per-field validation messages, keyed by the API's field names. */
export type ApplicationFieldErrors = {
  company_id?: string
  title?: string
  applied_at?: string
  source_url?: string
  notes?: string
}

export const EMPTY_FIELDS: ApplicationFieldValues = {
  companyId: null,
  title: '',
  appliedAt: '',
  sourceUrl: '',
  notes: '',
}

/** Fills the form from an existing application. */
export function fieldsFromApplication(application: Application): ApplicationFieldValues {
  return {
    companyId: application.company?.id ?? null,
    title: application.title,
    // The API returns a date-only string, which is what <input type="date">
    // expects; nulls become empty strings so the inputs stay controlled.
    appliedAt: application.applied_at ?? '',
    sourceUrl: application.source_url ?? '',
    notes: application.notes ?? '',
  }
}

/**
 * The `PATCH` body: only what actually changed.
 *
 * The endpoint treats an absent key as "leave alone" and an explicit null as
 * "clear", so a cleared optional field must send `null` rather than `''` --
 * an empty string would fail the `url` and `date` rules instead of clearing
 * the column. Sending only the difference also means two people editing
 * different fields cannot clobber each other, which matters once anything
 * else can write to a row.
 */
export function changedFields(
  original: ApplicationFieldValues,
  current: ApplicationFieldValues,
): Record<string, unknown> {
  const changes: Record<string, unknown> = {}

  if (current.companyId !== null && current.companyId !== original.companyId) {
    changes.company_id = current.companyId
  }

  if (current.title.trim() !== original.title) {
    changes.title = current.title.trim()
  }

  const optional = [
    ['applied_at', 'appliedAt'],
    ['source_url', 'sourceUrl'],
    ['notes', 'notes'],
  ] as const

  for (const [apiKey, formKey] of optional) {
    const next = current[formKey].trim()

    if (next !== original[formKey]) {
      changes[apiKey] = next === '' ? null : next
    }
  }

  return changes
}
