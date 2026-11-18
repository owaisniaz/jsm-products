import { Building2, Users, Activity } from 'lucide-react'
import { Card } from '@/shared/components/ui/card'
import { useCompaniesQuery } from '@/modules/organization/hooks/useOrganization'

export function DashboardPage() {
  const companies = useCompaniesQuery()
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
      <div>
        <p className="text-sm text-muted-foreground">Overview</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Companies', value: companies.data?.data.length ?? 0, icon: Building2 },
          { label: 'Team members', value: 0, icon: Users },
          { label: 'Active systems', value: 1, icon: Activity },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">{label}</span>
              <Icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}
