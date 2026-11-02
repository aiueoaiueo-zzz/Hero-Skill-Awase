import { beforeAll, describe, expect, it } from "vitest";
import { accessTokenFrom, normalizeTeamDomain, verifyAccessJwt, verifyAccessJwtDetailed, type JwksFetcher } from "../src/worker/lib/access";

const TEAM = "myteam.cloudflareaccess.com";
const ISS = "https://myteam.cloudflareaccess.com";
const AUD = "aud-123";

const b64url = (b: ArrayBuffer | Uint8Array | string) =>
  Buffer.from(typeof b === "string" ? b : b instanceof Uint8Array ? b : new Uint8Array(b))
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

let keyPair: CryptoKeyPair;
let otherPair: CryptoKeyPair;
let jwks: { keys: JsonWebKey[] };
let fetchCount = 0;
const fetcher: JwksFetcher = async (url) => {
  fetchCount++;
  expect(url).toBe(`${ISS}/cdn-cgi/access/certs`);
  return jwks;
};

const gen = () =>
  crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, [
    "sign",
    "verify",
  ]) as Promise<CryptoKeyPair>;

async function sign(payload: Record<string, unknown>, opts: { kid?: string; key?: CryptoKey; alg?: string } = {}) {
  const h = b64url(JSON.stringify({ alg: opts.alg ?? "RS256", kid: opts.kid ?? "k1", typ: "JWT" }));
  const p = b64url(JSON.stringify(payload));
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", opts.key ?? keyPair.privateKey, new TextEncoder().encode(`${h}.${p}`));
  return `${h}.${p}.${b64url(sig)}`;
}

const now = Math.floor(Date.now() / 1000);
const good = () => ({ email: "admin@example.com", aud: [AUD], iss: ISS, exp: now + 600, iat: now, nbf: now });

beforeAll(async () => {
  keyPair = await gen();
  otherPair = await gen();
  const jwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  jwks = { keys: [{ ...jwk, kid: "k1" } as JsonWebKey] };
});

describe("verifyAccessJwt", () => {
  it("正しいトークンを受け入れる", async () => {
    const c = await verifyAccessJwt(await sign(good()), { teamDomain: TEAM, aud: AUD }, fetcher);
    expect(c?.email).toBe("admin@example.com");
  });
  it("チーム名だけ・https 付きの指定でも検証できる", async () => {
    expect(await verifyAccessJwt(await sign(good()), { teamDomain: "myteam", aud: AUD }, fetcher)).not.toBeNull();
    expect(await verifyAccessJwt(await sign(good()), { teamDomain: "https://myteam.cloudflareaccess.com/", aud: AUD }, fetcher)).not.toBeNull();
  });
  it("別の鍵で署名されたトークンを拒否する", async () => {
    expect(await verifyAccessJwt(await sign(good(), { key: otherPair.privateKey }), { teamDomain: TEAM, aud: AUD }, fetcher)).toBeNull();
  });
  it("改ざんされたペイロードを拒否する", async () => {
    const [h, , s] = (await sign(good())).split(".");
    const forged = `${h}.${b64url(JSON.stringify({ ...good(), email: "evil@example.com" }))}.${s}`;
    expect(await verifyAccessJwt(forged, { teamDomain: TEAM, aud: AUD }, fetcher)).toBeNull();
  });
  it("期限切れを拒否する", async () => {
    expect(await verifyAccessJwt(await sign({ ...good(), exp: now - 3600 }), { teamDomain: TEAM, aud: AUD }, fetcher)).toBeNull();
  });
  it("AUD 違いを拒否する", async () => {
    expect(await verifyAccessJwt(await sign({ ...good(), aud: ["other"] }), { teamDomain: TEAM, aud: AUD }, fetcher)).toBeNull();
  });
  it("発行元違いを拒否する", async () => {
    expect(await verifyAccessJwt(await sign({ ...good(), iss: "https://evil.cloudflareaccess.com" }), { teamDomain: TEAM, aud: AUD }, fetcher)).toBeNull();
  });
  it("alg=none や知らない kid を拒否する", async () => {
    const h = b64url(JSON.stringify({ alg: "none", kid: "k1" }));
    expect(await verifyAccessJwt(`${h}.${b64url(JSON.stringify(good()))}.`, { teamDomain: TEAM, aud: AUD }, fetcher)).toBeNull();
    const before = fetchCount;
    expect(await verifyAccessJwt(await sign(good(), { kid: "unknown" }), { teamDomain: TEAM, aud: AUD }, fetcher)).toBeNull();
    expect(fetchCount).toBe(before + 1); // 知らない kid のときは鍵を取り直す
  });
  it("壊れたトークンを拒否する", async () => {
    expect(await verifyAccessJwt("abc", { teamDomain: TEAM, aud: AUD }, fetcher)).toBeNull();
    expect(await verifyAccessJwt("a.b.c", { teamDomain: TEAM, aud: AUD }, fetcher)).toBeNull();
  });
});

describe("verifyAccessJwtDetailed（失敗の理由）", () => {
  const v = (t: string, o: Partial<{ teamDomain: string; aud: string }> = {}) =>
    verifyAccessJwtDetailed(t, { teamDomain: TEAM, aud: AUD, ...o }, fetcher).then((r) => (r.ok ? "ok" : r.reason));
  it("JWKs の URL をまるごと設定しても検証できる", async () => {
    expect(await v(await sign(good()), { teamDomain: "https://myteam.cloudflareaccess.com/cdn-cgi/access/certs" })).toBe("ok");
  });
  it("AUD の前後に空白があっても検証できる", async () => {
    expect(await v(await sign(good()), { aud: ` ${AUD} ` })).toBe("ok");
  });
  it("理由を返す", async () => {
    expect(await v("abc")).toBe("malformed");
    expect(await v(await sign(good(), { key: otherPair.privateKey }))).toBe("signature");
    expect(await v(await sign({ ...good(), exp: now - 3600 }))).toBe("expired");
    expect(await v(await sign({ ...good(), aud: ["other"] }))).toBe("audience");
    expect(await v(await sign({ ...good(), iss: "https://evil.cloudflareaccess.com" }))).toBe("issuer");
    expect(await v(await sign(good(), { kid: "unknown" }))).toBe("kid_not_found");
  });
});

describe("helpers", () => {
  it("normalizeTeamDomain", () => {
    expect(normalizeTeamDomain("myteam")).toBe(ISS);
    expect(normalizeTeamDomain("https://myteam.cloudflareaccess.com/")).toBe(ISS);
    // JWKs の URL をまるごと貼った場合・前後の空白・大文字
    expect(normalizeTeamDomain("https://myteam.cloudflareaccess.com/cdn-cgi/access/certs")).toBe(ISS);
    expect(normalizeTeamDomain("  MyTeam.cloudflareaccess.com/cdn-cgi/access/certs ")).toBe(ISS);
  });
  it("accessTokenFrom：ヘッダー優先、なければ Cookie", () => {
    expect(accessTokenFrom(new Request("https://x/", { headers: { "Cf-Access-Jwt-Assertion": "H", Cookie: "CF_Authorization=C" } }))).toBe("H");
    expect(accessTokenFrom(new Request("https://x/", { headers: { Cookie: "a=1; CF_Authorization=C" } }))).toBe("C");
    expect(accessTokenFrom(new Request("https://x/"))).toBeNull();
  });
});
