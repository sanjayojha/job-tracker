import { useEffect, useId, useMemo, useState } from 'react'
import { useCombobox } from 'downshift'
import { CaretDownIcon, PlusIcon } from '@phosphor-icons/react'
import { ApiError } from '../../lib/api'
import { useCompanies, useCreateCompany } from './api'
import { buildOptions, optionToString, type CompanyOption } from './companyCombobox'

type Props = {
  /** The selected company's id, or null. */
  value: number | null
  onChange: (companyId: number | null) => void
  /** A server-side validation message for `company_id`. */
  error?: string
  autoFocus?: boolean
}

/**
 * Type-to-filter company picker, with inline creation for a company that is
 * not on the list yet.
 *
 * The keyboard and screen-reader behaviour comes from Downshift's `useCombobox`
 * rather than from hand-written ARIA: it owns `aria-activedescendant`, the
 * arrow/Home/End/Escape/Enter handling, the id wiring between input, listbox
 * and options, and the live region that announces how many results are left.
 * That is the one part of this app judged too easy to get subtly wrong by hand
 * -- everything visual below is still ours.
 */
export function CompanyCombobox({ value, onChange, error, autoFocus }: Props) {
  const { data: companies, isPending } = useCompanies()
  const createCompany = useCreateCompany()

  const [inputValue, setInputValue] = useState('')

  const selectedCompany = companies?.find((company) => company.id === value) ?? null

  // Both of these must be memoised. Downshift compares its controlled
  // `selectedItem` and its `items` by identity, so rebuilding either on every
  // render reads as a change on every render and the component never settles.
  const selectedItem: CompanyOption | null = useMemo(
    () =>
      selectedCompany
        ? { kind: 'company', label: selectedCompany.name, company: selectedCompany }
        : null,
    [selectedCompany],
  )

  // A company selected before its list arrived -- or one just created -- has no
  // name to show until `companies` catches up. Sync the text then, not on every
  // render, or typing would fight the selection.
  useEffect(() => {
    if (selectedCompany) {
      setInputValue(selectedCompany.name)
    }
  }, [selectedCompany])

  const options = useMemo(() => buildOptions(companies ?? [], inputValue), [companies, inputValue])

  const errorId = useId()
  const message = error ?? (createCompany.isError ? createCompanyMessage(createCompany.error) : undefined)

  const { isOpen, getLabelProps, getToggleButtonProps, getMenuProps, getInputProps, getItemProps, highlightedIndex } =
    useCombobox({
      items: options,
      inputValue,
      selectedItem,
      itemToString: optionToString,
      stateReducer: (_state, { changes }) => {
        // Choosing "Add X" is not a selection, so `itemToString` returns '' for
        // it and Downshift would blank the box on the way out -- after any
        // setInputValue in the change handler, which is why this cannot be
        // fixed there. Keep the typed name visible while the request runs.
        if (changes.selectedItem?.kind === 'create') {
          return { ...changes, inputValue: changes.selectedItem.name }
        }

        return changes
      },
      onInputValueChange: ({ inputValue: next }) => {
        setInputValue(next ?? '')

        // Clearing the box clears the selection. Leaving the old id set while
        // the text says something else would submit a company nobody chose.
        if (next === '') {
          onChange(null)
        }
      },
      onSelectedItemChange: ({ selectedItem: option }) => {
        if (!option) {
          onChange(null)
          return
        }

        if (option.kind === 'company') {
          onChange(option.company.id)
          return
        }

        // The typed name is held in the box by the state reducer above; this
        // only has to create the company and select the result.
        createCompany.mutate(option.name, {
          onSuccess: (company) => onChange(company.id),
        })
      },
    })

  return (
    <div>
      <label {...getLabelProps()} className="block font-medium text-ink-100">
        Company
      </label>

      <div className="relative mt-1">
        <input
          {...getInputProps({
            autoFocus,
            placeholder: isPending ? 'Loading companies…' : 'Type to search or add',
            'aria-describedby': message ? errorId : undefined,
            'aria-invalid': message ? true : undefined,
          })}
          className={`w-full border bg-white py-1.5 pr-9 pl-2.5 text-ink-100 focus:border-brand-60 focus:outline-none ${
            message ? 'border-critical-60' : 'border-ink-30'
          }`}
        />

        <button
          {...getToggleButtonProps({
            'aria-label': 'Show companies',
            tabIndex: -1,
          })}
          type="button"
          className="absolute top-0 right-0 flex h-full items-center px-2.5 text-ink-60 hover:text-ink-100"
        >
          <CaretDownIcon weight="light" size={16} />
        </button>

        {/* The list is always rendered -- Downshift keeps the input's
            aria-controls pointing at it whether or not it is open. */}
        <ul
          {...getMenuProps()}
          className={`absolute z-10 max-h-60 w-full overflow-y-auto border border-ink-30 bg-white ${
            isOpen ? 'block' : 'hidden'
          }`}
        >
          {isOpen && options.length === 0 && (
            <li className="px-2.5 py-1.5 text-ink-60">No companies match</li>
          )}

          {isOpen &&
            options.map((option, index) => (
              <li
                key={option.kind === 'company' ? `company-${option.company.id}` : 'create'}
                {...getItemProps({ item: option, index })}
                className={`flex cursor-pointer items-center gap-1.5 px-2.5 py-1.5 ${
                  highlightedIndex === index ? 'bg-brand-10 text-ink-100' : 'text-ink-80'
                } ${option.kind === 'create' ? 'border-t border-ink-20' : ''}`}
              >
                {option.kind === 'create' && (
                  <PlusIcon weight="light" size={16} className="shrink-0 text-ink-60" />
                )}
                {option.label}
              </li>
            ))}
        </ul>
      </div>

      {createCompany.isPending && <p className="mt-1 text-ink-60">Adding company…</p>}

      {message && (
        <p id={errorId} className="mt-1 text-critical-70">
          {message}
        </p>
      )}
    </div>
  )
}

/**
 * A failed inline creation, said plainly. The API's own 422 text is better
 * than anything generic -- it names the duplicate.
 */
function createCompanyMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.fieldError('name') ?? error.message
  }

  return 'Could not add the company. Try again.'
}
