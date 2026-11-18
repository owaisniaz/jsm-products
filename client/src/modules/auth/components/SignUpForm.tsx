import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { RHFInput } from '@/shared/components/form/rhf-input'
import { Button } from '@/shared/components/ui/button'
import { signUpSchema, type SignUpValues } from '@/modules/auth/schemas/auth.schema'
import { useSignUpMutation } from '@/modules/auth/hooks/useAuthMutations'

export function SignUpForm() {
  const mutation = useSignUpMutation()
  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { username: '', email: '', password: '', passwordConfirm: '' },
  })

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      <RHFInput control={form.control} name="username" label="Username" autoComplete="username" />
      <RHFInput control={form.control} name="email" label="Email" type="email" autoComplete="email" />
      <RHFInput control={form.control} name="password" label="Password" type="password" autoComplete="new-password" />
      <RHFInput control={form.control} name="passwordConfirm" label="Confirm password" type="password" autoComplete="new-password" />
      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? 'Creating account...' : 'Create account'}
      </Button>
    </form>
  )
}
