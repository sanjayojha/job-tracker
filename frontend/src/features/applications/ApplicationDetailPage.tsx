import { Link, useParams } from 'react-router'
import { ArrowLeftIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { ApiError } from '../../lib/api'
import { formatDate } from '../../lib/dates'
import { useApplication } from './api'
import { StageControl } from './StageControl'
import { StatusHistory } from './StatusHistory'

export function ApplicationDetailPage() {
  const { id } = useParams()
  const applicationId = Number(id)

  const { data: application, isPending, isError, error } = useApplication(applicationId)

  if (isPending) {
    return (
      <div className="border border-ink-20 bg-white px-3 py-8 text-center text-ink-70">
        Loading application…
      </div>
    )
  }

  if (isError) {
    // A 404 means the row is gone; a 403 means it belongs to someone else.
    // Neither is worth a different screen while this app has one user, but
    // saying which one happened beats a generic failure.
    const missing = error instanceof ApiError && (error.status === 404 || error.status === 403)

    return (
      <div className="space-y-4">
        <BackLink />
        <div className="flex items-start gap-2 border border-critical-60 bg-critical-10 px-3 py-3">
          <WarningCircleIcon weight="light" size={18} className="mt-0.5 shrink-0 text-critical-70" />
          <div>
            <p className="font-medium text-ink-100">
              {missing ? 'This application could not be found' : 'Could not load this application'}
            </p>
            <p className="text-ink-70">
              {missing
                ? 'It may have been deleted.'
                : `${error instanceof Error ? error.message : 'Unknown error.'} Check the API is running, then reload.`}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-4">
      <BackLink />

      <div>
        <p className="text-ink-70">{application.company?.name ?? '—'}</p>
        <h1 className="text-lg font-semibold tracking-tight text-ink-100">{application.title}</h1>
      </div>

      <StageControl applicationId={application.id} status={application.status} />

      <section className="border border-ink-20 bg-white p-4">
        <h2 className="font-medium text-ink-100">Details</h2>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
          <dt className="text-ink-70">Applied</dt>
          <dd className="font-mono text-ink-100">{formatDate(application.applied_at)}</dd>

          <dt className="text-ink-70">Posting</dt>
          <dd className="text-ink-100">
            {application.source_url ? (
              <a
                href={application.source_url}
                target="_blank"
                // noreferrer as well as noopener: the target page has no
                // business knowing where the click came from.
                rel="noopener noreferrer"
                className="break-all text-brand-60 hover:text-brand-70"
              >
                {application.source_url}
              </a>
            ) : (
              '—'
            )}
          </dd>

          <dt className="text-ink-70">Notes</dt>
          {/* Preserves the line breaks someone typed; notes are written in a
              hurry and reflowing them loses their structure. */}
          <dd className="whitespace-pre-wrap text-ink-100">{application.notes || '—'}</dd>
        </dl>
      </section>

      <StatusHistory entries={application.status_history ?? []} />
    </div>
  )
}

function BackLink() {
  return (
    <Link
      to="/applications"
      className="inline-flex items-center gap-1.5 text-brand-60 hover:text-brand-70"
    >
      <ArrowLeftIcon weight="light" size={16} />
      Applications
    </Link>
  )
}
