import { z } from 'zod'

const BooleanEnvSchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim().toLowerCase() : value),
  z.enum(['true', 'false']),
).transform((value) => value === 'true')

const PortEnvSchema = z.coerce.number().int().min(1).max(65_535)

const AbsoluteUrlSchema = z
  .string()
  .trim()
  .min(1)
  .url()
  .transform((value) => value.replace(/\/+$/, ''))

const ApiBaseUrlSchema = z
  .string()
  .trim()
  .min(1)
  .refine(
    (value) => {
      if (value.startsWith('/')) return true
      try {
        new URL(value)
        return true
      } catch {
        return false
      }
    },
    { message: 'Expected an absolute URL or an absolute path such as /api' },
  )
  .transform((value) => {
    if (value === '/') return value
    return value.replace(/\/+$/, '')
  })

const RelayerBaseUrlSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\/+$/, ''))
  .refine(
    (value) => {
      if (value === '') return true
      try {
        new URL(value)
        return true
      } catch {
        return false
      }
    },
    { message: 'Expected an absolute URL or empty string (same-origin)' },
  )

const PublicFrontendEnvSchema = z.object({
  VITE_API_BASE_URL: ApiBaseUrlSchema,
  VITE_USE_MOCK_API: BooleanEnvSchema,
  VITE_REOWN_PROJECT_ID: z.string().trim().min(1),
  VITE_RELAYER_BASE_URL: RelayerBaseUrlSchema.default(''),
})

const FrontendDevServerEnvSchema = z.object({
  FRONTEND_PORT: PortEnvSchema.optional(),
  VITE_DEV_API_PROXY_TARGET: AbsoluteUrlSchema.optional(),
})

type PublicFrontendEnvRaw = z.infer<typeof PublicFrontendEnvSchema>
type FrontendDevServerEnvRaw = z.infer<typeof FrontendDevServerEnvSchema>

function formatEnvError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const key = issue.path.join('.') || 'environment'
      return `- ${key}: ${issue.message}`
    })
    .join('\n')
}

function parseWithSchema<T>(schema: z.ZodType<T>, rawEnv: Record<string, unknown>, label: string): T {
  const result = schema.safeParse(rawEnv)

  if (!result.success) {
    throw new Error(
      `${label} environment validation failed:\n${formatEnvError(result.error)}`,
    )
  }

  return result.data
}

export interface PublicFrontendEnv {
  apiBaseUrl: string
  useMockApi: boolean
  reownProjectId: string
  relayerBaseUrl: string
}

export interface FrontendDevServerEnv {
  frontendPort?: number
  devApiProxyTarget?: string
}

export function parsePublicFrontendEnv(rawEnv: Record<string, unknown>): PublicFrontendEnv {
  const env = parseWithSchema<PublicFrontendEnvRaw>(
    PublicFrontendEnvSchema,
    rawEnv,
    'Frontend public',
  )

  return {
    apiBaseUrl: env.VITE_API_BASE_URL,
    useMockApi: env.VITE_USE_MOCK_API,
    reownProjectId: env.VITE_REOWN_PROJECT_ID,
    relayerBaseUrl: env.VITE_RELAYER_BASE_URL,
  }
}

export function parseFrontendBuildEnv(rawEnv: Record<string, unknown>): PublicFrontendEnv {
  return parsePublicFrontendEnv(rawEnv)
}

export function parseFrontendDevServerEnv(rawEnv: Record<string, unknown>): FrontendDevServerEnv {
  const env = parseWithSchema<FrontendDevServerEnvRaw>(
    FrontendDevServerEnvSchema,
    rawEnv,
    'Frontend dev server',
  )

  return {
    frontendPort: env.FRONTEND_PORT,
    devApiProxyTarget: env.VITE_DEV_API_PROXY_TARGET,
  }
}
