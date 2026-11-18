import { Card } from '@/shared/components/ui/card'
import { CompanySetupForm } from '@/modules/organization/components/CompanySetupForm'

export function CompanyOnboardingPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10 text-foreground">
      <Card className="w-full max-w-2xl p-7">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Company setup</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Choose your organization structure</h1>
        <p className="mt-1 mb-7 text-sm text-muted-foreground">Complete this step before entering the dashboard.</p>
        <CompanySetupForm />
      </Card>
    </main>
  )
}
