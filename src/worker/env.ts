export interface Env {
  DB: D1Database;
  MEDIA: R2Bucket;
  ASSETS: Fetcher;

  // secret（wrangler secret put / .dev.vars）
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET_NAME?: string;
  TURNSTILE_SECRET_KEY?: string;

  // vars
  TURNSTILE_SITE_KEY: string;
  ACCESS_TEAM_DOMAIN: string;
  ACCESS_AUD: string;
  STORAGE_LIMIT_BYTES: string;
  PENDING_LIMIT_BYTES: string;
  MEDIA_BASE_URL: string;
}

export type AppEnv = { Bindings: Env };
