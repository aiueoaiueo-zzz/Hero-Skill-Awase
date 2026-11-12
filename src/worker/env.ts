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
  /** Discord の Webhook URL（新しい投稿などを通知。未設定なら通知しない） */
  DISCORD_WEBHOOK_URL?: string;

  // vars
  /** "public"（一般向け）／"admin"（管理用）／"all"（ローカル開発：両方）。未設定は "all" */
  APP_ROLE?: string;
  TURNSTILE_SITE_KEY: string;
  ACCESS_TEAM_DOMAIN: string;
  ACCESS_AUD: string;
  STORAGE_LIMIT_BYTES: string;
  PENDING_LIMIT_BYTES: string;
  MEDIA_BASE_URL: string;
  /** 一般向けアプリの URL（X 共有のリンク先。管理用の Worker からも一般向けを指すため） */
  PUBLIC_APP_URL?: string;
  /** 管理用アプリの URL（Discord 通知のリンク先） */
  ADMIN_APP_URL?: string;
  /** 14 日以上審査されない承認待ち："keep"（残す・初期値）／"delete"（取り下げて動画を削除） */
  PENDING_EXPIRE_ACTION?: string;
  /** "staging" なら確認用サイト（画面に帯を出し、検索エンジンに載せない）。本番は空（docs/DECISIONS.md AK） */
  SITE_STAGE?: string;
}

export type AppEnv = { Bindings: Env };
