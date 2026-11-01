import { Hono } from "hono";
import { SETTING_KEYS } from "../../shared/constants";
import { approveSchema, rejectSchema, settingsSchema } from "../../shared/schema";
import type { AdminGroup, AdminPendingResponse, AdminTiming } from "../../shared/types";
import type { AppEnv, Env } from "../env";
import { requireAdmin } from "../lib/admin-auth";
import { listHeroes } from "../lib/heroes";
import { nowIso } from "../lib/ids";
import { mediaUrl } from "../lib/media";
import { serveR2 } from "../lib/serve";
import { getSettings } from "../lib/settings";
import { getUsage } from "../lib/storage";

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
        `SELECT t.*, s.nickname, s.support_code FROM timings t JOIN submissions s ON s.id = t.submission_id WHERE t.id IN (${ids.map(() => "?").join(",")})`,
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

/** 公開中・承認待ちのどのタイミングからも使われていない動画を削除する */
async function deleteIfUnused(env: Env, keys: string[]) {
  for (const key of new Set(keys)) {
    const used = await env.DB.prepare("SELECT 1 FROM timings WHERE video_key = ? AND status IN ('pending','approved') LIMIT 1").bind(key).first();
    if (!used) await env.MEDIA.delete(key);
  }
}

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
    if (!original || original.status !== "approved") return c.json({ error: "fix_target_not_approved" }, 409);
  }

  // 1. 動画を公開領域へコピー（pending/ → public/）
  let videoKey = t.video_key;
  let copied: string | null = null;
  if (t.video_key.startsWith("pending/")) {
    const src = await env.MEDIA.get(t.video_key);
    if (!src) return c.json({ error: "video_missing" }, 409);
    videoKey = "public/" + t.video_key.slice("pending/".length);
    await env.MEDIA.put(videoKey, src.body, { httpMetadata: { contentType: "video/mp4", cacheControl: "public, max-age=31536000, immutable" } });
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
        .prepare(`UPDATE timings SET timing_text = ?, note = ?, video_key = ?, video_size = ?, updated_at = ? WHERE id = ? AND status = 'approved' AND ${stillPending}`)
        .bind(v.timingText, v.note, videoKey, t.video_size, now, original.id, t.id),
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
    if (copied) await env.MEDIA.delete(copied);
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
  return c.json({ ok: true, merged: !!original });
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
