import { SignOutIcon } from '@phosphor-icons/react'
import { Navigate, NavLink, Route, Routes } from 'react-router'
import { RequireAuth } from './features/auth/RequireAuth'
import { useLogout, useUser } from './features/auth/api'
import { ApplicationsPage } from './features/applications/ApplicationsPage'
import { NewApplicationPage } from './features/applications/NewApplicationPage'
import { ApplicationDetailPage } from './features/applications/ApplicationDetailPage'

function AppShell({ children }: { children: React.ReactNode }) {
  const { data: user } = useUser()
  const logout = useLogout()

  return (
    <div className="min-h-screen bg-ink-10">
      <header className="border-b border-ink-20 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <span className="font-semibold tracking-tight text-ink-100">Job Tracker</span>
            <nav className="flex items-center gap-1">
              <NavLink
                to="/applications"
                className={({ isActive }) =>
                  `px-2 py-1 ${isActive ? 'border-b-2 border-brand-60 text-ink-100' : 'text-ink-70 hover:text-ink-100'}`
                }
              >
                Applications
              </NavLink>
            </nav>
          </div>
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

export default function App() {
  return (
    <RequireAuth>
      <AppShell>
        <Routes>
          {/* The list is the app's home for now. `/` stays free for the
              dashboard, which is a later piece of work. */}
          <Route path="/" element={<Navigate to="/applications" replace />} />
          <Route path="/applications" element={<ApplicationsPage />} />
          <Route path="/applications/new" element={<NewApplicationPage />} />
          {/* After /new, so the literal segment is not swallowed by :id. */}
          <Route path="/applications/:id" element={<ApplicationDetailPage />} />
          <Route path="*" element={<Navigate to="/applications" replace />} />
        </Routes>
      </AppShell>
    </RequireAuth>
  )
}
