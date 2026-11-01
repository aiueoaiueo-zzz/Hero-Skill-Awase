import { Hono } from "hono";
import type { AppEnv } from "../env";

// 公開メディアの配信（仕様 6-3）。public/ と heroes/ だけを返す。pending/ は返さない。
export const mediaRoutes = new Hono<AppEnv>();

const PUBLIC_PREFIXES = ["public/", "heroes/"];

mediaRoutes.on(["GET", "HEAD"], "/*", async (c) => {
  const key = decodeURIComponent(c.req.path.replace(/^\/media\//, ""));
  if (!PUBLIC_PREFIXES.some((p) => key.startsWith(p)) || key.includes("..")) return c.text("Not Found", 404);

  const obj = await c.env.MEDIA.get(key, { range: c.req.raw.headers, onlyIf: c.req.raw.headers });
  if (!obj) return c.text("Not Found", 404);

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("etag", obj.httpEtag);
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", "public, max-age=31536000, immutable");

  // onlyIf の条件に合わない（304）
  if (!("body" in obj)) return new Response(null, { status: 304, headers });

  const range = (obj as R2ObjectBody).range as { offset?: number; length?: number } | undefined;
  const isPartial = c.req.header("range") && range && range.offset !== undefined;
  if (isPartial) {
    const offset = range!.offset ?? 0;
    const length = range!.length ?? obj.size - offset;
    headers.set("Content-Range", `bytes ${offset}-${offset + length - 1}/${obj.size}`);
    headers.set("Content-Length", String(length));
  } else {
    headers.set("Content-Length", String(obj.size));
  }
  const body = c.req.method === "HEAD" ? null : (obj as R2ObjectBody).body;
  return new Response(body, { status: isPartial ? 206 : 200, headers });
});
