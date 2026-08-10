import type { ReactNode } from 'react'
import { useUser } from './api'
import { LoginPage } from './LoginPage'

/**
 * Gates the app on session state. This is a UX gate, not a security boundary:
 * every protected endpoint is enforced server-side by `auth:sanctum`.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { data: user, isPending, isError, error } = useUser()

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm text-slate-600">Loading…</p>
      </div>
    )
  }

  if (isError) {
    // A real failure (API down, network error) is distinct from being logged
    // out, which useUser resolves to null. Showing a login form here would
    // misdescribe the problem and send the user in circles.
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="max-w-sm text-sm">
          <h1 className="font-semibold text-slate-900">Cannot reach the server</h1>
          <p className="mt-1 text-slate-600">
            {error instanceof Error ? error.message : 'Unknown error.'}
          </p>
          <p className="mt-2 text-slate-600">Check that the API is running, then reload.</p>
        </div>
      </main>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  return <>{children}</>
}
