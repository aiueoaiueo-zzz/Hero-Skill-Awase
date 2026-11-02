import { Hono } from "hono";
import type { PairResponse, PublicTiming, TargetsResponse } from "../../shared/types";
import type { AppEnv } from "../env";
import { heroBySlug, listHeroes } from "../lib/heroes";
import { mediaUrl } from "../lib/media";
import { getSettings } from "../lib/settings";

// 一般向け API：承認済み（status = 'approved'）のタイミングしか返さない（仕様 7-2）
export const publicRoutes = new Hono<AppEnv>();

publicRoutes.use("*", async (c, next) => {
  await next();
  c.header("Cache-Control", "no-store");
});

publicRoutes.get("/bootstrap", async (c) => {
  const [heroes, settings] = await Promise.all([listHeroes(c.env), getSettings(c.env)]);
  return c.json({ heroes, settings, turnstileSiteKey: c.env.TURNSTILE_SITE_KEY || "" });
});

publicRoutes.get("/heroes/:slug/targets", async (c) => {
  const attacker = await heroBySlug(c.env, c.req.param("slug"));
  if (!attacker) return c.json({ error: "not_found" }, 404);
  const { results } = await c.env.DB.prepare(
    "SELECT DISTINCT target_id FROM timings WHERE attacker_id = ? AND status = 'approved'",
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
    `SELECT t.id, t.attack_type, t.cue_type, t.timing_text, t.note, t.video_key, t.reviewed_at,
            s.nickname, s.support_code
       FROM timings t JOIN submissions s ON s.id = t.submission_id
      WHERE t.attacker_id = ? AND t.target_id = ? AND t.status = 'approved'
      ORDER BY t.reviewed_at, t.position`,
  )
    .bind(attacker.id, target.id)
    .all<TimingRow>();
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
  }));
  return c.json<PairResponse>({ attacker, target, timings });
});
