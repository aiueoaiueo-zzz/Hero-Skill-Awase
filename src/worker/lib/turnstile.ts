import type { Env } from "../env";

/**
 * Turnstile のトークンを検証する。
 * TURNSTILE_SECRET_KEY が未設定のときは、localhost からのリクエストに限り検証を省略する（ローカル開発用）。
 * 本番で未設定のままなら常に失敗させる（設定漏れで素通りしないように）。
 */
export async function verifyTurnstile(env: Env, req: Request, token: string | undefined): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY) {
    const host = new URL(req.url).hostname;
    return host === "localhost" || host === "127.0.0.1";
  }
  if (!token) return false;
  const form = new FormData();
  form.append("secret", env.TURNSTILE_SECRET_KEY);
  form.append("response", token);
  const ip = req.headers.get("CF-Connecting-IP");
  if (ip) form.append("remoteip", ip); // 検証に使うだけで保存はしない
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
