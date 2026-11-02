import { ATTACK_LABEL, type AttackType } from "../../shared/constants";
import type { Env } from "../env";

// Discord への通知（Webhook）。DISCORD_WEBHOOK_URL が未設定なら何もしない。
// 通知の失敗で投稿を失敗させないよう、エラーはログに残すだけにする。

const ORANGE = 0xff6a00;
const CYAN = 0x2fd3ef;
const RED = 0xd93636;

/** Discord に送る内容 */
export type DiscordPayload = {
  content?: string;
  embeds: { title: string; description?: string; color: number; url?: string; fields?: { name: string; value: string; inline?: boolean }[] }[];
  /** メンション（@everyone など）は一切させない。投稿者が名前に書いても通知が飛ばないように */
  allowed_mentions: { parse: [] };
};

const clip = (s: string, n: number) => {
  const a = Array.from(s);
  return a.length > n ? a.slice(0, n - 1).join("") + "…" : s;
};
const adminLink = (env: Env) => (env.ADMIN_APP_URL ? `${env.ADMIN_APP_URL.replace(/\/+$/, "")}/admin` : undefined);

/** 新しい投稿・修正提案が届いたとき */
export function newSubmissionPayload(
  env: Env,
  p: {
    code: string;
    attacker: string;
    target: string;
    attackTypes: AttackType[];
    timingCount: number;
    nickname: string | null;
    isFix: boolean;
    pendingTotal: number;
  },
): DiscordPayload {
  const kinds = [...new Set(p.attackTypes)].map((k) => ATTACK_LABEL[k]).join("・");
  const url = adminLink(env);
  return {
    embeds: [
      {
        title: p.isFix ? `✏️ 修正提案が届きました（${p.code}）` : `📮 新しい投稿が届きました（${p.code}）`,
        description: `${clip(p.attacker, 30)} → ${clip(p.target, 30)}`,
        color: p.isFix ? CYAN : ORANGE,
        ...(url ? { url } : {}),
        fields: [
          { name: "タイミング", value: `${p.timingCount} 件（${kinds}）`, inline: true },
          { name: "投稿者", value: p.nickname ? clip(p.nickname, 20) : "（なし）", inline: true },
          { name: "承認待ち", value: `合計 ${p.pendingTotal} 件`, inline: true },
          ...(url ? [{ name: "管理画面", value: url }] : []),
        ],
      },
    ],
    allowed_mentions: { parse: [] },
  };
}

/** 容量の上限で、動画の受付が止まったとき */
export function capacityPayload(env: Env, u: { totalBytes: number; limitBytes: number; pendingBytes: number; pendingLimitBytes: number }): DiscordPayload {
  const gb = (n: number) => `${(n / 1024 ** 3).toFixed(2)}GB`;
  const url = adminLink(env);
  return {
    embeds: [
      {
        title: "⚠️ 動画の受付が止まっています（保存容量の上限）",
        description: "承認待ちを審査（承認・却下）すると、受付が再開します。",
        color: RED,
        ...(url ? { url } : {}),
        fields: [
          { name: "合計", value: `${gb(u.totalBytes)} / ${gb(u.limitBytes)}`, inline: true },
          { name: "うち承認待ち", value: `${gb(u.pendingBytes)} / ${gb(u.pendingLimitBytes)}`, inline: true },
          ...(url ? [{ name: "管理画面", value: url }] : []),
        ],
      },
    ],
    allowed_mentions: { parse: [] },
  };
}

export async function sendDiscord(env: Env, payload: DiscordPayload): Promise<boolean> {
  const url = env.DISCORD_WEBHOOK_URL;
  if (!url) return false;
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!res.ok) console.warn("discord notify failed", res.status, await res.text().catch(() => ""));
    return res.ok;
  } catch (e) {
    console.warn("discord notify error", String(e));
    return false;
  }
}

/** 同じ種類の通知を一定時間に 1 回だけにする（settings に最後に送った日時を記録） */
export async function sendDiscordThrottled(env: Env, kind: string, intervalMs: number, payload: DiscordPayload) {
  if (!env.DISCORD_WEBHOOK_URL) return;
  const key = `notified_${kind}`;
  const r = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind(key).first<{ value: string }>();
  if (r && Date.now() - Date.parse(r.value) < intervalMs) return;
  const now = new Date().toISOString();
  await env.DB.prepare("INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at")
    .bind(key, now, now)
    .run();
  await sendDiscord(env, payload);
}
