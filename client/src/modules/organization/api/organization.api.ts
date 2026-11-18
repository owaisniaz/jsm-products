import { axiosInstance } from '@/shared/api/axios-instance'
import type { OrganizationValues } from '@/modules/organization/schemas/organization.schema'

export interface Company {
  id: string
  name: string
  companyCode: string
  groupId: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Group {
  id: string
  name: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CompanyList {
  data: Company[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

export const organizationApi = {
  setup: async (values: OrganizationValues): Promise<Company> => {
    if (values.setupType === 'standalone') {
      return axiosInstance.post<Company, Company>('/companies', {
        name: values.companyName,
        companyCode: values.companyCode,
        groupId: null,
        isActive: true,
      })
    }
    const group = await axiosInstance.post<Group, Group>('/groups', {
      name: values.groupName,
      isActive: true,
    })
    return axiosInstance.post<Company, Company>('/companies', {
      name: values.childCompanyName,
      companyCode: values.childCompanyCode,
      groupId: group.id,
      isActive: true,
    })
  },
  listCompanies: () =>
    axiosInstance.get<CompanyList, CompanyList>('/companies'),
}
