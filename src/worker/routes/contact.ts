import { Hono } from "hono";
import { CONTACT_KIND_LABEL, type ContactKind } from "../../shared/constants";
import { contactSchema, contactStatusSchema } from "../../shared/schema";
import type { AdminContact } from "../../shared/types";
import type { AppEnv } from "../env";
import { nowIso, ulid } from "../lib/ids";
import { contactPayload, sendDiscord } from "../lib/notify";
import { verifyTurnstile } from "../lib/turnstile";

/** お問い合わせの送信（ログイン不要。Turnstile 必須） */
export const contactRoutes = new Hono<AppEnv>();

contactRoutes.post("/contact", async (c) => {
  const parsed = contactSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid_request", issues: parsed.error.issues.map((i) => i.message) }, 400);
  const d = parsed.data;
  if (!(await verifyTurnstile(c.env, c.req.raw, d.turnstileToken))) return c.json({ error: "turnstile_failed" }, 403);
  // 未対応が溜まりすぎていたら受け付けない（荒らし対策）
  const open = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM contacts WHERE status = 'open'").first<{ n: number }>();
  if ((open?.n ?? 0) >= 500) return c.json({ error: "contact_busy" }, 503);
  await c.env.DB.prepare("INSERT INTO contacts (id, kind, ref, body, reply_to, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(ulid(), d.kind, d.ref, d.body, d.replyTo, nowIso())
    .run();
  c.executionCtx.waitUntil(
    sendDiscord(c.env, contactPayload(c.env, { kindLabel: CONTACT_KIND_LABEL[d.kind as ContactKind], ref: d.ref, body: d.body, replyTo: d.replyTo, openTotal: (open?.n ?? 0) + 1 })),
  );
  return c.json({ ok: true });
});

type Row = { id: string; kind: ContactKind; ref: string | null; body: string; reply_to: string | null; status: "open" | "done"; created_at: string; done_at: string | null };
const toContact = (r: Row): AdminContact => ({
  id: r.id,
  kind: r.kind,
  ref: r.ref,
  body: r.body,
  replyTo: r.reply_to,
  status: r.status,
  createdAt: r.created_at,
  doneAt: r.done_at,
});

/** 管理：お問い合わせの一覧・対応済みの切り替え・削除（/api/admin/contacts） */
export const adminContactRoutes = new Hono<AppEnv>();

adminContactRoutes.get("/", async (c) => {
  const { results } = await c.env.DB.prepare("SELECT * FROM contacts ORDER BY status = 'done', created_at DESC LIMIT 300").all<Row>();
  return c.json({ contacts: results.map(toContact) });
});
/** 未対応の件数（管理画面のタブに表示） */
adminContactRoutes.get("/count", async (c) => {
  const r = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM contacts WHERE status = 'open'").first<{ n: number }>();
  return c.json({ open: r?.n ?? 0 });
});
adminContactRoutes.put("/:id", async (c) => {
  const parsed = contactStatusSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid_request" }, 400);
  const done = parsed.data.status === "done";
  const r = await c.env.DB.prepare("UPDATE contacts SET status = ?, done_at = ? WHERE id = ?")
    .bind(parsed.data.status, done ? nowIso() : null, c.req.param("id"))
    .run();
  return r.meta.changes ? c.json({ ok: true }) : c.json({ error: "not_found" }, 404);
});
adminContactRoutes.delete("/:id", async (c) => {
  const r = await c.env.DB.prepare("DELETE FROM contacts WHERE id = ?").bind(c.req.param("id")).run();
  return r.meta.changes ? c.json({ ok: true }) : c.json({ error: "not_found" }, 404);
});
