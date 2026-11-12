// 管理：イベントと今週のキャラ（docs/DECISIONS.md AL）
import { Hono } from "hono";
import { eventSchema, featuredSchema } from "../../shared/schema";
import type { AppEnv } from "../env";
import { listEvents } from "../lib/events";
import { nowIso, ulid } from "../lib/ids";

export const adminEventRoutes = new Hono<AppEnv>();
const bad = (issues: { message: string }[]) => ({ error: "invalid_request", issues: issues.map((i) => i.message) });

adminEventRoutes.get("/", async (c) => c.json(await listEvents(c.env)));

adminEventRoutes.post("/", async (c) => {
  const b = eventSchema.safeParse(await c.req.json().catch(() => null));
  if (!b.success) return c.json(bad(b.error.issues), 400);
  const v = b.data;
  await c.env.DB.prepare("INSERT INTO events (id, name, starts_on, ends_on, goal, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(ulid(), v.name, v.startsOn, v.endsOn, v.goal ?? null, nowIso())
    .run();
  return c.json(await listEvents(c.env));
});

adminEventRoutes.put("/:id", async (c) => {
  const b = eventSchema.safeParse(await c.req.json().catch(() => null));
  if (!b.success) return c.json(bad(b.error.issues), 400);
  const v = b.data;
  const r = await c.env.DB.prepare("UPDATE events SET name = ?, starts_on = ?, ends_on = ?, goal = ? WHERE id = ?")
    .bind(v.name, v.startsOn, v.endsOn, v.goal ?? null, c.req.param("id"))
    .run();
  if (!r.meta.changes) return c.json({ error: "not_found" }, 404);
  return c.json(await listEvents(c.env));
});

adminEventRoutes.delete("/:id", async (c) => {
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
