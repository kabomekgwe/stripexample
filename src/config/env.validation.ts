import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_API_VERSION: z.string().default('2024-06-20'),
  PINO_LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
  OTEL_ENABLED: z.enum(['true', 'false']).optional(),
  OTEL_SERVICE_NAME: z.string().default('new-stripe-api'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  OTEL_EXPORTER_OTLP_HEADERS: z.string().optional(),
  OTEL_TRACE_SAMPLE_RATIO: z.coerce.number().min(0).max(1).default(1),
  OTEL_DIAGNOSTIC_LOG_LEVEL: z
    .enum(['none', 'error', 'warn', 'info', 'debug', 'verbose', 'all'])
    .optional(),
  OTEL_IGNORE_PATHS: z.string().optional(),
  OTEL_STRICT_STARTUP: z.enum(['true', 'false']).optional(),
  BILLING_EMAIL_WEBHOOK_URL: z.string().url().optional(),
  BILLING_USAGE_METER_EVENT_NAME: z.string().default('monthly_usage'),
  SWAGGER_ENABLED: z.enum(['true', 'false']).optional(),
  SWAGGER_PATH: z.string().default('docs'),
  SWAGGER_DOCS_TOKEN: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function envValidation(config: Record<string, unknown>): Env {
  /**
   * Validates and normalizes environment variables at startup.
   */
  return envSchema.parse(config);
}
