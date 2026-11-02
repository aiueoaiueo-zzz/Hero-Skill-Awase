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

/** "myteam" / "myteam.cloudflareaccess.com" / "https://myteam.cloudflareaccess.com/" → "https://myteam.cloudflareaccess.com" */
export const normalizeTeamDomain = (d: string) => {
  let host = d.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  if (!host.includes(".")) host += ".cloudflareaccess.com";
  return `https://${host}`;
};

export type AccessClaims = { email?: string; sub?: string; aud: string | string[]; iss: string; exp: number; nbf?: number; iat?: number };

export async function verifyAccessJwt(
  token: string,
  opts: { teamDomain: string; aud: string; now?: number },
  fetchJwks: JwksFetcher = defaultFetcher,
): Promise<AccessClaims | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  let header: { alg?: string; kid?: string };
  let claims: AccessClaims;
  try {
    header = b64urlJson(parts[0]);
    claims = b64urlJson(parts[1]);
  } catch {
    return null;
  }
  if (header.alg !== "RS256" || !header.kid) return null;

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
  } catch {
    return null;
  }
  if (!jwk) return null;

  const key = await crypto.subtle.importKey("jwk", { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true }, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, [
    "verify",
  ]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64urlToBytes(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  if (!ok) return null;

  const now = Math.floor((opts.now ?? Date.now()) / 1000);
  const skew = 60;
  if (typeof claims.exp !== "number" || claims.exp < now - skew) return null;
  if (typeof claims.nbf === "number" && claims.nbf > now + skew) return null;
  if (claims.iss !== issuer) return null;
  const auds = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!auds.includes(opts.aud)) return null;
  return claims;
}

/** リクエストから Access のトークンを取り出す（ヘッダー優先、なければ Cookie） */
export const accessTokenFrom = (req: Request): string | null => {
  const h = req.headers.get("Cf-Access-Jwt-Assertion");
  if (h) return h;
  const m = (req.headers.get("Cookie") || "").match(/(?:^|;\s*)CF_Authorization=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
};
