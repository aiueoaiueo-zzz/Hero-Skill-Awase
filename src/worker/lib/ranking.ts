import { BONUS_PAIRS_PER_WEEK, POINTS, RANKING_MIN_USERS, RANKING_TOP, badgeFor, isXId, jstMonthStart, jstWeek } from "../../shared/ranking";
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

/** 小さな乱数（週ごとに同じ並びになる）。同時に何人が開いても同じ 7 つが選ばれるように、週の名前から作る */
function seeded(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return () => {
    h = (h + 0x6d2b79f5) >>> 0;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 今週のボーナス組み合わせ（その週で最初に呼ばれたときに選んで保存する） */
export async function weekBonus(env: Env, now = Date.now()) {
  const w = jstWeek(now);
  const db = env.DB;
  const read = async () =>
    (await db.prepare("SELECT attacker_id AS a, target_id AS t FROM bonus_pairs WHERE week = ?").bind(w.key).all<{ a: string; t: string }>()).results;
  let rows = await read();
  if (!rows.length) {
    const { results: heroes } = await db.prepare("SELECT id FROM heroes ORDER BY sort_order, created_at").all<{ id: string }>();
    const { results: reg } = await db
      .prepare("SELECT DISTINCT attacker_id AS a, target_id AS t FROM timings WHERE status = 'approved' AND hidden = 0")
      .all<{ a: string; t: string }>();
    const used = new Set(reg.map((r) => `${r.a}|${r.t}`));
    const cand: { a: string; t: string }[] = [];
    for (const a of heroes) for (const t of heroes) if (a.id !== t.id && !used.has(`${a.id}|${t.id}`)) cand.push({ a: a.id, t: t.id });
    // ランダムに並べ替えて先頭から（同じ週なら同じ結果）
    const rnd = seeded(`hs-awase-bonus:${w.key}`);
    for (let i = cand.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [cand[i], cand[j]] = [cand[j], cand[i]];
    }
    const pick = cand.slice(0, BONUS_PAIRS_PER_WEEK);
    if (pick.length)
      await db.batch(pick.map((p) => db.prepare("INSERT OR IGNORE INTO bonus_pairs (week, attacker_id, target_id) VALUES (?, ?, ?)").bind(w.key, p.a, p.t)));
    rows = await read();
  }
  return { week: w, pairs: rows };
}

/** 全員のポイント（対象外の ID は除く） */
export async function computeScores(env: Env, now = Date.now()) {
  const db = env.DB;
  const [excluded, posts, fixes, bonus] = await Promise.all([
    excludedIds(env),
    // 1. 公開中のタイミング（投稿した人に 1、修正提案で置き換えられたものは 0.5）
    db
      .prepare(
        `SELECT s.nickname AS x, t.reviewed_at AS at, t.attacker_id AS a, t.target_id AS t,
                EXISTS (SELECT 1 FROM submissions fs JOIN timings f ON f.submission_id = fs.id WHERE fs.replaces_timing_id = t.id AND f.status = 'merged') AS fixed
           FROM timings t JOIN submissions s ON s.id = t.submission_id
          WHERE t.status = 'approved' AND t.hidden = 0 AND t.reviewed_at IS NOT NULL`,
      )
      .all<{ x: string | null; at: string; a: string; t: string; fixed: number }>(),
    // 2. 承認された修正提案（修正した人に 0.5。元のタイミングが公開中のものだけ）
    db
      .prepare(
        `SELECT fs.nickname AS x, f.reviewed_at AS at
           FROM timings f JOIN submissions fs ON fs.id = f.submission_id JOIN timings t ON t.id = fs.replaces_timing_id
          WHERE f.status = 'merged' AND t.status = 'approved' AND t.hidden = 0 AND f.reviewed_at IS NOT NULL`,
      )
      .all<{ x: string | null; at: string }>(),
    db.prepare("SELECT week, attacker_id AS a, target_id AS t FROM bonus_pairs").all<{ week: string; a: string; t: string }>(),
  ]);
  const bonusSet = new Set(bonus.results.map((b) => `${b.week}|${b.a}|${b.t}`));
  const monthStart = jstMonthStart(now);
  const users = new Map<string, UserScore>();
  const add = (x: string | null, at: string, pt: number) => {
    if (!isXId(x) || excluded.has(x.toLowerCase())) return;
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
  for (const p of posts.results) {
    // 今週のボーナス組み合わせ：その週のうちに承認されたものに +1
    const isBonus = bonusSet.has(`${jstWeek(Date.parse(p.at)).key}|${p.a}|${p.t}`);
    add(p.x, p.at, (p.fixed ? POINTS.postFixed : POINTS.post) + (isBonus ? POINTS.bonus : 0));
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
  const { users } = await computeScores(env, now);
  const all = [...users.values()];
  const total = rank(all, "total");
  const month = rank(all, "month");
  return {
    total,
    month,
    users,
    view: {
      minUsers: RANKING_MIN_USERS,
      totalUsers: total.length,
      monthUsers: month.length,
      total: total.length >= RANKING_MIN_USERS ? total.slice(0, RANKING_TOP) : null,
      month: month.length >= RANKING_MIN_USERS ? month.slice(0, RANKING_TOP) : null,
    },
  };
}
