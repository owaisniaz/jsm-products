import type { FieldPath, FieldValues } from 'react-hook-form'
import { useController, type Control } from 'react-hook-form'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'

interface Props<T extends FieldValues> {
  control: Control<T>
  name: FieldPath<T>
  label: string
  type?: 'text' | 'email' | 'password'
  placeholder?: string
  autoComplete?: string
}

export function RHFInput<T extends FieldValues>({ control, name, label, ...props }: Props<T>) {
  const { field, fieldState } = useController({ control, name })
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} {...field} {...props} />
      {fieldState.error && <p className="text-sm text-destructive">{fieldState.error.message}</p>}
    </div>
  )
}
