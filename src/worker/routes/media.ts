import { Hono } from "hono";
import type { AppEnv } from "../env";
import { appRole } from "../lib/role";
import { serveR2 } from "../lib/serve";

// 公開メディアの配信（仕様 6-3）。public/ と heroes/ だけを返す。pending/ は返さない。
export const mediaRoutes = new Hono<AppEnv>();

const PUBLIC_PREFIXES = ["public/", "heroes/"];

mediaRoutes.on(["GET", "HEAD"], "/*", async (c) => {
  const key = decodeURIComponent(c.req.path.replace(/^\/media\//, ""));
  if (!PUBLIC_PREFIXES.some((p) => key.startsWith(p)) || key.includes("..")) return c.text("Not Found", 404);
  // キャラ画像は一般向けの Worker からは配信しない（管理用の Worker だけ）
  if (key.startsWith("heroes/") && appRole(c.env) === "public") return c.text("Not Found", 404);
  return serveR2(c.env.MEDIA, c.req.raw, key, "public, max-age=31536000, immutable");
});
