import { useCallback, useEffect, useState } from "react";
import type { AdminGroup, AdminPendingResponse, AdminPosterChange, AdminTiming, StorageUsage } from "../../../shared/types";
import { EntryCard, type EntryPoint } from "../../components/EntryCard";
import { pointId, PointsEditor, type PointDraft } from "../../components/PointsEditor";
import { Sheet } from "../../components/Sheet";
import { approvedShareText, shortLink, timingLink } from "../../../shared/share";
import { ATTACK_LABEL } from "../../../shared/constants";
import { api, ApiError } from "../../lib/api";
import { useData } from "../../lib/data";
import { openShare } from "../../lib/share";
import { useBootFx } from "../../lib/fx";
import { fmtDate, fmtSize, toast } from "../../lib/ui";
import { ArmedButton } from "./AdminHeroes";
import { AdminLayout, adminErrorMessage, pendingTotal } from "./AdminLayout";

const ERRORS: Record<string, string> = {
  not_pending: "すでに審査済みです（一覧を更新しました）",
  fix_target_not_approved: "修正の対象が公開中ではありません。却下してください",
  video_missing: "動画が見つかりません。却下してください",
  invalid_fix_edit: "修正提案では攻撃方法と目印を変更できません",
};
const errMsg = (e: unknown) => (e instanceof ApiError ? (ERRORS[e.message] ?? `操作に失敗しました（${e.message}）`) : "操作に失敗しました");

const toPoint = (t: AdminTiming): EntryPoint => ({
  attackType: t.attackType,
  cueType: t.cueType,
  timingText: t.timingText,
  note: t.note,
  videoUrl: t.videoUrl,
});

function Meter({ label, used, limit, last }: { label: string; used: number; limit: number; last?: boolean }) {
  const r = limit ? used / limit : 0;
  return (
    <div className="meter" style={last ? { marginBottom: 0 } : undefined}>
      <div className="t">
        <span>{label}</span>
        <span>
          {fmtSize(used)} / {fmtSize(limit)}
        </span>
      </div>
      <div className="bar">
        <i className={r > 0.8 ? "hi" : ""} style={{ width: `${Math.min(100, r * 100)}%` }} />
      </div>
    </div>
  );
}

function UsageBox({ u }: { u: StorageUsage }) {
  return (
    <div className="box">
      <Meter label="動画の保存容量" used={u.totalBytes} limit={u.limitBytes} />
      <Meter label="うち承認待ち" used={u.pendingBytes} limit={u.pendingLimitBytes} last />
    </div>
  );
}

/** 修正案で変わった項目 */
const changes = (o: AdminTiming, t: AdminTiming) =>
  [o.timingText !== t.timingText && "合わせるタイミング", (o.note ?? "") !== (t.note ?? "") && "備考", o.videoKey !== t.videoKey && "動画"].filter(
    Boolean,
  ) as string[];

/** 承認したタイミング（X で共有するため、この画面を開いている間だけ覚えておく） */
type Approved = { key: string; group: AdminGroup; timing: AdminTiming; linkId: string; updated: boolean; shareCode: string | null };

/** 処理中のボタン：回転アイコン付き */
const Busy = ({ on, label, busyLabel }: { on: boolean; label: string; busyLabel: string }) =>
  on ? (
    <>
      <span className="spin" aria-hidden="true" />
      {busyLabel}
    </>
  ) : (
    <>{label}</>
  );

/** 7. 管理：承認待ち一覧（審査はタイミング単位） */
export function AdminPending() {
  const [data, setData] = useState<AdminPendingResponse | null>(null);
  const [error, setError] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<AdminTiming | null>(null);
  const [editing, setEditing] = useState<{ t: AdminTiming; g: AdminGroup } | null>(null);
  const [busy, setBusy] = useState<{ id: string; action: "approve" | "reject" | "edit" } | null>(null);
  const [approved, setApproved] = useState<Approved[]>([]);
  const { publicAppUrl } = useData();

  const load = useCallback(async () => {
    try {
      setData(await api<AdminPendingResponse>("/api/admin/pending"));
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.status : 0);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  useBootFx(!!data || error !== null);

  const approve = async (t: AdminTiming, g: AdminGroup, edits?: Record<string, unknown>) => {
    setBusy({ id: t.id, action: edits ? "edit" : "approve" });
    try {
      const r = await api<{ merged: boolean; shareCode: string | null }>(`/api/admin/timings/${t.id}/approve`, { method: "POST", body: JSON.stringify(edits ? { edits } : {}) });
      toast(r.merged ? "承認し、公開中のタイミングに反映しました" : "承認しました");
      // 共有用に覚えておく（修正提案は、置き換わった元のタイミングへのリンクにする）
      const timing = edits ? { ...t, ...(edits as Partial<AdminTiming>) } : t;
      setApproved((a) => [{ key: t.id, group: g, timing, linkId: r.merged && g.original ? g.original.id : t.id, updated: r.merged, shareCode: r.shareCode }, ...a]);
      await load();
      return true;
    } catch (e) {
      toast(errMsg(e));
      await load();
      // 入力の誤り（400）のときはシートを閉じない
      return !(e instanceof ApiError && e.status === 400);
    } finally {
      setBusy(null);
    }
  };
  // すべて承認（表示中の承認待ちを上から順に 1 件ずつ承認。docs/DECISIONS.md AO）
  const [bulk, setBulk] = useState<{ done: number; total: number } | null>(null);
  const approveAll = async () => {
    if (!data || bulk) return;
    const list = data.groups.flatMap((g) => g.timings.map((t) => ({ t, g })));
    let ok = 0, ng = 0;
    setBulk({ done: 0, total: list.length });
    for (const { t, g } of list) {
      try {
        const r = await api<{ merged: boolean; shareCode: string | null }>(`/api/admin/timings/${t.id}/approve`, { method: "POST", body: "{}" });
        setApproved((a) => [{ key: t.id, group: g, timing: t, linkId: r.merged && g.original ? g.original.id : t.id, updated: r.merged, shareCode: r.shareCode }, ...a]);
        ok++;
      } catch {
        ng++;
      }
      setBulk({ done: ok + ng, total: list.length });
    }
    await load();
    setBulk(null);
    toast(ng ? `${ok} 件を承認しました（${ng} 件は承認できませんでした。個別に確認してください）` : `${ok} 件すべて承認しました`);
  };
  const reject = async (t: AdminTiming, reason: string) => {
    setBusy({ id: t.id, action: "reject" });
    try {
      await api(`/api/admin/timings/${t.id}/reject`, { method: "POST", body: JSON.stringify({ reason }) });
      toast("却下しました");
    } catch (e) {
      toast(errMsg(e));
    }
    await load();
    setBusy(null);
  };
  const share = (a: Approved) =>
    openShare({
      title: `${a.group.attacker.name} → ${a.group.target.name}｜ヒロアプ`,
      text: approvedShareText({
        attacker: a.group.attacker.name,
        target: a.group.target.name,
        attackType: a.timing.attackType,
        cueType: a.timing.cueType,
        timingText: a.timing.timingText,
        nickname: a.group.nickname,
        supportCode: a.group.supportCode,
        updated: a.updated,
      }),
      url: a.shareCode ? shortLink(publicAppUrl, a.shareCode) : timingLink(publicAppUrl, a.group.attacker.slug, a.group.target.slug, a.linkId),
    });

  const count = data ? data.groups.reduce((s, g) => s + g.timings.length, 0) : undefined;
  return (
    <AdminLayout tab="pending" pendingCount={pendingTotal(data)}>
      {error !== null && <div className="empty">{adminErrorMessage(error)}</div>}
      {data && (
        <>
          <UsageBox u={data.usage} />
          {approved.length > 0 && (
            <div className="box">
              <p>
                <b style={{ color: "var(--text)" }}>承認したタイミング</b>（X・LINE などで共有できます。この画面を閉じると消えます）
              </p>
              {approved.map((a) => (
                <div key={a.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderTop: "1px solid var(--line)" }}>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13 }}>
                    {a.group.attacker.name} → {a.group.target.name}（{ATTACK_LABEL[a.timing.attackType]}）{a.updated ? "・更新" : ""}
                    {a.group.nickname && <span style={{ color: "var(--sub)", fontSize: 12 }}>　投稿者：{a.group.nickname}</span>}
                  </span>
                  <button className="sbtn" style={{ whiteSpace: "nowrap" }} onClick={() => share(a)}>
                    共有
                  </button>
                </div>
              ))}
            </div>
          )}
          {data.posterChanges.length > 0 && <PosterChanges list={data.posterChanges} reload={load} />}
          {count ? (
            <div className="box allok">
              <p>
                承認待ちの <b>{count} 件</b>をまとめて承認します{data.groups.some((g) => g.isFix) ? "（修正提案も含みます。承認すると公開中のタイミングが置き換わります）" : ""}。
              </p>
              {bulk ? (
                <button className="sbtn ok busy" disabled>
                  承認中… {bulk.done} / {bulk.total}
                </button>
              ) : (
                <ArmedButton className="sbtn ok" label={`すべて承認（${count} 件）`} armedLabel={`もう一度押すと ${count} 件を承認`} onConfirm={approveAll} />
              )}
            </div>
          ) : null}
          {data.groups.length || data.posterChanges.length ? (
            data.groups.map((g) => (
              <div key={g.code}>
                <div className="sec" style={{ fontWeight: 700, color: "var(--text)" }}>
                  {g.code}・{fmtDate(g.createdAt)}・{g.isFix ? "修正提案" : `${g.total}タイミング`}
                </div>
                {g.timings.map((t, i) => {
                  const b = busy?.id === t.id ? busy.action : null;
                  const actions = (
                    <>
                      <button className={`sbtn danger ${b === "reject" ? "busy" : ""}`} disabled={!!busy || !!bulk} onClick={() => setRejecting(t)}>
                        <Busy on={b === "reject"} label="却下" busyLabel="却下中…" />
                      </button>
                      <button className={`sbtn ${b === "edit" ? "busy" : ""}`} disabled={!!busy || !!bulk} onClick={() => setEditing({ t, g })}>
                        <Busy on={b === "edit"} label="編集して承認" busyLabel="承認中…" />
                      </button>
                      <button className={`sbtn ok ${b === "approve" ? "busy" : ""}`} disabled={!!busy || !!bulk} onClick={() => approve(t, g)}>
                        <Busy on={b === "approve"} label="承認" busyLabel="承認中…" />
                      </button>
                    </>
                  );
                  if (g.isFix) {
                    const o = g.original;
                    const diff = o ? changes(o, t) : [];
                    return (
                      <div key={t.id}>
                        {o ? (
                          <EntryCard
                            old
                            label="現在公開中の内容"
                            points={[toPoint(o)]}
                            attacker={g.attacker}
                            target={g.target}
                            nickname={o.nickname}
                            supportCode={o.supportCode}
                            dateText={o.reviewedAt ? `${fmtDate(o.reviewedAt)} 承認` : ""}
                          />
                        ) : (
                          <div className="empty">修正の対象が見つかりません</div>
                        )}
                        <EntryCard
                          label={
                            <>
                              修正案
                              <span style={{ marginLeft: 8, fontWeight: 500, color: "var(--sub)" }}>
                                {diff.length ? `変更：${diff.join("・")}` : "変更なし"}
                              </span>
                            </>
                          }
                          points={[toPoint(t)]}
                          nickname={g.nickname}
                          supportCode={g.supportCode}
                          dateText={`${fmtDate(g.createdAt)} 投稿`}
                          actionsRow
                          actions={actions}
                        />
                      </div>
                    );
                  }
                  return (
                    <EntryCard
                      key={t.id}
                      label={g.total > 1 ? `タイミング ${t.position + 1} / ${g.total}` : undefined}
                      points={[toPoint(t)]}
                      attacker={i === 0 ? g.attacker : undefined}
                      target={g.target}
                      nickname={g.nickname}
                      supportCode={g.supportCode}
                      dateText={`${fmtDate(g.createdAt)} 投稿`}
                      actionsRow
                      actions={actions}
                    />
                  );
                })}
              </div>
            ))
          ) : (
            <div className="empty">承認待ちの投稿はありません</div>
          )}
        </>
      )}
      {rejecting && <RejectSheet t={rejecting} onClose={() => setRejecting(null)} onReject={reject} />}
      {editing && <EditSheet t={editing.t} isFix={editing.g.isFix} onClose={() => setEditing(null)} onApprove={(t, edits) => approve(t, editing.g, edits)} />}
    </AdminLayout>
  );
}

function RejectSheet({ t, onClose, onReject }: { t: AdminTiming; onClose: () => void; onReject: (t: AdminTiming, reason: string) => Promise<void> }) {
  const [reason, setReason] = useState("");
  return (
    <Sheet title="却下" okLabel="却下する" busyLabel="却下中…" onClose={onClose} onOk={() => onReject(t, reason)}>
      <label className="h">却下理由（任意・投稿者に表示されます）</label>
      <textarea maxLength={500} placeholder="例：タイミングが確認できませんでした" value={reason} onChange={(e) => setReason(e.target.value)} />
    </Sheet>
  );
}

function EditSheet({
  t,
  isFix,
  onClose,
  onApprove,
}: {
  t: AdminTiming;
  isFix: boolean;
  onClose: () => void;
  onApprove: (t: AdminTiming, edits: Record<string, unknown>) => Promise<boolean>;
}) {
  const [points, setPoints] = useState<PointDraft[]>([
    {
      id: pointId(),
      attackType: t.attackType,
      cueType: t.cueType,
      timingText: t.timingText,
      note: t.note ?? "",
      existing: t.videoUrl ? { key: t.videoKey, url: t.videoUrl } : null,
    },
  ]);
  return (
    <Sheet
      title="編集して承認"
      okLabel="保存して承認"
      busyLabel="承認中…"
      onClose={onClose}
      onOk={() => {
        const p = points[0];
        if (!p.timingText.trim()) {
          toast("合わせるタイミングを入力してください");
          return false;
        }
        return onApprove(t, { attackType: p.attackType, cueType: p.cueType, timingText: p.timingText.trim(), note: p.note.trim() || null });
      }}
    >
      <PointsEditor points={points} update={setPoints} opts={{ upload: false, single: true, locked: isFix }} />
    </Sheet>
  );
}

/** 投稿者情報（X の ID・応援コード）の変更申請（docs/DECISIONS.md AY） */
function PosterChanges({ list, reload }: { list: AdminPosterChange[]; reload: () => Promise<void> }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<AdminPosterChange | null>(null);
  const run = async (id: string, path: string, body: unknown, msg: string) => {
    setBusy(id);
    try {
      await api(`/api/admin/poster-changes/${id}/${path}`, { method: "POST", body: JSON.stringify(body) });
      toast(msg);
    } catch (e) {
      toast(errMsg(e));
    }
    await reload();
    setBusy(null);
  };
  const v = (s: string | null) => s || "（なし）";
  return (
    <>
      <div className="sec" style={{ fontWeight: 700, color: "var(--text)" }}>
        投稿者情報の変更申請（{list.length}件）
      </div>
      {list.map((c) => {
        // 変更前の値が投稿ごとに違うことがある（まとめて申請したとき）
        const olds = [...new Set(c.items.map((i) => `${v(i.oldNickname)}／${v(i.oldSupportCode)}`))];
        return (
          <div className="box" key={c.id}>
            <div className="bt">
              {fmtDate(c.createdAt)} 申請・{c.items.length}件
            </div>
            <p style={{ color: "var(--text)", margin: "0 0 8px" }}>
              X の ID：{olds.length === 1 ? v(c.items[0].oldNickname) : "（投稿ごとに下に）"} → <b>{v(c.nickname)}</b>
              <br />
              応援コード：{olds.length === 1 ? v(c.items[0].oldSupportCode) : "（投稿ごとに下に）"} → <b>{v(c.supportCode)}</b>
            </p>
            <div style={{ fontSize: 12.5 }}>
              {c.items.map((i) => (
                <div key={i.code} style={{ padding: "5px 0", borderTop: "1px dotted var(--line)" }}>
                  {i.code}・{i.attacker.name}→{i.target.name}・公開中 {i.published} 件{i.isFix ? "（修正提案）" : ""}
                  {olds.length > 1 && (
                    <span style={{ color: "var(--sub)" }}>
                      　今：{v(i.oldNickname)}／{v(i.oldSupportCode)}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="acts">
              <button className={`sbtn danger ${busy === c.id ? "busy" : ""}`} disabled={!!busy} onClick={() => setRejecting(c)}>
                却下
              </button>
              <button className={`sbtn ok ${busy === c.id ? "busy" : ""}`} disabled={!!busy} onClick={() => run(c.id, "approve", {}, "承認し、投稿者情報を変更しました")}>
                <Busy on={busy === c.id} label="承認" busyLabel="承認中…" />
              </button>
            </div>
          </div>
        );
      })}
      {rejecting && (
        <PosterRejectSheet
          onClose={() => setRejecting(null)}
          onReject={(reason) => run(rejecting.id, "reject", { reason }, "却下しました")}
        />
      )}
    </>
  );
}

function PosterRejectSheet({ onClose, onReject }: { onClose: () => void; onReject: (reason: string) => Promise<void> }) {
  const [reason, setReason] = useState("");
  return (
    <Sheet title="変更申請を却下" okLabel="却下する" busyLabel="却下中…" onClose={onClose} onOk={() => onReject(reason)}>
      <label className="h">却下理由（任意・投稿者に表示されます）</label>
      <textarea maxLength={500} placeholder="例：ご本人の ID か確認できませんでした" value={reason} onChange={(e) => setReason(e.target.value)} />
    </Sheet>
  );
}
