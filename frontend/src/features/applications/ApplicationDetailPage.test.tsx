import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'
import { renderWithProviders } from '../../test/renderWithProviders'
import { ApiError, apiFetch } from '../../lib/api'
import { ApplicationDetailPage } from './ApplicationDetailPage'

vi.mock('../../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/api')>()),
  apiFetch: vi.fn(),
}))

const mockedFetch = vi.mocked(apiFetch)

function application(overrides: Record<string, unknown> = {}) {
  return {
    id: 42,
    title: 'Senior Backend Engineer',
    status: 'screening',
    applied_at: '2026-08-03',
    source_url: 'https://example.com/job/1',
    notes: 'Referred by Priya',
    company: { id: 1, name: 'Monzo', website: null, notes: null },
    status_history: [
      {
        id: 1,
        from_status: null,
        to_status: 'applied',
        note: null,
        created_at: '2026-08-03T09:00:00Z',
      },
      {
        id: 2,
        from_status: 'applied',
        to_status: 'screening',
        note: 'Recruiter call booked',
        created_at: '2026-08-10T09:00:00Z',
      },
    ],
    created_at: '2026-08-03T09:00:00Z',
    updated_at: '2026-08-10T09:00:00Z',
    ...overrides,
  }
}

/** Rendered through a route so `useParams` sees a real :id, as in the app. */
function renderDetail() {
  return {
    user: userEvent.setup(),
    ...renderWithProviders(
      <Routes>
        <Route path="/applications/:id" element={<ApplicationDetailPage />} />
      </Routes>,
      { route: '/applications/42' },
    ),
  }
}

/** The body of the POST to the status endpoint, if there was one. */
function statusRequest() {
  const call = mockedFetch.mock.calls.find(([path]) => path === '/applications/42/status')

  return call?.[1]?.body as Record<string, unknown> | undefined
}

beforeEach(() => {
  mockedFetch.mockReset()
  mockedFetch.mockImplementation((path: string) => {
    if (path === '/applications/42') {
      return Promise.resolve({ data: application() })
    }
    throw new Error(`Unexpected request: ${path}`)
  })
})

describe('the audit trail', () => {
  it('shows every recorded move, newest first', async () => {
    renderDetail()

    const history = await screen.findByRole('list')
    const entries = within(history).getAllByRole('listitem')

    expect(entries).toHaveLength(2)
    // The API returns the trail oldest first; the recent move is what someone
    // is asking about, so the newest is at the top.
    expect(entries[0]).toHaveTextContent('Screening')
    expect(entries[0]).toHaveTextContent('Recruiter call booked')
    // The opening row has no previous stage to show.
    expect(entries[1]).toHaveTextContent('Logged as')
  })

  it('renders the application without a trail rather than failing', async () => {
    // Rows written straight to the database bypass the action that opens the
    // trail -- the factory does exactly this.
    mockedFetch.mockResolvedValue({ data: application({ status_history: [] }) })

    renderDetail()

    expect(await screen.findByText('No recorded changes.')).toBeInTheDocument()
  })
})

describe('moving a stage', () => {
  it('posts the new stage with a note and shows the appended history', async () => {
    const { user } = renderDetail()

    await screen.findByRole('heading', { name: 'Senior Backend Engineer' })

    mockedFetch.mockImplementation((path: string) => {
      if (path === '/applications/42/status') {
        return Promise.resolve({
          data: application({
            status: 'interview',
            status_history: [
              ...application().status_history,
              {
                id: 3,
                from_status: 'screening',
                to_status: 'interview',
                note: 'Onsite booked',
                created_at: '2026-08-18T09:00:00Z',
              },
            ],
          }),
        })
      }
      return Promise.resolve({ data: application() })
    })

    await user.selectOptions(screen.getByLabelText('Move to stage'), 'interview')
    await user.type(screen.getByLabelText('Note (optional)'), 'Onsite booked')
    await user.click(screen.getByRole('button', { name: 'Move' }))

    await waitFor(() => expect(statusRequest()).toEqual({ status: 'interview', note: 'Onsite booked' }))

    // The response carries the new state, so the trail updates without a
    // refetch of what was just returned.
    const entries = within(await screen.findByRole('list')).getAllByRole('listitem')
    expect(entries[0]).toHaveTextContent('Onsite booked')
    // And the note box is empty again, ready for the next move.
    expect(screen.getByLabelText('Note (optional)')).toHaveValue('')
  })

  it('omits the note entirely when none was typed', async () => {
    const { user } = renderDetail()

    await screen.findByRole('heading', { name: 'Senior Backend Engineer' })

    mockedFetch.mockResolvedValue({ data: application({ status: 'interview' }) })

    await user.selectOptions(screen.getByLabelText('Move to stage'), 'interview')
    await user.click(screen.getByRole('button', { name: 'Move' }))

    // Not `note: ''` -- an empty note is no note, and sending one would write
    // a blank string onto the audit row.
    await waitFor(() => expect(statusRequest()).toEqual({ status: 'interview' }))
  })

  it('will not move an application to the stage it already holds', async () => {
    renderDetail()

    await screen.findByRole('heading', { name: 'Senior Backend Engineer' })

    // The select opens on the current stage, so the button starts disabled and
    // the API's 422 stays a backstop rather than a routine outcome.
    expect(screen.getByLabelText('Move to stage')).toHaveValue('screening')
    expect(screen.getByRole('button', { name: 'Move' })).toBeDisabled()
  })

  it('surfaces a refused move without losing the typed note', async () => {
    const { user } = renderDetail()

    await screen.findByRole('heading', { name: 'Senior Backend Engineer' })

    mockedFetch.mockImplementation((path: string) => {
      if (path === '/applications/42/status') {
        return Promise.reject(
          new ApiError(422, 'The given data was invalid.', {
            status: ['This application is already at that stage.'],
          }),
        )
      }
      return Promise.resolve({ data: application() })
    })

    await user.selectOptions(screen.getByLabelText('Move to stage'), 'offer')
    await user.type(screen.getByLabelText('Note (optional)'), 'Verbal offer')
    await user.click(screen.getByRole('button', { name: 'Move' }))

    expect(await screen.findByText('This application is already at that stage.')).toBeInTheDocument()
    expect(screen.getByLabelText('Note (optional)')).toHaveValue('Verbal offer')
  })
})

describe('when the application cannot be loaded', () => {
  it('says it is missing on a 404 rather than showing a generic failure', async () => {
    mockedFetch.mockRejectedValue(new ApiError(404, 'No query results for model [App\\Models\\Application].'))

    renderDetail()

    expect(await screen.findByText('This application could not be found')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Applications' })).toBeInTheDocument()
  })

  it('reports a server failure as something to retry', async () => {
    mockedFetch.mockRejectedValue(new ApiError(500, 'Server Error'))

    renderDetail()

    expect(await screen.findByText('Could not load this application')).toBeInTheDocument()
  })
})

describe('editing the fields', () => {
  /** Opens edit mode from the detail screen, as a person would. */
  async function startEditing(user: ReturnType<typeof userEvent.setup>) {
    await screen.findByRole('heading', { name: 'Senior Backend Engineer' })
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await screen.findByRole('heading', { name: 'Edit details' })
  }

  /** The body of the PATCH, if one was sent. */
  function patchBody() {
    const call = mockedFetch.mock.calls.find(
      ([path, options]) => path === '/applications/42' && options?.method === 'PATCH',
    )

    return call?.[1]?.body as Record<string, unknown> | undefined
  }

  it('sends only the field that changed', async () => {
    const { user } = renderDetail()
    await startEditing(user)

    mockedFetch.mockResolvedValue({ data: application({ title: 'Staff Engineer' }) })

    await user.clear(screen.getByLabelText('Role title'))
    await user.type(screen.getByLabelText('Role title'), 'Staff Engineer')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(patchBody()).toEqual({ title: 'Staff Engineer' }))
    // Back to the read view, showing the saved value.
    expect(await screen.findByRole('heading', { name: 'Details' })).toBeInTheDocument()
  })

  it('clears an emptied field with null rather than an empty string', async () => {
    const { user } = renderDetail()
    await startEditing(user)

    mockedFetch.mockResolvedValue({ data: application({ source_url: null }) })

    await user.clear(screen.getByLabelText('Job posting URL'))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(patchBody()).toEqual({ source_url: null }))
  })

  it('does not send a request when nothing was changed', async () => {
    const { user } = renderDetail()
    await startEditing(user)

    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    // An empty PATCH would succeed and bump updated_at for no reason.
    await screen.findByRole('heading', { name: 'Details' })
    expect(patchBody()).toBeUndefined()
  })

  it('keeps the status history visible after an edit', async () => {
    const { user } = renderDetail()
    await startEditing(user)

    // PATCH does not load the trail, so the response has no status_history.
    mockedFetch.mockResolvedValue({
      data: { ...application({ title: 'Staff Engineer' }), status_history: undefined },
    })

    await user.clear(screen.getByLabelText('Role title'))
    await user.type(screen.getByLabelText('Role title'), 'Staff Engineer')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await screen.findByRole('heading', { name: 'Details' })
    // Writing the response straight into the cache would blank the history
    // the screen is showing.
    const entries = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(entries).toHaveLength(2)
  })

  it('discards the edits on cancel', async () => {
    const { user } = renderDetail()
    await startEditing(user)

    await user.clear(screen.getByLabelText('Role title'))
    await user.type(screen.getByLabelText('Role title'), 'Something else')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(await screen.findByRole('heading', { name: 'Senior Backend Engineer' })).toBeInTheDocument()
    expect(patchBody()).toBeUndefined()
  })

  it('shows a server-side 422 against the field it belongs to', async () => {
    const { user } = renderDetail()
    await startEditing(user)

    mockedFetch.mockRejectedValue(
      new ApiError(422, 'The given data was invalid.', {
        source_url: ['The source url field must be a valid URL.'],
      }),
    )

    await user.clear(screen.getByLabelText('Job posting URL'))
    await user.type(screen.getByLabelText('Job posting URL'), 'not-a-url')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('The source url field must be a valid URL.')).toBeInTheDocument()
    // Still editing, with the typed value intact.
    expect(screen.getByLabelText('Job posting URL')).toHaveValue('not-a-url')
  })
})
