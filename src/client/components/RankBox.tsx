import { Link, useNavigate } from "react-router";
import type { RankingResponse } from "../../shared/types";
import { useApi } from "../lib/api";
import { RankList } from "./RankBits";

/** トップ画面の小さなランキングの枠（今月→累計の上位 3 人と、今週のボーナス組み合わせ） */
export function RankBox() {
  const nav = useNavigate();
  const { data } = useApi<RankingResponse>("/api/ranking", { cached: true });
  if (!data) return null;
  const rows = data.month ?? data.total;
  const label = data.month ? "今月のランキング" : "累計ランキング";
  return (
    // 枠のどこを押してもランキングのページへ（中の @ID は投稿者のページへ）
    <div className="rankbox" role="link" tabIndex={0} onClick={() => nav("/ranking")} onKeyDown={(e) => e.key === "Enter" && nav("/ranking")}>
      <div className="rb-head">
        <b>🏆 {rows ? label : "ランキング"}</b>
        <Link to="/ranking" onClick={(e) => e.stopPropagation()}>
          すべて見る ›
        </Link>
      </div>
      {rows ? <RankList rows={rows.slice(0, 3)} /> : <p className="notyet">投稿者が {data.minUsers} 人集まったらランキング開始（いま {data.totalUsers} 人）</p>}
      {data.bonus.pairs.length > 0 && (
        <div className="rb-bonus">
          <b>★ 今週のボーナス組み合わせ</b>
          <span>
            {data.bonus.pairs
              .slice(0, 3)
              .map((p) => `${p.attacker.name} → ${p.target.name}`)
              .join("／")}
            {data.bonus.pairs.length > 3 && ` ほか${data.bonus.pairs.length - 3}つ`}
          </span>
        </div>
      )}
    </div>
  );
}
