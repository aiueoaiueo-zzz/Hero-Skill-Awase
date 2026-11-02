// Cloudflare Access の JWT（Cf-Access-Jwt-Assertion）を検証する（仕様 7-2）

type Jwk = JsonWebKey & { kid?: string };
export type JwksFetcher = (certsUrl: string) => Promise<{ keys: Jwk[] }>;

const defaultFetcher: JwksFetcher = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`jwks_fetch_failed_${res.status}`);
  return res.json();
};

// 公開鍵は 1 時間キャッシュ（鍵のローテーションに備え、見つからない kid のときは取り直す）
const cache = new Map<string, { at: number; keys: Jwk[] }>();
const CACHE_MS = 60 * 60 * 1000;

const b64urlToBytes = (s: string) => {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};
const b64urlJson = (s: string) => JSON.parse(new TextDecoder().decode(b64urlToBytes(s)));

/**
 * チームのドメインを発行元（iss）の形にそろえる。次のどれを入れても "https://myteam.cloudflareaccess.com" になる。
 *   "myteam" / "myteam.cloudflareaccess.com" / "https://myteam.cloudflareaccess.com/"
 *   "https://myteam.cloudflareaccess.com/cdn-cgi/access/certs"（JWKs の URL をまるごと貼った場合）
 */
export const normalizeTeamDomain = (d: string) => {
  let s = d.trim();
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  let host: string;
  try {
    host = new URL(s).hostname.toLowerCase();
  } catch {
    host = s.replace(/^https?:\/\//i, "").split(/[/?#]/)[0].toLowerCase();
  }
  if (!host.includes(".")) host += ".cloudflareaccess.com";
  return `https://${host}`;
};

export type AccessClaims = { email?: string; sub?: string; aud: string | string[]; iss: string; exp: number; nbf?: number; iat?: number };

/** 検証に失敗した理由（画面とログに出して、設定の誤りを見つけやすくする） */
export type AccessFailReason =
  | "malformed" // トークンの形が壊れている
  | "alg" // RS256 以外・kid なし
  | "jwks_fetch" // 公開鍵を取得できない（チームのドメインの誤りなど）
  | "kid_not_found" // 署名に使われた鍵が見つからない（チームのドメインの誤りなど）
  | "signature" // 署名が正しくない
  | "expired" // 期限切れ
  | "not_yet_valid"
  | "issuer" // 発行元（チームのドメイン）が違う
  | "audience"; // AUD が違う

export type AccessVerifyResult = { ok: true; claims: AccessClaims } | { ok: false; reason: AccessFailReason; detail?: string };

export async function verifyAccessJwtDetailed(
  token: string,
  opts: { teamDomain: string; aud: string; now?: number },
  fetchJwks: JwksFetcher = defaultFetcher,
): Promise<AccessVerifyResult> {
  const fail = (reason: AccessFailReason, detail?: string): AccessVerifyResult => ({ ok: false, reason, detail });
  const parts = token.split(".");
  if (parts.length !== 3) return fail("malformed");
  let header: { alg?: string; kid?: string };
  let claims: AccessClaims;
  try {
    header = b64urlJson(parts[0]);
    claims = b64urlJson(parts[1]);
  } catch {
    return fail("malformed");
  }
  if (header.alg !== "RS256" || !header.kid) return fail("alg");

  const issuer = normalizeTeamDomain(opts.teamDomain);
  const certsUrl = `${issuer}/cdn-cgi/access/certs`;
  const findKey = async (refresh: boolean) => {
    let c = cache.get(certsUrl);
    if (refresh || !c || Date.now() - c.at > CACHE_MS) {
      c = { at: Date.now(), keys: (await fetchJwks(certsUrl)).keys };
      cache.set(certsUrl, c);
    }
    return c.keys.find((k) => k.kid === header.kid);
  };
  let jwk: Jwk | undefined;
  try {
    jwk = (await findKey(false)) ?? (await findKey(true));
  } catch (e) {
    return fail("jwks_fetch", `${certsUrl}: ${String(e)}`);
  }
  if (!jwk) return fail("kid_not_found", `token iss=${claims.iss}`);

  let ok = false;
  try {
    const key = await crypto.subtle.importKey("jwk", { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true }, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, [
      "verify",
    ]);
    ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64urlToBytes(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  } catch {
    ok = false;
  }
  if (!ok) return fail("signature");

  const now = Math.floor((opts.now ?? Date.now()) / 1000);
  const skew = 60;
  if (typeof claims.exp !== "number" || claims.exp < now - skew) return fail("expired");
  if (typeof claims.nbf === "number" && claims.nbf > now + skew) return fail("not_yet_valid");
  if (normalizeTeamDomain(String(claims.iss || "")) !== issuer) return fail("issuer", `token iss=${claims.iss}, expected=${issuer}`);
  const auds = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!auds.includes(opts.aud.trim())) return fail("audience", `token aud=${auds.map((a) => String(a).slice(0, 8) + "…").join(",")}`);
  return { ok: true, claims };
}

/** 検証して、成功ならクレーム、失敗なら null */
export async function verifyAccessJwt(
  token: string,
  opts: { teamDomain: string; aud: string; now?: number },
  fetchJwks: JwksFetcher = defaultFetcher,
): Promise<AccessClaims | null> {
  const r = await verifyAccessJwtDetailed(token, opts, fetchJwks);
  return r.ok ? r.claims : null;
}

/** リクエストから Access のトークンを取り出す（ヘッダー優先、なければ Cookie） */
export const accessTokenFrom = (req: Request): string | null => {
  const h = req.headers.get("Cf-Access-Jwt-Assertion");
  if (h) return h;
  const m = (req.headers.get("Cookie") || "").match(/(?:^|;\s*)CF_Authorization=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
};
