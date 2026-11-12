import { Hono } from "hono";
import type { AppEnv } from "../env";
import { serveR2 } from "../lib/serve";

// 公開メディアの配信（仕様 6-3）。public/ と heroes/ だけを返す。pending/ は返さない。
export const mediaRoutes = new Hono<AppEnv>();

const PUBLIC_PREFIXES = ["public/", "heroes/"];

mediaRoutes.on(["GET", "HEAD"], "/*", async (c) => {
  const key = decodeURIComponent(c.req.path.replace(/^\/media\//, ""));
  if (!PUBLIC_PREFIXES.some((p) => key.startsWith(p)) || key.includes("..")) return c.text("Not Found", 404);
  const res = await serveR2(c.env.MEDIA, c.req.raw, key, "public, max-age=31536000, immutable");
  // 確認用サイト：本番からコピーしたデータの動画・画像は確認用の R2 にないので、本番の公開メディアを返す（読むだけ。docs/DECISIONS.md AK）
  if (res.status === 404 && c.env.MEDIA_FALLBACK_URL) {
    const range = c.req.header("range");
    const r = await fetch(`${c.env.MEDIA_FALLBACK_URL.replace(/\/+$/, "")}/${key.split("/").map(encodeURIComponent).join("/")}`, {
      method: c.req.method,
      headers: range ? { range } : {},
    });
    if (r.ok || r.status === 206) return new Response(r.body, r);
  }
  return res;
});
