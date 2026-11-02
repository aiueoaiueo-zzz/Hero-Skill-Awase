import { useEffect, useState } from "react";
import { STATUS_LABEL } from "../../shared/constants";
import { formatCue } from "../../shared/text";
import type { StatusResponse, StatusTiming } from "../../shared/types";
import { EntryCard } from "../components/EntryCard";
import { Header } from "../components/Header";
import { api, ApiError } from "../lib/api";
import { PROG, useBootFx } from "../lib/fx";
import { loadMy } from "../lib/storage";
import { fmtDate, toast } from "../lib/ui";

const fetchStatus = (code: string) => api<StatusResponse>(`/api/status/${encodeURIComponent(code)}`);

/** 承認済みのタイミングは、最初は折りたたんでおく（縦に長くなりすぎないように） */
const foldable = (t: StatusTiming) => t.status === "approved" || t.status === "merged";

/** 折りたたみの ▶／▼ ボタン */
const FoldButton = ({ open, onClick }: { open: boolean; onClick: () => void }) => (
  <button type="button" className="sbtn foldbtn" aria-expanded={open} aria-label={open ? "折りたたむ" : "開く"} onClick={onClick}>
    {open ? "▼" : "▶"}
  </button>
);

/** 受付番号ごとのまとまり（タイミングごとのステータス） */
function Group({ s, deleteKey, onChanged }: { s: StatusResponse; deleteKey?: string; onChanged: () => void }) {
  const [armed, setArmed] = useState(false);
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setOpened((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const pending = s.timings.some((t) => t.status === "pending");
  useEffect(() => {
    if (!armed) return;
    const id = setTimeout(() => setArmed(false), 2500);
    return () => clearTimeout(id);
  }, [armed]);
  const withdraw = async () => {
    if (!armed) return setArmed(true);
    try {
      await api(`/api/status/${s.code}/withdraw`, { method: "POST", body: JSON.stringify({ deleteKey }) });
      toast("取り下げました");
      onChanged();
    } catch (e) {
      toast(e instanceof ApiError && e.status === 403 ? "取り下げ用キーが一致しません" : "取り下げできませんでした");
    }
    setArmed(false);
  };
  return (
    <>
      <div className="sec">
        {s.code}・{fmtDate(s.createdAt)}・{s.isFix ? "修正提案" : `${s.timings.length}件`}
      </div>
      {s.timings.map((t) => {
        const label = s.timings.length > 1 ? `タイミング ${t.position + 1} / ${s.timings.length}` : undefined;
        const open = !foldable(t) || opened.has(t.id);
        if (!open)
          return (
            <div className="entry fold" key={t.id}>
              <FoldButton open={false} onClick={() => toggle(t.id)} />
              <span className={`chip st-${t.status}`} style={{ marginRight: 0, whiteSpace: "nowrap" }}>
                {STATUS_LABEL[t.status]}
              </span>
              <div className="tim">{formatCue(t.cueType, t.timingText)}</div>
            </div>
          );
        return (
        <EntryCard
          key={t.id}
          points={[{ attackType: t.attackType, cueType: t.cueType, timingText: t.timingText, note: t.note, videoUrl: t.videoUrl }]}
          attacker={s.attacker}
          target={s.target}
          status={t.status}
          nickname={s.nickname}
          supportCode={s.supportCode}
          label={
            foldable(t) ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <FoldButton open onClick={() => toggle(t.id)} />
                {label}
              </span>
            ) : (
              label
            )
          }
          dateText={t.status === "approved" && t.reviewedAt ? `${fmtDate(t.reviewedAt)} 承認` : `${fmtDate(s.createdAt)} 投稿`}
          actions={
            t.status === "rejected" && t.rejectReason ? (
              <span style={{ fontSize: 11.5, color: "var(--danger)", whiteSpace: "pre-wrap" }}>却下理由：{t.rejectReason}</span>
            ) : undefined
          }
        />
        );
      })}
      {deleteKey && pending && (
        <div className="acts" style={{ margin: "-2px 0 12px" }}>
          <button className={`sbtn danger ${armed ? "armed" : ""}`} onClick={withdraw}>
            {armed ? "もう一度で取り下げ" : "承認待ちの分を取り下げ"}
          </button>
        </div>
      )}
    </>
  );
}

/** 6. 審査状況の確認 */
export function Status() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<StatusResponse | "notfound" | null>(null);
  const [mine, setMine] = useState<{ s: StatusResponse; deleteKey: string }[] | null>(null);

  const loadMine = async () => {
    const my = loadMy();
    const rs = await Promise.all(my.map((m) => fetchStatus(m.code).then((s) => ({ s, deleteKey: m.deleteKey }), () => null)));
    setMine(rs.filter((x): x is { s: StatusResponse; deleteKey: string } => !!x));
  };
  useEffect(() => {
    loadMine();
  }, []);
  useBootFx(mine !== null);

  const show = async () => {
    const c = code.trim().toUpperCase();
    if (!c) return;
    try {
      setResult(await fetchStatus(c));
    } catch {
      setResult("notfound");
    }
  };
  const refresh = () => {
    loadMine();
    if (result && result !== "notfound") fetchStatus(result.code).then(setResult, () => setResult("notfound"));
  };
  const myKey = (c: string) => mine?.find((m) => m.s.code === c)?.deleteKey;

  return (
    <>
      <Header title="審査状況の確認" back="/" prog={PROG.other} />
      <div className="box">
        <p>受付番号を入力してください（タイミングごとに審査されます）</p>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="inp"
            placeholder="HS-XXXXXX"
            style={{ textTransform: "uppercase" }}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && show()}
          />
          <button className="sbtn ok" style={{ whiteSpace: "nowrap" }} onClick={show}>
            確認
          </button>
        </div>
        {result === "notfound" && <p style={{ marginTop: 10, color: "var(--danger)" }}>見つかりませんでした</p>}
        {result && result !== "notfound" && (
          <div style={{ marginTop: 8 }}>
            <Group s={result} deleteKey={myKey(result.code)} onChanged={refresh} />
          </div>
        )}
      </div>
      <div className="sec" style={{ fontWeight: 700 }}>
        このブラウザで投稿したもの
      </div>
      {mine && (mine.length ? mine.map((m) => <Group key={m.s.code} s={m.s} deleteKey={m.deleteKey} onChanged={refresh} />) : <div className="empty">まだ投稿していません</div>)}
    </>
  );
}
