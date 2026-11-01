import type { Env } from "../env";

/** R2 のキーから公開 URL を作る（MEDIA_BASE_URL で独自ドメインに切り替え可能） */
export const mediaUrl = (env: Env, key: string | null | undefined): string | null =>
  key ? `${(env.MEDIA_BASE_URL || "/media").replace(/\/$/, "")}/${key}` : null;
