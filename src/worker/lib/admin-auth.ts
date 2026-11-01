import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../env";
import { accessTokenFrom, verifyAccessJwt } from "./access";

const isLocal = (req: Request) => ["localhost", "127.0.0.1"].includes(new URL(req.url).hostname);

/**
 * 管理者の確認（Cloudflare Access で保護したうえで、Worker 側でも JWT を検証する）。
 * ACCESS_TEAM_DOMAIN / ACCESS_AUD が未設定のときは、localhost に限り通す（ローカル開発用）。
 */
export const requireAdmin =
  (kind: "api" | "page"): MiddlewareHandler<AppEnv> =>
  async (c, next) => {
    const deny = (status: 401 | 403 | 503, error: string) =>
      kind === "api" ? c.json({ error }, status) : c.text("管理画面は Cloudflare Access でログインした管理者だけが開けます。", status);

    if (!c.env.ACCESS_TEAM_DOMAIN || !c.env.ACCESS_AUD) {
      if (isLocal(c.req.raw)) return next();
      return deny(503, "access_not_configured");
    }
    const token = accessTokenFrom(c.req.raw);
    if (!token) return deny(401, "unauthorized");
    const claims = await verifyAccessJwt(token, { teamDomain: c.env.ACCESS_TEAM_DOMAIN, aud: c.env.ACCESS_AUD });
    if (!claims) return deny(403, "forbidden");
    return next();
  };
