import { api as realApi } from './client'
import { mockApi } from './mock'

export const api =
  import.meta.env.VITE_API_BASE_URL ? realApi : mockApi

export { ApiClientError } from './client'
export type * from './types'
