import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { RHFInput } from '@/shared/components/form/rhf-input'
import { RHFRadioCards } from '@/shared/components/form/rhf-radio-cards'
import { Button } from '@/shared/components/ui/button'
import { ORGANIZATION_LEVEL_ICONS } from '@/shared/config/role-icons'
import { organizationSchema, type OrganizationValues } from '@/modules/organization/schemas/organization.schema'
import { useOrganizationSetupMutation } from '@/modules/organization/hooks/useOrganization'

export function CompanySetupForm() {
  const mutation = useOrganizationSetupMutation()
  const form = useForm<OrganizationValues>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      setupType: 'standalone',
      companyName: '',
      companyCode: '',
      groupName: '',
      childCompanyName: '',
      childCompanyCode: '',
    },
  })
  const setupType = form.watch('setupType')

  return (
    <form className="space-y-6" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      <RHFRadioCards control={form.control} name="setupType" options={[
        { value: 'standalone', title: 'Standalone company', description: 'Create a single company workspace.', icon: ORGANIZATION_LEVEL_ICONS.STANDALONE },
        { value: 'group', title: 'Company group', description: 'Create a holding group with an initial child company.', icon: ORGANIZATION_LEVEL_ICONS.GROUP },
      ]} />
      {setupType === 'standalone' ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <RHFInput control={form.control} name="companyName" label="Company name" />
          <RHFInput control={form.control} name="companyCode" label="Company code" placeholder="ACME-01" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <RHFInput control={form.control} name="groupName" label="Holding group name" />
          <RHFInput control={form.control} name="childCompanyName" label="Initial child company" />
          <RHFInput control={form.control} name="childCompanyCode" label="Child company code" placeholder="CHILD-01" />
        </div>
      )}
      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? 'Completing setup...' : 'Complete setup'}
      </Button>
    </form>
  )
}
