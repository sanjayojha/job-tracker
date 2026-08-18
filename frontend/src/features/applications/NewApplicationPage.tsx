import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { CaretDownIcon, CaretRightIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { ApiError } from '../../lib/api'
import { CompanyCombobox } from '../companies/CompanyCombobox'
import { useCreateApplication, type NewApplication } from './api'
import { APPLICATION_STATUSES, STATUS_STYLES, type ApplicationStatus } from './status'

const fieldClasses =
  'mt-1 w-full border border-ink-30 bg-white px-2.5 py-1.5 text-ink-100 focus:border-brand-60 focus:outline-none'

/**
 * Logging an application has to take under 30 seconds, so the form above the
 * fold is the two fields the API actually requires plus the opening stage.
 * Everything else is behind a disclosure and editable later -- a longer form
 * is how a tool stops being used in a hurry, which is the only time this one
 * gets used.
 */
export function NewApplicationPage() {
  const navigate = useNavigate()
  const createApplication = useCreateApplication()

  const [companyId, setCompanyId] = useState<number | null>(null)
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState<ApplicationStatus>('wishlist')
  const [appliedAt, setAppliedAt] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [showDetails, setShowDetails] = useState(false)
  // Required-field messages appear on the first submit, not while typing --
  // scolding someone for an empty field they have not reached yet is noise.
  const [attempted, setAttempted] = useState(false)

  const error = createApplication.error
  const validation = error instanceof ApiError && error.status === 422 ? error : undefined
  // A 422 belongs next to the field that caused it; anything else is a banner.
  const banner = error && !validation ? error : undefined

  const companyError =
    validation?.fieldError('company_id') ??
    (attempted && companyId === null ? 'Choose a company, or type a name to add one.' : undefined)
  const titleError =
    validation?.fieldError('title') ??
    (attempted && !title.trim() ? 'Enter the role title.' : undefined)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setAttempted(true)

    if (companyId === null || !title.trim()) return

    const application: NewApplication = { company_id: companyId, title: title.trim(), status }

    // Optional fields are omitted rather than sent empty: the API distinguishes
    // an absent key from an explicit null, and '' is not a valid date or URL.
    if (appliedAt) application.applied_at = appliedAt
    if (sourceUrl.trim()) application.source_url = sourceUrl.trim()
    if (notes.trim()) application.notes = notes.trim()

    createApplication.mutate(application, {
      onSuccess: () => navigate('/applications'),
    })
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-lg font-semibold tracking-tight text-ink-100">Log an application</h1>
        <Link to="/applications" className="text-brand-60 hover:text-brand-70">
          Back to applications
        </Link>
      </div>

      {banner && (
        <div className="flex items-start gap-2 border border-critical-60 bg-critical-10 px-3 py-3">
          <WarningCircleIcon weight="light" size={18} className="mt-0.5 shrink-0 text-critical-70" />
          <div>
            <p className="font-medium text-ink-100">Could not save this application</p>
            <p className="text-ink-70">{banner.message}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4 border border-ink-20 bg-white p-4">
        <CompanyCombobox
          value={companyId}
          onChange={setCompanyId}
          error={companyError}
          autoFocus
        />

        <div>
          <label htmlFor="title" className="block font-medium text-ink-100">
            Role title
          </label>
          <input
            id="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Senior Backend Engineer"
            aria-invalid={titleError ? true : undefined}
            aria-describedby={titleError ? 'title-error' : undefined}
            className={fieldClasses}
          />
          {titleError && (
            <p id="title-error" className="mt-1 text-critical-70">
              {titleError}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="status" className="block font-medium text-ink-100">
            Stage
          </label>
          <select
            id="status"
            value={status}
            onChange={(event) => setStatus(event.target.value as ApplicationStatus)}
            className={fieldClasses}
          >
            {APPLICATION_STATUSES.map((value) => (
              <option key={value} value={value}>
                {STATUS_STYLES[value].label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-ink-60">
            Where this starts. Later moves are recorded in the application's history.
          </p>
        </div>

        <div className="border-t border-ink-20 pt-4">
          <button
            type="button"
            onClick={() => setShowDetails((open) => !open)}
            aria-expanded={showDetails}
            className="inline-flex items-center gap-1 text-ink-80 hover:text-ink-100"
          >
            {showDetails ? (
              <CaretDownIcon weight="light" size={16} />
            ) : (
              <CaretRightIcon weight="light" size={16} />
            )}
            More details
          </button>

          {showDetails && (
            <div className="mt-3 space-y-4">
              <div>
                <label htmlFor="applied_at" className="block font-medium text-ink-100">
                  Applied on
                </label>
                <input
                  id="applied_at"
                  type="date"
                  value={appliedAt}
                  onChange={(event) => setAppliedAt(event.target.value)}
                  className={fieldClasses}
                />
                {validation?.fieldError('applied_at') && (
                  <p className="mt-1 text-critical-70">{validation.fieldError('applied_at')}</p>
                )}
              </div>

              <div>
                <label htmlFor="source_url" className="block font-medium text-ink-100">
                  Job posting URL
                </label>
                <input
                  id="source_url"
                  type="url"
                  value={sourceUrl}
                  onChange={(event) => setSourceUrl(event.target.value)}
                  placeholder="https://"
                  className={fieldClasses}
                />
                {validation?.fieldError('source_url') && (
                  <p className="mt-1 text-critical-70">{validation.fieldError('source_url')}</p>
                )}
              </div>

              <div>
                <label htmlFor="notes" className="block font-medium text-ink-100">
                  Notes
                </label>
                <textarea
                  id="notes"
                  rows={4}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className={fieldClasses}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-ink-20 pt-4">
          <button
            type="submit"
            disabled={createApplication.isPending}
            className="bg-brand-60 px-3 py-1.5 font-medium text-white hover:bg-brand-70 disabled:opacity-60"
          >
            {createApplication.isPending ? 'Saving…' : 'Save application'}
          </button>
          <Link
            to="/applications"
            className="border border-ink-30 px-3 py-1.5 text-ink-80 hover:border-ink-50 hover:bg-ink-10"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
