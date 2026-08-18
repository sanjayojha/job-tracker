import { useState, type FormEvent } from 'react'
import { ApiError } from '../../lib/api'
import { ApplicationCoreFields, ApplicationOptionalFields } from './ApplicationFields'
import { changedFields, fieldsFromApplication, type ApplicationFieldValues } from './applicationFields'
import { useUpdateApplication, type Application } from './api'

type Props = {
  application: Application
  onDone: () => void
}

/**
 * Edit mode for the detail screen's Details section.
 *
 * Deliberately not its own route: editing a typo or backfilling a date is a
 * small correction, and sending someone to another screen for it loses the
 * history they were looking at when they noticed.
 */
export function ApplicationDetailsForm({ application, onDone }: Props) {
  const updateApplication = useUpdateApplication(application.id)

  // The form starts from the application and keeps the original alongside, so
  // the PATCH can send the difference rather than every field.
  const [original] = useState(() => fieldsFromApplication(application))
  const [values, setValues] = useState<ApplicationFieldValues>(original)
  const [attempted, setAttempted] = useState(false)

  const error = updateApplication.error
  const validation = error instanceof ApiError && error.status === 422 ? error : undefined
  const banner = error && !validation ? error : undefined

  const errors = {
    company_id:
      validation?.fieldError('company_id') ??
      (attempted && values.companyId === null ? 'Choose a company.' : undefined),
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

    const changes = changedFields(original, values)

    // Nothing to send. A PATCH with an empty body would succeed and touch
    // updated_at for no reason.
    if (Object.keys(changes).length === 0) {
      onDone()
      return
    }

    updateApplication.mutate(changes, { onSuccess: onDone })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 border border-ink-20 bg-white p-4">
      <h2 className="font-medium text-ink-100">Edit details</h2>

      {banner && (
        <p className="border border-critical-60 bg-critical-10 px-3 py-2 text-ink-100">
          {banner.message}
        </p>
      )}

      <ApplicationCoreFields values={values} errors={errors} onChange={update} />
      <ApplicationOptionalFields values={values} errors={errors} onChange={update} />

      <p className="text-ink-60">
        The stage is changed above, so the move is recorded in the history.
      </p>

      <div className="flex items-center gap-2 border-t border-ink-20 pt-4">
        <button
          type="submit"
          disabled={updateApplication.isPending}
          className="bg-brand-60 px-3 py-1.5 font-medium text-white hover:bg-brand-70 disabled:opacity-60"
        >
          {updateApplication.isPending ? 'Saving…' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="border border-ink-30 px-3 py-1.5 text-ink-80 hover:border-ink-50 hover:bg-ink-10"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
