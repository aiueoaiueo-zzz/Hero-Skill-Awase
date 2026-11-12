import { useEffect, useState } from "react";
import type { EventInfo, FeaturedHero } from "../../../shared/types";
import { api, ApiError, useApi } from "../../lib/api";
import { useData } from "../../lib/data";
import { useBootFx } from "../../lib/fx";
import { toast } from "../../lib/ui";
import { ArmedButton } from "./AdminHeroes";
import { AdminLayout, adminErrorMessage } from "./AdminLayout";

type Data = { events: EventInfo[]; featured: FeaturedHero[] };

/** 日本時間の今日（YYYY-MM-DD） */
const today = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
const addDays = (d: string, n: number) => new Date(Date.parse(d + "T00:00:00Z") + n * 86400_000).toISOString().slice(0, 10);
const WEEK = ["日", "月", "火", "水", "木", "金", "土"];
/** 2026-11-21 → 11/21（土） */
const md = (d: string) => {
  const t = new Date(d + "T00:00:00Z");
  return `${t.getUTCMonth() + 1}/${t.getUTCDate()}（${WEEK[t.getUTCDay()]}）`;
};
const stateOf = (s: string, e: string) => {
  const t = today();
  return t < s ? { label: "予定", cls: "plan" } : t > e ? { label: "終了", cls: "done" } : { label: "表示中", cls: "live" };
};
const errText = (e: unknown) =>
  e instanceof ApiError ? (e.status === 400 ? "入力内容を確認してください（日付・終了日は開始日以降）" : "保存できませんでした") : "保存できませんでした";

/** 管理：イベント（期間・目標）と今週のキャラのスケジュール（docs/DECISIONS.md AL） */
export function AdminEvents() {
  const { heroes, reload } = useData();
  const pending = useApi<{ groups: { timings: unknown[] }[] }>("/api/admin/pending");
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<number | null>(null);
  useEffect(() => {
    api<Data>("/api/admin/events").then(setData, (e) => setError(e instanceof ApiError ? e.status : 0));
  }, []);
  useBootFx(!!data || error !== null);

  const run = async (fn: () => Promise<Data>, msg: string) => {
    try {
      setData(await fn());
      await reload(); // トップの表示にもすぐ反映
      toast(msg);
      return true;
    } catch (e) {
      toast(errText(e));
      return false;
    }
  };

  // イベントの追加
  const [name, setName] = useState("全組み合わせ埋めチャレンジ");
  const [es, setEs] = useState(today());
  const [ee, setEe] = useState(addDays(today(), 27));
  const [goal, setGoal] = useState("");
  // 今週のキャラの追加（1 週間ずつ。直前の予定の翌日から始まるように初期値を入れる）
  const nextStart = data?.featured.length ? addDays(data.featured[data.featured.length - 1].endsOn, 1) : today();
  const [fh, setFh] = useState("");
  const [fs, setFs] = useState("");
  const [fe, setFe] = useState("");
  useEffect(() => {
    setFs(nextStart);
    setFe(addDays(nextStart, 6));
  }, [nextStart]);

  const heroName = (id: string) => {
    const h = heroes.find((x) => x.id === id);
    return h ? h.fullName || h.name : "（削除されたキャラ）";
  };
  const count = pending.data?.groups.reduce((s, g) => s + g.timings.length, 0);

  return (
    <AdminLayout tab="events" pendingCount={count}>
      {error !== null && <div className="empty">{adminErrorMessage(error)}</div>}
      {data && (
        <>
          <details className="box hhelp">
            <summary>イベントの使い方</summary>
            <ul>
              <li>イベントの期間中は、トップに「開催中」の枠と進み具合（投稿がある組み合わせの数 / 目標）が出ます。期間の前後は何も出ません。</li>
              <li>今週のキャラは、期間中だけトップに表示され、キャラ選択のカードに「今週」の印が付きます。1 週間ずつ、先の分まで予約しておけます。</li>
              <li>日付は日本時間。開始日の 0 時から、終了日の 23 時 59 分まで表示されます。</li>
            </ul>
          </details>

          <h2 className="evh">イベント</h2>
          {data.events.length === 0 && <div className="empty">イベントはまだありません</div>}
          {data.events.map((e) => {
            const st = stateOf(e.startsOn, e.endsOn);
            return (
              <div className="evrow" key={e.id}>
                <span className={`evst ${st.cls}`}>{st.label}</span>
                <div className="evmain">
                  <b>{e.name}</b>
                  <span>
                    {md(e.startsOn)} 〜 {md(e.endsOn)}
                    {e.goal ? `・目標 ${e.goal} 組` : ""}
                  </span>
                </div>
                <ArmedButton className="sbtn danger" label="削除" armedLabel="確定" onConfirm={() => run(() => api<Data>(`/api/admin/events/${e.id}`, { method: "DELETE" }), "削除しました")} />
              </div>
            );
          })}
          <div className="box evform">
            <p>
              <b>イベントを追加</b>
            </p>
            <label>
              名前
              <input className="inp" id="ev-name" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <div className="evdates">
              <label>
                開始日
                <input className="inp" id="ev-start" type="date" value={es} onChange={(e) => setEs(e.target.value)} />
              </label>
              <label>
                終了日
                <input className="inp" id="ev-end" type="date" value={ee} onChange={(e) => setEe(e.target.value)} />
              </label>
            </div>
            <label>
              目標の組み合わせ数（任意）
              <input className="inp" id="ev-goal" type="number" inputMode="numeric" min={1} placeholder="例：100" value={goal} onChange={(e) => setGoal(e.target.value)} />
            </label>
            <div className="btns">
              <button
                className="primary"
                onClick={() =>
                  run(
                    () => api<Data>("/api/admin/events", { method: "POST", body: JSON.stringify({ name, startsOn: es, endsOn: ee, goal: goal ? Number(goal) : null }) }),
                    "イベントを追加しました",
                  )
                }
              >
                追加
              </button>
            </div>
          </div>

          <h2 className="evh">今週のキャラ</h2>
          {data.featured.length === 0 && <div className="empty">まだ予定がありません</div>}
          {data.featured.map((f) => {
            const st = stateOf(f.startsOn, f.endsOn);
            return (
              <div className="evrow" key={f.id}>
                <span className={`evst ${st.cls}`}>{st.label}</span>
                <div className="evmain">
                  <b>{heroName(f.heroId)}</b>
                  <span>
                    {md(f.startsOn)} 〜 {md(f.endsOn)}
                  </span>
                </div>
                <ArmedButton className="sbtn danger" label="削除" armedLabel="確定" onConfirm={() => run(() => api<Data>(`/api/admin/events/featured/${f.id}`, { method: "DELETE" }), "削除しました")} />
              </div>
            );
          })}
          <div className="box evform">
            <p>
              <b>今週のキャラを予約</b>
            </p>
            <label>
              キャラ
              <select className="inp" id="ft-hero" value={fh} onChange={(e) => setFh(e.target.value)}>
                <option value="">選んでください</option>
                {heroes.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.fullName || h.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="evdates">
              <label>
                開始日
                <input className="inp" id="ft-start" type="date" value={fs} onChange={(e) => setFs(e.target.value)} />
              </label>
              <label>
                終了日
                <input className="inp" id="ft-end" type="date" value={fe} onChange={(e) => setFe(e.target.value)} />
              </label>
            </div>
            <div className="btns">
              <button
                className="primary"
                onClick={async () => {
                  if (!fh) return toast("キャラを選んでください");
                  if (await run(() => api<Data>("/api/admin/events/featured", { method: "POST", body: JSON.stringify({ heroId: fh, startsOn: fs, endsOn: fe }) }), "予約しました")) setFh("");
                }}
              >
                予約
              </button>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
