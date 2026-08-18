import { CompanyCombobox } from '../companies/CompanyCombobox'
import type { ApplicationFieldErrors, ApplicationFieldValues } from './applicationFields'

type Props = {
  values: ApplicationFieldValues
  errors: ApplicationFieldErrors
  onChange: (patch: Partial<ApplicationFieldValues>) => void
  /** Focuses the first field. Only the create screen wants this. */
  autoFocus?: boolean
}

const fieldClasses =
  'mt-1 w-full border bg-white px-2.5 py-1.5 text-ink-100 focus:border-brand-60 focus:outline-none'

function borderFor(error: string | undefined): string {
  return error ? 'border-critical-60' : 'border-ink-30'
}

/**
 * The two fields the API requires. Shared by the create screen and the detail
 * screen's edit mode so the same input, label and error treatment appears in
 * both -- two hand-maintained copies of the same form is how they drift.
 */
export function ApplicationCoreFields({ values, errors, onChange, autoFocus }: Props) {
  return (
    <>
      <CompanyCombobox
        value={values.companyId}
        onChange={(companyId) => onChange({ companyId })}
        error={errors.company_id}
        autoFocus={autoFocus}
      />

      <div>
        <label htmlFor="title" className="block font-medium text-ink-100">
          Role title
        </label>
        <input
          id="title"
          value={values.title}
          onChange={(event) => onChange({ title: event.target.value })}
          placeholder="Senior Backend Engineer"
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={errors.title ? 'title-error' : undefined}
          className={`${fieldClasses} ${borderFor(errors.title)}`}
        />
        {errors.title && (
          <p id="title-error" className="mt-1 text-critical-70">
            {errors.title}
          </p>
        )}
      </div>
    </>
  )
}

/**
 * Everything optional. The create screen hides these behind a disclosure to
 * protect its 30-second path; the edit form shows them, because filling one in
 * after the fact is the reason someone is editing at all.
 */
export function ApplicationOptionalFields({ values, errors, onChange }: Props) {
  return (
    <>
      <div>
        <label htmlFor="applied_at" className="block font-medium text-ink-100">
          Applied on
        </label>
        <input
          id="applied_at"
          type="date"
          value={values.appliedAt}
          onChange={(event) => onChange({ appliedAt: event.target.value })}
          aria-invalid={errors.applied_at ? true : undefined}
          className={`${fieldClasses} ${borderFor(errors.applied_at)}`}
        />
        {errors.applied_at && <p className="mt-1 text-critical-70">{errors.applied_at}</p>}
      </div>

      <div>
        <label htmlFor="source_url" className="block font-medium text-ink-100">
          Job posting URL
        </label>
        <input
          id="source_url"
          type="url"
          value={values.sourceUrl}
          onChange={(event) => onChange({ sourceUrl: event.target.value })}
          placeholder="https://"
          aria-invalid={errors.source_url ? true : undefined}
          className={`${fieldClasses} ${borderFor(errors.source_url)}`}
        />
        {errors.source_url && <p className="mt-1 text-critical-70">{errors.source_url}</p>}
      </div>

      <div>
        <label htmlFor="notes" className="block font-medium text-ink-100">
          Notes
        </label>
        <textarea
          id="notes"
          rows={4}
          value={values.notes}
          onChange={(event) => onChange({ notes: event.target.value })}
          className={`${fieldClasses} ${borderFor(errors.notes)}`}
        />
      </div>
    </>
  )
}
