import { Hono } from "hono";
import type { PairResponse, PublicTiming, TargetsResponse } from "../../shared/types";
import type { AppEnv } from "../env";
import { heroBySlug, listHeroes } from "../lib/heroes";
import { mediaUrl } from "../lib/media";
import { ensureShareCodes, SHARE_CODE_RE } from "../lib/share-code";
import { getSettings } from "../lib/settings";

// 一般向け API：承認済み（status = 'approved'）のタイミングしか返さない（仕様 7-2）
export const publicRoutes = new Hono<AppEnv>();

publicRoutes.use("*", async (c, next) => {
  await next();
  c.header("Cache-Control", "no-store");
});

publicRoutes.get("/bootstrap", async (c) => {
  const [heroes, settings] = await Promise.all([listHeroes(c.env), getSettings(c.env)]);
  const publicAppUrl = (c.env.PUBLIC_APP_URL || new URL(c.req.url).origin).replace(/\/+$/, "");
  return c.json({ heroes, settings, turnstileSiteKey: c.env.TURNSTILE_SITE_KEY || "", publicAppUrl });
});

publicRoutes.get("/heroes/:slug/targets", async (c) => {
  const attacker = await heroBySlug(c.env, c.req.param("slug"));
  if (!attacker) return c.json({ error: "not_found" }, 404);
  const { results } = await c.env.DB.prepare(
    "SELECT DISTINCT target_id FROM timings WHERE attacker_id = ? AND status = 'approved' AND hidden = 0",
  )
    .bind(attacker.id)
    .all<{ target_id: string }>();
  return c.json<TargetsResponse>({ attacker, registeredTargetIds: results.map((r) => r.target_id) });
});

type TimingRow = {
  id: string;
  attack_type: PublicTiming["attackType"];
  cue_type: PublicTiming["cueType"];
  timing_text: string;
  note: string | null;
  video_key: string;
  reviewed_at: string;
  share_code: string | null;
  nickname: string | null;
  support_code: string | null;
};

publicRoutes.get("/pairs/:attacker/:target", async (c) => {
  const [attacker, target] = await Promise.all([
    heroBySlug(c.env, c.req.param("attacker")),
    heroBySlug(c.env, c.req.param("target")),
  ]);
  if (!attacker || !target) return c.json({ error: "not_found" }, 404);
  const { results } = await c.env.DB.prepare(
    `SELECT t.id, t.attack_type, t.cue_type, t.timing_text, t.note, t.video_key, t.reviewed_at, t.share_code,
            s.nickname, s.support_code
       FROM timings t JOIN submissions s ON s.id = COALESCE(t.credit_submission_id, t.submission_id)
      WHERE t.attacker_id = ? AND t.target_id = ? AND t.status = 'approved' AND t.hidden = 0
      ORDER BY t.reviewed_at, t.position`,
  )
    .bind(attacker.id, target.id)
    .all<TimingRow>();
  // 共有コードがまだないもの（この機能より前に承認されたもの）は、ここで発行する
  const missing = results.filter((r) => !r.share_code).map((r) => r.id);
  if (missing.length) {
    const codes = await ensureShareCodes(c.env, missing);
    for (const r of results) if (!r.share_code) r.share_code = codes.get(r.id) ?? null;
  }
  const timings: PublicTiming[] = results.map((r) => ({
    id: r.id,
    attackType: r.attack_type,
    cueType: r.cue_type,
    timingText: r.timing_text,
    note: r.note,
    videoUrl: mediaUrl(c.env, r.video_key)!,
    nickname: r.nickname || null,
    supportCode: r.support_code || null,
    reviewedAt: r.reviewed_at,
    shareCode: r.share_code,
  }));
  return c.json<PairResponse>({ attacker, target, timings });
});

// 共有用の短いリンク：/s/<コード> → そのタイミングの詳細画面（承認済みのみ）
export const shortLinkRoutes = new Hono<AppEnv>();
shortLinkRoutes.get("/:code", async (c) => {
  const code = c.req.param("code").toLowerCase();
  if (!SHARE_CODE_RE.test(code)) return c.redirect("/", 302);
  const r = await c.env.DB.prepare(
    `SELECT t.id, a.slug AS a, h.slug AS t FROM timings t
       JOIN heroes a ON a.id = t.attacker_id JOIN heroes h ON h.id = t.target_id
      WHERE t.share_code = ? AND t.status = 'approved' AND t.hidden = 0`,
  )
    .bind(code)
    .first<{ id: string; a: string; t: string }>();
  if (!r) return c.redirect("/", 302);
  c.header("Cache-Control", "no-store");
  return c.redirect(`/h/${encodeURIComponent(r.a)}/${encodeURIComponent(r.t)}#t-${encodeURIComponent(r.id)}`, 302);
});
