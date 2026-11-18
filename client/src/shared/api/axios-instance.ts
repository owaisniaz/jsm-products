import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { AppApiError } from '@/shared/api/api-error'

interface ApiEnvelope<T> {
  success: boolean
  statusCode: number
  message: string
  data: T
  error?: {
    code?: string
    message?: string
    fieldErrors?: Record<string, string[]>
  }
}

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1',
  withCredentials: true,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
})

let refreshPromise: Promise<unknown> | null = null

axiosInstance.interceptors.response.use(
  (response: AxiosResponse<ApiEnvelope<unknown> | unknown>) => {
    const payload = response.data
    if (payload && typeof payload === 'object' && 'success' in payload && 'data' in payload) {
      return { ...response, data: payload.data }
    }
    return response
  },
  async (error: AxiosError<ApiEnvelope<unknown>>) => {
    const response = error.response
    const request = error.config as RetriableConfig | undefined
    const statusCode = response?.status ?? 0

    if (statusCode === 401 && request && !request._retry && !request.url?.includes('/auth/refresh')) {
      request._retry = true
      try {
        refreshPromise ??= axiosInstance.post('/auth/refresh')
        await refreshPromise
        refreshPromise = null
        return axiosInstance.request(request)
      } catch {
        refreshPromise = null
      }
    }

    const payload = response?.data
    const message =
      payload?.error?.message ??
      payload?.message ??
      (statusCode === 0 ? 'Unable to reach the server' : 'Request failed')
    throw new AppApiError({
      code: payload?.error?.code,
      message,
      statusCode,
      fieldErrors: payload?.error?.fieldErrors,
    })
  },
)
