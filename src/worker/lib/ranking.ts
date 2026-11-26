import { EVENT_TIER_LABEL, eventBadgeKind, FEATURED_BONUS, POINTS, RANKING_MIN_USERS, RANKING_TOP, badgeFor, isXId, jstMonthStart, normalizeXId } from "../../shared/ranking";
import type { RankingResponse } from "../../shared/types";
import type { Env } from "../env";
import { currentEvent, todayJst } from "./events";
import { getSettings } from "./settings";

// ランキングの集計。投稿は多くないので、毎回データベースから数え直す（保存した集計とずれない）

type HeroCount = Map<string, { n: number; at: string }>;
export type UserScore = { xId: string; total: number; month: number; event: number; totalAt: string; monthAt: string; eventAt: string; heroes: { total: HeroCount; month: HeroCount; event: HeroCount } };
/** イベントの期間（日本時間の開始日 0 時〜終了日の翌日 0 時の UTC ミリ秒） */
export type Window = { start: number; end: number };
const JST = 9 * 3600_000;
export const eventWindow = (startsOn: string, endsOn: string): Window => ({
  start: Date.parse(startsOn + "T00:00:00Z") - JST,
  end: Date.parse(endsOn + "T00:00:00Z") - JST + 86400_000,
});

/** 対象外にする X の ID（管理画面の設定。1 行に 1 つ、小文字で比べる） */
async function excludedIds(env: Env) {
  const r = await env.DB.prepare("SELECT value FROM settings WHERE key = 'ranking_excluded'").first<{ value: string }>();
  return new Set(
    String(r?.value ?? "")
      .split(/[\s,、]+/)
      .map((s) => s.trim().replace(/^[@＠]+/, "").toLowerCase())
      .filter(Boolean),
  );
}

/** 全員のポイント（対象外の ID も含む。バッジは全員に付け、ランキングでだけ対象外の ID を除く） */
export async function computeScores(env: Env, now = Date.now(), win: Window | null = null) {
  const db = env.DB;
  const [excluded, posts, fixes, featured] = await Promise.all([
    excludedIds(env),
    // 1. 公開中のタイミング（投稿した人に 1、修正提案で置き換えられたものは 0.5）
    db
      .prepare(
        `SELECT t.id, s.nickname AS x, t.reviewed_at AS at, s.created_at AS posted, t.attacker_id AS a, t.target_id AS t,
                EXISTS (SELECT 1 FROM submissions fs JOIN timings f ON f.submission_id = fs.id WHERE fs.replaces_timing_id = t.id AND f.status = 'merged') AS fixed
           FROM timings t JOIN submissions s ON s.id = t.submission_id
          WHERE t.status = 'approved' AND t.hidden = 0 AND t.reviewed_at IS NOT NULL
          ORDER BY t.reviewed_at, t.position, t.id`,
      )
      .all<{ id: string; x: string | null; at: string; posted: string; a: string; t: string; fixed: number }>(),
    // 2. 承認された修正提案（修正した人に 0.5。元のタイミングが公開中のものだけ）
    db
      .prepare(
        `SELECT fs.nickname AS x, f.reviewed_at AS at
           FROM timings f JOIN submissions fs ON fs.id = f.submission_id JOIN timings t ON t.id = fs.replaces_timing_id
          WHERE f.status = 'merged' AND t.status = 'approved' AND t.hidden = 0 AND f.reviewed_at IS NOT NULL`,
      )
      .all<{ x: string | null; at: string }>(),
    // 3. 今週のキャラ（イベントのポイントの加点に使う。イベントが無いときは読まない）
    win
      ? db.prepare("SELECT hero_id AS h, starts_on AS s, ends_on AS e FROM featured_heroes").all<{ h: string; s: string; e: string }>()
      : Promise.resolve({ results: [] as { h: string; s: string; e: string }[] }),
  ]);
  // 投稿した日（日本時間）に、攻撃側か相手側のキャラが今週のキャラだったか
  const isFeatured = (posted: string, a: string, t: string) => {
    const day = new Date(Date.parse(posted) + JST).toISOString().slice(0, 10);
    return featured.results.some((f) => (f.h === a || f.h === t) && f.s <= day && day <= f.e);
  };
  const monthStart = jstMonthStart(now);
  const users = new Map<string, UserScore>();
  const add = (raw: string | null, at: string, pt: number, hero?: string, eventBonus = 0) => {
    // 古い投稿で @ 付きのまま保存された ID も同じ人として数える
    const x = normalizeXId(raw);
    if (!isXId(x)) return;
    const k = x.toLowerCase();
    const u = users.get(k) ?? { xId: x, total: 0, month: 0, event: 0, totalAt: "", monthAt: "", eventAt: "", heroes: { total: new Map(), month: new Map(), event: new Map() } };
    // 攻撃側のキャラを数える（投稿だけ。修正提案は数えない）
    const count = (m: HeroCount) => { if (!hero) return; const c = m.get(hero) ?? { n: 0, at: "" }; c.n++; if (at > c.at) c.at = at; m.set(hero, c); };
    count(u.heroes.total);
    u.total += pt;
    if (at > u.totalAt) u.totalAt = at;
    if (Date.parse(at) >= monthStart) {
      u.month += pt;
      count(u.heroes.month);
      if (at > u.monthAt) u.monthAt = at;
    }
    // イベント期間中に承認されたもの（ポイントの付け方は累計と同じ）
    if (win && Date.parse(at) >= win.start && Date.parse(at) < win.end) {
      u.event += pt + eventBonus;
      count(u.heroes.event);
      if (at > u.eventAt) u.eventAt = at;
    }
    users.set(k, u);
  };
  // その組み合わせで最初に承認された投稿（公開中のものの中で一番早いもの）に +0.5
  const seen = new Set<string>();
  for (const p of posts.results) {
    const key = `${p.a}|${p.t}`;
    const first = !seen.has(key);
    seen.add(key);
    add(p.x, p.at, (p.fixed ? POINTS.postFixed : POINTS.post) + (first ? POINTS.firstPair : 0), p.a, isFeatured(p.posted, p.a, p.t) ? FEATURED_BONUS : 0);
  }
  for (const f of fixes.results) add(f.x, f.at, POINTS.fix);
  return { users, excluded };
}

export type { RankRow } from "../../shared/types";
import type { RankRow } from "../../shared/types";
/** いちばん多いキャラ（同じ数ならあとで承認されたほう） */
const topHero = (m: HeroCount): string | null => {
  let best: string | null = null, bn = 0, ba = "";
  for (const [h, c] of m) if (c.n > bn || (c.n === bn && c.at > ba)) { best = h; bn = c.n; ba = c.at; }
  return best;
};

/** ポイントの多い順。同じポイントなら、先にそのポイントに届いた人が上 */
export function rank(users: UserScore[], key: "total" | "month" | "event"): RankRow[] {
  const at = key === "total" ? "totalAt" : key === "month" ? "monthAt" : "eventAt";
  return users
    .filter((u) => u[key] > 0)
    .sort((a, b) => b[key] - a[key] || a[at].localeCompare(b[at]))
    .map((u, i) => ({ rank: i + 1, xId: u.xId, points: u[key], badge: badgeFor(u.total), hero: topHero(u.heroes[key]) }));
}

export async function rankingSummary(env: Env, now = Date.now()) {
  const [{ event }, flags] = await Promise.all([currentEvent(env, todayJst(now)), getSettings(env)]);
  const show = { total: flags.ranking_show_total !== "0", month: flags.ranking_show_month === "1", event: flags.ranking_show_event !== "0" };
  // イベント期間中（イベントランキングを公開にしているとき）は、イベントランキングだけを出す
  const eventMode = !!event && show.event;
  const win = event ? eventWindow(event.startsOn, event.endsOn) : null;
  const { users, excluded } = await computeScores(env, now, win);
  // ランキングの対象外にした ID は、順位と人数の数からだけ外す
  const all = [...users.values()].filter((u) => !excluded.has(u.xId.toLowerCase()));
  const total = rank(all, "total");
  const month = rank(all, "month");
  // イベントランキングのバッジの欄は、合わせ賞（ナイス・グッド・ベスト）だけにする。順位のバッジや累計のバッジは出さない（docs/DECISIONS.md BM）
  const ev = rank(all, "event").map((r): RankRow => {
    if (!event?.badgeName) return r;
    const kind = eventBadgeKind(null, r.points, event.tiers);
    return kind === "high" || kind === "mid" || kind === "low" ? { ...r, badge: EVENT_TIER_LABEL[kind], badgeKind: kind } : { ...r, badge: null };
  });
  const top = (rows: RankRow[]) => (rows.length >= RANKING_MIN_USERS ? rows.slice(0, RANKING_TOP) : null);
  const view: RankingResponse = {
    minUsers: RANKING_MIN_USERS,
    mode: eventMode ? "event" : "normal",
    show: { total: show.total, month: show.month },
    total: !eventMode && show.total ? top(total) : null,
    month: !eventMode && show.month ? top(month) : null,
    event: eventMode && event ? { name: event.name, startsOn: event.startsOn, endsOn: event.endsOn, rows: top(ev) } : null,
  };
  return { total, month, event: eventMode && event ? { info: event, rows: ev } : null, show, users, excluded, view };
}
