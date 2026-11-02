import type { Env } from "./env";
import { nowIso } from "./lib/ids";
import { deleteMedia, recordStmt } from "./lib/storage";

// 1 日 1 回の自動処理（仕様 6-4・8-2）

const HOUR = 60 * 60 * 1000;
const ORPHAN_AFTER_MS = 24 * HOUR; // アップロードされたのに登録されなかった動画
const PENDING_EXPIRE_DAYS = 14;
export const PENDING_EXPIRE_REASON = "14日以上審査されなかったため、自動で削除しました";

export type MaintenanceReport = {
  r2Objects: number;
  deleted: string[];
  ledgerFixed: number;
  expiredPending: number;
  totalBytes: number;
};

async function listAll(bucket: R2Bucket) {
  const objs: { key: string; size: number; uploaded: Date }[] = [];
  let cursor: string | undefined;
  do {
    const r = await bucket.list({ cursor, limit: 1000 });
    for (const o of r.objects) objs.push({ key: o.key, size: o.size, uploaded: o.uploaded });
    cursor = r.truncated ? r.cursor : undefined;
  } while (cursor);
  return objs;
}

export async function runMaintenance(env: Env, now = Date.now()): Promise<MaintenanceReport> {
  const db = env.DB;
  const iso = nowIso();
  let expiredPending = 0;

  // 1. 14 日以上審査されずに残っている承認待ち：環境変数で「残す（初期値）」か「削除」を選ぶ
  if ((env.PENDING_EXPIRE_ACTION || "keep") === "delete") {
    const before = new Date(now - PENDING_EXPIRE_DAYS * 24 * HOUR).toISOString();
    const { results } = await db
      .prepare(
        `SELECT t.id FROM timings t JOIN submissions s ON s.id = t.submission_id
          WHERE t.status = 'pending' AND s.created_at < ?`,
      )
      .bind(before)
      .all<{ id: string }>();
    for (let i = 0; i < results.length; i += 50) {
      const ids = results.slice(i, i + 50).map((r) => r.id);
      const r = await db
        .prepare(`UPDATE timings SET status = 'rejected', reject_reason = ?, reviewed_at = ?, updated_at = ? WHERE status = 'pending' AND id IN (${ids.map(() => "?").join(",")})`)
        .bind(PENDING_EXPIRE_REASON, iso, iso, ...ids)
        .run();
      expiredPending += r.meta.changes;
    }
  }

  // 2. 使われている動画・画像（公開中・承認待ちのタイミング、キャラ画像）
  const used = new Set<string>();
  const { results: vk } = await db.prepare("SELECT DISTINCT video_key AS k FROM timings WHERE status IN ('pending','approved')").all<{ k: string }>();
  vk.forEach((r) => used.add(r.k));
  const { results: hk } = await db.prepare("SELECT image_key AS k FROM heroes WHERE image_key IS NOT NULL").all<{ k: string }>();
  hk.forEach((r) => used.add(r.k));
  // アップロード先を発行して 24 時間以内のもの（これから登録される可能性がある）
  const recentFrom = new Date(now - ORPHAN_AFTER_MS).toISOString();
  const { results: rk } = await db.prepare("SELECT video_key AS k FROM uploads WHERE used_at IS NULL AND created_at >= ?").bind(recentFrom).all<{ k: string }>();
  const recent = new Set(rk.map((r) => r.k));

  // 3. R2 の実際の一覧から、使われていないものを削除
  //    （却下・取り下げ・修正で置き換えられた動画、登録されなかったアップロード、外されたキャラ画像）
  const objects = await listAll(env.MEDIA);
  const garbage = objects
    .filter((o) => !used.has(o.key) && !recent.has(o.key) && now - o.uploaded.getTime() > ORPHAN_AFTER_MS)
    .map((o) => o.key);
  await deleteMedia(env, garbage);

  // 4. 台帳を R2 の実際の値と照合する
  const actual = new Map(objects.filter((o) => !garbage.includes(o.key)).map((o) => [o.key, o.size]));
  const { results: ledger } = await db.prepare("SELECT key, size FROM media_objects").all<{ key: string; size: number }>();
  const fixes: D1PreparedStatement[] = [];
  const ledgerKeys = new Set<string>();
  for (const row of ledger) {
    ledgerKeys.add(row.key);
    const size = actual.get(row.key);
    if (size === undefined) {
      // R2 にない：発行直後の予約（24 時間以内）だけ残す
      if (!recent.has(row.key)) fixes.push(db.prepare("DELETE FROM media_objects WHERE key = ?").bind(row.key));
    } else if (size !== row.size) fixes.push(recordStmt(env, row.key, size, iso));
  }
  for (const [key, size] of actual) if (!ledgerKeys.has(key)) fixes.push(recordStmt(env, key, size, iso));
  for (let i = 0; i < fixes.length; i += 100) await db.batch(fixes.slice(i, i + 100));

  // 5. 古いアップロード記録を片付ける（7 日以上前）
  await db.prepare("DELETE FROM uploads WHERE created_at < ?").bind(new Date(now - 7 * 24 * HOUR).toISOString()).run();

  const total = await db.prepare("SELECT COALESCE(SUM(size), 0) AS n FROM media_objects").first<{ n: number }>();
  return { r2Objects: objects.length, deleted: garbage, ledgerFixed: fixes.length, expiredPending, totalBytes: total?.n ?? 0 };
}
