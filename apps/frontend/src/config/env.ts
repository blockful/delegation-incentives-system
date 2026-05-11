import { parsePublicFrontendEnv } from './env.schema'

export const env = parsePublicFrontendEnv(import.meta.env)
