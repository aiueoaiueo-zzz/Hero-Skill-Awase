import type { Env } from "../env";

// 共有用の短いコード：英小文字と数字 6 文字（紛らわしい i・l・o・0・1 を除く 31 種類 → 約 8.9 億通り）
const CHARS = "abcdefghjkmnpqrstuvwxyz23456789";
export const SHARE_CODE_RE = /^[a-hjkmnp-z2-9]{6}$/;

export function genShareCode(): string {
  const rnd = crypto.getRandomValues(new Uint8Array(6));
  let s = "";
  for (let i = 0; i < 6; i++) s += CHARS[rnd[i] % CHARS.length];
  return s;
}

/**
 * 承認済みのタイミングに共有コードがなければ発行する（重複したら作り直す）。
 * 戻り値：タイミング ID → 共有コード
 */
export async function ensureShareCodes(env: Env, timingIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (const id of timingIds) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = genShareCode();
      try {
        await env.DB.prepare("UPDATE timings SET share_code = ? WHERE id = ? AND share_code IS NULL").bind(code, id).run();
        break;
      } catch (e) {
        if (!String(e).includes("UNIQUE")) throw e; // コードの重複 → 作り直す
      }
    }
    const r = await env.DB.prepare("SELECT share_code FROM timings WHERE id = ?").bind(id).first<{ share_code: string | null }>();
    if (r?.share_code) out.set(id, r.share_code);
  }
  return out;
}
