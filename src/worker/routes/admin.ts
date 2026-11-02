import { Hono } from "hono";
import { SETTING_KEYS } from "../../shared/constants";
import { approveSchema, rejectSchema, settingsSchema } from "../../shared/schema";
import type { AdminGroup, AdminPendingResponse, AdminPublished, AdminTiming } from "../../shared/types";
import type { AppEnv, Env } from "../env";
import { requireAdmin } from "../lib/admin-auth";
import { adminHeroRoutes } from "./admin-heroes";
import { listHeroes } from "../lib/heroes";
import { nowIso } from "../lib/ids";
import { mediaUrl } from "../lib/media";
import { serveR2 } from "../lib/serve";
import { getSettings } from "../lib/settings";
import { ensureShareCodes } from "../lib/share-code";
import { deleteIfUnused, deleteMedia, getUsage, recordObject } from "../lib/storage";

// 管理者向け API（/api/admin/*）。Cloudflare Access で保護し、Worker でも JWT を検証する
export const adminRoutes = new Hono<AppEnv>();
adminRoutes.use("*", requireAdmin("api"));
adminRoutes.use("*", async (c, next) => {
  await next();
  if (!c.req.path.startsWith("/api/admin/media/")) c.header("Cache-Control", "no-store");
});

type Row = {
  id: string;
  submission_id: string;
  attacker_id: string;
  target_id: string;
  position: number;
  attack_type: AdminTiming["attackType"];
  cue_type: AdminTiming["cueType"];
  timing_text: string;
  note: string | null;
  video_key: string;
  video_size: number | null;
  status: string;
  reviewed_at: string | null;
  hidden?: number;
  share_code?: string | null;
  credit_submission_id?: string | null;
};

/** 管理画面で再生する動画の URL（承認待ちは管理者用の配信、それ以外は公開 URL） */
const adminVideoUrl = (env: Env, key: string) => (key.startsWith("pending/") ? `/api/admin/media/${key}` : mediaUrl(env, key));
const toAdminTiming = (env: Env, r: Row): AdminTiming => ({
  id: r.id,
  position: r.position,
  attackType: r.attack_type,
  cueType: r.cue_type,
  timingText: r.timing_text,
  note: r.note,
  videoKey: r.video_key,
  videoUrl: adminVideoUrl(env, r.video_key),
});

/** 承認待ち一覧（受付番号ごとにまとめ、古い順） */
adminRoutes.get("/pending", async (c) => {
  const db = c.env.DB;
  const { results } = await db
    .prepare(
      `SELECT t.*, s.code, s.created_at AS s_created, s.nickname, s.support_code, s.replaces_timing_id,
              (SELECT COUNT(*) FROM timings x WHERE x.submission_id = s.id) AS total
         FROM timings t JOIN submissions s ON s.id = t.submission_id
        WHERE t.status = 'pending'
        ORDER BY s.created_at, s.id, t.position`,
    )
    .all<Row & { code: string; s_created: string; nickname: string | null; support_code: string | null; replaces_timing_id: string | null; total: number }>();

  const origIds = [...new Set(results.map((r) => r.replaces_timing_id).filter((x): x is string => !!x))];
  const originals = new Map<string, Row & { nickname: string | null; support_code: string | null }>();
  for (let i = 0; i < origIds.length; i += 50) {
    const ids = origIds.slice(i, i + 50);
    const { results: os } = await db
      .prepare(
        `SELECT t.*, s.nickname, s.support_code FROM timings t JOIN submissions s ON s.id = COALESCE(t.credit_submission_id, t.submission_id) WHERE t.id IN (${ids.map(() => "?").join(",")})`,
      )
      .bind(...ids)
      .all<Row & { nickname: string | null; support_code: string | null }>();
    os.forEach((o) => originals.set(o.id, o));
  }

  const heroes = new Map((await listHeroes(c.env)).map((h) => [h.id, h]));
  const groups: AdminGroup[] = [];
  for (const r of results) {
    let g = groups[groups.length - 1];
    if (!g || g.code !== r.code) {
      const o = r.replaces_timing_id ? originals.get(r.replaces_timing_id) : undefined;
      g = {
        code: r.code,
        createdAt: r.s_created,
        attacker: heroes.get(r.attacker_id)!,
        target: heroes.get(r.target_id)!,
        nickname: r.nickname,
        supportCode: r.support_code,
        total: r.total,
        isFix: !!r.replaces_timing_id,
        original: o
          ? { ...toAdminTiming(c.env, o), nickname: o.nickname, supportCode: o.support_code, reviewedAt: o.reviewed_at, status: o.status as NonNullable<AdminGroup["original"]>["status"] }
          : null,
        timings: [],
      };
      groups.push(g);
    }
    g.timings.push(toAdminTiming(c.env, r));
  }
  return c.json<AdminPendingResponse>({ groups, usage: await getUsage(c.env) });
});

const getPending = (env: Env, id: string) =>
  env.DB.prepare("SELECT t.*, s.replaces_timing_id FROM timings t JOIN submissions s ON s.id = t.submission_id WHERE t.id = ?")
    .bind(id)
    .first<Row & { replaces_timing_id: string | null }>();

/** 承認（edits があれば「編集して承認」） */
adminRoutes.post("/timings/:id/approve", async (c) => {
  const body = approveSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!body.success) return c.json({ error: "invalid_request", issues: body.error.issues.map((i) => i.message) }, 400);
  const env = c.env;
  const t = await getPending(env, c.req.param("id"));
  if (!t || t.status !== "pending") return c.json({ error: "not_pending" }, 409);

  const e = body.data.edits;
  const fixOf = t.replaces_timing_id;
  // 修正提案は攻撃方法と目印を変更できない
  if (e && fixOf && (e.attackType !== t.attack_type || e.cueType !== t.cue_type)) return c.json({ error: "invalid_fix_edit" }, 400);
  const v = {
    attackType: e?.attackType ?? t.attack_type,
    cueType: e?.cueType ?? t.cue_type,
    timingText: e?.timingText ?? t.timing_text,
    note: e ? e.note : t.note,
  };

  let original: Row | null = null;
  if (fixOf) {
    original = await env.DB.prepare("SELECT * FROM timings WHERE id = ?").bind(fixOf).first<Row>();
    // 非公開にした元のタイミングへの修正提案は承認しない（公開に戻してから）
    if (!original || original.status !== "approved" || original.hidden) return c.json({ error: "fix_target_not_approved" }, 409);
  }

  // 1. 動画を公開領域へコピー（pending/ → public/）
  let videoKey = t.video_key;
  let copied: string | null = null;
  if (t.video_key.startsWith("pending/")) {
    const src = await env.MEDIA.get(t.video_key);
    if (!src) return c.json({ error: "video_missing" }, 409);
    videoKey = "public/" + t.video_key.slice("pending/".length);
    await env.MEDIA.put(videoKey, src.body, { httpMetadata: { contentType: "video/mp4", cacheControl: "public, max-age=31536000, immutable" } });
    await recordObject(env, videoKey, src.size);
    copied = videoKey;
  }

  // 2. D1 を 1 つの batch で更新
  const now = nowIso();
  const db = env.DB;
  const stillPending = "EXISTS (SELECT 1 FROM timings p WHERE p.id = ? AND p.status = 'pending')";
  const stmts: D1PreparedStatement[] = [];
  if (original) {
    // 修正提案：元のタイミングを修正案の内容で置き換え、修正案は merged にする
    stmts.push(
      db
        // 表示する投稿者も、修正した人（修正提案の submission）にする
        .prepare(
          `UPDATE timings SET timing_text = ?, note = ?, video_key = ?, video_size = ?, credit_submission_id = ?, updated_at = ? WHERE id = ? AND status = 'approved' AND ${stillPending}`,
        )
        .bind(v.timingText, v.note, videoKey, t.video_size, t.submission_id, now, original.id, t.id),
      db
        .prepare("UPDATE timings SET status = 'merged', timing_text = ?, note = ?, video_key = ?, reviewed_at = ?, updated_at = ? WHERE id = ? AND status = 'pending'")
        .bind(v.timingText, v.note, videoKey, now, now, t.id),
    );
  } else {
    stmts.push(
      db
        .prepare(
          "UPDATE timings SET status = 'approved', attack_type = ?, cue_type = ?, timing_text = ?, note = ?, video_key = ?, reviewed_at = ?, updated_at = ? WHERE id = ? AND status = 'pending'",
        )
        .bind(v.attackType, v.cueType, v.timingText, v.note, videoKey, now, now, t.id),
    );
  }
  let changed = 0;
  try {
    const res = await db.batch(stmts);
    changed = res[res.length - 1].meta.changes;
  } catch (err) {
    if (copied) await deleteMedia(env, [copied]);
    throw err;
  }
  if (!changed) {
    // ほかの操作と重なって、すでに審査済みだった
    if (copied) await deleteIfUnused(env, [copied]);
    return c.json({ error: "not_pending" }, 409);
  }

  // 3. 使われなくなった動画を削除（承認待ち側の元ファイル、置き換えられた元の動画）
  const garbage = [];
  if (copied) garbage.push(t.video_key);
  if (original && original.video_key !== videoKey) garbage.push(original.video_key);
  await deleteIfUnused(env, garbage);
  // 共有用の短いコード（修正提案は、置き換えた元のタイミングのコード）
  const publicId = original ? original.id : t.id;
  const shareCode = (await ensureShareCodes(env, [publicId])).get(publicId) ?? null;
  return c.json({ ok: true, merged: !!original, shareCode });
});

/** 却下（理由は任意）。動画は削除する */
adminRoutes.post("/timings/:id/reject", async (c) => {
  const body = rejectSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!body.success) return c.json({ error: "invalid_request" }, 400);
  const t = await getPending(c.env, c.req.param("id"));
  if (!t || t.status !== "pending") return c.json({ error: "not_pending" }, 409);
  const now = nowIso();
  const r = await c.env.DB.prepare(
    "UPDATE timings SET status = 'rejected', reject_reason = ?, reviewed_at = ?, updated_at = ? WHERE id = ? AND status = 'pending'",
  )
    .bind(body.data.reason, now, now, t.id)
    .run();
  if (!r.meta.changes) return c.json({ error: "not_pending" }, 409);
  if (t.video_key.startsWith("pending/")) await deleteIfUnused(c.env, [t.video_key]);
  return c.json({ ok: true });
});

adminRoutes.route("/heroes", adminHeroRoutes);

// ===== 公開中のタイミングの管理（非公開・公開に戻す・削除） =====

/** R2 のファイルを別のキーにコピーして、容量の記録にも追加する */
async function copyObject(env: Env, from: string, to: string) {
  const src = await env.MEDIA.get(from);
  if (!src) throw new Error("video_missing");
  await env.MEDIA.put(to, src.body, { httpMetadata: { contentType: "video/mp4", cacheControl: "public, max-age=31536000, immutable" } });
  await recordObject(env, to, src.size);
}

/** 公開中・非公開のタイミングの一覧（新しく承認した順） */
adminRoutes.get("/published", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT t.*, s.code, cs.nickname, cs.support_code
       FROM timings t
       JOIN submissions s ON s.id = t.submission_id
       JOIN submissions cs ON cs.id = COALESCE(t.credit_submission_id, t.submission_id)
      WHERE t.status = 'approved'
      ORDER BY t.reviewed_at DESC
      LIMIT 1000`,
  ).all<Row & { code: string; nickname: string | null; support_code: string | null }>();
  const heroes = new Map((await listHeroes(c.env)).map((h) => [h.id, h]));
  const items: AdminPublished[] = results.map((r) => ({
    id: r.id,
    attacker: heroes.get(r.attacker_id)!,
    target: heroes.get(r.target_id)!,
    attackType: r.attack_type,
    cueType: r.cue_type,
    timingText: r.timing_text,
    note: r.note,
    videoUrl: adminVideoUrl(c.env, r.video_key),
    nickname: r.nickname,
    supportCode: r.support_code,
    reviewedAt: r.reviewed_at,
    hidden: !!r.hidden,
    shareCode: r.share_code ?? null,
    code: r.code,
  }));
  return c.json({ items });
});

/** 非公開にする：一般向けから外し、動画も pending/ に移して /media から見えなくする */
adminRoutes.post("/timings/:id/hide", async (c) => {
  const env = c.env;
  const t = await env.DB.prepare("SELECT * FROM timings WHERE id = ? AND status = 'approved'").bind(c.req.param("id")).first<Row>();
  if (!t) return c.json({ error: "not_found" }, 404);
  if (t.hidden) return c.json({ ok: true });
  const to = t.video_key.startsWith("public/") ? "pending/" + t.video_key.slice("public/".length) : t.video_key;
  if (to !== t.video_key) {
    try {
      await copyObject(env, t.video_key, to);
    } catch {
      return c.json({ error: "video_missing" }, 409);
    }
  }
  const r = await env.DB.prepare("UPDATE timings SET hidden = 1, video_key = ?, updated_at = ? WHERE id = ? AND status = 'approved' AND hidden = 0")
    .bind(to, nowIso(), t.id)
    .run();
  if (!r.meta.changes) return c.json({ error: "conflict" }, 409);
  if (to !== t.video_key) await deleteIfUnused(env, [t.video_key]); // ほかの修正提案が同じ動画を使っていれば残る
  return c.json({ ok: true });
});

/** 公開に戻す */
adminRoutes.post("/timings/:id/unhide", async (c) => {
  const env = c.env;
  const t = await env.DB.prepare("SELECT * FROM timings WHERE id = ? AND status = 'approved'").bind(c.req.param("id")).first<Row>();
  if (!t) return c.json({ error: "not_found" }, 404);
  if (!t.hidden) return c.json({ ok: true });
  const to = t.video_key.startsWith("pending/") ? "public/" + t.video_key.slice("pending/".length) : t.video_key;
  if (to !== t.video_key) {
    try {
      await copyObject(env, t.video_key, to);
    } catch {
      return c.json({ error: "video_missing" }, 409);
    }
  }
  const r = await env.DB.prepare("UPDATE timings SET hidden = 0, video_key = ?, updated_at = ? WHERE id = ? AND status = 'approved' AND hidden = 1")
    .bind(to, nowIso(), t.id)
    .run();
  if (!r.meta.changes) return c.json({ error: "conflict" }, 409);
  if (to !== t.video_key) await deleteIfUnused(env, [t.video_key]);
  return c.json({ ok: true });
});

/** 削除：タイミングと動画を消す（元に戻せない）。投稿にほかのタイミングが残っていなければ投稿ごと消す */
adminRoutes.delete("/timings/:id", async (c) => {
  const env = c.env;
  const db = env.DB;
  const t = await db.prepare("SELECT * FROM timings WHERE id = ? AND status = 'approved'").bind(c.req.param("id")).first<Row>();
  if (!t) return c.json({ error: "not_found" }, 404);
  await db.batch([
    // このタイミングへの修正提案（承認待ち・反映済み）からの参照を外す
    db.prepare("UPDATE submissions SET replaces_timing_id = NULL WHERE replaces_timing_id = ?").bind(t.id),
    db.prepare("DELETE FROM timings WHERE id = ?").bind(t.id),
    // 投稿にタイミングが残っておらず、ほかのタイミングの投稿者表示にも使われていなければ投稿ごと削除
    db
      .prepare(
        `DELETE FROM submissions WHERE id = ?
           AND NOT EXISTS (SELECT 1 FROM timings WHERE submission_id = ?)
           AND NOT EXISTS (SELECT 1 FROM timings WHERE credit_submission_id = ?)`,
      )
      .bind(t.submission_id, t.submission_id, t.submission_id),
  ]);
  await deleteIfUnused(env, [t.video_key]);
  return c.json({ ok: true });
});

/** 承認待ちの動画（管理者のみ） */
adminRoutes.on(["GET", "HEAD"], "/media/*", async (c) => {
  const key = decodeURIComponent(c.req.path.replace(/^\/api\/admin\/media\//, ""));
  if (!key.startsWith("pending/") || key.includes("..")) return c.text("Not Found", 404);
  return serveR2(c.env.MEDIA, c.req.raw, key, "private, no-store");
});

/** 設定（制作者の応援コード・注意事項・このアプリについて） */
adminRoutes.get("/settings", async (c) => c.json(await getSettings(c.env)));
adminRoutes.put("/settings", async (c) => {
  const body = settingsSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: "invalid_request", issues: body.error.issues.map((i) => i.message) }, 400);
  const now = nowIso();
  const stmts = SETTING_KEYS.filter((k) => body.data[k] !== undefined).map((k) =>
    c.env.DB.prepare("INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at").bind(
      k,
      body.data[k]!,
      now,
    ),
  );
  if (stmts.length) await c.env.DB.batch(stmts);
  return c.json(await getSettings(c.env));
});
