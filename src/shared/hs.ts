// 合わせられるかの判定（docs/DECISIONS.md X・Z）
import { NG_ATTACK_TYPES, type AttackType } from "./constants";
import type { Hero, HsInvincible } from "./types";

type HsInfo = Pick<Hero, "ngAttacks" | "hsAttackTime" | "hsInvincible">;

/** 相手の HS の無敵時間が、自分の HS のダメージ発生より短い。
 *  short：足りない場面（無敵時間が場面で変わるキャラは場面ごとに比べる）。all：全部の場面で足りない */
export type HsJudge = { attackTime: number; short: HsInvincible[]; all: boolean } | null;

/** 自分の HS で、相手の HS 明けに時間が足りるか。足りない場面があるときだけ返す（HS が不可のキャラ・情報が足りないときは null） */
export function hsJudge(attacker: HsInfo | null | undefined, target: HsInfo | null | undefined): HsJudge {
  if (!attacker || !target || attacker.ngAttacks.includes("hs")) return null;
  const a = attacker.hsAttackTime;
  const list = target.hsInvincible;
  if (a == null || !list.length) return null;
  const short = list.filter((v) => v.sec < a);
  return short.length ? { attackTime: a, short, all: short.length === list.length } : null;
}

/** 合わせ不可（存在しない）の攻撃方法：自分のキャラで「不可」にしたもの＋全部の場面で時間が足りない HS */
export function blockedAttacks(attacker: HsInfo | null | undefined, target: HsInfo | null | undefined): Set<AttackType> {
  const s = new Set<AttackType>(NG_ATTACK_TYPES.filter((k) => attacker?.ngAttacks.includes(k)));
  if (hsJudge(attacker, target)?.all) s.add("hs");
  return s;
}

/** 秒の表示（1.5 → 「1.5秒」、2 → 「2秒」） */
export const fmtSec = (n: number) => `${Number(n.toFixed(2))}秒`;

/** 無敵時間の表示（「7.34秒」「4.7秒（最短距離時）」「1,2回目 1.3秒／3回目 5.5秒」） */
export const fmtInvincible = (list: HsInvincible[]) =>
  list.length === 1 && list[0].label
    ? `${fmtSec(list[0].sec)}（${list[0].label}）`
    : list.map((v) => (v.label ? `${v.label} ${fmtSec(v.sec)}` : fmtSec(v.sec))).join("／");

/** 管理画面の入力欄用（「7.34」「最短距離時:4.7」「1,2回目:1.3 / 3回目:5.5」） */
export const invincibleToText = (list: HsInvincible[]) => list.map((v) => (v.label ? `${v.label}:${v.sec}` : String(v.sec))).join(" / ");

/** 管理画面の入力を読む。空なら []、読めなければ null */
export function parseInvincibleText(text: string): HsInvincible[] | null {
  const t = text.trim();
  if (!t) return [];
  const list: HsInvincible[] = [];
  for (const part of t.split(/[/／]/)) {
    const m = part.trim().match(/^(?:(.+?)\s*[:：]\s*)?([0-9]+(?:\.[0-9]+)?)\s*秒?$/);
    if (!m) return null;
    const sec = Number(m[2]);
    if (!(sec >= 0 && sec <= 60)) return null;
    list.push({ label: (m[1] ?? "").trim(), sec: Math.round(sec * 100) / 100 });
  }
  return list.length > 6 ? null : list;
}
