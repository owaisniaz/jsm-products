import type { FieldPath, FieldValues } from 'react-hook-form'
import { useController, type Control } from 'react-hook-form'
import type { LucideIcon } from 'lucide-react'

interface Option { value: string; title: string; description: string; icon?: LucideIcon }
interface Props<T extends FieldValues> { control: Control<T>; name: FieldPath<T>; options: Option[] }

export function RHFRadioCards<T extends FieldValues>({ control, name, options }: Props<T>) {
  const { field, fieldState } = useController({ control, name })
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {options.map((option) => (
        <label key={option.value} className={`cursor-pointer rounded-lg border p-4 transition-colors ${field.value === option.value ? 'border-primary bg-accent' : 'border-border bg-card hover:bg-muted/40'}`}>
          <input type="radio" className="sr-only" checked={field.value === option.value} onChange={() => field.onChange(option.value)} />
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
            {option.icon && <option.icon aria-hidden="true" size={16} strokeWidth={1.75} className="text-primary" />}
            {option.title}
          </span>
          <span className="mt-1 block text-sm text-muted-foreground">{option.description}</span>
        </label>
      ))}
      {fieldState.error && <p className="text-sm text-destructive">{fieldState.error.message}</p>}
    </div>
  )
}
