import { AwsV4Signer } from "aws4fetch";
import type { Env } from "../env";

/** R2 の S3 互換 API の認証情報が設定されているか */
export const hasR2Credentials = (env: Env) => !!(env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET_NAME);

/**
 * R2 への署名付き PUT URL（仕様 6-2）。
 * Content-Type と Content-Length も署名に含めるので、video/mp4 以外や、申告したサイズと違うファイルは PUT できない
 * （大きなファイルを置かれるのを、アップロードの時点で防ぐ）。Content-Length はブラウザが実際のサイズを自動で付ける。
 */
export async function presignPut(env: Env, key: string, contentType: string, size: number, expiresSec = 600): Promise<string> {
  const url = new URL(`https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_BUCKET_NAME}/${key.split("/").map(encodeURIComponent).join("/")}`);
  url.searchParams.set("X-Amz-Expires", String(expiresSec));
  const signer = new AwsV4Signer({
    method: "PUT",
    url: url.toString(),
    headers: { "Content-Type": contentType, "Content-Length": String(size) },
    accessKeyId: env.R2_ACCESS_KEY_ID!,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
    service: "s3",
    region: "auto",
    signQuery: true,
    allHeaders: true,
  });
  const signed = await signer.sign();
  return signed.url.toString();
}
