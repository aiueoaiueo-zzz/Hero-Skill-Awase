import type { StorageUsage } from "../../shared/types";
import type { Env } from "../env";
import { nowIso } from "./ids";

// 課金を防ぐ安全装置（仕様 8-2）：R2 の使用量を D1 の台帳（media_objects）で記録する

const num = (v: string | undefined, d: number) => (v && Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);
export const storageLimit = (env: Env) => num(env.STORAGE_LIMIT_BYTES, 9 * 1024 ** 3);
export const pendingLimit = (env: Env) => num(env.PENDING_LIMIT_BYTES, 2 * 1024 ** 3);

export async function getUsage(env: Env): Promise<StorageUsage> {
  const r = await env.DB.prepare(
    `SELECT COALESCE(SUM(size), 0) AS total,
            COALESCE(SUM(CASE WHEN key LIKE 'pending/%' THEN size ELSE 0 END), 0) AS pending
       FROM media_objects`,
  ).first<{ total: number; pending: number }>();
  return { totalBytes: r?.total ?? 0, pendingBytes: r?.pending ?? 0, limitBytes: storageLimit(env), pendingLimitBytes: pendingLimit(env) };
}

/**
 * 新しい動画を受け付けられるか。
 * 合計が上限（初期値 9GB）を超える、または承認待ちの合計が上限（初期値 2GB）を超える場合は受け付けない。
 * incoming：これから受け付ける動画の合計（宣言サイズ）
 */
export async function videoAccepting(env: Env, incoming = 0): Promise<boolean> {
  const u = await getUsage(env);
  return u.totalBytes + incoming <= u.limitBytes && u.pendingBytes + incoming <= u.pendingLimitBytes;
}

/** 台帳に記録（追加・サイズ更新） */
export const recordStmt = (env: Env, key: string, size: number, now = nowIso()) =>
  env.DB.prepare(
    "INSERT INTO media_objects (key, size, created_at, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET size = excluded.size, updated_at = excluded.updated_at",
  ).bind(key, size, now, now);

export const recordObject = (env: Env, key: string, size: number) => recordStmt(env, key, size).run();

/** R2 から削除し、台帳からも消す */
export async function deleteMedia(env: Env, keys: string[]) {
  const ks = [...new Set(keys)].filter(Boolean);
  if (!ks.length) return;
  for (let i = 0; i < ks.length; i += 1000) await env.MEDIA.delete(ks.slice(i, i + 1000));
  for (let i = 0; i < ks.length; i += 50) {
    const part = ks.slice(i, i + 50);
    await env.DB.prepare(`DELETE FROM media_objects WHERE key IN (${part.map(() => "?").join(",")})`).bind(...part).run();
  }
}

/** 公開中・承認待ちのどのタイミング／キャラ画像からも使われていない動画・画像を削除する */
export async function deleteIfUnused(env: Env, keys: string[]) {
  const garbage: string[] = [];
  for (const key of new Set(keys)) {
    const used = await env.DB.prepare(
      "SELECT 1 FROM timings WHERE video_key = ? AND status IN ('pending','approved') UNION ALL SELECT 1 FROM heroes WHERE image_key = ? LIMIT 1",
    )
      .bind(key, key)
      .first();
    if (!used) garbage.push(key);
  }
  await deleteMedia(env, garbage);
}
