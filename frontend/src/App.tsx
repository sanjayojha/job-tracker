import { Route, Routes } from 'react-router'
import { RequireAuth } from './features/auth/RequireAuth'
import { useLogout, useUser } from './features/auth/api'

function Dashboard() {
  const { data: user } = useUser()
  const logout = useLogout()

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <span className="text-sm font-semibold text-slate-900">Job Tracker</span>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-600">{user?.email}</span>
            <button
              type="button"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              className="rounded border border-slate-300 px-2 py-1 text-slate-800 hover:bg-slate-50 focus:ring-2 focus:ring-slate-400 focus:outline-none disabled:opacity-60"
            >
              {logout.isPending ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-lg font-semibold text-slate-900">Signed in as {user?.name}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Authentication is wired end to end. Applications and the status pipeline come next.
        </p>
      </main>
    </div>
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
