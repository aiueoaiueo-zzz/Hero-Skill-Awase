import { POINTS, RANKING_MIN_USERS, RANKING_TOP, badgeFor, isXId, jstMonthStart, normalizeXId } from "../../shared/ranking";
import type { Env } from "../env";

// ランキングの集計。投稿は多くないので、毎回データベースから数え直す（保存した集計とずれない）

export type UserScore = { xId: string; total: number; month: number; totalAt: string; monthAt: string };

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
export async function computeScores(env: Env, now = Date.now()) {
  const db = env.DB;
  const [excluded, posts, fixes] = await Promise.all([
    excludedIds(env),
    // 1. 公開中のタイミング（投稿した人に 1、修正提案で置き換えられたものは 0.5）
    db
      .prepare(
        `SELECT t.id, s.nickname AS x, t.reviewed_at AS at, t.attacker_id AS a, t.target_id AS t,
                EXISTS (SELECT 1 FROM submissions fs JOIN timings f ON f.submission_id = fs.id WHERE fs.replaces_timing_id = t.id AND f.status = 'merged') AS fixed
           FROM timings t JOIN submissions s ON s.id = t.submission_id
          WHERE t.status = 'approved' AND t.hidden = 0 AND t.reviewed_at IS NOT NULL
          ORDER BY t.reviewed_at, t.position, t.id`,
      )
      .all<{ id: string; x: string | null; at: string; a: string; t: string; fixed: number }>(),
    // 2. 承認された修正提案（修正した人に 0.5。元のタイミングが公開中のものだけ）
    db
      .prepare(
        `SELECT fs.nickname AS x, f.reviewed_at AS at
           FROM timings f JOIN submissions fs ON fs.id = f.submission_id JOIN timings t ON t.id = fs.replaces_timing_id
          WHERE f.status = 'merged' AND t.status = 'approved' AND t.hidden = 0 AND f.reviewed_at IS NOT NULL`,
      )
      .all<{ x: string | null; at: string }>(),
  ]);
  const monthStart = jstMonthStart(now);
  const users = new Map<string, UserScore>();
  const add = (raw: string | null, at: string, pt: number) => {
    // 古い投稿で @ 付きのまま保存された ID も同じ人として数える
    const x = normalizeXId(raw);
    if (!isXId(x)) return;
    const k = x.toLowerCase();
    const u = users.get(k) ?? { xId: x, total: 0, month: 0, totalAt: "", monthAt: "" };
    u.total += pt;
    if (at > u.totalAt) u.totalAt = at;
    if (Date.parse(at) >= monthStart) {
      u.month += pt;
      if (at > u.monthAt) u.monthAt = at;
    }
    users.set(k, u);
  };
  // その組み合わせで最初に承認された投稿（公開中のものの中で一番早いもの）に +0.5
  const seen = new Set<string>();
  for (const p of posts.results) {
    const key = `${p.a}|${p.t}`;
    const first = !seen.has(key);
    seen.add(key);
    add(p.x, p.at, (p.fixed ? POINTS.postFixed : POINTS.post) + (first ? POINTS.firstPair : 0));
  }
  for (const f of fixes.results) add(f.x, f.at, POINTS.fix);
  return { users, excluded };
}

export type RankRow = { rank: number; xId: string; points: number; badge: string | null };

/** ポイントの多い順。同じポイントなら、先にそのポイントに届いた人が上 */
function rank(users: UserScore[], key: "total" | "month"): RankRow[] {
  const at = key === "total" ? "totalAt" : "monthAt";
  return users
    .filter((u) => u[key] > 0)
    .sort((a, b) => b[key] - a[key] || a[at].localeCompare(b[at]))
    .map((u, i) => ({ rank: i + 1, xId: u.xId, points: u[key], badge: badgeFor(u.total) }));
}

export async function rankingSummary(env: Env, now = Date.now()) {
  const { users, excluded } = await computeScores(env, now);
  // ランキングの対象外にした ID は、順位と人数の数からだけ外す
  const all = [...users.values()].filter((u) => !excluded.has(u.xId.toLowerCase()));
  const total = rank(all, "total");
  const month = rank(all, "month");
  return {
    total,
    month,
    users,
    excluded,
    view: {
      minUsers: RANKING_MIN_USERS,
      totalUsers: total.length,
      monthUsers: month.length,
      total: total.length >= RANKING_MIN_USERS ? total.slice(0, RANKING_TOP) : null,
      month: month.length >= RANKING_MIN_USERS ? month.slice(0, RANKING_TOP) : null,
    },
  };
}
