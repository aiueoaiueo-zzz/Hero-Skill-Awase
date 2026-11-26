import { useNavigate } from "react-router";
import { useData } from "../lib/data";
import { Avatar } from "./Avatar";

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];
const md = (d: string) => {
  const t = new Date(d + "T00:00:00Z");
  return `${t.getUTCMonth() + 1}/${t.getUTCDate()}（${WEEK[t.getUTCDay()]}）`;
};

/** トップ：開催中のイベントと今週のキャラ（docs/DECISIONS.md AL）。どちらもなければ何も出さない */
export function EventBox() {
  const { event, featured, heroes } = useData();
  const nav = useNavigate();
  const feat = featured.map((f) => ({ ...f, hero: heroes.find((h) => h.id === f.heroId) })).filter((f) => f.hero);
  if (!event && !feat.length) return null;
  const pct = event?.goal ? Math.min(100, Math.round((event.filled / event.goal) * 100)) : null;
  // 目標に届いたら「目標達成！」。そのあとも集まった数は増えていく（docs/DECISIONS.md BP）
  const done = !!event?.goal && event.filled >= event.goal;
  return (
    <section className="evbox" aria-label="開催中のイベント">
      {event && (
        <div className="evtop">
          <span className="evlive">
            開催中<small>〜{md(event.endsOn)}</small>
          </span>
          <b className="evname">{event.name}</b>
        </div>
      )}
      {event && (
        <div className={`evprog ${done ? "done" : ""}`}>
          <div className="evnum">
            イベント中に集まったタイミング <b>{event.filled}</b>
            {event.goal ? <> / 目標 {event.goal}</> : ""}
            {done && <span className="evdone">目標達成！</span>}
          </div>
          {pct !== null && (
            <div className="evbar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <i style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>
      )}
      {feat.length > 0 && (
        <div className="evfeat">
          <div className="evheroes">
            <span className="evlabel">今週のキャラ</span>
            {feat.map((f) => (
              <button key={f.heroId} className="evhero" onClick={() => nav(`/h/${f.hero!.slug}`)}>
                <Avatar hero={f.hero} />
                <span>
                  <b>{f.hero!.fullName || f.hero!.name}</b>
                  <small>
                    {md(f.startsOn)}〜{md(f.endsOn)}
                  </small>
                </span>
              </button>
            ))}
          </div>
          <p className="evhint">このキャラが自分でも相手でもOK。知ってるHS合わせを投稿してね！</p>
        </div>
      )}
    </section>
  );
}
