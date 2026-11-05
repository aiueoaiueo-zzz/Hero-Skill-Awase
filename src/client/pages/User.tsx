import { Link, useParams } from "react-router";
import { ATTACK_LABEL, CUE_LABEL } from "../../shared/constants";
import { fmtPoints } from "../../shared/ranking";
import type { UserResponse } from "../../shared/types";
import { Header } from "../components/Header";
import { useApi } from "../lib/api";
import { PROG, useBootFx } from "../lib/fx";
import { fmtDate } from "../lib/ui";

/** 投稿者のページ（バッジ・ポイント・順位と、その人の公開中の合わせ） */
export function User() {
  const { xid = "" } = useParams();
  const { data, error } = useApi<UserResponse>(`/api/users/${encodeURIComponent(xid)}`);
  useBootFx(!!data || !!error);
  return (
    <>
      <Header title={`@${data?.xId ?? xid}`} sub="投稿者のページ" back="/ranking" prog={PROG.other} />
      {error && <div className="empty">{error.status === 404 ? "この投稿者の公開中の合わせはありません" : "読み込みに失敗しました"}</div>}
      {data && (
        <>
          <div className="box userbox">
            <div className="ub-top">
              {data.badge ? <span className="badge big">{data.badge}</span> : <span className="sub">バッジなし</span>}
              <a className="sbtn" href={`https://x.com/${data.xId}`} target="_blank" rel="noopener noreferrer">
                X のプロフィール ↗
              </a>
            </div>
            {data.excluded ? (
              <p className="note">この投稿者はランキングの対象外です。</p>
            ) : (
              <dl className="ub-stats">
                <div>
                  <dt>累計</dt>
                  <dd>
                    {fmtPoints(data.total)}pt{data.rankTotal && <small>（{data.rankTotal}位）</small>}
                  </dd>
                </div>
                <div>
                  <dt>今月</dt>
                  <dd>
                    {fmtPoints(data.month)}pt{data.rankMonth && <small>（{data.rankMonth}位）</small>}
                  </dd>
                </div>
              </dl>
            )}
            {!data.rankingActive && !data.excluded && <p className="note">ランキングは、投稿者が 5 人集まったら始まります。</p>}
            <p className="note">※ X の ID は、投稿した人が入力したものです。</p>
          </div>
          <div className="sec">公開中の合わせ（{data.timings.length} 件）</div>
          {data.timings.map((t) => (
            <Link key={t.kind + t.id} className="entry ulink" to={`/h/${t.attacker.slug}/${t.target.slug}#t-${t.id}`}>
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                <span className={`chip ${t.kind === "fix" ? "st-merged" : "st-approved"}`}>{t.kind === "fix" ? "修正" : "投稿"}</span>
                <b style={{ fontSize: 13 }}>
                  {t.attacker.name} → {t.target.name}
                </b>
                <span style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--sub)" }}>{fmtDate(t.at)}</span>
              </div>
              <div className="tim" style={{ marginTop: 6 }}>
                {t.timingText}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--sub)", marginTop: 4 }}>
                攻撃方法：{ATTACK_LABEL[t.attackType]}／目印：{CUE_LABEL[t.cueType]}
              </div>
            </Link>
          ))}
        </>
      )}
    </>
  );
}
