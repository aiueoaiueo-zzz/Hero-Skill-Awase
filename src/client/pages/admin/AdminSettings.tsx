import { useEffect, useState } from "react";
import { DEFAULT_ABOUT, DEFAULT_NOTICES, type SettingKey } from "../../../shared/constants";
import { api, ApiError, useApi } from "../../lib/api";
import { useData } from "../../lib/data";
import { useBootFx } from "../../lib/fx";
import { mdLite, toast } from "../../lib/ui";
import { AdminLayout, adminErrorMessage } from "./AdminLayout";

type Settings = Record<SettingKey, string>;

/** 管理：設定（制作者の応援コード・注意事項・このアプリについて） */
export function AdminSettings() {
  const { data, error } = useApi<Settings>("/api/admin/settings");
  const pending = useApi<{ groups: { timings: unknown[] }[] }>("/api/admin/pending");
  const { reload } = useData();
  const [own, setOwn] = useState("");
  const [notices, setNotices] = useState("");
  const [about, setAbout] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!data) return;
    setOwn(data.owner_support_code);
    setNotices(data.notices);
    setAbout(data.about);
  }, [data]);
  useBootFx(!!data || !!error);

  const save = async (patch: Partial<Settings>, msg: string) => {
    try {
      await api("/api/admin/settings", { method: "PUT", body: JSON.stringify(patch) });
      await reload(); // フッター・概要にすぐ反映
      toast(msg);
    } catch (e) {
      toast(e instanceof ApiError && e.status === 400 ? "入力内容を確認してください（文字数など）" : "保存できませんでした");
    }
  };
  const count = pending.data?.groups.reduce((s, g) => s + g.timings.length, 0);

  return (
    <AdminLayout tab="settings" pendingCount={count}>
      {error && <div className="empty">{adminErrorMessage(error.status)}</div>}
      {data && (
        <>
          <div className="box">
            <p>
              <b style={{ color: "var(--text)" }}>制作者の応援コード</b>（フッターに表示）
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <input className="inp" maxLength={20} value={own} placeholder="例：A1B2C3D4" onChange={(e) => setOwn(e.target.value)} />
              <button className="sbtn ok" style={{ whiteSpace: "nowrap" }} onClick={() => save({ owner_support_code: own.trim() }, "保存しました")}>
                保存
              </button>
            </div>
          </div>
          <div className="box">
            <p>
              <b style={{ color: "var(--text)" }}>注意事項</b>（全画面のフッターに表示）
              <br />
              1行に1項目。**文字** で太字になります。
            </p>
            <textarea style={{ minHeight: 220 }} value={notices} onChange={(e) => setNotices(e.target.value)} />
            <div className="btns">
              <button
                onClick={() => {
                  setNotices(DEFAULT_NOTICES);
                  toast("初期の文面を入れました（保存で確定）");
                }}
              >
                初期の文面に戻す
              </button>
              <button className="primary" onClick={() => save({ notices }, "注意事項を保存しました")}>
                保存
              </button>
            </div>
          </div>
          <div className="box">
            <p>
              <b style={{ color: "var(--text)" }}>このアプリについて</b>（ヘッダーの「ⓘ 概要」で表示）
              <br />
              「## 」で見出し、「- 」で箇条書き、「1. 」で番号付きリスト、**文字** で太字、空行で段落の区切りになります。
            </p>
            <textarea style={{ minHeight: 360 }} value={about} onChange={(e) => setAbout(e.target.value)} />
            <div className="btns">
              <button
                onClick={() => {
                  setAbout(DEFAULT_ABOUT);
                  toast("初期の文面を入れました（保存で確定）");
                }}
              >
                初期の文面に戻す
              </button>
              <button onClick={() => setPreview(about)}>プレビュー</button>
              <button className="primary" onClick={() => save({ about }, "概要を保存しました")}>
                保存
              </button>
            </div>
            {preview !== null && (
              <div className="about" style={{ marginTop: 12 }}>
                <div className="lbl">プレビュー</div>
                <div dangerouslySetInnerHTML={{ __html: mdLite(preview) }} />
              </div>
            )}
          </div>
        </>
      )}
    </AdminLayout>
  );
}
