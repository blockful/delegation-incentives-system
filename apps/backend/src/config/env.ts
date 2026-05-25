import { z } from "zod";

const PortSchema = z.coerce.number().int().min(1).max(65_535);

const BackendEnvSchema = z.object({
  BLOCKFUL_API_TOKEN: z.string().trim().min(1, "BLOCKFUL_API_TOKEN is required"),
  GATEFUL_UPSTREAM_URL: z
    .string()
    .trim()
    .min(1, "GATEFUL_UPSTREAM_URL is required")
    .url("GATEFUL_UPSTREAM_URL must be an absolute URL"),

  DATABASE_URL: z.string().trim().min(1).optional(),
  DATABASE_SCHEMA: z.string().trim().min(1).optional(),
  ALLOWED_ORIGINS: z.string().trim().optional(),
  ROUND_MONTHS: z.string().trim().optional(),
  GATEFUL_UPSTREAM_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
  BACKEND_PORT: PortSchema.optional(),
  PORT: PortSchema.optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).optional(),
  VITEST: z.string().optional(),
});

export type BackendEnv = z.infer<typeof BackendEnvSchema>;

function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => `- ${issue.path.join(".") || "env"}: ${issue.message}`)
    .join("\n");
}

function parseBackendEnv(raw: NodeJS.ProcessEnv): BackendEnv {
  const result = BackendEnvSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      `Backend environment validation failed:\n${formatZodError(result.error)}`,
    );
  }
  return result.data;
}

export const env: BackendEnv = parseBackendEnv(process.env);
