import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { RHFInput } from '@/shared/components/form/rhf-input'
import { Button } from '@/shared/components/ui/button'
import { signInSchema, type SignInValues } from '@/modules/auth/schemas/auth.schema'
import { useSignInMutation } from '@/modules/auth/hooks/useAuthMutations'

export function SignInForm() {
  const mutation = useSignInMutation()
  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  })
  return (
    <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      <RHFInput control={form.control} name="email" label="Email" type="email" autoComplete="email" />
      <RHFInput control={form.control} name="password" label="Password" type="password" autoComplete="current-password" />
      <div className="-mt-2 text-right">
        <Link className="text-sm font-semibold text-primary hover:underline" to="/auth/forgot-password">
          Forgot password?
        </Link>
      </div>
      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? 'Signing in...' : 'Sign in'}
      </Button>
    </form>
  )
}
