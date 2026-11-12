// イベント（キャンペーン）と「今週のキャラ」（docs/DECISIONS.md AL）
import type { EventInfo, FeaturedHero, PublicEvent } from "../../shared/types";
import type { Env } from "../env";

/** 日本時間の今日（YYYY-MM-DD） */
export const todayJst = (now = Date.now()) => new Date(now + 9 * 3600_000).toISOString().slice(0, 10);

type EventRow = { id: string; name: string; starts_on: string; ends_on: string; goal: number | null };
type FeaturedRow = { id: string; hero_id: string; starts_on: string; ends_on: string };
const toEvent = (r: EventRow): EventInfo => ({ id: r.id, name: r.name, startsOn: r.starts_on, endsOn: r.ends_on, goal: r.goal });
const toFeatured = (r: FeaturedRow): FeaturedHero => ({ id: r.id, heroId: r.hero_id, startsOn: r.starts_on, endsOn: r.ends_on });

export async function listEvents(env: Env): Promise<{ events: EventInfo[]; featured: FeaturedHero[] }> {
  const [e, f] = await env.DB.batch([
    env.DB.prepare("SELECT id, name, starts_on, ends_on, goal FROM events ORDER BY starts_on DESC, created_at DESC"),
    env.DB.prepare("SELECT id, hero_id, starts_on, ends_on FROM featured_heroes ORDER BY starts_on, created_at"),
  ]);
  return { events: (e.results as EventRow[]).map(toEvent), featured: (f.results as FeaturedRow[]).map(toFeatured) };
}

/** 一般向け：今日開催中のイベント（複数あれば開始が新しいもの）と、今日の今週のキャラ */
export async function currentEvent(env: Env, today = todayJst()): Promise<{ event: PublicEvent | null; featured: Omit<FeaturedHero, "id">[] }> {
  const [e, f, filled] = await env.DB.batch([
    env.DB.prepare("SELECT id, name, starts_on, ends_on, goal FROM events WHERE starts_on <= ?1 AND ends_on >= ?1 ORDER BY starts_on DESC LIMIT 1").bind(today),
    env.DB.prepare("SELECT id, hero_id, starts_on, ends_on FROM featured_heroes WHERE starts_on <= ?1 AND ends_on >= ?1 ORDER BY starts_on").bind(today),
    env.DB.prepare("SELECT COUNT(*) AS n FROM (SELECT DISTINCT attacker_id, target_id FROM timings WHERE status = 'approved' AND hidden = 0)"),
  ]);
  const ev = (e.results as EventRow[])[0];
  return {
    event: ev ? { ...toEvent(ev), filled: (filled.results as { n: number }[])[0]?.n ?? 0 } : null,
    featured: (f.results as FeaturedRow[]).map(toFeatured).map(({ heroId, startsOn, endsOn }) => ({ heroId, startsOn, endsOn })),
  };
}
