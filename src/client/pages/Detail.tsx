import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router";
import {
  ATTACK_LABEL,
  ATTACK_NOTE,
  ATTACK_TAB,
  ATTACK_TYPES,
  type AttackType,
} from "../../shared/constants";
import type { PairResponse } from "../../shared/types";
import { Avatar } from "../components/Avatar";
import { displayName } from "../../shared/text";
import { blockedAttacks, fmtInvincible, fmtSec, hsJudge } from "../../shared/hs";
import { Header } from "../components/Header";
import { TimingCard } from "../components/TimingCard";
import { shortLink, timingLink, timingShareText } from "../../shared/share";
import { useApi } from "../lib/api";
import { useData } from "../lib/data";
import { openShare } from "../lib/share";
import { PROG, useBootFx } from "../lib/fx";

// 組み合わせごとに選んだタブを覚えておく（画面を行き来しても戻る）
const tabMemory = new Map<string, AttackType>();

/** 3. タイミング詳細 */
export function Detail() {
  const { a = "", t = "" } = useParams();
  const nav = useNavigate();
  const { data, error } = useApi<PairResponse>(
    `/api/pairs/${encodeURIComponent(a)}/${encodeURIComponent(t)}`,
    { cached: true },
  );
  const key = `${a}/${t}`;
  const [tab, setTab] = useState<AttackType | undefined>(tabMemory.get(key));
  const { publicAppUrl, heroes } = useData();
  const { hash } = useLocation();
  // 共有リンク（#t-<タイミングID>）で開いたとき：そのタイミングのタブを開いて、そこまで移動する
  const linkedId = hash.startsWith("#t-")
    ? decodeURIComponent(hash.slice(3))
    : null;
  const [flashId, setFlashId] = useState<string | null>(null);
  const scrolled = useRef<string | null>(null);
  useEffect(() => {
    if (!data || !linkedId || scrolled.current === linkedId) return;
    const t = data.timings.find((x) => x.id === linkedId);
    if (!t || blockedAttacks(data.attacker, data.target).has(t.attackType)) return;
    if (tab !== t.attackType) {
      setTab(t.attackType);
      return; // タブが切り替わってから移動する
    }
    scrolled.current = linkedId;
    requestAnimationFrame(() => {
      document
        .getElementById(`t-${linkedId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      setFlashId(linkedId);
      setTimeout(() => setFlashId(null), 2500);
    });
  }, [data, linkedId, tab]);
  useBootFx(!!data || !!error);
  if (error?.status === 404) return <Navigate to="/" replace />;

  // キャラは最初の読み込みで分かっているので、タイミングを待たずに見出しと VS を出す
  const A = data?.attacker ?? heroes.find((h) => h.slug === a);
  const T = data?.target ?? heroes.find((h) => h.slug === t);
  // 自分の HS で、相手の HS 明けに時間が足りるか（足りないときだけ理由が入る）
  const ng = hsJudge(A, T);
  // 合わせ不可（存在しない）の攻撃方法：タブをグレーにして選べなくし、その投稿も出さない
  const blocked = blockedAttacks(A, T);
  const timings = (data?.timings ?? []).filter((x) => !blocked.has(x.attackType));
  const counts = Object.fromEntries(
    ATTACK_TYPES.map(([k]) => [
      k,
      timings.filter((x) => x.attackType === k).length,
    ]),
  ) as Record<AttackType, number>;
  // 初期表示は、件数が 1 件以上ある最初のタブ（合わせ不可のタブは選ばない）
  const open = ATTACK_TYPES.filter(([k]) => !blocked.has(k));
  const cur: AttackType =
    tab && !blocked.has(tab) ? tab : (open.find(([k]) => counts[k] > 0) ?? open[0])[0];
  const list = timings.filter((x) => x.attackType === cur);
  const select = (k: AttackType) => {
    tabMemory.set(key, k);
    setTab(k);
  };

  return (
    <>
      <Header
        title={A && T ? `${A.name} → ${T.name}` : ""}
        sub={T ? `${T.name}のHS明けに合わせるタイミング` : ""}
        back={`/h/${a}`}
        prog={PROG.step3}
      />
      {error && <div className="empty">読み込みに失敗しました</div>}
      {A && T && (
        <div className="vs">
          <div className="side atk">
            <small>自分</small>
            <Avatar hero={A} />
            <b>{displayName(A!)}</b>
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
            <b>{displayName(T!)}</b>
          </div>
        </div>
      )}
      {T && T.hsInvincible.length > 0 && (
        <div className="invline">
          {T.name}の HS の無敵時間：<b>{fmtInvincible(T.hsInvincible)}</b>
        </div>
      )}
      {A && T && ng && (
        <div className="ngbox">
          {ng.all ? (
            <>
              <b>HS での合わせは不可能です</b>
              {`${T.name}の HS の無敵時間（${fmtInvincible(ng.short)}）が、${A.name}の HS のダメージ発生（${fmtSec(ng.attackTime)}）より短いため、HS では合わせられません。`}
            </>
          ) : (
            <>
              <b>一部の場面では HS で合わせられません</b>
              {`${ng.short.map((v) => `${v.label}（${fmtSec(v.sec)}）`).join("・")}は、${T.name}の HS の無敵時間が${A.name}の HS のダメージ発生（${fmtSec(ng.attackTime)}）より短いため、HS では合わせられません。`}
            </>
          )}
        </div>
      )}
      {data && (
        <>
          {/* 不可の攻撃方法があるときは、投稿がなくてもグレーのタブを見せる */}
          {!timings.length && !blocked.size ? (
            <div className="empty">
              まだ情報がありません。
              <br />
              知っている方はぜひ投稿してください！
            </div>
          ) : (
            <>
              <div className="atabs">
                {ATTACK_TYPES.map(([k]) => (
                  <button
                    key={k}
                    className={`${k === cur ? "on" : ""} ${counts[k] ? "" : "zero"} ${blocked.has(k) ? "off" : ""}`}
                    disabled={blocked.has(k)}
                    onClick={() => select(k)}
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
                  <TimingCard
                    key={x.id}
                    id={`t-${x.id}`}
                    flash={flashId === x.id}
                    t={x}
                    num={i + 1}
                    actions={
                      <>
                        <button
                          className="sbtn"
                          onClick={() =>
                            openShare({
                              title: `${A!.name} → ${T!.name}｜ヒロアプ`,
                              text: timingShareText({
                                attacker: A!.name,
                                target: T!.name,
                                attackType: x.attackType,
                                cueType: x.cueType,
                                timingText: x.timingText,
                                nickname: x.nickname,
                                supportCode: x.supportCode,
                              }),
                              url: x.shareCode
                                ? shortLink(publicAppUrl, x.shareCode)
                                : timingLink(
                                    publicAppUrl,
                                    A!.slug,
                                    T!.slug,
                                    x.id,
                                  ),
                            })
                          }
                        >
                          共有
                        </button>
                        <button
                          className="sbtn"
                          onClick={() => nav(`/submit?fix=${x.id}`)}
                        >
                          修正を提案
                        </button>
                      </>
                    }
                  />
                ))
              ) : (
                <div className="empty">
                  「{ATTACK_LABEL[cur]}」での合わせ方はまだありません
                </div>
              )}
            </>
          )}
          <button
            className="fab"
            onClick={() =>
              nav(
                `/submit?a=${encodeURIComponent(a)}&t=${encodeURIComponent(t)}`,
              )
            }
          >
            ＋ この組み合わせを投稿
          </button>
        </>
      )}
    </>
  );
}
