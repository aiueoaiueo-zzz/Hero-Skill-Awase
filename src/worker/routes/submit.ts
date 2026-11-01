import { Hono } from "hono";
import { LIMITS } from "../../shared/constants";
import { codeSchema, entryInputSchema, uploadRequestSchema, withdrawSchema } from "../../shared/schema";
import type { EntryResponse, FixSource, StatusResponse, StatusTiming, UploadResponse } from "../../shared/types";
import type { AppEnv } from "../env";
import { toHero, type HeroRow } from "../lib/heroes";
import { genCode, genSecret, nowIso, sha256Hex, ulid } from "../lib/ids";
import { mediaUrl } from "../lib/media";
import { videoAccepting } from "../lib/storage";
import { verifyTurnstile } from "../lib/turnstile";

// 投稿・審査状況・取り下げ（ログイン不要）
export const submitRoutes = new Hono<AppEnv>();

submitRoutes.use("*", async (c, next) => {
  await next();
  c.header("Cache-Control", "no-store");
});

const UPLOAD_URL_TTL_MS = 10 * 60 * 1000; // 署名付き URL の有効期限 10 分
const TICKET_TTL_MS = 60 * 60 * 1000; // アップロードから登録までの猶予

/** 動画の受付状態（投稿フォームの表示用） */
submitRoutes.get("/uploads/status", async (c) => c.json({ accepting: await videoAccepting(c.env) }));

/** 1. 動画アップロードの受付：Turnstile と容量を確認し、アップロード先を返す */
submitRoutes.post("/uploads", async (c) => {
  const parsed = uploadRequestSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid_request" }, 400);
  if (!(await verifyTurnstile(c.env, c.req.raw, parsed.data.turnstileToken))) return c.json({ error: "turnstile_failed" }, 403);
  if (!(await videoAccepting(c.env))) return c.json({ error: "video_not_accepting" }, 503);

  const ticket = genSecret();
  const now = nowIso();
  const uploads: UploadResponse["uploads"] = [];
  const stmts: D1PreparedStatement[] = [];
  for (const f of parsed.data.files) {
    const id = ulid();
    const videoKey = `pending/${id}.mp4`;
    stmts.push(
      c.env.DB.prepare(
        "INSERT INTO uploads (video_key, ticket, declared_size, content_type, created_at) VALUES (?, ?, ?, ?, ?)",
      ).bind(videoKey, ticket, f.size, f.contentType, now),
    );
    // ステップ 5 で R2 への署名付き URL に置き換える。それまでは Worker 経由で受け取る。
    uploads.push({ videoKey, url: `/api/uploads/${id}?t=${ticket}`, method: "PUT", headers: { "Content-Type": f.contentType } });
  }
  await c.env.DB.batch(stmts);
  return c.json<UploadResponse>({ ticket, uploads });
});

/** Worker 経由のアップロード先（R2 の S3 互換 API が使えないローカル開発用） */
submitRoutes.put("/uploads/:id", async (c) => {
  const key = `pending/${c.req.param("id")}.mp4`;
  const row = await c.env.DB.prepare("SELECT ticket, declared_size, created_at, used_at FROM uploads WHERE video_key = ?")
    .bind(key)
    .first<{ ticket: string; declared_size: number; created_at: string; used_at: string | null }>();
  if (!row || row.ticket !== c.req.query("t") || row.used_at) return c.json({ error: "invalid_upload" }, 403);
  if (Date.now() - Date.parse(row.created_at) > UPLOAD_URL_TTL_MS) return c.json({ error: "upload_expired" }, 403);
  if (c.req.header("content-type") !== "video/mp4") return c.json({ error: "invalid_type" }, 400);
  const len = Number(c.req.header("content-length") || 0);
  if (!len || len !== row.declared_size || len > LIMITS.videoBytes) return c.json({ error: "invalid_size" }, 400);
  await c.env.MEDIA.put(key, c.req.raw.body, { httpMetadata: { contentType: "video/mp4" } });
  return c.json({ ok: true });
});

type TimingRow = {
  id: string;
  attacker_id: string;
  target_id: string;
  attack_type: string;
  cue_type: string;
  timing_text: string;
  note: string | null;
  video_key: string;
  status: string;
};

/** 修正提案の元になる公開中のタイミング（承認済みのみ） */
submitRoutes.get("/timings/:id", async (c) => {
  const t = await c.env.DB.prepare("SELECT * FROM timings WHERE id = ? AND status = 'approved'").bind(c.req.param("id")).first<TimingRow>();
  if (!t) return c.json({ error: "not_found" }, 404);
  const { results } = await c.env.DB.prepare("SELECT * FROM heroes WHERE id IN (?, ?)").bind(t.attacker_id, t.target_id).all<HeroRow>();
  const h = (id: string) => toHero(c.env, results.find((r) => r.id === id)!);
  return c.json<FixSource>({
    id: t.id,
    attacker: h(t.attacker_id),
    target: h(t.target_id),
    attackType: t.attack_type as FixSource["attackType"],
    cueType: t.cue_type as FixSource["cueType"],
    timingText: t.timing_text,
    note: t.note,
    videoKey: t.video_key,
    videoUrl: mediaUrl(c.env, t.video_key)!,
  });
});

/** 3. エントリの登録 */
submitRoutes.post("/entries", async (c) => {
  const parsed = entryInputSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid_request", issues: parsed.error.issues.map((i) => i.message) }, 400);
  const input = parsed.data;
  const db = c.env.DB;

  // 認証：動画アップロード時に Turnstile を通過したチケット、またはこのリクエストの Turnstile
  let ticket: string | null = null;
  if (input.uploadTicket) {
    const r = await db.prepare("SELECT MIN(created_at) AS t FROM uploads WHERE ticket = ?").bind(input.uploadTicket).first<{ t: string | null }>();
    if (r?.t && Date.now() - Date.parse(r.t) < TICKET_TTL_MS) ticket = input.uploadTicket;
  }
  if (!ticket && !(await verifyTurnstile(c.env, c.req.raw, input.turnstileToken))) return c.json({ error: "turnstile_failed" }, 403);

  // キャラ
  const heroes = await db.prepare("SELECT id FROM heroes WHERE id IN (?, ?)").bind(input.attackerId, input.targetId).all<{ id: string }>();
  const ids = new Set(heroes.results.map((r) => r.id));
  if (!ids.has(input.attackerId) || !ids.has(input.targetId)) return c.json({ error: "invalid_hero" }, 400);

  // 修正提案：公開中のタイミング 1 つに対して 1 つだけ。攻撃方法・目印・キャラは変更できない
  let original: TimingRow | null = null;
  if (input.replacesTimingId) {
    original = await db.prepare("SELECT * FROM timings WHERE id = ? AND status = 'approved'").bind(input.replacesTimingId).first<TimingRow>();
    if (!original) return c.json({ error: "fix_target_not_found" }, 400);
    const t = input.timings[0];
    if (
      input.timings.length !== 1 ||
      original.attacker_id !== input.attackerId ||
      original.target_id !== input.targetId ||
      original.attack_type !== t.attackType ||
      original.cue_type !== t.cueType
    )
      return c.json({ error: "invalid_fix" }, 400);
  }

  // 動画：このアプリが発行した未使用のキーで、R2 に実在し、サイズが制限内であること
  const keys = input.timings.map((t) => t.videoKey);
  if (new Set(keys).size !== keys.length) return c.json({ error: "duplicate_video" }, 400);
  const sizes: number[] = [];
  for (const key of keys) {
    if (original && key === original.video_key) {
      // 修正提案で動画を変えない場合は、公開中の動画をそのまま使う
      const v = await db.prepare("SELECT video_size FROM timings WHERE id = ?").bind(original.id).first<{ video_size: number }>();
      sizes.push(v?.video_size ?? 0);
      continue;
    }
    const up = await db.prepare("SELECT ticket, used_at FROM uploads WHERE video_key = ?").bind(key).first<{ ticket: string; used_at: string | null }>();
    if (!up || up.used_at || (ticket && up.ticket !== ticket)) return c.json({ error: "invalid_video" }, 400);
    const head = await c.env.MEDIA.head(key);
    if (!head) return c.json({ error: "video_not_uploaded" }, 400);
    if (head.size > LIMITS.videoBytes) return c.json({ error: "video_too_large" }, 400);
    sizes.push(head.size);
  }

  // 登録（submissions と timings を 1 つの batch で）
  const deleteKey = genSecret();
  const deleteKeyHash = await sha256Hex(deleteKey);
  const now = nowIso();
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = genCode();
    const subId = ulid();
    const stmts = [
      db
        .prepare(
          `INSERT INTO submissions (id, code, delete_key_hash, attacker_id, target_id, nickname, support_code, replaces_timing_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(subId, code, deleteKeyHash, input.attackerId, input.targetId, input.nickname, input.supportCode, original?.id ?? null, now),
      ...input.timings.map((t, i) =>
        db
          .prepare(
            `INSERT INTO timings (id, submission_id, attacker_id, target_id, position, attack_type, cue_type, timing_text, note, video_key, video_size, status, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
          )
          .bind(ulid(), subId, input.attackerId, input.targetId, i, t.attackType, t.cueType, t.timingText, t.note, t.videoKey, sizes[i], now),
      ),
      ...keys.filter((k) => k.startsWith("pending/")).map((k) => db.prepare("UPDATE uploads SET used_at = ? WHERE video_key = ?").bind(now, k)),
    ];
    try {
      await db.batch(stmts);
      return c.json<EntryResponse>({ code, deleteKey });
    } catch (e) {
      if (String(e).includes("UNIQUE") && String(e).includes("code")) continue; // 受付番号の衝突 → 作り直す
      throw e;
    }
  }
  return c.json({ error: "code_generation_failed" }, 500);
});

type SubRow = {
  id: string;
  code: string;
  delete_key_hash: string;
  attacker_id: string;
  target_id: string;
  nickname: string | null;
  support_code: string | null;
  replaces_timing_id: string | null;
  created_at: string;
};

/** 審査状況：その受付番号のタイミングだけを返す（ステータスに関係なく） */
submitRoutes.get("/status/:code", async (c) => {
  const code = codeSchema.safeParse(c.req.param("code").toUpperCase());
  if (!code.success) return c.json({ error: "not_found" }, 404);
  const s = await c.env.DB.prepare("SELECT * FROM submissions WHERE code = ?").bind(code.data).first<SubRow>();
  if (!s) return c.json({ error: "not_found" }, 404);
  const [{ results: heroes }, { results: rows }] = await Promise.all([
    c.env.DB.prepare("SELECT * FROM heroes WHERE id IN (?, ?)").bind(s.attacker_id, s.target_id).all<HeroRow>(),
    c.env.DB.prepare("SELECT * FROM timings WHERE submission_id = ? ORDER BY position").bind(s.id).all<
      TimingRow & { position: number; reject_reason: string | null; reviewed_at: string | null }
    >(),
  ]);
  const h = (id: string) => toHero(c.env, heroes.find((r) => r.id === id)!);
  const timings: StatusTiming[] = rows.map((t) => ({
    id: t.id,
    position: t.position,
    attackType: t.attack_type as StatusTiming["attackType"],
    cueType: t.cue_type as StatusTiming["cueType"],
    timingText: t.timing_text,
    note: t.note,
    status: t.status as StatusTiming["status"],
    rejectReason: t.status === "rejected" ? t.reject_reason : null,
    reviewedAt: t.reviewed_at,
    // 承認待ち・却下の動画は一般には見せない（承認済みで公開領域にあるものだけ）
    videoUrl: t.status === "approved" && t.video_key.startsWith("public/") ? mediaUrl(c.env, t.video_key) : null,
  }));
  return c.json<StatusResponse>({
    code: s.code,
    createdAt: s.created_at,
    attacker: h(s.attacker_id),
    target: h(s.target_id),
    nickname: s.nickname,
    supportCode: s.support_code,
    isFix: !!s.replaces_timing_id,
    timings,
  });
});

/** 承認待ちの分を取り下げる（取り下げ用キーが必要） */
submitRoutes.post("/status/:code/withdraw", async (c) => {
  const code = codeSchema.safeParse(c.req.param("code").toUpperCase());
  const body = withdrawSchema.safeParse(await c.req.json().catch(() => null));
  if (!code.success || !body.success) return c.json({ error: "invalid_request" }, 400);
  const s = await c.env.DB.prepare("SELECT id, delete_key_hash FROM submissions WHERE code = ?").bind(code.data).first<SubRow>();
  if (!s || s.delete_key_hash !== (await sha256Hex(body.data.deleteKey))) return c.json({ error: "invalid_delete_key" }, 403);
  const { results } = await c.env.DB.prepare("SELECT id, video_key FROM timings WHERE submission_id = ? AND status = 'pending'")
    .bind(s.id)
    .all<{ id: string; video_key: string }>();
  if (!results.length) return c.json({ withdrawn: 0 });
  const now = nowIso();
  await c.env.DB.batch(
    results.map((t) => c.env.DB.prepare("UPDATE timings SET status = 'withdrawn', updated_at = ? WHERE id = ? AND status = 'pending'").bind(now, t.id)),
  );
  // 承認待ちの動画を削除（公開中の動画を流用した修正提案の場合は消さない）
  const del = results.map((t) => t.video_key).filter((k) => k.startsWith("pending/"));
  if (del.length) await c.env.MEDIA.delete(del);
  return c.json({ withdrawn: results.length });
});
