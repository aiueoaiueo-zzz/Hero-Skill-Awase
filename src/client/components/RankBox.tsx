import { Link, useNavigate } from "react-router";
import type { RankingResponse } from "../../shared/types";
import { useApi } from "../lib/api";
import { NotYet, RankList } from "./RankBits";

/** トップ画面の小さなランキングの枠（イベント期間中はイベント、それ以外は累計→今月の上位 3 人。どれも非公開なら出さない） */
export function RankBox() {
  const nav = useNavigate();
  const { data } = useApi<RankingResponse>("/api/ranking", { cached: true });
  if (!data) return null;
  const [rows, label] = data.event
    ? [data.event.rows, `${data.event.name} ランキング`]
    : data.show.total
      ? [data.total, "累計ランキング"]
      : data.show.month
        ? [data.month, "今月のランキング"]
        : [null, ""];
  if (!label) return null;
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
