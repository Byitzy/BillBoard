import { z } from 'zod';

// Client-side environment schema
const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'Supabase anonymous key is required'),
  NEXT_PUBLIC_APP_NAME: z.string().default('BillBoard'),
  NEXT_PUBLIC_DEFAULT_LOCALE: z.string().default('en-CA'),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
});

// Server-side environment schema
const serverEnvSchema = clientEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, 'Supabase service role key is required'),
  SUPABASE_DB_URL: z.string().url('Invalid database URL').optional(),
  SUPABASE_DB_PASSWORD: z.string().optional(),
  SUPABASE_PROJECT_REF: z.string().optional(),
  // Optional email service keys
  RESEND_API_KEY: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  // Optional storage keys
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_REGION: z.string().optional(),
  // Skip validation flag
  SKIP_ENV_VALIDATION: z.coerce.boolean().default(false),
});

type ClientEnv = z.infer<typeof clientEnvSchema>;
type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Validates client-side environment variables
 * Safe to use in browser environments
 */
export function validateClientEnvironment(): ClientEnv {
  try {
    return clientEnvSchema.parse({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
      NEXT_PUBLIC_DEFAULT_LOCALE: process.env.NEXT_PUBLIC_DEFAULT_LOCALE,
      NODE_ENV: process.env.NODE_ENV,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(
        (issue) => `${issue.path.join('.')}: ${issue.message}`
      );
      throw new Error(`Environment validation failed:\n${issues.join('\n')}`);
    }
    throw error;
  }
}

/**
 * Validates server-side environment variables
 * Only use in server-side code (API routes, middleware, etc.)
 */
export function validateServerEnvironment(): ServerEnv {
  // Skip validation if explicitly requested (e.g., during build)
  if (process.env.SKIP_ENV_VALIDATION === 'true') {
    console.warn('⚠️ Environment validation skipped');
    return {} as ServerEnv;
  }

  try {
    return serverEnvSchema.parse({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
      NEXT_PUBLIC_DEFAULT_LOCALE: process.env.NEXT_PUBLIC_DEFAULT_LOCALE,
      NODE_ENV: process.env.NODE_ENV,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_DB_URL: process.env.SUPABASE_DB_URL,
      SUPABASE_DB_PASSWORD: process.env.SUPABASE_DB_PASSWORD,
      SUPABASE_PROJECT_REF: process.env.SUPABASE_PROJECT_REF,
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
      AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
      AWS_REGION: process.env.AWS_REGION,
      SKIP_ENV_VALIDATION: process.env.SKIP_ENV_VALIDATION,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(
        (issue) => `${issue.path.join('.')}: ${issue.message}`
      );
      console.error('❌ Environment validation failed:');
      issues.forEach((issue) => console.error(`  - ${issue}`));
      throw new Error(
        `Environment validation failed. Check the above errors and update your .env.local file.`
      );
    }
    throw error;
  }
}

// Validated environment variables for type-safe access
// Only include client-safe variables here
export const env = (() => {
  try {
    return validateClientEnvironment();
  } catch (error) {
    console.error('❌ Failed to validate environment:', error);
    // Return defaults for build-time compatibility
    return {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'BillBoard',
      NEXT_PUBLIC_DEFAULT_LOCALE:
        process.env.NEXT_PUBLIC_DEFAULT_LOCALE || 'en-CA',
      NODE_ENV:
        (process.env.NODE_ENV as 'development' | 'production' | 'test') ||
        'development',
    } as ClientEnv;
  }
})();

// Server-side environment (lazy evaluation)
let _serverEnv: ServerEnv | null = null;
export const serverEnv = (): ServerEnv => {
  if (!_serverEnv) {
    _serverEnv = validateServerEnvironment();
  }
  return _serverEnv;
};

// Legacy exports for backward compatibility
export const validateEnvironment = validateClientEnvironment;

export type { ClientEnv, ServerEnv };
