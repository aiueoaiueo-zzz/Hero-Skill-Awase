import { AwsClient } from "aws4fetch";
import type { Env } from "../env";

/** R2 の S3 互換 API の認証情報が設定されているか */
export const hasR2Credentials = (env: Env) => !!(env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET_NAME);

/**
 * R2 への署名付き PUT URL（仕様 6-2）。Content-Type も署名に含めるので、video/mp4 以外では PUT できない。
 */
export async function presignPut(env: Env, key: string, contentType: string, expiresSec = 600): Promise<string> {
  const client = new AwsClient({ accessKeyId: env.R2_ACCESS_KEY_ID!, secretAccessKey: env.R2_SECRET_ACCESS_KEY!, service: "s3", region: "auto" });
  const url = new URL(`https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_BUCKET_NAME}/${key.split("/").map(encodeURIComponent).join("/")}`);
  url.searchParams.set("X-Amz-Expires", String(expiresSec));
  const signed = await client.sign(new Request(url, { method: "PUT", headers: { "Content-Type": contentType } }), { aws: { signQuery: true, allHeaders: true } });
  return signed.url;
}
