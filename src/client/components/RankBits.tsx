import { Link } from "react-router";
import { fmtPoints } from "../../shared/ranking";
import type { RankRow } from "../../shared/types";
import { useData } from "../lib/data";
import { Avatar } from "./Avatar";

/** ランキングの一覧（順位・@ID・バッジ・ポイント） */
export function RankList({ rows }: { rows: RankRow[] }) {
  return (
    <ol className="ranklist">
      {rows.map((r) => (
        <li key={r.xId} className={r.rank <= 3 ? `top${r.rank}` : ""}>
          <span className="no">{r.rank}</span>
          <Link className="who" to={`/u/${r.xId}`} onClick={(e) => e.stopPropagation()}>
            @{r.xId}
          </Link>
          {r.badge && <span className="badge">{r.badge}</span>}
          <span className="pt">{fmtPoints(r.points)}pt</span>
        </li>
      ))}
    </ol>
  );
}

/** 人数が足りないときの案内 */
export const NotYet = () => <p className="notyet">ランキング準備中です</p>;

/** 表彰台（1〜3 位）＋ 4 位からの一覧。アイコンは、集計対象の投稿で攻撃側にいちばん多く選んだキャラ（docs/DECISIONS.md AY） */
export function Podium({ rows }: { rows: RankRow[] }) {
  const { heroes } = useData();
  const top = rows.slice(0, 3);
  const spot = (r: RankRow | undefined, k: number) => {
    if (!r) return <div className={`pd pd${k}`} />;
    const h = r.hero ? heroes.find((x) => x.id === r.hero) : undefined;
    return (
      <Link className={`pd pd${k}`} to={`/u/${r.xId}`}>
        <span className="crown">{k === 1 ? "👑" : ""}</span>
        <span className="pav">{h ? <Avatar hero={h} /> : <b>{r.xId[0]?.toUpperCase()}</b>}</span>
        <span className="pid">@{r.xId}</span>
        {r.badge && <span className="badge">{r.badge}</span>}
        <span className="ppt">{fmtPoints(r.points)}pt</span>
        <span className="step">{k}</span>
      </Link>
    );
  };
  return (
    <>
      <div className="podium">
        {spot(top[1], 2)}
        {spot(top[0], 1)}
        {spot(top[2], 3)}
      </div>
      {rows.length > 3 && <RankList rows={rows.slice(3)} />}
    </>
  );
}

/** トップ画面用の小さな表彰台（2・1・3 位を横に並べる。アイコンは表彰台と同じ） */
export function MiniPodium({ rows }: { rows: RankRow[] }) {
  const { heroes } = useData();
  const spot = (r: RankRow | undefined, k: number) => {
    if (!r) return <div className={`mp mp${k}`} />;
    const h = r.hero ? heroes.find((x) => x.id === r.hero) : undefined;
    return (
      <Link className={`mp mp${k}`} to={`/u/${r.xId}`} onClick={(e) => e.stopPropagation()}>
        <span className="crown">{k === 1 ? "👑" : ""}</span>
        <span className="pav">{h ? <Avatar hero={h} /> : <b>{r.xId[0]?.toUpperCase()}</b>}</span>
        <span className="pid">@{r.xId}</span>
        <span className="ppt">{fmtPoints(r.points)}pt</span>
        <span className="step">{k}</span>
      </Link>
    );
  };
  return (
    <div className="minipodium">
      {spot(rows[1], 2)}
      {spot(rows[0], 1)}
      {spot(rows[2], 3)}
    </div>
  );
}
