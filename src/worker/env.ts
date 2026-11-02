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
  /** "public"（一般向け）／"admin"（管理用）／"all"（ローカル開発：両方）。未設定は "all" */
  APP_ROLE?: string;
  TURNSTILE_SITE_KEY: string;
  ACCESS_TEAM_DOMAIN: string;
  ACCESS_AUD: string;
  STORAGE_LIMIT_BYTES: string;
  PENDING_LIMIT_BYTES: string;
  MEDIA_BASE_URL: string;
  /** 14 日以上審査されない承認待ち："keep"（残す・初期値）／"delete"（取り下げて動画を削除） */
  PENDING_EXPIRE_ACTION?: string;
}

export type AppEnv = { Bindings: Env };
