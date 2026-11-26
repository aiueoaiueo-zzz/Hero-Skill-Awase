// イベントのバッジ（docs/DECISIONS.md BM）
// イベントが終わったら、その時点のイベントのポイントと順位でバッジを確定して保存する（あとで投稿が増減しても変わらない）
import { eventBadgeKind, eventBadgeLabel } from "../../shared/ranking";
import type { EventBadge, EventBadgeKind } from "../../shared/types";
import type { Env } from "../env";
import { EVENT_COLS, type EventRow, todayJst } from "./events";
import { nowIso } from "./ids";
import { computeScores, eventWindow, rank } from "./ranking";

export type FinalizeResult = number | "not_found" | "not_ended" | "no_badge";

/** 1 つのイベントのバッジを確定する（確定し直すときは付け直す）。返り値は付けたバッジの数 */
export async function finalizeEvent(env: Env, id: string, now = Date.now()): Promise<FinalizeResult> {
  const ev = await env.DB.prepare(`SELECT ${EVENT_COLS} FROM events WHERE id = ?`).bind(id).first<EventRow>();
  if (!ev) return "not_found";
  // 終了日の翌日（日本時間）から確定できる
  if (ev.ends_on >= todayJst(now)) return "not_ended";
  if (!ev.badge_name) return "no_badge";
  const { users, excluded } = await computeScores(env, now, eventWindow(ev.starts_on, ev.ends_on));
  // 順位はランキングと同じ数え方（対象外の ID は順位を付けない。合わせ賞は付ける）
  const ranked = rank([...users.values()].filter((u) => !excluded.has(u.xId.toLowerCase())), "event");
  const rankOf = new Map(ranked.map((r) => [r.xId.toLowerCase(), r.rank]));
  const tiers = { low: ev.tier_low, mid: ev.tier_mid, high: ev.tier_high };
  const at = nowIso();
  const rows: { x: string; kind: EventBadgeKind; pt: number }[] = [];
  for (const [k, u] of users) {
    const kind = eventBadgeKind(rankOf.get(k) ?? null, u.event, tiers);
    if (kind) rows.push({ x: u.xId, kind, pt: u.event });
  }
  await env.DB.batch([
    env.DB.prepare("DELETE FROM event_badges WHERE event_id = ?").bind(id),
    ...rows.map((r) => env.DB.prepare("INSERT INTO event_badges (event_id, x_id, kind, points, created_at) VALUES (?, ?, ?, ?, ?)").bind(id, r.x, r.kind, r.pt, at)),
    env.DB.prepare("UPDATE events SET finalized_at = ? WHERE id = ?").bind(at, id),
  ]);
  return rows.length;
}

/** 毎日の自動処理：終わったのにまだ確定していないイベント（バッジの名前があるもの）を確定する */
export async function finalizeEndedEvents(env: Env, now = Date.now()) {
  const { results } = await env.DB.prepare("SELECT id FROM events WHERE ends_on < ? AND finalized_at IS NULL AND badge_name IS NOT NULL")
    .bind(todayJst(now))
    .all<{ id: string }>();
  let n = 0;
  for (const r of results) {
    const x = await finalizeEvent(env, r.id, now);
    if (typeof x === "number") n++;
  }
  return n;
}

/** その人の確定したイベントのバッジ（新しいイベント順） */
export async function userEventBadges(env: Env, xId: string): Promise<EventBadge[]> {
  const { results } = await env.DB.prepare(
    `SELECT b.kind, e.badge_name AS bn, e.name, e.ends_on FROM event_badges b JOIN events e ON e.id = b.event_id
      WHERE lower(b.x_id) = lower(?) AND e.badge_name IS NOT NULL ORDER BY e.ends_on DESC`,
  )
    .bind(xId)
    .all<{ kind: EventBadgeKind; bn: string; name: string; ends_on: string }>();
  return results.map((r) => ({ label: eventBadgeLabel(r.bn, r.kind), kind: r.kind, eventName: r.name, endsOn: r.ends_on }));
}
