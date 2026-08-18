import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiFetch } from './api'

const API_BASE = 'https://job-tracker.ddev.site'

/**
 * The CSRF dance is the highest-value untested code in the SPA: get it wrong
 * and every write 419s, which looks like an auth bug rather than a header bug.
 * These drive it through the real `document.cookie`, because reading the cookie
 * is half of what is being tested.
 */
function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value}`
}

function clearCookies() {
  for (const pair of document.cookie.split('; ')) {
    const name = pair.split('=')[0]
    if (name) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`
    }
  }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  clearCookies()
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  clearCookies()
})

/** The options object `fetch` was called with on its nth call. */
function callInit(index: number): RequestInit {
  return fetchMock.mock.calls[index][1] as RequestInit
}

function callHeaders(index: number): Record<string, string> {
  return callInit(index).headers as Record<string, string>
}

/**
 * The ApiError a request rejected with. Fails loudly if it resolved, or if it
 * threw something else -- and narrows the type, which a bare `.catch(e => e)`
 * cannot do.
 */
async function rejection(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise
  } catch (error) {
    if (error instanceof ApiError) return error
    throw error
  }

  throw new Error('Expected the request to reject, but it resolved')
}

describe('GET requests', () => {
  it('sends the session cookie and unwraps the JSON body', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 1 } }))

    const result = await apiFetch<{ data: { id: number } }>('/applications')

    expect(result).toEqual({ data: { id: 1 } })
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock.mock.calls[0][0]).toBe(`${API_BASE}/api/v1/applications`)
    // Without this the session cookie is neither sent nor stored and every
    // request looks unauthenticated.
    expect(callInit(0).credentials).toBe('include')
    expect(callHeaders(0).Accept).toBe('application/json')
  })

  it('does not fetch a CSRF cookie for a read', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [] }))

    await apiFetch('/companies')

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(callHeaders(0)['X-XSRF-TOKEN']).toBeUndefined()
  })
})

describe('mutating requests', () => {
  it('requests the CSRF cookie first when there is none, then sends the token', async () => {
    fetchMock
      // The /sanctum/csrf-cookie call. Setting the cookie is Sanctum's job in
      // the real world; here the mock stands in for it.
      .mockImplementationOnce(() => {
        setCookie('XSRF-TOKEN', 'token-from-sanctum')
        return Promise.resolve(new Response(null, { status: 204 }))
      })
      .mockResolvedValueOnce(jsonResponse({ data: { id: 7 } }, 201))

    await apiFetch('/applications', { method: 'POST', body: { title: 'Engineer' } })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][0]).toBe(`${API_BASE}/sanctum/csrf-cookie`)
    expect(callHeaders(1)['X-XSRF-TOKEN']).toBe('token-from-sanctum')
    expect(callHeaders(1)['Content-Type']).toBe('application/json')
    expect(callInit(1).body).toBe(JSON.stringify({ title: 'Engineer' }))
  })

  it('skips the CSRF round trip when the cookie is already set', async () => {
    setCookie('XSRF-TOKEN', 'existing-token')
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: {} }, 201))

    await apiFetch('/companies', { method: 'POST', body: { name: 'Acme' } })

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(callHeaders(0)['X-XSRF-TOKEN']).toBe('existing-token')
  })

  it('URL-decodes the token, because Laravel compares the decoded value', async () => {
    // Sanctum percent-encodes the cookie; sending it back encoded fails the
    // comparison and Laravel answers 419.
    setCookie('XSRF-TOKEN', encodeURIComponent('token+with/special=chars'))
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: {} }, 201))

    await apiFetch('/companies', { method: 'POST', body: { name: 'Acme' } })

    expect(callHeaders(0)['X-XSRF-TOKEN']).toBe('token+with/special=chars')
  })

  it('returns undefined for a 204, which has no body to parse', async () => {
    setCookie('XSRF-TOKEN', 'token')
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))

    await expect(apiFetch('/applications/1', { method: 'DELETE' })).resolves.toBeUndefined()
  })
})

describe('errors', () => {
  it('throws an ApiError carrying the status and validation errors', async () => {
    setCookie('XSRF-TOKEN', 'token')
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          message: 'The given data was invalid.',
          errors: { title: ['The title field is required.'] },
        },
        422,
      ),
    )

    const error = await rejection(apiFetch('/applications', { method: 'POST', body: {} }))

    expect(error.status).toBe(422)
    expect(error.message).toBe('The given data was invalid.')
    expect(error.fieldError('title')).toBe('The title field is required.')
    expect(error.fieldError('company_id')).toBeUndefined()
  })

  it('falls back to a status message when the body is not JSON', async () => {
    // A 500 rendered as an HTML error page, which is what a fatal error looks
    // like before Laravel gets to format a JSON response.
    fetchMock.mockResolvedValueOnce(new Response('<html>Server Error</html>', { status: 500 }))

    const error = await rejection(apiFetch('/applications'))

    expect(error.status).toBe(500)
    expect(error.message).toBe('Request failed with status 500')
    expect(error.errors).toBeUndefined()
  })
})
