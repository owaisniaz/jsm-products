import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { RHFInput } from '@/shared/components/form/rhf-input'
import { Button } from '@/shared/components/ui/button'
import { Card } from '@/shared/components/ui/card'
import {
  updatePasswordSchema,
  type UpdatePasswordValues,
} from '@/modules/auth/schemas/auth.schema'
import { useUpdatePasswordMutation } from '@/modules/auth/hooks/useAuthMutations'

export function UpdatePasswordForm() {
  const form = useForm<UpdatePasswordValues>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })
  const mutation = useUpdatePasswordMutation(form.setError)

  return (
    <Card className="w-full max-w-xl p-6 shadow-none">
      <h2 className="text-lg font-semibold text-foreground">Update password</h2>
      <p className="mt-1 mb-5 text-sm text-muted-foreground">
        Choose a new password. Other signed-in sessions will be revoked.
      </p>
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit((values) =>
          mutation.mutate(values, {
            onSuccess: () => {
              form.reset()
              toast.success('Password updated successfully')
            },
          }),
        )}
      >
        <RHFInput
          control={form.control}
          name="currentPassword"
          label="Current password"
          type="password"
          autoComplete="current-password"
        />
        <RHFInput
          control={form.control}
          name="newPassword"
          label="New password"
          type="password"
          autoComplete="new-password"
        />
        <RHFInput
          control={form.control}
          name="confirmPassword"
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
        />
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Updating password...' : 'Update password'}
        </Button>
      </form>
    </Card>
  )
}
