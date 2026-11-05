import { useCallback, useEffect, useState } from "react";
import { ATTACK_LABEL } from "../../../shared/constants";
import { formatCue, normalizeForSearch } from "../../../shared/text";
import type { AdminPublished as Item } from "../../../shared/types";
import { EntryCard } from "../../components/EntryCard";
import { api, ApiError, useApi } from "../../lib/api";
import { useBootFx } from "../../lib/fx";
import { fmtDate, toast } from "../../lib/ui";
import { ArmedButton } from "./AdminHeroes";
import { AdminLayout, adminErrorMessage } from "./AdminLayout";

/** 管理：公開中のタイミング（非公開にする・公開に戻す・削除） */
export function AdminPublished() {
  const pending = useApi<{ groups: { timings: unknown[] }[] }>("/api/admin/pending");
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems((await api<{ items: Item[] }>("/api/admin/published")).items);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.status : 0);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  useBootFx(!!items || error !== null);

  const toggle = (id: string) =>
    setOpened((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const run = async (id: string, method: string, path: string, msg: string) => {
    setBusy(id);
    try {
      await api(path, { method });
      toast(msg);
      await load();
    } catch (e) {
      toast(e instanceof ApiError && e.message === "video_missing" ? "動画が見つかりませんでした" : "操作に失敗しました");
    } finally {
      setBusy(null);
    }
  };

  const nq = normalizeForSearch(q);
  const list = (items ?? []).filter(
    (t) =>
      !nq ||
      [t.attacker.name, t.target.name, t.timingText, t.nickname ?? "", t.code, ATTACK_LABEL[t.attackType]].some((s) => normalizeForSearch(s).includes(nq)),
  );
  const hiddenCount = (items ?? []).filter((t) => t.hidden).length;

  return (
    <AdminLayout tab="published" pendingCount={pending.data?.groups.reduce((s, g) => s + g.timings.length, 0)}>
      {error !== null && <div className="empty">{adminErrorMessage(error)}</div>}
      {items && (
        <>
          <div className="box">
            <p>
              公開中のタイミング {items.length - hiddenCount} 件{hiddenCount ? `・非公開 ${hiddenCount} 件` : ""}。▶ で開いて「非公開にする」「削除」、投稿者の X の ID の修正ができます。
              <br />
              非公開：一般向けの画面と動画から外します（「公開に戻す」で戻せます）。削除：タイミングと動画を消します（元に戻せません）。
            </p>
          </div>
          <input className="search" placeholder="キャラ名・タイミング・投稿者・受付番号で検索" value={q} onChange={(e) => setQ(e.target.value)} />
          {list.length ? (
            list.map((t) => {
              const open = opened.has(t.id);
              const status = t.hidden ? "hidden" : "approved";
              if (!open)
                return (
                  <div className={`entry fold ${t.hidden ? "old" : ""}`} key={t.id}>
                    <button type="button" className="sbtn foldbtn" aria-expanded={false} aria-label="開く" onClick={() => toggle(t.id)}>
                      ▶
                    </button>
                    <span className={`chip st-${status}`} style={{ marginRight: 0, whiteSpace: "nowrap" }}>
                      {t.hidden ? "非公開" : "公開中"}
                    </span>
                    <div className="tim">
                      {t.attacker.name}→{t.target.name}｜{formatCue(t.cueType, t.timingText)}
                    </div>
                  </div>
                );
              const isBusy = busy === t.id;
              return (
                <EntryCard
                  key={t.id}
                  old={t.hidden}
                  status={status}
                  label={
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <button type="button" className="sbtn foldbtn" aria-expanded aria-label="折りたたむ" onClick={() => toggle(t.id)}>
                        ▼
                      </button>
                      {t.code}
                    </span>
                  }
                  points={[{ attackType: t.attackType, cueType: t.cueType, timingText: t.timingText, note: t.note, videoUrl: t.videoUrl }]}
                  attacker={t.attacker}
                  target={t.target}
                  nickname={t.nickname}
                  supportCode={t.supportCode}
                  dateText={t.reviewedAt ? `${fmtDate(t.reviewedAt)} 承認` : ""}
                  actionsRow
                  actions={
                    <>
                      {t.hidden ? (
                        <button className={`sbtn ${isBusy ? "busy" : ""}`} disabled={!!busy} onClick={() => run(t.id, "POST", `/api/admin/timings/${t.id}/unhide`, "公開に戻しました")}>
                          {isBusy ? (
                            <>
                              <span className="spin" aria-hidden="true" />
                              処理中…
                            </>
                          ) : (
                            "公開に戻す"
                          )}
                        </button>
                      ) : (
                        <button className={`sbtn ${isBusy ? "busy" : ""}`} disabled={!!busy} onClick={() => run(t.id, "POST", `/api/admin/timings/${t.id}/hide`, "非公開にしました")}>
                          {isBusy ? (
                            <>
                              <span className="spin" aria-hidden="true" />
                              処理中…
                            </>
                          ) : (
                            "非公開にする"
                          )}
                        </button>
                      )}
                      <ArmedButton
                        className="sbtn danger"
                        label="削除"
                        armedLabel="もう一度で削除"
                        onConfirm={() => run(t.id, "DELETE", `/api/admin/timings/${t.id}`, "削除しました")}
                      />
                      <PosterEdit id={t.id} value={t.nickname ?? ""} onSaved={load} />
                    </>
                  }
                />
              );
            })
          ) : (
            <div className="empty">{items.length ? "該当するタイミングがありません" : "公開中のタイミングはありません"}</div>
          )}
        </>
      )}
    </AdminLayout>
  );
}

/** 投稿者の X の ID を直す（打ち間違い・なりすましの対応。空にすると投稿者なし） */
function PosterEdit({ id, value, onSaved }: { id: string; value: string; onSaved: () => Promise<void> }) {
  const [v, setV] = useState(value);
  const [busy, setBusy] = useState(false);
  useEffect(() => setV(value), [value]);
  const save = async () => {
    setBusy(true);
    try {
      await api(`/api/admin/timings/${id}/poster`, { method: "POST", body: JSON.stringify({ nickname: v }) });
      toast(v.trim() ? "投稿者の X の ID を保存しました" : "投稿者を消しました");
      await onSaved();
    } catch (e) {
      toast(e instanceof ApiError && e.status === 400 ? "X の ID は英数字と _ の 15 文字までです" : "保存できませんでした");
    } finally {
      setBusy(false);
    }
  };
  return (
    <span style={{ display: "inline-flex", gap: 6, alignItems: "center", width: "100%", marginTop: 6 }}>
      <input className="inp" style={{ flex: 1, minWidth: 0 }} aria-label="投稿者の X の ID" placeholder="投稿者の X の ID（@xxxx）" value={v} onChange={(e) => setV(e.target.value)} />
      <button className="sbtn" disabled={busy || v === value} onClick={save}>
        {busy ? "保存中…" : "ID を保存"}
      </button>
    </span>
  );
}
