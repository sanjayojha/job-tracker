import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { CaretDownIcon, CaretRightIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { ApiError } from '../../lib/api'
import { ApplicationCoreFields, ApplicationOptionalFields } from './ApplicationFields'
import { EMPTY_FIELDS, type ApplicationFieldValues } from './applicationFields'
import { useCreateApplication, type NewApplication } from './api'
import { APPLICATION_STATUSES, STATUS_STYLES, type ApplicationStatus } from './status'

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

  const [values, setValues] = useState<ApplicationFieldValues>(EMPTY_FIELDS)
  const [status, setStatus] = useState<ApplicationStatus>('wishlist')
  const [showDetails, setShowDetails] = useState(false)
  // Required-field messages appear on the first submit, not while typing --
  // scolding someone for an empty field they have not reached yet is noise.
  const [attempted, setAttempted] = useState(false)

  const error = createApplication.error
  const validation = error instanceof ApiError && error.status === 422 ? error : undefined
  // A 422 belongs next to the field that caused it; anything else is a banner.
  const banner = error && !validation ? error : undefined

  const errors = {
    company_id:
      validation?.fieldError('company_id') ??
      (attempted && values.companyId === null
        ? 'Choose a company, or type a name to add one.'
        : undefined),
    title:
      validation?.fieldError('title') ??
      (attempted && !values.title.trim() ? 'Enter the role title.' : undefined),
    applied_at: validation?.fieldError('applied_at'),
    source_url: validation?.fieldError('source_url'),
    notes: validation?.fieldError('notes'),
  }

  function update(patch: Partial<ApplicationFieldValues>) {
    setValues((current) => ({ ...current, ...patch }))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setAttempted(true)

    if (values.companyId === null || !values.title.trim()) return

    const application: NewApplication = {
      company_id: values.companyId,
      title: values.title.trim(),
      status,
    }

    // Optional fields are omitted rather than sent empty: the API distinguishes
    // an absent key from an explicit null, and '' is not a valid date or URL.
    if (values.appliedAt) application.applied_at = values.appliedAt
    if (values.sourceUrl.trim()) application.source_url = values.sourceUrl.trim()
    if (values.notes.trim()) application.notes = values.notes.trim()

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
        <ApplicationCoreFields values={values} errors={errors} onChange={update} autoFocus />

        <div>
          <label htmlFor="status" className="block font-medium text-ink-100">
            Stage
          </label>
          <select
            id="status"
            value={status}
            onChange={(event) => setStatus(event.target.value as ApplicationStatus)}
            className="mt-1 w-full border border-ink-30 bg-white px-2.5 py-1.5 text-ink-100 focus:border-brand-60 focus:outline-none"
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
              <ApplicationOptionalFields values={values} errors={errors} onChange={update} />
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
