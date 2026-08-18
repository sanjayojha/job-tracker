import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLocation } from 'react-router'
import { renderWithProviders } from '../../test/renderWithProviders'
import { ApiError, apiFetch } from '../../lib/api'
import { NewApplicationPage } from './NewApplicationPage'

vi.mock('../../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/api')>()),
  apiFetch: vi.fn(),
}))

const mockedFetch = vi.mocked(apiFetch)

const COMPANIES = [
  { id: 1, name: 'Deliveroo', website: null, notes: null },
  { id: 2, name: 'Monzo', website: null, notes: null },
]

/** Surfaces the current path, so a redirect after saving can be asserted. */
function LocationProbe() {
  return <span data-testid="path">{useLocation().pathname}</span>
}

function renderPage() {
  return {
    user: userEvent.setup(),
    ...renderWithProviders(
      <>
        <NewApplicationPage />
        <LocationProbe />
      </>,
      { route: '/applications/new' },
    ),
  }
}

/** The body of the POST to /applications, or undefined if there was none. */
function createdApplication() {
  const call = mockedFetch.mock.calls.find(
    ([path, options]) => path === '/applications' && options?.method === 'POST',
  )

  return call?.[1]?.body as Record<string, unknown> | undefined
}

/** Picks an existing company through the combobox, as a person would. */
async function chooseCompany(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.type(screen.getByRole('combobox', { name: 'Company' }), name.slice(0, 3))
  await user.click(await screen.findByRole('option', { name }))
}

beforeEach(() => {
  mockedFetch.mockReset()
  mockedFetch.mockImplementation((path: string, options?: { method?: string }) => {
    if (path === '/companies' && options?.method !== 'POST') {
      return Promise.resolve({ data: COMPANIES })
    }
    if (path === '/applications' && options?.method === 'POST') {
      return Promise.resolve({ data: { id: 42 } })
    }
    throw new Error(`Unexpected request: ${options?.method ?? 'GET'} ${path}`)
  })
})

describe('the fast path', () => {
  it('saves an application from the two required fields and returns to the list', async () => {
    const { user } = renderPage()

    await chooseCompany(user, 'Monzo')
    await user.type(screen.getByLabelText('Role title'), 'Backend Engineer')
    await user.click(screen.getByRole('button', { name: 'Save application' }))

    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/applications'))

    // Only the fields that were filled in. Sending empty optionals would fail
    // the API's date and URL rules on an otherwise valid application.
    expect(createdApplication()).toEqual({
      company_id: 2,
      title: 'Backend Engineer',
      status: 'wishlist',
    })
  })

  it('keeps the optional fields out of the way until asked for', async () => {
    renderPage()

    expect(screen.queryByLabelText('Job posting URL')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /More details/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })

  it('sends the optional fields once they are filled in', async () => {
    const { user } = renderPage()

    await chooseCompany(user, 'Deliveroo')
    await user.type(screen.getByLabelText('Role title'), 'Staff Engineer')
    await user.selectOptions(screen.getByLabelText('Stage'), 'applied')
    await user.click(screen.getByRole('button', { name: /More details/ }))

    await user.type(screen.getByLabelText('Applied on'), '2026-08-14')
    await user.type(screen.getByLabelText('Job posting URL'), 'https://example.com/job/1')
    await user.type(screen.getByLabelText('Notes'), 'Referred by Priya')

    await user.click(screen.getByRole('button', { name: 'Save application' }))

    await waitFor(() =>
      expect(createdApplication()).toEqual({
        company_id: 1,
        title: 'Staff Engineer',
        status: 'applied',
        applied_at: '2026-08-14',
        source_url: 'https://example.com/job/1',
        notes: 'Referred by Priya',
      }),
    )
  })
})

describe('validation', () => {
  it('names the missing required fields instead of posting an invalid application', async () => {
    const { user } = renderPage()

    await user.click(screen.getByRole('button', { name: 'Save application' }))

    expect(await screen.findByText(/Choose a company/)).toBeInTheDocument()
    expect(screen.getByText('Enter the role title.')).toBeInTheDocument()
    expect(createdApplication()).toBeUndefined()
  })

  it('shows a server-side 422 against the field it belongs to', async () => {
    mockedFetch.mockImplementation((path: string, options?: { method?: string }) => {
      if (path === '/applications' && options?.method === 'POST') {
        return Promise.reject(
          new ApiError(422, 'The given data was invalid.', {
            title: ['The title may not be greater than 255 characters.'],
          }),
        )
      }
      return Promise.resolve({ data: COMPANIES })
    })

    const { user } = renderPage()

    await chooseCompany(user, 'Monzo')
    await user.type(screen.getByLabelText('Role title'), 'Backend Engineer')
    await user.click(screen.getByRole('button', { name: 'Save application' }))

    expect(
      await screen.findByText('The title may not be greater than 255 characters.'),
    ).toBeInTheDocument()
    // Still on the form, with the entries intact -- notes typed in a hurry are
    // never thrown away by a failed save.
    expect(screen.getByTestId('path')).toHaveTextContent('/applications/new')
    expect(screen.getByLabelText('Role title')).toHaveValue('Backend Engineer')
  })

  it('reports a non-validation failure as a banner rather than against a field', async () => {
    mockedFetch.mockImplementation((path: string, options?: { method?: string }) => {
      if (path === '/applications' && options?.method === 'POST') {
        return Promise.reject(new ApiError(500, 'Server Error'))
      }
      return Promise.resolve({ data: COMPANIES })
    })

    const { user } = renderPage()

    await chooseCompany(user, 'Monzo')
    await user.type(screen.getByLabelText('Role title'), 'Backend Engineer')
    await user.click(screen.getByRole('button', { name: 'Save application' }))

    expect(await screen.findByText('Could not save this application')).toBeInTheDocument()
    expect(screen.getByTestId('path')).toHaveTextContent('/applications/new')
  })
})
