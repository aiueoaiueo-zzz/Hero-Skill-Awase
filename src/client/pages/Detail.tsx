import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import { ATTACK_LABEL, ATTACK_TAB, ATTACK_TYPES, type AttackType } from "../../shared/constants";
import type { PairResponse } from "../../shared/types";
import { Avatar } from "../components/Avatar";
import { Header } from "../components/Header";
import { TimingCard } from "../components/TimingCard";
import { useApi } from "../lib/api";
import { PROG, useBootFx } from "../lib/fx";

// 組み合わせごとに選んだタブを覚えておく（画面を行き来しても戻る）
const tabMemory = new Map<string, AttackType>();

/** 3. タイミング詳細 */
export function Detail() {
  const { a = "", t = "" } = useParams();
  const nav = useNavigate();
  const { data, error } = useApi<PairResponse>(`/api/pairs/${encodeURIComponent(a)}/${encodeURIComponent(t)}`);
  const key = `${a}/${t}`;
  const [tab, setTab] = useState<AttackType | undefined>(tabMemory.get(key));
  useBootFx(!!data || !!error);
  if (error?.status === 404) return <Navigate to="/" replace />;

  const A = data?.attacker;
  const T = data?.target;
  const timings = data?.timings ?? [];
  const counts = Object.fromEntries(ATTACK_TYPES.map(([k]) => [k, timings.filter((x) => x.attackType === k).length])) as Record<
    AttackType,
    number
  >;
  // 初期表示は、件数が 1 件以上ある最初のタブ
  const cur: AttackType = tab ?? (ATTACK_TYPES.find(([k]) => counts[k] > 0) ?? ATTACK_TYPES[0])[0];
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
      {data && (
        <>
          <div className="vs">
            <div className="side atk">
              <small>攻撃する側</small>
              <Avatar hero={A} />
              <b>{A!.name}</b>
            </div>
            <div className="x">
              HS明けに
              <br />
              合わせる
              <br />▶
            </div>
            <div className="side def">
              <small>HSを使う相手</small>
              <Avatar hero={T} />
              <b>{T!.name}</b>
            </div>
          </div>
          {!timings.length ? (
            <div className="empty">
              まだ情報がありません。
              <br />
              知っている方はぜひ投稿してください！
            </div>
          ) : (
            <>
              <div className="atabs">
                {ATTACK_TYPES.map(([k]) => (
                  <button key={k} className={`${k === cur ? "on" : ""} ${counts[k] ? "" : "zero"}`} onClick={() => select(k)}>
                    <span>
                      {ATTACK_TAB[k][0]}
                      {ATTACK_TAB[k][1] && (
                        <>
                          <br />
                          {ATTACK_TAB[k][1]}
                        </>
                      )}
                    </span>
                    <b>{counts[k]}件</b>
                  </button>
                ))}
              </div>
              {list.length ? (
                list.map((x, i) => (
                  <TimingCard
                    key={x.id}
                    t={x}
                    num={i + 1}
                    actions={
                      <button className="sbtn" onClick={() => nav(`/submit?fix=${x.id}`)}>
                        修正を提案
                      </button>
                    }
                  />
                ))
              ) : (
                <div className="empty">「{ATTACK_LABEL[cur]}」での合わせ方はまだありません</div>
              )}
            </>
          )}
          <button className="fab" onClick={() => nav(`/submit?a=${encodeURIComponent(a)}&t=${encodeURIComponent(t)}`)}>
            ＋ この組み合わせを投稿
          </button>
        </>
      )}
    </>
  );
}
