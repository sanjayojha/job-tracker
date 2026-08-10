import { STATUS_STYLES, type ApplicationStatus } from '../features/applications/status'

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  const { label, className } = STATUS_STYLES[status]

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium tracking-wide uppercase ${className}`}
    >
      {label}
    </span>
  )
}
