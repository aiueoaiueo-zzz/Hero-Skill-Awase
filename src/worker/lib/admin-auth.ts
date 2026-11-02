import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../env";
import { accessTokenFrom, verifyAccessJwtDetailed, type AccessFailReason } from "./access";

const isLocal = (req: Request) => ["localhost", "127.0.0.1"].includes(new URL(req.url).hostname);

/** 失敗の理由ごとの、設定の見直しポイント（管理者向けの画面に出す） */
const HINT: Record<AccessFailReason | "no_token", string> = {
  no_token: "Cloudflare Access のログイン情報が届いていません。Access の保護範囲が「All traffic」になっているか確認してください。",
  malformed: "ログイン情報の形式が正しくありません。いったんログアウトして、もう一度ログインしてください。",
  alg: "ログイン情報の形式が正しくありません。いったんログアウトして、もう一度ログインしてください。",
  jwks_fetch: "ACCESS_TEAM_DOMAIN（チームのドメイン）が正しいか確認してください。例：myteam.cloudflareaccess.com",
  kid_not_found: "ACCESS_TEAM_DOMAIN（チームのドメイン）が、ログインしたチームと一致しているか確認してください。",
  signature: "ACCESS_TEAM_DOMAIN（チームのドメイン）が、ログインしたチームと一致しているか確認してください。",
  expired: "ログインの有効期限が切れています。もう一度ログインしてください。",
  not_yet_valid: "端末の時刻がずれている可能性があります。もう一度ログインしてください。",
  issuer: "ACCESS_TEAM_DOMAIN（チームのドメイン）が、ログインしたチームと一致しているか確認してください。",
  audience: "ACCESS_AUD（AUD タグ）が、管理用の Worker（hs-awase-admin）の Access のものと一致しているか確認してください。",
};

/**
 * 管理者の確認（Cloudflare Access で保護したうえで、Worker 側でも JWT を検証する）。
 * ACCESS_TEAM_DOMAIN / ACCESS_AUD が未設定のときは、localhost に限り通す（ローカル開発用）。
 * 失敗したときは理由（設定の見直しポイント）を返し、Workers のログにも残す。
 */
export const requireAdmin =
  (kind: "api" | "page"): MiddlewareHandler<AppEnv> =>
  async (c, next) => {
    const deny = (status: 401 | 403 | 503, error: string, hint?: string) =>
      kind === "api"
        ? c.json({ error, ...(hint ? { hint } : {}) }, status)
        : c.text(
            `管理画面は Cloudflare Access でログインした管理者だけが開けます。${hint ? `\n\n確認できなかった理由（${error}）：${hint}` : ""}`,
            status,
          );

    if (!c.env.ACCESS_TEAM_DOMAIN || !c.env.ACCESS_AUD) {
      if (isLocal(c.req.raw)) return next();
      return deny(503, "access_not_configured", "ACCESS_TEAM_DOMAIN と ACCESS_AUD が設定されていません。");
    }
    const token = accessTokenFrom(c.req.raw);
    if (!token) {
      console.warn("admin auth failed", JSON.stringify({ reason: "no_token", path: c.req.path }));
      return deny(401, "no_token", HINT.no_token);
    }
    const r = await verifyAccessJwtDetailed(token, { teamDomain: c.env.ACCESS_TEAM_DOMAIN, aud: c.env.ACCESS_AUD });
    if (!r.ok) {
      console.warn("admin auth failed", JSON.stringify({ reason: r.reason, detail: r.detail, path: c.req.path }));
      return deny(403, r.reason, HINT[r.reason]);
    }
    return next();
  };
