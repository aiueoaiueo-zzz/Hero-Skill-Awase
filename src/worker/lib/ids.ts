const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** ULID（時刻 48bit ＋ 乱数 80bit、Crockford Base32 の 26 文字） */
export function ulid(now = Date.now()): string {
  let time = "";
  let t = now;
  for (let i = 0; i < 10; i++) {
    time = CROCKFORD[t % 32] + time;
    t = Math.floor(t / 32);
  }
  const rnd = crypto.getRandomValues(new Uint8Array(16));
  let rand = "";
  for (let i = 0; i < 16; i++) rand += CROCKFORD[rnd[i] % 32];
  return time + rand;
}

// 受付番号：紛らわしい文字（I, O, 0, 1）を除いた英数字 6 桁
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function genCode(): string {
  const rnd = crypto.getRandomValues(new Uint8Array(6));
  let c = "HS-";
  for (let i = 0; i < 6; i++) c += CODE_CHARS[rnd[i] % CODE_CHARS.length];
  return c;
}

/** 取り下げ用キー（128bit、hex） */
export function genSecret(bytes = 16): string {
  return [...crypto.getRandomValues(new Uint8Array(bytes))].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const nowIso = () => new Date().toISOString();
