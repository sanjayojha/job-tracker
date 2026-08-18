import { useState } from 'react'
import { ArrowRightIcon } from '@phosphor-icons/react'
import { ApiError } from '../../lib/api'
import { StatusBadge } from '../../components/StatusBadge'
import { useChangeStatus } from './api'
import { APPLICATION_STATUSES, STATUS_STYLES, type ApplicationStatus } from './status'

type Props = {
  applicationId: number
  status: ApplicationStatus
}

/**
 * Moves an application to another stage, with an optional note saying why.
 *
 * The note is worth the extra field: it is written onto the audit row, and
 * "why did this stall in screening" is the question the trail exists to
 * answer. It is optional, so the common case is still two clicks.
 */
export function StageControl({ applicationId, status }: Props) {
  const changeStatus = useChangeStatus(applicationId)

  const [target, setTarget] = useState<ApplicationStatus>(status)
  const [note, setNote] = useState('')

  // A move to the stage already held is refused by the API with a 422. Keeping
  // the button disabled means the refusal is a backstop rather than something
  // anyone routinely walks into.
  const unchanged = target === status

  const message =
    changeStatus.error instanceof ApiError
      ? (changeStatus.error.fieldError('status') ?? changeStatus.error.message)
      : changeStatus.error
        ? 'Could not move this application. Try again.'
        : undefined

  function handleMove() {
    if (unchanged) return

    changeStatus.mutate(
      { status: target, note: note.trim() || undefined },
      { onSuccess: () => setNote('') },
    )
  }

  return (
    <section className="border border-ink-20 bg-white p-4">
      <h2 className="font-medium text-ink-100">Stage</h2>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <StatusBadge status={status} />
        <ArrowRightIcon weight="light" size={16} className="text-ink-50" />

        <label className="sr-only" htmlFor="target-stage">
          Move to stage
        </label>
        <select
          id="target-stage"
          value={target}
          onChange={(event) => setTarget(event.target.value as ApplicationStatus)}
          className="border border-ink-30 bg-white px-2.5 py-1.5 text-ink-100 focus:border-brand-60 focus:outline-none"
        >
          {APPLICATION_STATUSES.map((value) => (
            <option key={value} value={value}>
              {STATUS_STYLES[value].label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleMove}
          disabled={unchanged || changeStatus.isPending}
          className="bg-brand-60 px-3 py-1.5 font-medium text-white hover:bg-brand-70 disabled:opacity-60"
        >
          {changeStatus.isPending ? 'Moving…' : 'Move'}
        </button>
      </div>

      <div className="mt-3">
        <label htmlFor="move-note" className="block text-ink-70">
          Note (optional)
        </label>
        <input
          id="move-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Why it moved — recorded against this change"
          className="mt-1 w-full max-w-lg border border-ink-30 bg-white px-2.5 py-1.5 text-ink-100 focus:border-brand-60 focus:outline-none"
        />
      </div>

      {message && <p className="mt-2 text-critical-70">{message}</p>}
    </section>
  )
}
