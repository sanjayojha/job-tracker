import { useState, type FormEvent } from 'react'
import { ApiError } from '../../lib/api'
import { useLogin } from './api'

export function LoginPage() {
  const login = useLogin()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const error = login.error instanceof ApiError ? login.error : null
  const emailError = error?.fieldError('email')
  const passwordError = error?.fieldError('password')
  // A throttled or otherwise non-validation failure has no field to attach to.
  const generalError = error && !emailError && !passwordError ? error.message : null

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    login.mutate({ email, password })
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold text-slate-900">Job Tracker</h1>
        <p className="mt-1 text-sm text-slate-600">Sign in to continue.</p>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        >
          {generalError && (
            <p
              role="alert"
              className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              {generalError}
            </p>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-800">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              autoFocus
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={emailError ? true : undefined}
              aria-describedby={emailError ? 'email-error' : undefined}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:ring-2 focus:ring-slate-400 focus:outline-none"
            />
            {emailError && (
              <p id="email-error" className="mt-1 text-sm text-red-700">
                {emailError}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-800">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={passwordError ? true : undefined}
              aria-describedby={passwordError ? 'password-error' : undefined}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:ring-2 focus:ring-slate-400 focus:outline-none"
            />
            {passwordError && (
              <p id="password-error" className="mt-1 text-sm text-red-700">
                {passwordError}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={login.isPending}
            className="w-full rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:outline-none disabled:opacity-60"
          >
            {login.isPending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  )
}
