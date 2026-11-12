import { useNavigate } from "react-router";
import { BADGES } from "../../shared/ranking";
import type { RankingResponse } from "../../shared/types";
import { Header } from "../components/Header";
import { NotYet, RankList } from "../components/RankBits";
import { useApi } from "../lib/api";
import { PROG, useBootFx } from "../lib/fx";

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];
const md = (d: string) => {
  const t = new Date(d + "T00:00:00Z");
  return `${t.getUTCMonth() + 1}/${t.getUTCDate()}（${WEEK[t.getUTCDay()]}）`;
};

/** ランキング（イベント期間中はイベントだけ。それ以外は公開にしたもの）と、参加の注意事項・バッジの種類（docs/DECISIONS.md AM） */
export function Ranking() {
  const nav = useNavigate();
  const { data, error } = useApi<RankingResponse>("/api/ranking");
  useBootFx(!!data || !!error);
  return (
    <>
      <Header title="ランキング" sub="承認された合わせで集計" back="/" prog={PROG.other} />
      {error && <div className="empty">読み込みに失敗しました</div>}
      {data && (
        <>
          {data.event && (
            <div className="box">
              <p className="bt">
                {data.event.name} ランキング
                <small className="rkperiod">
                  {md(data.event.startsOn)}〜{md(data.event.endsOn)}
                </small>
              </p>
              {data.event.rows ? <RankList rows={data.event.rows} /> : <NotYet />}
            </div>
          )}
          {data.mode === "normal" && data.show.total && (
            <div className="box">
              <p className="bt">累計ランキング</p>
              {data.total ? <RankList rows={data.total} /> : <NotYet />}
            </div>
          )}
          {data.mode === "normal" && data.show.month && (
            <div className="box">
              <p className="bt">今月のランキング</p>
              {data.month ? <RankList rows={data.month} /> : <NotYet />}
            </div>
          )}
          {data.mode === "normal" && !data.show.total && !data.show.month && <div className="empty">ランキングは現在お休み中です</div>}
          <div className="links">
            <button onClick={() => nav("/submit")}>＋ 投稿する</button>
          </div>
          <div className="box rules" style={{ marginTop: 18 }}>
            <p className="bt">ランキング参加にあたっての注意事項</p>
            <ul>
              <li>X の ID はご自身のもののみ入力してください</li>
              <li>投稿する動画は、ご自身で撮影したもの、または撮影者（友人・知人）の許可を得たもののみにしてください</li>
            </ul>
          </div>
          <div className="box rules">
            <p className="bt">バッジの種類</p>
            <ul className="badges">
              {BADGES.map((b) => (
                <li key={b.name}>
                  <span className="badge">{b.name}</span> 累計 {b.min} ポイント〜
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </>
  );
}
