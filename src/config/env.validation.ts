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
