import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/infra/database/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? './sqlite.db',
  },
  strict: true,
  verbose: true,
});
