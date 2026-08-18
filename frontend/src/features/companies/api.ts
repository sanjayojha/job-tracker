import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../../lib/api'
import type { Company } from '../applications/api'

type CompanyWithCount = Company & { applications_count?: number }

type CompaniesResponse = { data: CompanyWithCount[] }

export const companyKeys = {
  all: ['companies'] as const,
  list: () => ['companies', 'list'] as const,
}

/**
 * The whole list, unpaginated -- the API returns it that way on purpose so a
 * picker can filter it locally without a round trip per keystroke.
 */
export function useCompanies() {
  return useQuery({
    queryKey: companyKeys.list(),
    queryFn: async () => {
      const { data } = await apiFetch<CompaniesResponse>('/companies')
      return data
    },
    // Companies change far less often than applications do.
    staleTime: 5 * 60_000,
  })
}

/**
 * Creates a company from the picker, without leaving the form someone is
 * mid-way through filling in.
 *
 * Note the response carries no `applications_count`: CompanyResource only
 * includes it `whenCounted`, and `store` does not count. Anything reading it
 * off a freshly created company gets undefined, not 0.
 */
export function useCreateCompany() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (name: string) => {
      const { data } = await apiFetch<{ data: CompanyWithCount }>('/companies', {
        method: 'POST',
        body: { name },
      })
      return data
    },
    onSuccess: (company) => {
      // Seed the list rather than refetching it: the picker is open and about
      // to select this company, and a round trip here is a visible stall.
      queryClient.setQueryData<CompanyWithCount[]>(companyKeys.list(), (current) =>
        current ? [...current, company].sort((a, b) => a.name.localeCompare(b.name)) : current,
      )
      // Still invalidate, so the authoritative ordering and counts arrive
      // in the background.
      queryClient.invalidateQueries({ queryKey: companyKeys.all })
    },
  })
}
