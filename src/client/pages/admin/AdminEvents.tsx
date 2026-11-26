import { useEffect, useState } from "react";
import type { EventInfo, FeaturedHero } from "../../../shared/types";
import { api, ApiError, useApi } from "../../lib/api";
import { useData } from "../../lib/data";
import { useBootFx } from "../../lib/fx";
import { toast } from "../../lib/ui";
import { ArmedButton } from "./AdminHeroes";
import { AdminLayout, adminErrorMessage, pendingTotal } from "./AdminLayout";

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
  e instanceof ApiError && e.status === 409 ? "バッジを配ったイベントは削除できません（もらった人のバッジが消えるため）" :
  e instanceof ApiError ? (e.status === 400 ? "入力内容を確認してください（日付・終了日は開始日以降）" : "保存できませんでした") : "保存できませんでした";

/** 管理：イベント（期間・目標）と今週のキャラのスケジュール（docs/DECISIONS.md AL） */
export function AdminEvents() {
  const { heroes, reload } = useData();
  const pending = useApi<{ groups: { timings: unknown[] }[]; posterChanges?: unknown[] }>("/api/admin/pending");
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
  // イベントのバッジ（docs/DECISIONS.md BM）
  const [bn, setBn] = useState("");
  const [tl, setTl] = useState("");
  const [tm, setTm] = useState("");
  const [th, setTh] = useState("");
  // 編集中のイベント（null なら追加）
  const [editId, setEditId] = useState<string | null>(null);
  const num = (s: string) => (s.trim() ? Number(s) : null);
  const startEdit = (e: EventInfo) => {
    setEditId(e.id);
    setName(e.name);
    setEs(e.startsOn);
    setEe(e.endsOn);
    setGoal(e.goal ? String(e.goal) : "");
    setBn(e.badgeName ?? "");
    setTl(e.tiers.low != null ? String(e.tiers.low) : "");
    setTm(e.tiers.mid != null ? String(e.tiers.mid) : "");
    setTh(e.tiers.high != null ? String(e.tiers.high) : "");
    setTimeout(() => document.getElementById("ev-form")?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
  };
  const saveEvent = async () => {
    const body = JSON.stringify({ name, startsOn: es, endsOn: ee, goal: num(goal), badgeName: bn.trim() || null, tierLow: num(tl), tierMid: num(tm), tierHigh: num(th) });
    const ok = editId
      ? await run(() => api<Data>(`/api/admin/events/${editId}`, { method: "PUT", body }), "保存しました")
      : await run(() => api<Data>("/api/admin/events", { method: "POST", body }), "イベントを追加しました");
    if (ok) setEditId(null);
  };
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
  const count = pendingTotal(pending.data);

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
              <li>バッジの名前を入れると、ナイス・グッド・ベスト合わせ賞は期間中に達成したらすぐ投稿者のページに出ます。1〜3位のバッジは、イベント終了の翌日に確定します（「確定し直す」で付け直せます）。</li>
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
                    {e.goal ? `・目標 ${e.goal} タイミング` : ""}
                  </span>
                  <span>
                    {e.badgeName
                      ? `バッジ：${e.badgeName}（1〜3位／ベスト ${e.tiers.high ?? "−"}pt・グッド ${e.tiers.mid ?? "−"}pt・ナイス ${e.tiers.low ?? "−"}pt〜）`
                      : "バッジなし"}
                    {e.finalizedAt && `・確定済み（${e.badgeCount}人）`}
                  </span>
                </div>
                {st.cls === "done" && e.badgeName && (
                  <ArmedButton
                    className="sbtn"
                    label={e.finalizedAt ? "確定し直す" : "バッジを確定"}
                    armedLabel="実行"
                    onConfirm={() => run(() => api<Data>(`/api/admin/events/${e.id}/finalize`, { method: "POST" }), "バッジを確定しました")}
                  />
                )}
                <button className="sbtn" onClick={() => startEdit(e)}>
                  編集
                </button>
                <ArmedButton className="sbtn danger" label="削除" armedLabel="確定" onConfirm={() => run(() => api<Data>(`/api/admin/events/${e.id}`, { method: "DELETE" }), "削除しました")} />
              </div>
            );
          })}
          <div className="box evform" id="ev-form">
            <p>
              <b>{editId ? "イベントを編集" : "イベントを追加"}</b>
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
              目標のタイミング数（任意。イベント期間中に承認されたタイミングの数）
              <input className="inp" id="ev-goal" type="number" inputMode="numeric" min={1} placeholder="例：50" value={goal} onChange={(e) => setGoal(e.target.value)} />
            </label>
            <label>
              バッジの名前（任意。空ならバッジなし）
              <input className="inp" id="ev-badge" maxLength={20} placeholder="例：リリース記念イベント" value={bn} onChange={(e) => setBn(e.target.value)} />
            </label>
            <p className="evnote">
              合わせ賞：イベントの合わせポイントで「{bn.trim() || "（名前）"} ナイス合わせ賞」「グッド合わせ賞」「ベスト合わせ賞」（空の段階は付けません。目安：1・5・15pt）。達成したらすぐもらえます。順位のバッジ：1〜3位に「{bn.trim() || "（名前）"}1位」など。イベントが終わった翌日の自動処理で確定します。どちらも投稿者のページに残ります。
            </p>
            <div className="evdates ev3">
              {(
                [
                  ["ナイス", tl, setTl, "ev-tl"],
                  ["グッド", tm, setTm, "ev-tm"],
                  ["ベスト", th, setTh, "ev-th"],
                ] as const
              ).map(([lb, v, set, id]) => (
                <label key={id}>
                  {lb}（pt 以上）
                  <input className="inp" id={id} type="number" inputMode="decimal" min={0.5} step={0.5} value={v} onChange={(e) => set(e.target.value)} />
                </label>
              ))}
            </div>
            <div className="btns">
              {editId && <button onClick={() => setEditId(null)}>やめる</button>}
              <button className="primary" onClick={saveEvent}>
                {editId ? "保存" : "追加"}
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
