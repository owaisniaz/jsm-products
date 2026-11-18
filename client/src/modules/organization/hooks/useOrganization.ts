import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { AppApiError } from '@/shared/api/api-error'
import { organizationApi } from '@/modules/organization/api/organization.api'
import type { OrganizationValues } from '@/modules/organization/schemas/organization.schema'
import { useAuthStore } from '@/modules/auth/store/useAuthStore'

export function useOrganizationSetupMutation() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const completeCompanySetup = useAuthStore((state) => state.completeCompanySetup)
  return useMutation({
    mutationFn: (values: OrganizationValues) => organizationApi.setup(values),
    onSuccess: async () => {
      completeCompanySetup()
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tenant'] }),
        queryClient.invalidateQueries({ queryKey: ['user'] }),
      ])
      toast.success('Company setup completed')
      navigate('/dashboard', { replace: true })
    },
    onError: (error: AppApiError) => toast.error(error.message),
  })
}

export function useCompaniesQuery() {
  return useQuery({
    queryKey: ['tenant', 'companies'],
    queryFn: organizationApi.listCompanies,
  })
}
