import { useState } from 'react'
// Phosphor 2.1 renamed exports to an `Icon` suffix; the bare names are
// deprecated aliases. Always import the suffixed form.
import { WarningCircleIcon } from '@phosphor-icons/react'
import { ApiError } from '../../lib/api'
import { useLogin } from './api'

const fieldClass =
  'mt-1 w-full border border-ink-30 bg-white px-3 py-2 text-ink-100 ' +
  'placeholder:text-ink-50 focus:border-brand-60 aria-invalid:border-critical-60'

export function LoginPage() {
  const login = useLogin()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const error = login.error instanceof ApiError ? login.error : null
  const emailError = error?.fieldError('email')
  const passwordError = error?.fieldError('password')
  // A throttled or otherwise non-validation failure has no field to attach to.
  const generalError = error && !emailError && !passwordError ? error.message : null

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink-10 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold tracking-tight text-ink-100">Job Tracker</h1>
        <p className="mt-1 text-ink-70">Sign in to continue.</p>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            login.mutate({ email, password })
          }}
          noValidate
          className="mt-6 border border-ink-20 bg-white p-6"
        >
          {generalError && (
            <p
              role="alert"
              className="mb-4 flex items-start gap-2 border-l-2 border-critical-60 bg-critical-10 px-3 py-2 text-ink-100"
            >
              <WarningCircleIcon
                weight="light"
                size={18}
                className="mt-px shrink-0 text-critical-60"
              />
              {generalError}
            </p>
          )}

          <div>
            <label htmlFor="email" className="block font-medium text-ink-80">
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
              className={fieldClass}
            />
            {emailError && (
              <p id="email-error" className="mt-1 text-critical-70">
                {emailError}
              </p>
            )}
          </div>

          <div className="mt-4">
            <label htmlFor="password" className="block font-medium text-ink-80">
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
              className={fieldClass}
            />
            {passwordError && (
              <p id="password-error" className="mt-1 text-critical-70">
                {passwordError}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={login.isPending}
            className="mt-6 w-full bg-brand-60 px-3 py-2.5 font-medium text-white hover:bg-brand-70 disabled:cursor-not-allowed disabled:bg-ink-40"
          >
            {login.isPending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  )
}
