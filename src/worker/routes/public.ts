import { currentEvent } from "../lib/events";
import { Hono } from "hono";
import { PRIVATE_SETTING_KEYS } from "../../shared/constants";
import { badgeFor, isXId, normalizeXId } from "../../shared/ranking";
import type { Bootstrap, PairResponse, PublicTiming, RankingResponse, TargetsResponse, UserResponse, UserTiming } from "../../shared/types";
import type { AppEnv } from "../env";
import { heroBySlug, listHeroes } from "../lib/heroes";
import { mediaUrl } from "../lib/media";
import { ensureShareCodes, SHARE_CODE_RE } from "../lib/share-code";
import { computeScores, rankingSummary } from "../lib/ranking";
import { getSettings } from "../lib/settings";

// 一般向け API：承認済み（status = 'approved'）のタイミングしか返さない（仕様 7-2）
export const publicRoutes = new Hono<AppEnv>();

publicRoutes.use("*", async (c, next) => {
  await next();
  c.header("Cache-Control", "no-store");
});

publicRoutes.get("/bootstrap", async (c) => {
  const [heroes, settings, pairs, ev] = await Promise.all([
    listHeroes(c.env),
    getSettings(c.env),
    c.env.DB.prepare("SELECT DISTINCT attacker_id AS a, target_id AS t FROM timings WHERE status = 'approved' AND hidden = 0").all<{ a: string; t: string }>(),
    currentEvent(c.env),
  ]);
  for (const k of PRIVATE_SETTING_KEYS) delete (settings as Partial<typeof settings>)[k];
  const publicAppUrl = (c.env.PUBLIC_APP_URL || new URL(c.req.url).origin).replace(/\/+$/, "");
  const registered: Record<string, string[]> = {};
  for (const r of pairs.results) (registered[r.a] ??= []).push(r.t);
  return c.json<Bootstrap>({ heroes, settings, turnstileSiteKey: c.env.TURNSTILE_SITE_KEY || "", publicAppUrl, registered, stage: c.env.SITE_STAGE || "", event: ev.event, featured: ev.featured });
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
  // 投稿者のバッジ（ランキングの対象の X の ID のときだけ）
  const { users } = results.some((r) => isXId(normalizeXId(r.nickname))) ? await computeScores(c.env) : { users: new Map() };
  const badgeOf = (raw: string | null) => {
    const x = normalizeXId(raw);
    return isXId(x) ? badgeFor(users.get(x.toLowerCase())?.total ?? 0) : null;
  };
  const timings: PublicTiming[] = results.map((r) => ({
    id: r.id,
    attackType: r.attack_type,
    cueType: r.cue_type,
    timingText: r.timing_text,
    note: r.note,
    videoUrl: mediaUrl(c.env, r.video_key)!,
    nickname: r.nickname || null,
    badge: badgeOf(r.nickname),
    supportCode: r.support_code || null,
    reviewedAt: r.reviewed_at,
    shareCode: r.share_code,
  }));
  return c.json<PairResponse>({ attacker, target, timings });
});

/** ランキング（累計・今月） */
publicRoutes.get("/ranking", async (c) => {
  const r = await rankingSummary(c.env);
  return c.json<RankingResponse>(r.view);
});

/** 投稿者のページ：その人のポイント・バッジ・順位と、投稿・修正した公開中の合わせ */
publicRoutes.get("/users/:xid", async (c) => {
  const xid = normalizeXId(c.req.param("xid"));
  if (!isXId(xid)) return c.json({ error: "not_found" }, 404);
  const db = c.env.DB;
  const [r, posts, fixes, heroes, codes] = await Promise.all([
    rankingSummary(c.env),
    db
      .prepare(
        `SELECT t.id, t.attacker_id AS a, t.target_id AS tg, t.attack_type, t.cue_type, t.timing_text, t.reviewed_at AS at
           FROM timings t JOIN submissions s ON s.id = t.submission_id
          WHERE lower(ltrim(s.nickname, '@＠')) = lower(?) AND t.status = 'approved' AND t.hidden = 0`,
      )
      .bind(xid)
      .all<{ id: string; a: string; tg: string; attack_type: UserTiming["attackType"]; cue_type: UserTiming["cueType"]; timing_text: string; at: string }>(),
    db
      .prepare(
        `SELECT t.id, t.attacker_id AS a, t.target_id AS tg, t.attack_type, t.cue_type, t.timing_text, f.reviewed_at AS at
           FROM timings f JOIN submissions fs ON fs.id = f.submission_id JOIN timings t ON t.id = fs.replaces_timing_id
          WHERE lower(ltrim(fs.nickname, '@＠')) = lower(?) AND f.status = 'merged' AND t.status = 'approved' AND t.hidden = 0`,
      )
      .bind(xid)
      .all<{ id: string; a: string; tg: string; attack_type: UserTiming["attackType"]; cue_type: UserTiming["cueType"]; timing_text: string; at: string }>(),
    listHeroes(c.env),
    // 公開中の投稿・修正提案で入力された応援コード（大文字・小文字と前後の空白は無視して比べる）
    db
      .prepare(
        `SELECT DISTINCT upper(trim(s.support_code)) AS code FROM submissions s
          WHERE lower(ltrim(s.nickname, '@＠')) = lower(?) AND trim(COALESCE(s.support_code, '')) <> ''
            AND (EXISTS (SELECT 1 FROM timings t WHERE t.submission_id = s.id AND t.status = 'approved' AND t.hidden = 0)
              OR EXISTS (SELECT 1 FROM timings f JOIN timings t ON t.id = s.replaces_timing_id
                          WHERE f.submission_id = s.id AND f.status = 'merged' AND t.status = 'approved' AND t.hidden = 0))`,
      )
      .bind(xid)
      .all<{ code: string }>(),
  ]);
  const byId = new Map(heroes.map((h) => [h.id, h]));
  const timings: UserTiming[] = [
    ...posts.results.map((x) => ({ ...x, kind: "post" as const })),
    ...fixes.results.map((x) => ({ ...x, kind: "fix" as const })),
  ]
    .filter((x) => byId.has(x.a) && byId.has(x.tg))
    .sort((a, b) => b.at.localeCompare(a.at))
    .map((x) => ({
      id: x.id,
      kind: x.kind,
      attacker: byId.get(x.a)!,
      target: byId.get(x.tg)!,
      attackType: x.attack_type,
      cueType: x.cue_type,
      timingText: x.timing_text,
      at: x.at,
    }));
  const k = xid.toLowerCase();
  const u = r.users.get(k);
  const excluded = r.excluded.has(k);
  if (!u && !timings.length) return c.json({ error: "not_found" }, 404);
  const active = r.view.total !== null;
  return c.json<UserResponse>({
    xId: u?.xId ?? xid,
    total: u?.total ?? 0,
    month: u?.month ?? 0,
    badge: u ? badgeFor(u.total) : null,
    rankTotal: active ? (r.total.find((x) => x.xId.toLowerCase() === k)?.rank ?? null) : null,
    rankMonth: r.view.month ? (r.month.find((x) => x.xId.toLowerCase() === k)?.rank ?? null) : null,
    rankingActive: active,
    excluded,
    // 複数の応援コードが見つかったときは出さない（どれが本人のものか分からないため）
    supportCode: codes.results.length === 1 ? codes.results[0].code : null,
    timings,
  });
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
