import { useState } from "react";
import { LIMITS } from "../../shared/constants";
import type { PosterChangeResponse, StatusPosterChange, StatusResponse } from "../../shared/types";
import { api, ApiError } from "../lib/api";
import { saveNickSup } from "../lib/storage";
import { fmtDate, toast } from "../lib/ui";

// 投稿者情報（X の ID・応援コード）の変更申請（審査状況の画面。docs/DECISIONS.md BC）

export type Owned = { s: StatusResponse; deleteKey: string };

const show = (v: string | null) => v || "（なし）";

const errorText = (e: unknown) =>
  e instanceof ApiError && e.status === 403
    ? "このブラウザの記録と一致しませんでした"
    : e instanceof ApiError && e.status === 400
      ? "入力を確認してください（X の ID は英数字と _ の 15 文字まで）"
      : "送信できませんでした";

/** 申請フォーム。targets が 2 件以上なら、どの投稿を変えるかを選べる */
export function PosterChangeForm({ targets, onDone, onCancel }: { targets: Owned[]; onDone: () => void; onCancel: () => void }) {
  const first = targets[0].s;
  const multi = targets.length > 1;
  const [nick, setNick] = useState(first.nickname ? `@${first.nickname}` : "");
  const [sup, setSup] = useState(first.supportCode ?? "");
  const [picked, setPicked] = useState<Set<string>>(new Set(targets.map((t) => t.s.code)));
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    const items = targets.filter((t) => picked.has(t.s.code)).map((t) => ({ code: t.s.code, deleteKey: t.deleteKey }));
    if (!items.length) return toast("変える投稿を選んでください");
    setBusy(true);
    try {
      const r = await api<PosterChangeResponse>("/api/poster-changes", { method: "POST", body: JSON.stringify({ items, nickname: nick, supportCode: sup }) });
      saveNickSup(nick.trim().replace(/^[@＠]/, ""), sup.trim());
      toast(
        r.requested && r.applied
          ? `${r.applied}件を変更し、${r.requested}件の変更を申請しました`
          : r.requested
            ? "変更を申請しました（管理者が確認してから反映されます）"
            : r.applied
              ? "変更しました"
              : "今と同じ内容なので、変更はありません",
      );
      onDone();
    } catch (e) {
      toast(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="box f">
      <div className="bt">{multi ? "投稿者情報をまとめて変更" : "投稿者情報の変更を申請"}</div>
      <p>公開中の投稿は、管理者が確認してから反映されます（まだ承認されていない投稿は、すぐ変わります）。タイミング・備考・動画を直すときは「修正を提案」から。</p>
      {multi && (
        <>
          <label className="h">変える投稿</label>
          {targets.map((t) => (
            <label className="toggle" key={t.s.code}>
              <input
                type="checkbox"
                checked={picked.has(t.s.code)}
                onChange={(e) =>
                  setPicked((p) => {
                    const n = new Set(p);
                    if (e.target.checked) n.add(t.s.code);
                    else n.delete(t.s.code);
                    return n;
                  })
                }
              />
              <span className="nm" style={{ fontSize: 13 }}>
                {t.s.code}・{t.s.attacker.name}→{t.s.target.name}
                <br />
                <small style={{ color: "var(--sub)" }}>
                  今：{show(t.s.nickname)}／{show(t.s.supportCode)}
                </small>
              </span>
            </label>
          ))}
        </>
      )}
      <label className="h">X の ID（任意）</label>
      <input
        type="text"
        maxLength={16}
        value={nick}
        placeholder="例：@HS_awase_cmps"
        inputMode="url"
        autoCapitalize="none"
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => setNick(e.target.value)}
      />
      <div className="hint">
        {!multi && <>今：{show(first.nickname)}／</>}空欄にすると、ID を消します。
        <br />※ 他の人のIDを入力しないでください。
      </div>
      <label className="h">応援コード（任意）</label>
      <input type="text" maxLength={LIMITS.supportCode} value={sup} placeholder="例：C-doeh" autoCapitalize="characters" autoComplete="off" onChange={(e) => setSup(e.target.value)} />
      {!multi && <div className="hint">今：{show(first.supportCode)}</div>}
      <div className="btns">
        <button onClick={onCancel} disabled={busy}>
          やめる
        </button>
        <button className={`primary ${busy ? "busy" : ""}`} onClick={submit} disabled={busy}>
          {busy ? "送信中…" : "申請する"}
        </button>
      </div>
    </div>
  );
}

/** 申請中・却下の表示 */
export function PosterChangeState({ pc, canAct, onWithdraw, onRetry }: { pc: StatusPosterChange; canAct: boolean; onWithdraw: () => Promise<void>; onRetry: () => void }) {
  const [armed, setArmed] = useState(false);
  const pending = pc.status === "pending";
  const row = (label: string, from: string | null, to: string | null) => (
    <>
      {label}：{show(from)} → {pending ? <b>{show(to)}</b> : show(to)}
    </>
  );
  return (
    <div className="box">
      <div className="bt">
        <span className={`chip st-${pending ? "pending" : "rejected"}`} style={{ marginRight: 6 }}>
          {pending ? "審査中" : "却下"}
        </span>
        {pending ? "投稿者情報の変更を申請中" : "投稿者情報の変更は却下されました"}
      </div>
      <p style={{ color: "#000", margin: "0 0 4px" }}>
        {row("X の ID", pc.oldNickname, pc.nickname)}
        <br />
        {row("応援コード", pc.oldSupportCode, pc.supportCode)}
      </p>
      {pending ? (
        <p style={{ margin: 0 }}>
          {fmtDate(pc.createdAt)} 申請{pc.count > 1 ? `（${pc.count}件まとめて）` : ""}。承認されると、ここ・詳細画面・共有文・ランキングに反映されます。
        </p>
      ) : (
        pc.rejectReason && <p style={{ margin: 0, color: "var(--danger)", whiteSpace: "pre-wrap" }}>却下理由：{pc.rejectReason}</p>
      )}
      {canAct && (
        <div className="acts">
          {pending ? (
            <button
              className={`sbtn danger ${armed ? "armed" : ""}`}
              onClick={async () => {
                if (!armed) {
                  setArmed(true);
                  setTimeout(() => setArmed(false), 2500);
                  return;
                }
                await onWithdraw();
                setArmed(false);
              }}
            >
              {armed ? "もう一度で取り下げ" : pc.count > 1 ? `申請を取り下げ（${pc.count}件まとめて）` : "申請を取り下げ"}
            </button>
          ) : (
            <button className="sbtn" onClick={onRetry}>
              もう一度申請
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** 申請を取り下げる（同じ申請に入っている、このブラウザの投稿をまとめて） */
export async function withdrawPosterChange(items: Owned[]) {
  try {
    await api("/api/poster-changes/withdraw", { method: "POST", body: JSON.stringify({ items: items.map((t) => ({ code: t.s.code, deleteKey: t.deleteKey })) }) });
    toast("申請を取り下げました");
  } catch (e) {
    toast(errorText(e));
  }
}
