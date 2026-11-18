export interface ApiErrorDetails {
  code?: string
  message: string
  statusCode: number
  fieldErrors?: Record<string, string[]>
}

export class AppApiError extends Error {
  readonly code?: string
  readonly statusCode: number
  readonly fieldErrors?: Record<string, string[]>

  constructor(details: ApiErrorDetails) {
    super(details.message)
    this.name = 'AppApiError'
    this.code = details.code
    this.statusCode = details.statusCode
    this.fieldErrors = details.fieldErrors
  }
}
