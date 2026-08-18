import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../test/renderWithProviders'
import { ApiError, apiFetch } from '../../lib/api'
import { CompanyCombobox } from './CompanyCombobox'

vi.mock('../../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/api')>()),
  apiFetch: vi.fn(),
}))

const mockedFetch = vi.mocked(apiFetch)

const COMPANIES = [
  { id: 1, name: 'Deliveroo', website: null, notes: null },
  { id: 2, name: 'Monzo', website: null, notes: null },
  { id: 3, name: 'Depop', website: null, notes: null },
]

/**
 * The combobox is controlled, so the tests need something to hold the value --
 * this stands in for the form, and reports the selection so assertions can read
 * what the parent would actually submit.
 */
function Harness() {
  const [companyId, setCompanyId] = useState<number | null>(null)

  return (
    <>
      <CompanyCombobox value={companyId} onChange={setCompanyId} />
      <span data-testid="selected">{companyId ?? 'none'}</span>
    </>
  )
}

function renderCombobox() {
  return { user: userEvent.setup(), ...renderWithProviders(<Harness />) }
}

function selected() {
  return screen.getByTestId('selected').textContent
}

beforeEach(() => {
  mockedFetch.mockReset()
  mockedFetch.mockImplementation((path: string) => {
    if (path === '/companies') {
      return Promise.resolve({ data: COMPANIES })
    }
    throw new Error(`Unexpected request: ${path}`)
  })
})

describe('choosing an existing company', () => {
  it('filters the list to what has been typed', async () => {
    const { user } = renderCombobox()

    await user.type(screen.getByRole('combobox', { name: 'Company' }), 'de')

    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument())

    const options = screen.getAllByRole('option').map((option) => option.textContent)
    // Case-insensitive and matches anywhere in the name -- "Depop" and
    // "Deliveroo" both contain "de", "Monzo" does not.
    expect(options).toEqual(['Deliveroo', 'Depop', 'Add "de"'])
  })

  it('selects with the keyboard alone', async () => {
    const { user } = renderCombobox()

    const input = screen.getByRole('combobox', { name: 'Company' })
    await user.type(input, 'mon')
    await waitFor(() => expect(screen.getByRole('option', { name: 'Monzo' })).toBeInTheDocument())

    await user.keyboard('{ArrowDown}{Enter}')

    expect(selected()).toBe('2')
    expect(input).toHaveValue('Monzo')
    // Selecting an existing company is not a write.
    expect(mockedFetch).not.toHaveBeenCalledWith('/companies', expect.anything())
  })

  it('clears the selection when the input is emptied', async () => {
    const { user } = renderCombobox()

    const input = screen.getByRole('combobox', { name: 'Company' })
    await user.type(input, 'mon')
    await user.keyboard('{ArrowDown}{Enter}')
    expect(selected()).toBe('2')

    await user.clear(input)

    // Otherwise the box reads empty while the form still holds an id, and the
    // submitted company is one nobody chose.
    expect(selected()).toBe('none')
  })
})

describe('adding a company inline', () => {
  it('creates the company and selects it', async () => {
    mockedFetch.mockImplementation((path: string, options?: { method?: string }) => {
      if (path === '/companies' && options?.method === 'POST') {
        return Promise.resolve({ data: { id: 9, name: 'Wise', website: null, notes: null } })
      }
      return Promise.resolve({ data: COMPANIES })
    })

    const { user } = renderCombobox()

    const input = screen.getByRole('combobox', { name: 'Company' })
    await user.type(input, 'Wise')
    await user.click(await screen.findByRole('option', { name: 'Add "Wise"' }))

    await waitFor(() => expect(selected()).toBe('9'))

    expect(mockedFetch).toHaveBeenCalledWith('/companies', {
      method: 'POST',
      body: { name: 'Wise' },
    })
    // The typed name survives the round trip rather than blanking while the
    // request is in flight.
    expect(input).toHaveValue('Wise')
  })

  it('does not offer to add a company that already exists, whatever the casing', async () => {
    const { user } = renderCombobox()

    await user.type(screen.getByRole('combobox', { name: 'Company' }), 'monzo')

    await waitFor(() => expect(screen.getByRole('option', { name: 'Monzo' })).toBeInTheDocument())
    // Company names are unique case-insensitively in PostgreSQL, so offering
    // this would send a request the API is bound to reject.
    expect(screen.queryByRole('option', { name: /^Add/ })).not.toBeInTheDocument()
  })

  it('reports a rejected name without losing what was typed', async () => {
    mockedFetch.mockImplementation((path: string, options?: { method?: string }) => {
      if (path === '/companies' && options?.method === 'POST') {
        return Promise.reject(
          new ApiError(422, 'The given data was invalid.', {
            name: ['A company with this name already exists.'],
          }),
        )
      }
      return Promise.resolve({ data: COMPANIES })
    })

    const { user } = renderCombobox()

    const input = screen.getByRole('combobox', { name: 'Company' })
    await user.type(input, 'Wise')
    await user.click(await screen.findByRole('option', { name: 'Add "Wise"' }))

    expect(await screen.findByText('A company with this name already exists.')).toBeInTheDocument()
    expect(selected()).toBe('none')
    expect(input).toHaveValue('Wise')
  })
})

describe('keyboard and pointer dismissal', () => {
  it('closes the list on Escape', async () => {
    const { user } = renderCombobox()

    await user.type(screen.getByRole('combobox', { name: 'Company' }), 'de')
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument())

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('option')).not.toBeInTheDocument()
  })

  it('opens the full list from the toggle button', async () => {
    const { user } = renderCombobox()

    await user.click(await screen.findByRole('button', { name: 'Show companies' }))

    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(COMPANIES.length))
  })
})
