import { Link } from 'react-router-dom'
import { Card } from '@/shared/components/ui/card'
import { SignUpForm } from '@/modules/auth/components/SignUpForm'

export function SignUpPage() {
  return (
    <Card className="w-full max-w-md p-7">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Create your account</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">Set up your workspace and continue to company onboarding.</p>
      <SignUpForm />
      <p className="mt-5 text-center text-sm text-muted-foreground">Already registered? <Link className="font-semibold text-primary hover:underline" to="/auth/signin">Sign in</Link></p>
    </Card>
  )
}
