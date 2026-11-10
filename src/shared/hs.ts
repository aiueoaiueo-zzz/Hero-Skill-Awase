// HS で合わせられるかの判定（docs/DECISIONS.md X）
import type { Hero } from "./types";

type HsInfo = Pick<Hero, "hsType" | "hsAttackTime" | "hsInvincibleTime">;

export type HsJudge =
  /** 攻撃する側の HS が防御型 */
  | { ok: false; reason: "defense" }
  /** 相手の HS の無敵時間が、自分の HS の攻撃発生時間より短い */
  | { ok: false; reason: "time"; attackTime: number; invincibleTime: number }
  /** 合わせられる、または情報が足りなくて判定できない */
  | null;

/** 攻撃する側（自分）の HS で、相手の HS 明けに合わせられるか。合わせ不可能なときだけ理由を返す */
export function hsJudge(attacker: HsInfo | null | undefined, target: HsInfo | null | undefined): HsJudge {
  if (!attacker) return null;
  if (attacker.hsType === "defense") return { ok: false, reason: "defense" };
  if (attacker.hsType !== "attack" || !target) return null;
  const a = attacker.hsAttackTime;
  const t = target.hsInvincibleTime;
  if (a == null || t == null) return null;
  return t < a ? { ok: false, reason: "time", attackTime: a, invincibleTime: t } : null;
}

/** 秒の表示（1.5 → 「1.5秒」、2 → 「2秒」） */
export const fmtSec = (n: number) => `${Number(n.toFixed(2))}秒`;
