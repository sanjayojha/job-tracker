const API_BASE = import.meta.env.VITE_API_URL ?? 'https://job-tracker.ddev.site'

/** A non-2xx response. `errors` is present on 422 validation failures. */
export class ApiError extends Error {
  // Declared explicitly rather than as constructor parameter properties:
  // tsconfig enables erasableSyntaxOnly, which disallows those.
  readonly status: number
  readonly errors?: Record<string, string[]>

  constructor(status: number, message: string, errors?: Record<string, string[]>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }

  /** First message for a field, for rendering next to the input. */
  fieldError(field: string): string | undefined {
    return this.errors?.[field]?.[0]
  }
}

function readCookie(name: string): string | undefined {
  return document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
    ?.split('=')[1]
}

/**
 * Sanctum sets an XSRF-TOKEN cookie; Laravel expects it echoed back in the
 * X-XSRF-TOKEN header, URL-decoded. Axios does this automatically, native
 * fetch does not, so we do it here.
 */
async function ensureCsrfCookie(): Promise<void> {
  if (readCookie('XSRF-TOKEN')) return

  await fetch(`${API_BASE}/sanctum/csrf-cookie`, {
    credentials: 'include',
  })
}

type RequestOptions = {
  method?: string
  body?: unknown
}

export async function apiFetch<T>(
  path: string,
  { method = 'GET', body }: RequestOptions = {},
): Promise<T> {
  const mutating = method !== 'GET' && method !== 'HEAD'

  if (mutating) {
    await ensureCsrfCookie()
  }

  const headers: Record<string, string> = {
    // Sanctum needs this to treat the request as stateful, and Laravel needs
    // it to return JSON errors instead of a redirect.
    Accept: 'application/json',
  }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  if (mutating) {
    const token = readCookie('XSRF-TOKEN')
    if (token) {
      headers['X-XSRF-TOKEN'] = decodeURIComponent(token)
    }
  }

  const response = await fetch(`${API_BASE}/api/v1${path}`, {
    method,
    headers,
    // Without this the session cookie is neither sent nor stored, and every
    // request looks unauthenticated.
    credentials: 'include',
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (response.status === 204) {
    return undefined as T
  }

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.message ?? `Request failed with status ${response.status}`,
      payload?.errors,
    )
  }

  return payload as T
}
