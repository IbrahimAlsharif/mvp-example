import { z } from "zod";

/**
 * Centralized, zod-validated environment access. Importing `env` anywhere
 * guarantees the process fails fast at boot if config is missing/malformed,
 * rather than producing a subtle runtime bug later.
 *
 * Note: MEDIA_GET_TTL_SECONDS is capped at 600 (10 minutes) to enforce the
 * US-3.3 signed-URL expiry invariant at the config boundary.
 */
const schema = z.object({
  DATABASE_URL: z.string().url(),

  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().min(1),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_FORCE_PATH_STYLE: z
    .string()
    .optional()
    .transform((v) => v === "true"),

  MEDIA_GET_TTL_SECONDS: z.coerce.number().int().positive().max(600).default(600),
  SHARE_LINK_DEFAULT_TTL_HOURS: z.coerce.number().int().positive().default(168),
  UPLOAD_ABANDON_THRESHOLD_HOURS: z.coerce.number().int().positive().default(48),

  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
  APP_URL: z.string().url().default("http://localhost:3000"),

  OAUTH_GOOGLE_CLIENT_ID: z.string().optional().default(""),
  OAUTH_GOOGLE_CLIENT_SECRET: z.string().optional().default(""),

  RESEND_API_KEY: z.string().optional().default(""),
  EMAIL_FROM: z.string().optional().default("Human Timeline <noreply@localhost>"),
});

export const env = schema.parse(process.env);

export const isGoogleOAuthEnabled =
  env.OAUTH_GOOGLE_CLIENT_ID !== "" && env.OAUTH_GOOGLE_CLIENT_SECRET !== "";
