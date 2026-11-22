import type { ReactNode } from "react";
import { ATTACK_LABEL, ATTACK_NOTE, ATTACK_TAB, ATTACK_TYPES, type AttackType } from "../../shared/constants";
import { blockedAttacks, fmtInvincible, fmtSec, hsJudge } from "../../shared/hs";
import { displayName } from "../../shared/text";
import type { Hero } from "../../shared/types";
import { Avatar } from "./Avatar";
import { TimingCard, type TimingCardData } from "./TimingCard";

export type PairTiming = TimingCardData & { id: string; attackType: AttackType };

/** 組み合わせごとに選んだタブを覚えておく（画面を行き来しても戻る） */
export const tabMemory = new Map<string, AttackType>();

/** タブの初期表示：件数が 1 件以上ある最初のタブ（合わせ不可のタブは選ばない） */
export function currentTab<X extends PairTiming>(A: Hero | undefined, T: Hero | undefined, timings: X[], tab: AttackType | undefined) {
  const blocked = blockedAttacks(A, T);
  const shown = timings.filter((x) => !blocked.has(x.attackType));
  const counts = Object.fromEntries(ATTACK_TYPES.map(([k]) => [k, shown.filter((x) => x.attackType === k).length])) as Record<AttackType, number>;
  const open = ATTACK_TYPES.filter(([k]) => !blocked.has(k));
  const cur: AttackType = tab && !blocked.has(tab) ? tab : (open.find(([k]) => counts[k] > 0) ?? open[0])[0];
  return { blocked, shown, counts, cur };
}

/**
 * 詳細画面の本体（VS・ダメージ発生と無敵時間・合わせ不可の説明・攻撃方法のタブ・タイミングの一覧）。
 * 一般向けの詳細画面と、管理画面の公開中タブで同じものを使う（ボタンだけ違う）。
 */
export function PairView<X extends PairTiming>({
  A,
  T,
  timings,
  loaded,
  tab,
  onTab,
  actions,
  flashId,
  cardClass,
  emptyText,
}: {
  A?: Hero;
  T?: Hero;
  timings: X[];
  loaded: boolean;
  tab: AttackType | undefined;
  onTab: (k: AttackType) => void;
  actions: (x: X) => ReactNode;
  flashId?: string | null;
  /** カードの見た目を変える（管理画面の非公開など） */
  cardClass?: (x: X) => string | undefined;
  emptyText: ReactNode;
}) {
  // 自分の HS で、相手の HS 明けに時間が足りるか（足りないときだけ理由が入る）
  const ng = hsJudge(A, T);
  // 合わせ不可（存在しない）の攻撃方法：タブをグレーにして選べなくし、その投稿も出さない
  const { blocked, shown, counts, cur } = currentTab(A, T, timings, tab);
  const list = shown.filter((x) => x.attackType === cur);
  return (
    <>
      {A && T && (
        <div className="vs">
          <div className="side atk">
            <small>自分</small>
            <Avatar hero={A} />
            <b>{displayName(A)}</b>
          </div>
          <div className="x">
            HS明けに
            <br />
            合わせる
            <br />▶
          </div>
          <div className="side def">
            <small>相手</small>
            <Avatar hero={T} />
            <b>{displayName(T)}</b>
          </div>
        </div>
      )}
      {/* 左：自分の HS のダメージ発生（HS が可で入力済みのとき）／右：相手の HS の無敵時間（docs/DECISIONS.md AQ） */}
      {((A && A.hsAttackTime != null && !A.ngAttacks.includes("hs")) || (T && T.hsInvincible.length > 0)) && (
        <div className="invline">
          {A && A.hsAttackTime != null && !A.ngAttacks.includes("hs") && (
            <span className="atk">
              ダメージ発生：<b>{fmtInvincible(A.hsAttack)}</b>
            </span>
          )}
          {T && T.hsInvincible.length > 0 && (
            <span className="inv">
              無敵時間：<b>{fmtInvincible(T.hsInvincible)}</b>
              {T.cardMuTime ? <small>（＋無発動カード {fmtSec(T.cardMuTime)}）</small> : null}
            </span>
          )}
        </div>
      )}
      {A && T && ng && (
        <div className="ngbox">
          {ng.all ? (
            <>
              <b>HS での合わせは不可能です</b>
              {`${T.name}の HS の無敵時間（${fmtInvincible(ng.short)}）${ng.cardTime ? `＋無発動カードの発生（${fmtSec(ng.cardTime)}）` : ""}が、${A.name}の HS のダメージ発生（${A.hsAttackLabel ? `${A.hsAttackLabel} ` : ""}${fmtSec(ng.attackTime)}）より短いため、HS では合わせられません。`}
            </>
          ) : (
            <>
              <b>一部の場面では HS で合わせられません</b>
              {`${ng.short.map((v) => `${v.label}（${fmtSec(v.sec)}）`).join("・")}は、${T.name}の HS の無敵時間${ng.cardTime ? `＋無発動カードの発生（${fmtSec(ng.cardTime)}）` : ""}が${A.name}の HS のダメージ発生（${A.hsAttackLabel ? `${A.hsAttackLabel} ` : ""}${fmtSec(ng.attackTime)}）より短いため、HS では合わせられません。`}
            </>
          )}
        </div>
      )}
      {loaded &&
        (!shown.length && !blocked.size ? (
          // 不可の攻撃方法があるときは、投稿がなくてもグレーのタブを見せる
          <div className="empty">{emptyText}</div>
        ) : (
          <>
            <div className="atabs">
              {ATTACK_TYPES.map(([k]) => (
                <button
                  key={k}
                  className={`${k === cur ? "on" : ""} ${counts[k] ? "" : "zero"} ${blocked.has(k) ? "off" : ""}`}
                  disabled={blocked.has(k)}
                  onClick={() => onTab(k)}
                >
                  <span>
                    {ATTACK_TAB[k][0]}
                    {ATTACK_TAB[k][1] && (
                      <>
                        <br />
                        {ATTACK_TAB[k][1]}
                      </>
                    )}
                  </span>
                  <b>{blocked.has(k) ? "不可" : `${counts[k]}件`}</b>
                </button>
              ))}
            </div>
            {ATTACK_NOTE[cur] && <div className="atknote">{ATTACK_NOTE[cur]}</div>}
            {list.length ? (
              list.map((x, i) => (
                <TimingCard key={x.id} id={`t-${x.id}`} flash={flashId === x.id} t={x} num={i + 1} className={cardClass?.(x)} actions={actions(x)} />
              ))
            ) : (
              <div className="empty">「{ATTACK_LABEL[cur]}」での合わせ方はまだありません</div>
            )}
          </>
        ))}
    </>
  );
}
