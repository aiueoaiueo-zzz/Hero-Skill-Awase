import { describe, expect, it } from "vitest";
import type { Env } from "../src/worker/env";
import { hasR2Credentials, presignPut } from "../src/worker/lib/presign";

const env = {
  R2_ACCOUNT_ID: "acc123",
  R2_ACCESS_KEY_ID: "AKIDEXAMPLE",
  R2_SECRET_ACCESS_KEY: "secret",
  R2_BUCKET_NAME: "hs-awase-media",
} as Env;

describe("presignPut", () => {
  it("R2 の署名付き PUT URL を作る（10 分・Content-Type を署名）", async () => {
    const u = new URL(await presignPut(env, "pending/01ABC.mp4", "video/mp4", 600));
    expect(u.origin).toBe("https://acc123.r2.cloudflarestorage.com");
    expect(u.pathname).toBe("/hs-awase-media/pending/01ABC.mp4");
    expect(u.searchParams.get("X-Amz-Expires")).toBe("600");
    expect(u.searchParams.get("X-Amz-Algorithm")).toBe("AWS4-HMAC-SHA256");
    expect(u.searchParams.get("X-Amz-Credential")).toMatch(/^AKIDEXAMPLE\/\d{8}\/auto\/s3\/aws4_request$/);
    expect(u.searchParams.get("X-Amz-SignedHeaders")).toBe("content-type;host");
    expect(u.searchParams.get("X-Amz-Signature")).toMatch(/^[0-9a-f]{64}$/);
  });
  it("認証情報が揃っていなければ使わない", () => {
    expect(hasR2Credentials(env)).toBe(true);
    expect(hasR2Credentials({ ...env, R2_SECRET_ACCESS_KEY: "" } as Env)).toBe(false);
  });
});
