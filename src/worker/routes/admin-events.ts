// 管理：イベントと今週のキャラ（docs/DECISIONS.md AL）
import { Hono } from "hono";
import { eventSchema, featuredSchema } from "../../shared/schema";
import type { AppEnv } from "../env";
import { finalizeEvent } from "../lib/event-badges";
import { listEvents } from "../lib/events";
import { nowIso, ulid } from "../lib/ids";

export const adminEventRoutes = new Hono<AppEnv>();
const bad = (issues: { message: string }[]) => ({ error: "invalid_request", issues: issues.map((i) => i.message) });

adminEventRoutes.get("/", async (c) => c.json(await listEvents(c.env)));

adminEventRoutes.post("/", async (c) => {
  const b = eventSchema.safeParse(await c.req.json().catch(() => null));
  if (!b.success) return c.json(bad(b.error.issues), 400);
  const v = b.data;
  await c.env.DB.prepare("INSERT INTO events (id, name, starts_on, ends_on, goal, badge_name, tier_low, tier_mid, tier_high, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(ulid(), v.name, v.startsOn, v.endsOn, v.goal ?? null, v.badgeName || null, v.tierLow ?? null, v.tierMid ?? null, v.tierHigh ?? null, nowIso())
    .run();
  return c.json(await listEvents(c.env));
});

adminEventRoutes.put("/:id", async (c) => {
  const b = eventSchema.safeParse(await c.req.json().catch(() => null));
  if (!b.success) return c.json(bad(b.error.issues), 400);
  const v = b.data;
  const r = await c.env.DB.prepare("UPDATE events SET name = ?, starts_on = ?, ends_on = ?, goal = ?, badge_name = ?, tier_low = ?, tier_mid = ?, tier_high = ? WHERE id = ?")
    .bind(v.name, v.startsOn, v.endsOn, v.goal ?? null, v.badgeName || null, v.tierLow ?? null, v.tierMid ?? null, v.tierHigh ?? null, c.req.param("id"))
    .run();
  if (!r.meta.changes) return c.json({ error: "not_found" }, 404);
  return c.json(await listEvents(c.env));
});

/** バッジを確定する（終了したイベントだけ。やり直すと付け直す。docs/DECISIONS.md BM） */
adminEventRoutes.post("/:id/finalize", async (c) => {
  const r = await finalizeEvent(c.env, c.req.param("id"));
  if (r === "not_found") return c.json({ error: "not_found" }, 404);
  if (r === "not_ended" || r === "no_badge") return c.json({ error: r }, 409);
  return c.json(await listEvents(c.env));
});

adminEventRoutes.delete("/:id", async (c) => {
  // バッジを配ったイベントは消さない（event_badges が一緒に消え、もらった人のバッジがなくなるため。docs/DECISIONS.md BM）
  const has = await c.env.DB.prepare("SELECT 1 FROM event_badges WHERE event_id = ? LIMIT 1").bind(c.req.param("id")).first();
  if (has) return c.json({ error: "has_badges" }, 409);
  await c.env.DB.prepare("DELETE FROM events WHERE id = ?").bind(c.req.param("id")).run();
  return c.json(await listEvents(c.env));
});

adminEventRoutes.post("/featured", async (c) => {
  const b = featuredSchema.safeParse(await c.req.json().catch(() => null));
  if (!b.success) return c.json(bad(b.error.issues), 400);
  const v = b.data;
  const hero = await c.env.DB.prepare("SELECT id FROM heroes WHERE id = ?").bind(v.heroId).first();
  if (!hero) return c.json({ error: "invalid_hero" }, 400);
  await c.env.DB.prepare("INSERT INTO featured_heroes (id, hero_id, starts_on, ends_on, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(ulid(), v.heroId, v.startsOn, v.endsOn, nowIso())
    .run();
  return c.json(await listEvents(c.env));
});

adminEventRoutes.delete("/featured/:id", async (c) => {
  await c.env.DB.prepare("DELETE FROM featured_heroes WHERE id = ?").bind(c.req.param("id")).run();
  return c.json(await listEvents(c.env));
});
