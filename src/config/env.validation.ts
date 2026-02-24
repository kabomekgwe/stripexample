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
});

export type Env = z.infer<typeof envSchema>;

export function envValidation(config: Record<string, unknown>): Env {
  /**
   * Validates and normalizes environment variables at startup.
   */
  return envSchema.parse(config);
}
