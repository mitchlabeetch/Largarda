import { createContext, useContext } from 'react'
import type { ApiClient } from './client'

const ApiClientContext = createContext<ApiClient | null>(null)

export const ApiClientProvider = ApiClientContext.Provider

export function useApi(): ApiClient {
  const client = useContext(ApiClientContext)
  if (!client) {
    throw new Error('useApi must be used within an ApiClientProvider')
  }
  return client
}
