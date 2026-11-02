import { useCallback, useEffect, useState } from "react";
import { CONTACT_KIND_LABEL } from "../../../shared/constants";
import type { AdminContact } from "../../../shared/types";
import { api, ApiError, useApi } from "../../lib/api";
import { useBootFx } from "../../lib/fx";
import { copyText, toast } from "../../lib/ui";
import { ArmedButton } from "./AdminHeroes";
import { AdminLayout, adminErrorMessage } from "./AdminLayout";

const fmtDateTime = (s: string) => new Date(s).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

/** 管理：お問い合わせ（未対応 → 対応済み、削除） */
export function AdminContacts() {
  const pending = useApi<{ groups: { timings: unknown[] }[] }>("/api/admin/pending");
  const [items, setItems] = useState<AdminContact[] | null>(null);
  const [error, setError] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems((await api<{ contacts: AdminContact[] }>("/api/admin/contacts")).contacts);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.status : 0);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  useBootFx(!!items || error !== null);

  const run = async (id: string, init: RequestInit, msg: string) => {
    setBusy(id);
    try {
      await api(`/api/admin/contacts/${id}`, init);
      toast(msg);
      await load();
    } catch {
      toast("操作に失敗しました");
    } finally {
      setBusy(null);
    }
  };
  const openCount = (items ?? []).filter((c) => c.status === "open").length;

  return (
    <AdminLayout tab="contacts" pendingCount={pending.data?.groups.reduce((s, g) => s + g.timings.length, 0)}>
      {error !== null && <div className="empty">{adminErrorMessage(error)}</div>}
      {items && (
        <>
          <div className="box">
            <p>
              未対応 {openCount} 件・対応済み {items.length - openCount} 件。
              <br />
              対応済みにしたものは、90 日後に自動で削除されます。
            </p>
          </div>
          {items.length ? (
            items.map((c) => {
              const done = c.status === "done";
              const isBusy = busy === c.id;
              return (
                <div className={`entry ${done ? "old" : ""}`} key={c.id}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                    <span className={`chip ${done ? "st-approved" : "st-pending"}`}>{done ? "対応済み" : "未対応"}</span>
                    <b style={{ fontSize: 13 }}>{CONTACT_KIND_LABEL[c.kind]}</b>
                    <span style={{ fontSize: 11.5, color: "var(--sub)", marginLeft: "auto" }}>{fmtDateTime(c.createdAt)}</span>
                  </div>
                  {c.ref && (
                    <div style={{ fontSize: 12, color: "var(--sub)", marginBottom: 4, wordBreak: "break-all" }}>
                      対象：{c.ref}
                    </div>
                  )}
                  <div style={{ fontSize: 13.5, lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{c.body}</div>
                  <div style={{ fontSize: 12, color: "var(--sub)", marginTop: 6, wordBreak: "break-all" }}>返信先：{c.replyTo || "（なし）"}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                    {c.replyTo && (
                      <button className="sbtn" onClick={() => copyText(c.replyTo!, "返信先をコピーしました")}>
                        返信先をコピー
                      </button>
                    )}
                    <button
                      className={`sbtn ${done ? "" : "ok"} ${isBusy ? "busy" : ""}`}
                      disabled={!!busy}
                      onClick={() =>
                        run(c.id, { method: "PUT", body: JSON.stringify({ status: done ? "open" : "done" }) }, done ? "未対応に戻しました" : "対応済みにしました")
                      }
                    >
                      {isBusy ? (
                        <>
                          <span className="spin" aria-hidden="true" />
                          処理中…
                        </>
                      ) : done ? (
                        "未対応に戻す"
                      ) : (
                        "対応済みにする"
                      )}
                    </button>
                    <ArmedButton className="sbtn danger" label="削除" armedLabel="もう一度押すと削除" onConfirm={() => run(c.id, { method: "DELETE" }, "削除しました")} />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="empty">お問い合わせはまだありません</div>
          )}
        </>
      )}
    </AdminLayout>
  );
}
