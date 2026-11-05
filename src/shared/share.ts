import { ATTACK_LABEL, CUE_LABEL, type AttackType, type CueType } from "./constants";
import { X_ID_RE } from "./ranking";

// X（旧 Twitter）への共有。投稿画面（intent）を開くだけで、アプリから X に直接は送らない。
const X_INTENT = "https://x.com/intent/tweet";
const HASHTAGS = "#ヒロアプ #HS合わせ #コンパス";
/** 管理者のお知らせの区切り線 */
const RULE = "-".repeat(20);
/** X の上限（重み付きの文字数） */
export const X_LIMIT = 280;
/** X が URL を数える長さ（どんな URL も 23） */
const X_URL_WEIGHT = 23;

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

/**
 * X の文字数の数え方（重み付き）：半角英数字・記号などは 1、日本語（全角）や絵文字は 2。URL は長さに関係なく 23。
 * （twitter-text の既定の設定に合わせた近似）
 */
export const xWeight = (s: string) => {
  let n = 0;
  for (const c of s.replace(/https?:\/\/\S+/g, "u".repeat(X_URL_WEIGHT))) {
    const o = c.codePointAt(0)!;
    n += o <= 0x10ff || (o >= 0x2000 && o <= 0x200d) || (o >= 0x2010 && o <= 0x201f) || (o >= 0x2032 && o <= 0x2037) ? 1 : 2;
  }
  return n;
};

/** 投稿者の表示。X の ID は「＠ID」、古い自由入力の名前は @ を全角にしてそのまま（X でほかの人に通知が飛ばないように） */
const noMention = (s: string) => (X_ID_RE.test(s) ? `＠${s}` : s.replace(/@/g, "＠"));

type Base = {
  attacker: string;
  target: string;
  attackType: AttackType;
  cueType: CueType;
  timingText: string;
  nickname?: string | null;
  supportCode?: string | null;
};

/**
 * 共有の文面を組み立てる。URL は X が後ろに付けるので、その分も数えて X の上限に収まるように、
 * はみ出すときはタイミングの文を短くして「…」を付ける（それでも入らないときだけ投稿者名も短くする）。
 */
function build(p: Base, head: string[], nickMax = 20): string {
  const cue = `（目印：${CUE_LABEL[p.cueType] ?? "その他"}）`;
  const lines = (timing: string) =>
    [
      ...head,
      "【HS合わせ】",
      `${p.attacker}（攻撃方法：${ATTACK_LABEL[p.attackType]}）→ ${p.target}`,
      "",
      `${timing}${cue}`,
      "",
      ...(p.nickname ? [`投稿者：${noMention(clip(p.nickname, nickMax))}`] : []),
      ...(p.supportCode ? [`応援コード：${clip(p.supportCode, 20)}`] : []),
      HASHTAGS,
    ].join("\n");
  const full = Array.from(p.timingText.replace(/\s+/g, " ").trim());
  const fits = (t: string) => xWeight(lines(t)) + 1 + X_URL_WEIGHT <= X_LIMIT;
  if (fits(full.join(""))) return lines(full.join(""));
  // タイミングの文は最低 10 文字は残す。それでも入らないときは投稿者名を短くする
  for (let n = full.length - 1; n >= Math.min(10, full.length - 1); n--) {
    const t = full.slice(0, n).join("") + "…";
    if (fits(t)) return lines(t);
  }
  if (p.nickname && nickMax > 6) return build(p, head, nickMax - 4);
  return lines(full.slice(0, 10).join("") + "…");
}

/** 利用者が詳細画面のタイミングを共有するときの文面 */
export const timingShareText = (p: Base) => build(p, []);

/** 管理者が承認したタイミングを知らせるときの文面（修正提案の承認は「更新」） */
export const approvedShareText = (p: Base & { updated?: boolean }) =>
  build(p, [`以下の合わせが${p.updated ? "更新" : "公開"}されました！`, RULE]);
