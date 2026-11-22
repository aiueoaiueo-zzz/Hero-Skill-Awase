import { Hono } from "hono";
import { posterChangeSchema, posterChangeWithdrawSchema } from "../../shared/schema";
import type { PosterChangeResponse } from "../../shared/types";
import type { AppEnv, Env } from "../env";
import { nowIso, sha256Hex, ulid } from "../lib/ids";
import { posterChangePayload, sendDiscord } from "../lib/notify";

// 投稿者情報（X の ID・応援コード）の変更申請（docs/DECISIONS.md AY）
//   投稿したブラウザに残っている「受付番号と取り下げ用キー」で本人と確かめる。まとめて複数の投稿を申請できる。
//   - まだ公開前（承認済み・採用済みのタイミングがない）の投稿：申請を挟まず、すぐ書き換える
//   - 公開中の投稿：審査待ちの申請にし、管理者が承認したら反映する
export const posterChangeRoutes = new Hono<AppEnv>();

posterChangeRoutes.use("*", async (c, next) => {
  await next();
  c.header("Cache-Control", "no-store");
});

type Owned = { id: string; code: string; nickname: string | null; support_code: string | null };

/** 受付番号と取り下げ用キーを確かめる。1 つでも合わなければ null（全部やめる） */
async function verifyOwned(env: Env, items: { code: string; deleteKey: string }[]): Promise<Owned[] | null> {
  const want = new Map<string, string>();
  for (const it of items) want.set(it.code.toUpperCase(), it.deleteKey);
  const out: Owned[] = [];
  const codes = [...want.keys()];
  for (let i = 0; i < codes.length; i += 50) {
    const part = codes.slice(i, i + 50);
    const { results } = await env.DB.prepare(
      `SELECT id, code, delete_key_hash, nickname, support_code FROM submissions WHERE code IN (${part.map(() => "?").join(",")})`,
    )
      .bind(...part)
      .all<Owned & { delete_key_hash: string }>();
    if (results.length !== part.length) return null;
    for (const r of results) {
      if (r.delete_key_hash !== (await sha256Hex(want.get(r.code)!))) return null;
      out.push({ id: r.id, code: r.code, nickname: r.nickname, support_code: r.support_code });
    }
  }
  return out;
}

/** 公開中（承認済み・非公開を含む／修正提案が採用されて表示に使われている）の投稿の ID */
async function publishedIds(env: Env, ids: string[]): Promise<Set<string>> {
  const set = new Set<string>();
  for (let i = 0; i < ids.length; i += 40) {
    const part = ids.slice(i, i + 40);
    const q = part.map(() => "?").join(",");
    const { results } = await env.DB.prepare(
      `SELECT submission_id AS id FROM timings WHERE submission_id IN (${q}) AND status IN ('approved', 'merged')
       UNION SELECT credit_submission_id AS id FROM timings WHERE credit_submission_id IN (${q}) AND status = 'approved'`,
    )
      .bind(...part, ...part)
      .all<{ id: string }>();
    for (const r of results) set.add(r.id);
  }
  return set;
}

/** 審査待ちの申請から、これらの投稿を外す（空になった申請は取り下げ扱い）SQL */
const detachStmts = (env: Env, ids: string[]) =>
  ids.map((id) =>
    env.DB.prepare(
      "DELETE FROM poster_change_items WHERE submission_id = ? AND change_id IN (SELECT id FROM poster_changes WHERE status = 'pending')",
    ).bind(id),
  );
const closeEmptyStmt = (env: Env, now: string) =>
  env.DB.prepare(
    "UPDATE poster_changes SET status = 'withdrawn', reviewed_at = ? WHERE status = 'pending' AND NOT EXISTS (SELECT 1 FROM poster_change_items i WHERE i.change_id = poster_changes.id)",
  ).bind(now);

/** 変更を申請する */
posterChangeRoutes.post("/poster-changes", async (c) => {
  const body = posterChangeSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: "invalid_request", issues: body.error.issues.map((i) => i.message) }, 400);
  const { nickname, supportCode } = body.data;
  const env = c.env;
  const owned = await verifyOwned(env, body.data.items);
  if (!owned) return c.json({ error: "invalid_delete_key" }, 403);

  const published = await publishedIds(env, owned.map((s) => s.id));
  const direct = owned.filter((s) => !published.has(s.id));
  // 公開中で、今と同じ内容のものは申請しない
  const review = owned.filter((s) => published.has(s.id) && (s.nickname !== nickname || s.support_code !== supportCode));
  const now = nowIso();
  const changeId = ulid();
  const stmts = [
    ...detachStmts(env, owned.map((s) => s.id)),
    ...direct.map((s) => env.DB.prepare("UPDATE submissions SET nickname = ?, support_code = ? WHERE id = ?").bind(nickname, supportCode, s.id)),
    ...(review.length
      ? [
          env.DB.prepare("INSERT INTO poster_changes (id, nickname, support_code, status, created_at) VALUES (?, ?, ?, 'pending', ?)").bind(
            changeId,
            nickname,
            supportCode,
            now,
          ),
          ...review.map((s) =>
            env.DB.prepare("INSERT INTO poster_change_items (change_id, submission_id, old_nickname, old_support_code) VALUES (?, ?, ?, ?)").bind(
              changeId,
              s.id,
              s.nickname,
              s.support_code,
            ),
          ),
        ]
      : []),
    closeEmptyStmt(env, now),
  ];
  await env.DB.batch(stmts);

  if (review.length && env.DISCORD_WEBHOOK_URL) {
    c.executionCtx.waitUntil(
      (async () => {
        const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM poster_changes WHERE status = 'pending'").first<{ n: number }>();
        await sendDiscord(
          env,
          posterChangePayload(env, { codes: review.map((s) => s.code), oldNickname: review[0].nickname, nickname, pendingTotal: n?.n ?? 1 }),
        );
      })(),
    );
  }
  return c.json<PosterChangeResponse>({ applied: direct.length, requested: review.length });
});

/** 申請を取り下げる（審査待ちのものだけ） */
posterChangeRoutes.post("/poster-changes/withdraw", async (c) => {
  const body = posterChangeWithdrawSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: "invalid_request" }, 400);
  const owned = await verifyOwned(c.env, body.data.items);
  if (!owned) return c.json({ error: "invalid_delete_key" }, 403);
  await c.env.DB.batch([...detachStmts(c.env, owned.map((s) => s.id)), closeEmptyStmt(c.env, nowIso())]);
  return c.json({ ok: true });
});
