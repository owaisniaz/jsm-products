import { RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { queryClient } from '@/app/query-client'
import { router } from '@/app/router'
import { ThemeProvider } from '@/shared/components/theme/ThemeProvider'
import { useTheme } from '@/shared/components/theme/useTheme'

function AppContent() {
  const { resolvedTheme } = useTheme()

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster position="top-right" richColors closeButton theme={resolvedTheme} />
    </QueryClientProvider>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}
