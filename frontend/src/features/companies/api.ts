import { useQuery } from '@tanstack/react-query'
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
