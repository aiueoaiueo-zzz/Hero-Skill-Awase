import { useCallback, useEffect, useState } from "react";
import type { AdminGroup, AdminPendingResponse, AdminTiming, StorageUsage } from "../../../shared/types";
import { EntryCard, type EntryPoint } from "../../components/EntryCard";
import { pointId, PointsEditor, type PointDraft } from "../../components/PointsEditor";
import { Sheet } from "../../components/Sheet";
import { api, ApiError } from "../../lib/api";
import { useBootFx } from "../../lib/fx";
import { fmtDate, fmtSize, toast } from "../../lib/ui";
import { AdminLayout, adminErrorMessage } from "./AdminLayout";

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

/** 7. 管理：承認待ち一覧（審査はタイミング単位） */
export function AdminPending() {
  const [data, setData] = useState<AdminPendingResponse | null>(null);
  const [error, setError] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<AdminTiming | null>(null);
  const [editing, setEditing] = useState<{ t: AdminTiming; g: AdminGroup } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  const approve = async (t: AdminTiming, edits?: Record<string, unknown>) => {
    setBusyId(t.id);
    try {
      const r = await api<{ merged: boolean }>(`/api/admin/timings/${t.id}/approve`, { method: "POST", body: JSON.stringify(edits ? { edits } : {}) });
      toast(r.merged ? "承認し、公開中のタイミングに反映しました" : "承認しました");
      await load();
      return true;
    } catch (e) {
      toast(errMsg(e));
      await load();
      // 入力の誤り（400）のときはシートを閉じない
      return !(e instanceof ApiError && e.status === 400);
    } finally {
      setBusyId(null);
    }
  };

  const count = data ? data.groups.reduce((s, g) => s + g.timings.length, 0) : undefined;
  return (
    <AdminLayout tab="pending" pendingCount={count}>
      {error !== null && <div className="empty">{adminErrorMessage(error)}</div>}
      {data && (
        <>
          <UsageBox u={data.usage} />
          {data.groups.length ? (
            data.groups.map((g) => (
              <div key={g.code}>
                <div className="sec" style={{ fontWeight: 700, color: "var(--text)" }}>
                  {g.code}・{fmtDate(g.createdAt)}・{g.isFix ? "修正提案" : `${g.total}タイミング`}
                </div>
                {g.timings.map((t, i) => {
                  const busy = busyId === t.id;
                  const actions = (
                    <>
                      <button className="sbtn danger" disabled={busy} onClick={() => setRejecting(t)}>
                        却下
                      </button>
                      <button className="sbtn" disabled={busy} onClick={() => setEditing({ t, g })}>
                        編集して承認
                      </button>
                      <button className="sbtn ok" disabled={busy} onClick={() => approve(t)}>
                        承認
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
      {rejecting && <RejectSheet t={rejecting} onClose={() => setRejecting(null)} onDone={load} />}
      {editing && <EditSheet t={editing.t} isFix={editing.g.isFix} onClose={() => setEditing(null)} onApprove={approve} />}
    </AdminLayout>
  );
}

function RejectSheet({ t, onClose, onDone }: { t: AdminTiming; onClose: () => void; onDone: () => Promise<void> }) {
  const [reason, setReason] = useState("");
  return (
    <Sheet
      title="却下"
      okLabel="却下する"
      onClose={onClose}
      onOk={async () => {
        try {
          await api(`/api/admin/timings/${t.id}/reject`, { method: "POST", body: JSON.stringify({ reason }) });
          toast("却下しました");
        } catch (e) {
          toast(errMsg(e));
        }
        await onDone();
      }}
    >
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
