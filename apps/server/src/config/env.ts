import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().optional(),
  CORS_ORIGIN: z.string().default('*'),
  WS_MAX_PAYLOAD_BYTES: z.coerce.number().default(1048576), // 1 MB payload limit
  PERSISTENCE_FLUSH_INTERVAL_MS: z.coerce.number().default(2500),
});

export const env = envSchema.parse(process.env);
