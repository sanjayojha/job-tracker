import { useEffect, useState } from 'react'
import { MagnifyingGlassIcon, XIcon } from '@phosphor-icons/react'
import { useCompanies } from '../companies/api'
import { APPLICATION_STATUSES, STATUS_STYLES } from './status'

type Props = {
  search: string
  status: string
  companyId: string
  onChange: (patch: Record<string, string>) => void
  onClear: () => void
}

const controlClasses =
  'border border-ink-30 bg-white px-2.5 py-1.5 text-ink-100 focus:border-brand-60 focus:outline-none'

export function ApplicationFilters({ search, status, companyId, onChange, onClear }: Props) {
  const { data: companies } = useCompanies()

  // The input is uncontrolled by the URL while typing: writing every keystroke
  // to the query string would push a history entry per character and make the
  // back button useless.
  const [draft, setDraft] = useState(search)

  useEffect(() => {
    setDraft(search)
  }, [search])

  useEffect(() => {
    if (draft === search) return

    const timer = setTimeout(() => onChange({ search: draft }), 300)

    return () => clearTimeout(timer)
  }, [draft, search, onChange])

  const hasFilters = Boolean(search || status || companyId)

  return (
    <div className="flex flex-wrap items-center gap-2 border border-ink-20 bg-white p-3">
      <div className="relative min-w-56 flex-1">
        <MagnifyingGlassIcon
          weight="light"
          size={16}
          className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-ink-50"
        />
        <input
          type="search"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Search role titles"
          aria-label="Search role titles"
          className={`${controlClasses} w-full pl-8`}
        />
      </div>

      <label className="sr-only" htmlFor="status-filter">
        Filter by status
      </label>
      <select
        id="status-filter"
        value={status}
        onChange={(event) => onChange({ status: event.target.value })}
        className={controlClasses}
      >
        <option value="">All statuses</option>
        {APPLICATION_STATUSES.map((value) => (
          <option key={value} value={value}>
            {STATUS_STYLES[value].label}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="company-filter">
        Filter by company
      </label>
      <select
        id="company-filter"
        value={companyId}
        onChange={(event) => onChange({ company_id: event.target.value })}
        className={controlClasses}
      >
        <option value="">All companies</option>
        {companies?.map((company) => (
          <option key={company.id} value={String(company.id)}>
            {company.name}
          </option>
        ))}
      </select>

      {hasFilters && (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1.5 border border-ink-30 px-2.5 py-1.5 text-ink-80 hover:border-ink-50 hover:bg-ink-10"
        >
          <XIcon weight="light" size={16} />
          Clear
        </button>
      )}
    </div>
  )
}
