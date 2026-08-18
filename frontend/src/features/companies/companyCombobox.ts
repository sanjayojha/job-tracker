import type { Company } from '../applications/api'

/**
 * What the picker's list can hold: a real company, or the offer to create one
 * from what has been typed.
 *
 * Modelled as a union rather than a nullable `company` because Downshift's
 * selection callback has to tell the two apart -- one sets a value, the other
 * fires a mutation.
 */
export type CompanyOption =
  | { kind: 'company'; label: string; company: Company }
  | { kind: 'create'; label: string; name: string }

/** What Downshift renders into the input when an option is selected. */
export function optionToString(option: CompanyOption | null): string {
  return option?.kind === 'company' ? option.company.name : ''
}

/**
 * Filters the companies against what has been typed, and appends a "create"
 * option when the text names no company that exists.
 *
 * Filtering is client-side on purpose: the API returns companies unpaginated
 * so a picker can narrow them without a request per keystroke.
 *
 * The exact-match test is case-insensitive because the database's uniqueness
 * is -- a functional index on lower(name). Offering to create "acme" while
 * "Acme" exists would send a request the API is bound to reject.
 */
export function buildOptions(companies: Company[], input: string): CompanyOption[] {
  const query = input.trim()
  const needle = query.toLowerCase()

  const matches: CompanyOption[] = companies
    .filter((company) => company.name.toLowerCase().includes(needle))
    .map((company) => ({ kind: 'company', label: company.name, company }))

  if (query === '') {
    return matches
  }

  const exists = companies.some((company) => company.name.toLowerCase() === needle)

  if (exists) {
    return matches
  }

  return [...matches, { kind: 'create', label: `Add "${query}"`, name: query }]
}
