import type { StorageUsage } from "../../shared/types";
import type { Env } from "../env";

const num = (v: string | undefined, d: number) => (v && Number.isFinite(Number(v)) ? Number(v) : d);
export const storageLimit = (env: Env) => num(env.STORAGE_LIMIT_BYTES, 9 * 1024 ** 3);
export const pendingLimit = (env: Env) => num(env.PENDING_LIMIT_BYTES, 2 * 1024 ** 3);

/**
 * 動画の使用量（D1 の記録から集計）。
 * ステップ 6 で、アップロード・削除のたびに増減する記録と Cron による実測照合に置き換える。
 */
export async function getUsage(env: Env): Promise<StorageUsage> {
  const r = await env.DB.prepare(
    `SELECT
       COALESCE(SUM(size), 0) AS total,
       COALESCE(SUM(CASE WHEN video_key LIKE 'pending/%' THEN size ELSE 0 END), 0) AS pending
     FROM (SELECT video_key, MAX(COALESCE(video_size, 0)) AS size FROM timings WHERE status IN ('pending','approved') GROUP BY video_key)`,
  ).first<{ total: number; pending: number }>();
  return { totalBytes: r?.total ?? 0, pendingBytes: r?.pending ?? 0, limitBytes: storageLimit(env), pendingLimitBytes: pendingLimit(env) };
}

/** 新しい動画を受け付けられるか（課金防止の安全装置） */
export async function videoAccepting(env: Env): Promise<boolean> {
  const u = await getUsage(env);
  return u.totalBytes < u.limitBytes && u.pendingBytes < u.pendingLimitBytes;
}
