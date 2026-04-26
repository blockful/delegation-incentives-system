import { env } from '@/config/env'
import { api as realApi } from './client'
import { mockApi } from './mock'

export const api = env.useMockApi ? mockApi : realApi

export { ApiClientError } from './client'
export type * from './types'
