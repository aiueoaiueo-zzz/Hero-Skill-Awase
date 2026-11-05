import { Link } from "react-router";
import { fmtPoints } from "../../shared/ranking";
import type { RankRow } from "../../shared/types";

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
export const NotYet = ({ now, min, label }: { now: number; min: number; label: string }) => (
  <p className="notyet">
    {label}は、投稿者が {min} 人集まったら始まります（いま {now} 人）
  </p>
);
