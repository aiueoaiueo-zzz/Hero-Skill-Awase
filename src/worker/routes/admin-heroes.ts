import { Hono } from "hono";
import { heroAddSchema, heroMoveSchema, heroPatchSchema } from "../../shared/schema";
import { NG_ATTACK_TYPES } from "../../shared/constants";
import type { AdminHero } from "../../shared/types";
import type { AppEnv, Env } from "../env";
import { toHero, type HeroRow } from "../lib/heroes";
import { nowIso, ulid } from "../lib/ids";
import { deleteIfUnused, deleteMedia } from "../lib/storage";

// 管理：キャラ管理（仕様 4-7）。/api/admin/heroes 以下（requireAdmin は admin.ts 側で適用済み）
export const adminHeroRoutes = new Hono<AppEnv>();


async function listAdminHeroes(env: Env): Promise<AdminHero[]> {
  const { results } = await env.DB.prepare(
    `SELECT h.*, (SELECT COUNT(*) FROM timings t WHERE t.attacker_id = h.id OR t.target_id = h.id) AS timing_count
       FROM heroes h ORDER BY h.sort_order, h.created_at`,
  ).all<HeroRow & { timing_count: number }>();
  return results.map((r) => ({ ...toHero(env, r), sortOrder: r.sort_order, timingCount: r.timing_count }));
}

const dupError = (e: unknown) => {
  const s = String(e);
  if (s.includes("UNIQUE") && s.includes("heroes.name")) return "duplicate_name";
  if (s.includes("UNIQUE") && s.includes("heroes.slug")) return "duplicate_slug";
  return null;
};

adminHeroRoutes.get("/", async (c) => c.json({ heroes: await listAdminHeroes(c.env) }));

/** 追加（1 行に 1 キャラ。slug を省略したら仮の slug を付ける） */
adminHeroRoutes.post("/", async (c) => {
  const body = heroAddSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: "invalid_request", issues: body.error.issues.map((i) => i.message) }, 400);
  const db = c.env.DB;
  const { results } = await db.prepare("SELECT name, slug, sort_order FROM heroes").all<{ name: string; slug: string; sort_order: number }>();
  const names = new Set(results.map((r) => r.name));
  const slugs = new Set(results.map((r) => r.slug));
  let order = results.reduce((m, r) => Math.max(m, r.sort_order), 0);
  let n = results.length;
  const now = nowIso();
  const stmts: D1PreparedStatement[] = [];
  const skipped: string[] = [];
  for (const it of body.data.items) {
    if (names.has(it.name)) {
      skipped.push(it.name);
      continue;
    }
    let slug = it.slug;
    if (slug && slugs.has(slug)) return c.json({ error: "duplicate_slug", slug }, 409);
    while (!slug || slugs.has(slug)) slug = `hero-${++n}`;
    names.add(it.name);
    slugs.add(slug);
    stmts.push(db.prepare("INSERT INTO heroes (id, name, slug, image_key, sort_order, created_at) VALUES (?, ?, ?, NULL, ?, ?)").bind(ulid(), it.name, slug, ++order, now));
  }
  if (stmts.length) await db.batch(stmts);
  return c.json({ added: stmts.length, skipped, heroes: await listAdminHeroes(c.env) });
});

/** 名前・正式名称・slug の変更 */
adminHeroRoutes.patch("/:id", async (c) => {
  const body = heroPatchSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: "invalid_request", issues: body.error.issues.map((i) => i.message) }, 400);
  const { name, slug, fullName, ngAttacks, hsAttackTime, hsInvincibleTime, role, hsAttackImportance, hsTargetImportance } = body.data;
  if ([name, slug, fullName, ngAttacks, hsAttackTime, hsInvincibleTime, role, hsAttackImportance, hsTargetImportance].every((v) => v === undefined)) return c.json({ error: "invalid_request" }, 400);
  // 未指定の項目はそのまま、null を指定した項目は未入力に戻す
  const set = (v: unknown) => [v !== undefined ? 1 : 0, v ?? null];
  try {
    const r = await c.env.DB.prepare(
      `UPDATE heroes SET name = COALESCE(?, name), slug = COALESCE(?, slug), full_name = CASE WHEN ? THEN ? ELSE full_name END,
              ng_attacks = CASE WHEN ? THEN ? ELSE ng_attacks END, hs_attack_time = CASE WHEN ? THEN ? ELSE hs_attack_time END,
              hs_invincible_time = CASE WHEN ? THEN ? ELSE hs_invincible_time END,
              role = CASE WHEN ? THEN ? ELSE role END, hs_importance = CASE WHEN ? THEN ? ELSE hs_importance END,
              hs_attack_importance = CASE WHEN ? THEN ? ELSE hs_attack_importance END WHERE id = ?`,
    )
      .bind(name ?? null, slug ?? null, ...set(fullName), ...set(ngAttacks && NG_ATTACK_TYPES.filter((k) => ngAttacks.includes(k)).join(",")), ...set(hsAttackTime), ...set(hsInvincibleTime), ...set(role), ...set(hsTargetImportance), ...set(hsAttackImportance), c.req.param("id"))
      .run();
    if (!r.meta.changes) return c.json({ error: "not_found" }, 404);
    // ヒーロースキルが不可なら、HS合わせ重要度は「−」（0）に固定（docs/DECISIONS.md AB）
    await c.env.DB.prepare(`UPDATE heroes SET hs_attack_importance = 0 WHERE id = ? AND (',' || ng_attacks || ',') LIKE '%,hs,%'`)
      .bind(c.req.param("id"))
      .run();
  } catch (e) {
    const d = dupError(e);
    if (d) return c.json({ error: d }, 409);
    throw e;
  }
  return c.json({ heroes: await listAdminHeroes(c.env) });
});

/** 並べ替え：1 つ上／下と入れ替える（sort_order を振り直してから入れ替え） */
adminHeroRoutes.post("/:id/move", async (c) => {
  const body = heroMoveSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: "invalid_request" }, 400);
  const list = await listAdminHeroes(c.env);
  const i = list.findIndex((h) => h.id === c.req.param("id"));
  if (i < 0) return c.json({ error: "not_found" }, 404);
  const j = i + body.data.dir;
  if (j >= 0 && j < list.length) {
    [list[i], list[j]] = [list[j], list[i]];
    await c.env.DB.batch(list.map((h, k) => c.env.DB.prepare("UPDATE heroes SET sort_order = ? WHERE id = ?").bind(k + 1, h.id)));
  }
  return c.json({ heroes: await listAdminHeroes(c.env) });
});

/** 削除（このキャラの投稿・タイミング・動画もまとめて削除） */
adminHeroRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const db = c.env.DB;
  const hero = await db.prepare("SELECT * FROM heroes WHERE id = ?").bind(id).first<HeroRow>();
  if (!hero) return c.json({ error: "not_found" }, 404);
  const { results: subs } = await db.prepare("SELECT id FROM submissions WHERE attacker_id = ? OR target_id = ?").bind(id, id).all<{ id: string }>();
  const { results: vids } = await db
    .prepare("SELECT DISTINCT video_key FROM timings WHERE attacker_id = ? OR target_id = ?")
    .bind(id, id)
    .all<{ video_key: string }>();
  const subIds = subs.map((s) => s.id);
  const count = await db.prepare("SELECT COUNT(*) AS n FROM timings WHERE attacker_id = ? OR target_id = ?").bind(id, id).first<{ n: number }>();
  const stmts: D1PreparedStatement[] = [];
  // ほかのキャラの組み合わせから、削除するタイミングへの修正提案の参照を外す
  stmts.push(
    db
      .prepare("UPDATE submissions SET replaces_timing_id = NULL WHERE replaces_timing_id IN (SELECT id FROM timings WHERE attacker_id = ? OR target_id = ?)")
      .bind(id, id),
  );
  stmts.push(db.prepare("DELETE FROM timings WHERE attacker_id = ? OR target_id = ?").bind(id, id));
  for (let i = 0; i < subIds.length; i += 50) {
    const part = subIds.slice(i, i + 50);
    stmts.push(db.prepare(`UPDATE timings SET credit_submission_id = NULL WHERE credit_submission_id IN (${part.map(() => "?").join(",")})`).bind(...part));
    stmts.push(db.prepare(`DELETE FROM timings WHERE submission_id IN (${part.map(() => "?").join(",")})`).bind(...part));
    stmts.push(db.prepare(`DELETE FROM submissions WHERE id IN (${part.map(() => "?").join(",")})`).bind(...part));
  }
  stmts.push(db.prepare("DELETE FROM heroes WHERE id = ?").bind(id));
  await db.batch(stmts);
  await deleteIfUnused(c.env, [...vids.map((v) => v.video_key), ...(hero.image_key ? [hero.image_key] : [])]);
  return c.json({ deletedTimings: count?.n ?? 0, heroes: await listAdminHeroes(c.env) });
});

/** 画像の設定（ブラウザで 256×256 の WebP に縮小したもの）。ファイル名に内容のハッシュを入れる */
// キャラ画像は権利への配慮で使わない（docs/DECISIONS.md S）。新しい画像は受け付けない（登録済みの画像の削除だけ残す）
adminHeroRoutes.put("/:id/image", (c) => c.json({ error: "images_disabled" }, 403));

/** 画像を外す（R2 からも削除。頭文字の代替表示に戻る） */
adminHeroRoutes.delete("/:id/image", async (c) => {
  const hero = await c.env.DB.prepare("SELECT * FROM heroes WHERE id = ?").bind(c.req.param("id")).first<HeroRow>();
  if (!hero) return c.json({ error: "not_found" }, 404);
  await c.env.DB.prepare("UPDATE heroes SET image_key = NULL WHERE id = ?").bind(hero.id).run();
  if (hero.image_key) await deleteMedia(c.env, [hero.image_key]);
  return c.json({ heroes: await listAdminHeroes(c.env) });
});
