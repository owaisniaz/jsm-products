import { Link } from 'react-router-dom'
import { Card } from '@/shared/components/ui/card'
import { SignInForm } from '@/modules/auth/components/SignInForm'

export function SignInPage() {
  return (
    <Card className="w-full max-w-md p-7">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Welcome back</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">Sign in to your workspace.</p>
      <SignInForm />
      <p className="mt-5 text-center text-sm text-muted-foreground">New here? <Link className="font-semibold text-primary hover:underline" to="/auth/signup">Create an account</Link></p>
    </Card>
  )
}
