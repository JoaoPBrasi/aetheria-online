import { config } from 'dotenv';
import { z } from 'zod';
config({ path: new URL('../../../../.env', import.meta.url), quiet: true });
export const EnvironmentSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    HOST: z.string().default('127.0.0.1'),
    PORT: z.coerce.number().int().min(1).max(65535).default(2567),
    DEV_IDENTITY_ENABLED: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
    DATABASE_URL: z
      .url()
      .refine(
        (v) => v.startsWith('postgresql://') || v.startsWith('postgres://'),
        'PostgreSQL URL required',
      ),
  })
  .superRefine((v, ctx) => {
    if (v.NODE_ENV === 'production' && v.DEV_IDENTITY_ENABLED)
      ctx.addIssue({
        code: 'custom',
        message: 'Local development identity cannot run in production',
        path: ['DEV_IDENTITY_ENABLED'],
      });
  });
export function readEnvironment(input: Record<string, unknown> = process.env) {
  const result = EnvironmentSchema.safeParse(input);
  if (!result.success)
    throw new Error(
      `Invalid configuration: ${result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
    );
  return result.data;
}
