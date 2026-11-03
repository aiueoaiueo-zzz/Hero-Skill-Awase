import { ATTACK_LABEL, type AttackType } from "./constants";

// X（旧 Twitter）への共有。投稿画面（intent）を開くだけで、アプリから X に直接は送らない。
const X_INTENT = "https://x.com/intent/tweet";
const HASHTAGS = "#コンパス #HS合わせアプリ";

/** 文字数（絵文字なども 1 文字）で切り詰める */
const clip = (s: string, n: number) => {
  const a = Array.from(s.replace(/\s+/g, " ").trim());
  return a.length > n ? a.slice(0, n - 1).join("") + "…" : a.join("");
};

/** 詳細画面の、特定のタイミングへのリンク（#t-<id> でそのタイミングまで移動する） */
export const timingLink = (base: string, attackerSlug: string, targetSlug: string, timingId: string) =>
  `${base.replace(/\/+$/, "")}/h/${encodeURIComponent(attackerSlug)}/${encodeURIComponent(targetSlug)}#t-${encodeURIComponent(timingId)}`;

/** 共有用の短いリンク（/s/<コード>。開くとそのタイミングへ移動する） */
export const shortLink = (base: string, shareCode: string) => `${base.replace(/\/+$/, "")}/s/${shareCode}`;

export const xShareUrl = (text: string, url: string) => `${X_INTENT}?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;

/** X のダイレクトメッセージ（送り先は X の画面で選ぶ） */
export const xDmUrl = (text: string, url: string) => `https://x.com/messages/compose?text=${encodeURIComponent(`${text}\n${url}`)}`;

/** LINE で送る（送り先は LINE の画面で選ぶ） */
export const lineShareUrl = (text: string, url: string) => `https://line.me/R/share?text=${encodeURIComponent(`${text}\n${url}`)}`;

type Base = { attacker: string; target: string; attackType: AttackType; nickname?: string | null; supportCode?: string | null };
const credit = (p: Base) => [p.nickname && `投稿者：${clip(p.nickname, 20)}`, p.supportCode && `応援コード：${clip(p.supportCode, 20)}`].filter(Boolean);

/** 利用者が詳細画面のタイミングを共有するときの文面 */
export function timingShareText(p: Base & { timingText: string }) {
  return [
    `【HS合わせアプリ】${p.attacker} → ${p.target} のHS明けに合わせる（${ATTACK_LABEL[p.attackType]}）`,
    clip(p.timingText, 50),
    ...credit(p),
    HASHTAGS,
  ].join("\n");
}

/** 管理者が承認したタイミングを知らせるときの文面 */
export function approvedShareText(p: Base & { updated?: boolean }) {
  return [
    `【HS合わせアプリ】この合わせが${p.updated ? "更新" : "アップロード"}されました！`,
    `${p.attacker} → ${p.target}（${ATTACK_LABEL[p.attackType]}）`,
    ...credit(p),
    HASHTAGS,
  ].join("\n");
}
