import { SignOutIcon } from '@phosphor-icons/react'
import { Route, Routes } from 'react-router'
import { RequireAuth } from './features/auth/RequireAuth'
import { useLogout, useUser } from './features/auth/api'

function AppShell({ children }: { children: React.ReactNode }) {
  const { data: user } = useUser()
  const logout = useLogout()

  return (
    <div className="min-h-screen bg-ink-10">
      <header className="border-b border-ink-20 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <span className="font-semibold tracking-tight text-ink-100">Job Tracker</span>
          <div className="flex items-center gap-4">
            <span className="text-ink-60">{user?.email}</span>
            <button
              type="button"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              className="inline-flex items-center gap-1.5 border border-ink-30 px-2.5 py-1.5 text-ink-80 hover:border-ink-50 hover:bg-ink-10 disabled:opacity-60"
            >
              <SignOutIcon weight="light" size={16} />
              {logout.isPending ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  )
}

function Dashboard() {
  const { data: user } = useUser()

  return (
    <AppShell>
      <h1 className="text-lg font-semibold tracking-tight text-ink-100">
        Signed in as {user?.name}
      </h1>
      <p className="mt-1 text-ink-70">
        Authentication is wired end to end. Applications and the status pipeline come next.
      </p>
    </AppShell>
  )
}

export default function App() {
  return (
    <RequireAuth>
      <Routes>
        <Route path="/" element={<Dashboard />} />
      </Routes>
    </RequireAuth>
  )
}
