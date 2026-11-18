import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm, useController } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/shared/components/ui/button'
import { Card } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { RHFInput } from '@/shared/components/form/rhf-input'
import {
  forgotPasswordSchema,
  resetPasswordOtpSchema,
  type ForgotPasswordValues,
  type ResetPasswordOtpValues,
} from '@/modules/auth/schemas/auth.schema'
import {
  useForgotPasswordMutation,
  useResetPasswordMutation,
} from '@/modules/auth/hooks/useAuthMutations'

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const emailForm = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })
  const resetForm = useForm<ResetPasswordOtpValues>({
    resolver: zodResolver(resetPasswordOtpSchema),
    defaultValues: { email: '', otp: '', newPassword: '', confirmPassword: '' },
  })
  const forgotMutation = useForgotPasswordMutation(emailForm.setError)
  const resetMutation = useResetPasswordMutation(resetForm.setError)
  const otp = useController({ control: resetForm.control, name: 'otp' })

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = window.setTimeout(
      () => setResendCooldown((seconds) => Math.max(0, seconds - 1)),
      1000,
    )
    return () => window.clearTimeout(timer)
  }, [resendCooldown])

  function requestCode(values: ForgotPasswordValues, isResend = false) {
    forgotMutation.mutate(values, {
      onSuccess: () => {
        setEmail(values.email)
        if (!isResend) {
          resetForm.reset({
            email: values.email,
            otp: '',
            newPassword: '',
            confirmPassword: '',
          })
          setStep('otp')
        } else {
          toast.success('A new verification code has been sent')
        }
        setResendCooldown(60)
      },
    })
  }

  function submitReset(values: ResetPasswordOtpValues) {
    resetMutation.mutate(values, {
      onSuccess: () => {
        toast.success('Password reset successfully')
        navigate('/auth/signin', { replace: true })
      },
    })
  }

  return (
    <Card className="w-full max-w-md p-7 shadow-none">
      {step === 'email' ? (
        <>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Forgot password?</h1>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">
            Enter your account email and we’ll send you a verification code.
          </p>
          <form
            className="space-y-4"
            onSubmit={emailForm.handleSubmit((values) => requestCode(values))}
          >
            <RHFInput
              control={emailForm.control}
              name="email"
              label="Email"
              type="email"
              autoComplete="email"
            />
            <Button className="w-full" type="submit" disabled={forgotMutation.isPending}>
              {forgotMutation.isPending ? 'Sending code...' : 'Send verification code'}
            </Button>
          </form>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Reset your password</h1>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">
            Enter the 6-digit code sent to <span className="font-medium">{email}</span>, then choose a new password.
          </p>
          <form className="space-y-4" onSubmit={resetForm.handleSubmit(submitReset)}>
            <input type="hidden" {...resetForm.register('email')} />
            <div className="space-y-1.5">
              <Label htmlFor="otp">6-digit verification code</Label>
              <Input
                {...otp.field}
                id="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                pattern="[0-9]{6}"
                aria-invalid={Boolean(otp.fieldState.error)}
              />
              {otp.fieldState.error && (
                <p className="text-sm text-destructive">{otp.fieldState.error.message}</p>
              )}
            </div>
            <RHFInput
              control={resetForm.control}
              name="newPassword"
              label="New password"
              type="password"
              autoComplete="new-password"
            />
            <RHFInput
              control={resetForm.control}
              name="confirmPassword"
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
            />
            <Button className="w-full" type="submit" disabled={resetMutation.isPending}>
              {resetMutation.isPending ? 'Resetting password...' : 'Reset password'}
            </Button>
          </form>
          <div className="mt-4 flex items-center justify-between text-sm">
            <button
              type="button"
              className="font-semibold text-primary hover:underline disabled:text-muted-foreground"
              disabled={resendCooldown > 0 || forgotMutation.isPending}
              onClick={() => requestCode({ email }, true)}
            >
              {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend OTP'}
            </button>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => {
                emailForm.setValue('email', email)
                setStep('email')
              }}
            >
              Change email
            </button>
          </div>
        </>
      )}
      <p className="mt-5 text-center text-sm text-muted-foreground">
        Remember your password?{' '}
        <Link className="font-semibold text-primary hover:underline" to="/auth/signin">
          Sign in
        </Link>
      </p>
    </Card>
  )
}
