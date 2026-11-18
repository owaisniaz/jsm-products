import type {
  FieldPath,
  FieldValues,
  UseFormSetError,
} from 'react-hook-form'
import { AppApiError } from '@/shared/api/api-error'

export function mapServerErrorsToForm<T extends FieldValues>(
  error: AppApiError,
  setError: UseFormSetError<T>,
): boolean {
  const fieldErrors = Object.entries(error.fieldErrors ?? {})
  if (fieldErrors.length === 0) return false

  for (const [field, messages] of fieldErrors) {
    const message = messages[0]
    if (message) {
      setError(field as FieldPath<T>, { type: 'server', message })
    }
  }
  return true
}
