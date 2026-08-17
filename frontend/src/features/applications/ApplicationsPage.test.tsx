import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLocation } from 'react-router'
import { renderWithProviders } from '../../test/renderWithProviders'
import { apiFetch } from '../../lib/api'
import { ApplicationsPage } from './ApplicationsPage'

vi.mock('../../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/api')>()),
  apiFetch: vi.fn(),
}))

const mockedFetch = vi.mocked(apiFetch)

/** Surfaces the current query string so assertions can read the URL state. */
function LocationProbe() {
  return <span data-testid="search-params">{useLocation().search}</span>
}

function applicationsPayload(titles: string[], total = titles.length) {
  return {
    data: titles.map((title, index) => ({
      id: index + 1,
      title,
      status: 'applied',
      applied_at: '2026-08-03',
      source_url: null,
      notes: null,
      company: { id: 1, name: 'Deliveroo', website: null, notes: null },
      status_changed_at: '2026-08-05T09:00:00Z',
      created_at: '2026-08-03T09:00:00Z',
      updated_at: '2026-08-03T09:00:00Z',
    })),
    meta: {
      current_page: 1,
      last_page: 1,
      per_page: 25,
      total,
      from: total === 0 ? null : 1,
      to: total === 0 ? null : titles.length,
    },
  }
}

/** Routes each mocked call by path: the page also loads companies for a filter. */
function respondWith(applications: ReturnType<typeof applicationsPayload>) {
  mockedFetch.mockImplementation((path: string) => {
    if (path.startsWith('/companies')) {
      return Promise.resolve({ data: [{ id: 1, name: 'Deliveroo', website: null, notes: null }] })
    }
    return Promise.resolve(applications)
  })
}

/** The paths the page asked the API for, in order. */
function requestedApplicationPaths() {
  return mockedFetch.mock.calls
    .map(([path]) => path as string)
    .filter((path) => path.startsWith('/applications'))
}

function renderPage(route = '/applications') {
  return renderWithProviders(
    <>
      <ApplicationsPage />
      <LocationProbe />
    </>,
    { route },
  )
}

beforeEach(() => {
  mockedFetch.mockReset()
})

describe('ApplicationsPage', () => {
  it('lists the applications the API returns', async () => {
    respondWith(applicationsPayload(['Backend Engineer', 'Platform Engineer']))

    renderPage()

    expect(await screen.findByText('Backend Engineer')).toBeInTheDocument()
    expect(screen.getByText('Platform Engineer')).toBeInTheDocument()
    expect(screen.getByText('Showing 1–2 of 2')).toBeInTheDocument()
  })

  it('distinguishes an empty list from an empty search', async () => {
    // Conflating these makes a filtered-out search look like data loss, and
    // the two need different next actions.
    respondWith(applicationsPayload([], 0))

    renderPage()

    expect(await screen.findByText('No applications yet')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument()
  })

  it('offers a way out when filters match nothing', async () => {
    respondWith(applicationsPayload([], 0))

    renderPage('/applications?search=nothing')

    expect(await screen.findByText('No applications match these filters')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument()
  })

  it('reads filters from the URL on first load', async () => {
    // A bookmarked or reloaded filtered view has to come back filtered.
    respondWith(applicationsPayload(['Backend Engineer']))

    renderPage('/applications?status=applied&search=backend')

    await screen.findByText('Backend Engineer')

    expect(requestedApplicationPaths()[0]).toContain('status=applied')
    expect(requestedApplicationPaths()[0]).toContain('search=backend')
  })

  it('pushes a debounced search into the URL and the request', async () => {
    respondWith(applicationsPayload(['Backend Engineer']))

    renderPage()
    await screen.findByText('Backend Engineer')

    await userEvent.type(screen.getByLabelText('Search role titles'), 'backend')

    await waitFor(() => {
      expect(screen.getByTestId('search-params')).toHaveTextContent('search=backend')
    })

    // Debounced: one request for the whole word, not one per keystroke.
    const searchRequests = requestedApplicationPaths().filter((path) => path.includes('search='))
    expect(searchRequests).toHaveLength(1)
  })

  it('toggles sort direction when the sorted column is clicked again', async () => {
    respondWith(applicationsPayload(['Backend Engineer']))

    renderPage()
    await screen.findByText('Backend Engineer')

    await userEvent.click(screen.getByRole('button', { name: 'Status' }))
    await waitFor(() => {
      expect(screen.getByTestId('search-params')).toHaveTextContent('direction=desc')
    })

    await userEvent.click(screen.getByRole('button', { name: 'Status' }))
    await waitFor(() => {
      expect(screen.getByTestId('search-params')).toHaveTextContent('direction=asc')
    })
  })

  it('drops the page number when a filter changes', async () => {
    // Page 3 of the old result set is usually past the end of the new one.
    respondWith(applicationsPayload(['Backend Engineer']))

    renderPage('/applications?page=2')
    await screen.findByText('Backend Engineer')

    await userEvent.selectOptions(screen.getByLabelText('Filter by status'), 'offer')

    await waitFor(() => {
      expect(screen.getByTestId('search-params')).toHaveTextContent('status=offer')
    })
    expect(screen.getByTestId('search-params')).not.toHaveTextContent('page=2')
  })

  it('says so when the list cannot be loaded', async () => {
    mockedFetch.mockRejectedValue(new Error('Network unreachable'))

    renderPage()

    expect(await screen.findByText('Could not load applications')).toBeInTheDocument()
    expect(screen.getByText(/Network unreachable/)).toBeInTheDocument()
  })
})
