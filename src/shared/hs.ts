// 合わせられるかの判定（docs/DECISIONS.md X・Z）
import { NG_ATTACK_TYPES, type AttackType } from "./constants";
import type { Hero } from "./types";

type HsInfo = Pick<Hero, "ngAttacks" | "hsAttackTime" | "hsInvincibleTime">;

/** 相手の HS の無敵時間が、自分の HS の攻撃発生時間より短い（HS で合わせ不可能） */
export type HsJudge = { ok: false; reason: "time"; attackTime: number; invincibleTime: number } | null;

/** 自分の HS で、相手の HS 明けに時間が足りて合わせられるか。足りないときだけ理由を返す（HS が不可のキャラ・情報が足りないときは null） */
export function hsJudge(attacker: HsInfo | null | undefined, target: HsInfo | null | undefined): HsJudge {
  if (!attacker || !target || attacker.ngAttacks.includes("hs")) return null;
  const a = attacker.hsAttackTime;
  const t = target.hsInvincibleTime;
  if (a == null || t == null) return null;
  return t < a ? { ok: false, reason: "time", attackTime: a, invincibleTime: t } : null;
}

/** 合わせ不可（存在しない）の攻撃方法：自分のキャラで「不可」にしたもの＋時間が足りない HS */
export function blockedAttacks(attacker: HsInfo | null | undefined, target: HsInfo | null | undefined): Set<AttackType> {
  const s = new Set<AttackType>(NG_ATTACK_TYPES.filter((k) => attacker?.ngAttacks.includes(k)));
  if (hsJudge(attacker, target)) s.add("hs");
  return s;
}

/** 秒の表示（1.5 → 「1.5秒」、2 → 「2秒」） */
export const fmtSec = (n: number) => `${Number(n.toFixed(2))}秒`;
