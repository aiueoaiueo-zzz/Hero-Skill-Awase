import { Link, useNavigate } from "react-router";
import type { RankingResponse } from "../../shared/types";
import { useApi } from "../lib/api";
import { NotYet, RankList } from "./RankBits";

/** トップ画面の小さなランキングの枠（今月→累計の上位 3 人） */
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
      {rows ? <RankList rows={rows.slice(0, 3)} /> : <NotYet />}
    </div>
  );
}
