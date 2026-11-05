import { Link, useNavigate } from "react-router";
import { BADGES, BONUS_PAIRS_PER_WEEK, POINTS } from "../../shared/ranking";
import type { RankingResponse } from "../../shared/types";
import { Header } from "../components/Header";
import { NotYet, RankList } from "../components/RankBits";
import { useApi } from "../lib/api";
import { PROG, useBootFx } from "../lib/fx";

const md = (iso: string) => new Date(iso).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", timeZone: "Asia/Tokyo" });

/** ランキング（累計・今月）と今週のボーナス組み合わせ */
export function Ranking() {
  const nav = useNavigate();
  const { data, error } = useApi<RankingResponse>("/api/ranking");
  useBootFx(!!data || !!error);
  return (
    <>
      <Header title="ランキング" sub="承認された合わせの数で集計" back="/" prog={PROG.other} />
      {error && <div className="empty">読み込みに失敗しました</div>}
      {data && (
        <>
          <div className="box">
            <p className="bt">
              ★ 今週のボーナス組み合わせ
              <small>
                （{md(data.bonus.weekStart)}〜{md(new Date(Date.parse(data.bonus.weekEnd) - 1).toISOString())}）
              </small>
            </p>
            <ul className="bonuslist">
              {data.bonus.pairs.map((p) => (
                <li key={p.attacker.id + p.target.id}>
                  <Link to={`/h/${p.attacker.slug}/${p.target.slug}`}>
                    {p.attacker.name} → {p.target.name}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="note">
              毎週月曜 0:00 に、まだ情報がない組み合わせの中からランダムで {BONUS_PAIRS_PER_WEEK} つ選ばれます。その週のうちにこの組み合わせの投稿が承認されると、＋
              {POINTS.bonus} ポイント。
              <br />※ ランダムで選ぶため、合わせるタイミング自体がない組み合わせが選ばれることもあります。
            </p>
          </div>
          <div className="box">
            <p className="bt">今月のランキング</p>
            {data.month ? <RankList rows={data.month} /> : <NotYet now={data.monthUsers} min={data.minUsers} label="今月のランキング" />}
          </div>
          <div className="box">
            <p className="bt">累計ランキング</p>
            {data.total ? <RankList rows={data.total} /> : <NotYet now={data.totalUsers} min={data.minUsers} label="ランキング" />}
          </div>
          <div className="box rules">
            <p className="bt">ポイントのルール</p>
            <ul>
              <li>投稿したタイミングが承認されると {POINTS.post} ポイント</li>
              <li>修正提案が承認されると、修正した人に {POINTS.fix} ポイント（元の投稿は {POINTS.postFixed} ポイントになります）</li>
              <li>今週のボーナス組み合わせは ＋{POINTS.bonus} ポイント</li>
              <li>非公開・削除になったものは数えません。投稿時に X の ID を入力した投稿だけが対象です</li>
              <li>今月のランキングは毎月 1 日 0:00 にリセット。同じポイントの場合は、先にそのポイントに届いた人が上になります</li>
            </ul>
            <p className="bt" style={{ marginTop: 12 }}>
              バッジ（累計ポイント）
            </p>
            <ul className="badges">
              {BADGES.map((b) => (
                <li key={b.name}>
                  <span className="badge">{b.name}</span> {b.min} ポイント〜
                </li>
              ))}
            </ul>
            <p className="note">
              ※ X の ID は、なるべくご自身のものを入力してください。他の方の ID は入力しないでください。
              <br />※ 自分で撮影した動画、または撮影した人（知人・友人など）から許可をもらった動画のみ投稿してください。
            </p>
          </div>
          <div className="links">
            <button onClick={() => nav("/submit")}>＋ 投稿する</button>
          </div>
        </>
      )}
    </>
  );
}
