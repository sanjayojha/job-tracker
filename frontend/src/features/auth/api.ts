import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, apiFetch } from '../../lib/api'

export type User = {
  id: number
  name: string
  email: string
}

type UserResponse = { data: User }
type Credentials = { email: string; password: string }

/** Single source of truth for the cache key, so invalidation cannot drift. */
export const authKeys = {
  user: ['auth', 'user'] as const,
}

/**
 * The session cookie is HttpOnly, so the SPA cannot read auth state directly.
 * Asking the API who we are is the only way to know, and the answer is what
 * the whole app keys off.
 */
export function useUser() {
  return useQuery({
    queryKey: authKeys.user,
    queryFn: async () => {
      try {
        const { data } = await apiFetch<UserResponse>('/user')
        return data
      } catch (error) {
        // A 401 is the expected answer for a logged-out visitor, not a
        // failure. Returning null keeps it out of the error path so the UI
        // renders a login form instead of an error state.
        if (error instanceof ApiError && error.status === 401) {
          return null
        }
        throw error
      }
    },
    retry: false,
    staleTime: Infinity,
  })
}

export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (credentials: Credentials) => {
      const { data } = await apiFetch<UserResponse>('/login', {
        method: 'POST',
        body: credentials,
      })
      return data
    },
    onSuccess: (user) => {
      queryClient.setQueryData(authKeys.user, user)
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => apiFetch<{ message: string }>('/logout', { method: 'POST' }),
    onSuccess: () => {
      // Order matters. Flip auth state first so mounted components re-render
      // straight to the login form.
      queryClient.setQueryData(authKeys.user, null)

      // Then drop everything else: cached data belonged to the session that
      // just ended and must not leak into the next one. Deliberately not
      // clear(), which would also discard the value just written and leave
      // the UI showing a signed-in shell until the next reload.
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== 'auth',
      })
    },
  })
}
