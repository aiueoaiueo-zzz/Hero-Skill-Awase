import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router";
import { ATTACK_LABEL, type AttackType } from "../../../shared/constants";
import { formatCue } from "../../../shared/text";
import { blockedAttacks } from "../../../shared/hs";
import type { AdminPublished as Item } from "../../../shared/types";
import { PairView, tabMemory } from "../../components/PairView";
import { pointId, PointsEditor, type PointDraft } from "../../components/PointsEditor";
import { Sheet } from "../../components/Sheet";
import { api, ApiError, useApi } from "../../lib/api";
import { useData } from "../../lib/data";
import { PROG, useBootFx } from "../../lib/fx";
import { toast } from "../../lib/ui";
import { AttackerPick } from "../Home";
import { TargetsBody } from "../Targets";
import { ArmedButton } from "./AdminHeroes";
import { AdminLayout, adminErrorMessage, pendingTotal } from "./AdminLayout";

// 管理：公開中のタイミング（docs/DECISIONS.md BD）
// 一般向けの画面と同じ流れ（攻撃する側 → 相手 → タイミング）で、ボタンは「編集」だけ。
// 一般向けと違い、非公開のタイミングも（「非公開」の印つきで）出す。

const BASE = "/admin/published/h";

/** 公開中・非公開のタイミング（3 つの画面で共有。編集したら読み直す） */
let cache: Item[] | null = null;
function usePublished() {
  const [items, setItems] = useState<Item[] | null>(cache);
  const [error, setError] = useState<number | null>(null);
  const load = useCallback(async () => {
    try {
      cache = (await api<{ items: Item[] }>("/api/admin/published")).items;
      setItems(cache);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.status : 0);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  return { items, error, load };
}

function usePendingCount() {
  const pending = useApi<{ groups: { timings: unknown[] }[]; posterChanges?: unknown[] }>("/api/admin/pending");
  return pendingTotal(pending.data);
}

/** ① 攻撃する側のキャラを選ぶ */
export function AdminPublished() {
  const { items, error } = usePublished();
  const pendingCount = usePendingCount();
  useBootFx(!!items || error !== null);
  const hidden = (items ?? []).filter((t) => t.hidden).length;
  return (
    <AdminLayout tab="published" pendingCount={pendingCount} header={{ title: "公開中", sub: "① 攻撃する側のキャラを選択" }}>
      {error !== null && <div className="empty">{adminErrorMessage(error)}</div>}
      {items && (
        <div className="box">
          <p style={{ margin: 0 }}>
            公開中のタイミング {items.length - hidden} 件{hidden ? `・非公開 ${hidden} 件` : ""}。一般向けの画面と同じ順にたどって、タイミングの「編集」から直せます。
          </p>
        </div>
      )}
      {items && <CodeSearch items={items} />}
      <AttackerPick base={BASE} />
    </AdminLayout>
  );
}

/** タイミングの詳細画面へのリンク（#t-<id> でそのタイミングのタブを開いて、そこまで移動する） */
const timingPath = (t: Item) => `${BASE}/${t.attacker.slug}/${t.target.slug}#t-${encodeURIComponent(t.id)}`;

/** 受付番号で探す（「HS-」は省略可。修正提案が反映されたものは、修正提案の受付番号でも見つかる）。1 件ならすぐ開く */
function CodeSearch({ items }: { items: Item[] }) {
  const nav = useNavigate();
  const [code, setCode] = useState("");
  const [hits, setHits] = useState<{ code: string; list: Item[] } | null>(null);
  const search = () => {
    // 全角の英数字・ハイフンも受け付ける
    let c = code.trim().replace(/[Ａ-Ｚａ-ｚ０-９－ー]/g, (ch) => (ch === "－" || ch === "ー" ? "-" : String.fromCharCode(ch.charCodeAt(0) - 0xfee0))).toUpperCase();
    if (!c) return;
    if (/^[A-Z0-9]{6}$/.test(c)) c = `HS-${c}`;
    const list = items.filter((t) => t.code === c || t.fixCode === c);
    setHits({ code: c, list });
    if (list.length === 1) nav(timingPath(list[0]));
  };
  return (
    <div className="box">
      <p>受付番号で探す</p>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          className="inp"
          placeholder="HS-XXXXXX"
          style={{ textTransform: "uppercase" }}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
        />
        <button className="sbtn ok" style={{ whiteSpace: "nowrap" }} onClick={search}>
          検索
        </button>
      </div>
      {hits && !hits.list.length && (
        <p style={{ margin: "10px 0 0", color: "var(--danger)" }}>
          {hits.code} は公開中・非公開のタイミングにありません（承認待ち・却下・取り下げのものは「承認待ち」タブや審査状況の画面で）
        </p>
      )}
      {hits && hits.list.length > 1 && (
        <div style={{ marginTop: 10 }}>
          <p style={{ margin: "0 0 6px" }}>
            {hits.code}：{hits.list[0].attacker.name} → {hits.list[0].target.name}・{hits.list.length}件
          </p>
          {hits.list.map((t) => (
            <button key={t.id} className="sbtn" style={{ display: "block", width: "100%", textAlign: "left", marginBottom: 6 }} onClick={() => nav(timingPath(t))}>
              {t.hidden ? "【非公開】" : ""}
              {ATTACK_LABEL[t.attackType]}｜{formatCue(t.cueType, t.timingText)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** ② 相手のキャラを選ぶ */
export function AdminPublishedTargets() {
  const { a = "" } = useParams();
  const { heroes } = useData();
  const { items, error } = usePublished();
  const pendingCount = usePendingCount();
  useBootFx(!!items || error !== null);
  const attacker = heroes.find((h) => h.slug === a);
  if (!attacker) return <Navigate to="/admin/published" replace />;
  const registered = new Set((items ?? []).filter((t) => t.attacker.id === attacker.id).map((t) => t.target.id));
  return (
    <AdminLayout tab="published" pendingCount={pendingCount} header={{ title: `${attacker.name} で攻撃`, sub: "② HSを使う側（相手）を選択", back: "/admin/published", prog: PROG.step2 }}>
      {error !== null && <div className="empty">{adminErrorMessage(error)}</div>}
      <TargetsBody attacker={attacker} registered={registered} base={BASE} />
    </AdminLayout>
  );
}

/** ③ タイミング（一般向けの詳細画面と同じ。ボタンは「編集」だけ） */
export function AdminPublishedDetail() {
  const { a = "", t = "" } = useParams();
  const { heroes } = useData();
  const { items, error, load } = usePublished();
  const pendingCount = usePendingCount();
  const key = `${a}/${t}`;
  const [tab, setTab] = useState<AttackType | undefined>(tabMemory.get(key));
  const [editing, setEditing] = useState<Item | null>(null);
  useBootFx(!!items || error !== null);
  // 受付番号の検索から（#t-<タイミングID>）：そのタイミングのタブを開いて、そこまで移動する（一般向けの詳細画面と同じ）
  const { hash } = useLocation();
  const linkedId = hash.startsWith("#t-") ? decodeURIComponent(hash.slice(3)) : null;
  const [flashId, setFlashId] = useState<string | null>(null);
  const scrolled = useRef<string | null>(null);
  useEffect(() => {
    if (!items || !linkedId || scrolled.current === linkedId) return;
    const x = items.find((i) => i.id === linkedId);
    if (!x) return;
    if (tab !== x.attackType) {
      setTab(x.attackType);
      return; // タブが切り替わってから移動する
    }
    scrolled.current = linkedId;
    requestAnimationFrame(() => {
      document.getElementById(`t-${linkedId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      setFlashId(linkedId);
      setTimeout(() => setFlashId(null), 2500);
    });
  }, [items, linkedId, tab]);
  const A = heroes.find((h) => h.slug === a);
  const T = heroes.find((h) => h.slug === t);
  if (!A || !T) return <Navigate to="/admin/published" replace />;
  // 一般向けと同じ並び（承認が新しい順）。非公開も出す
  const timings = (items ?? []).filter((x) => x.attacker.id === A.id && x.target.id === T.id).map((x) => ({ ...x, badge: null }));
  return (
    <AdminLayout
      tab="published"
      pendingCount={pendingCount}
      header={{ title: `${A.name} → ${T.name}`, sub: `${T.name}のHS明けに合わせるタイミング`, back: `${BASE}/${a}`, prog: PROG.step3 }}
    >
      {error !== null && <div className="empty">{adminErrorMessage(error)}</div>}
      <PairView
        A={A}
        T={T}
        timings={timings}
        loaded={!!items}
        tab={tab}
        onTab={(k) => {
          tabMemory.set(key, k);
          setTab(k);
        }}
        flashId={flashId}
        cardClass={(x) => (x.hidden ? "hiddenpost" : undefined)}
        emptyText="公開中のタイミングはありません"
        actions={(x) => (
          <button className="sbtn" onClick={() => setEditing(x)}>
            編集
          </button>
        )}
      />
      {editing && <EditSheet t={editing} onClose={() => setEditing(null)} onSaved={load} />}
    </AdminLayout>
  );
}

/**
 * 公開中のタイミングを直す：攻撃方法・目印・タイミング・備考（動画はそのまま）と、投稿者の X の ID。
 * 非公開にする（公開に戻す）・削除もここから。
 */
function EditSheet({ t, onClose, onSaved }: { t: Item; onClose: () => void; onSaved: () => Promise<void> }) {
  const [points, setPoints] = useState<PointDraft[]>([
    { id: pointId(), attackType: t.attackType, cueType: t.cueType, timingText: t.timingText, note: t.note ?? "", existing: t.videoUrl ? { key: "", url: t.videoUrl } : null },
  ]);
  const [nick, setNick] = useState(t.nickname ?? "");
  const [busy, setBusy] = useState(false);
  const act = async (method: string, path: string, msg: string) => {
    setBusy(true);
    try {
      await api(path, { method });
      toast(msg);
      await onSaved();
      onClose();
    } catch (e) {
      toast(e instanceof ApiError && e.message === "video_missing" ? "動画が見つかりませんでした" : "操作に失敗しました");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet
      title="タイミングを編集"
      okLabel="保存"
      busyLabel="保存中…"
      onClose={onClose}
      onOk={async () => {
        const p = points[0];
        if (!p.timingText.trim()) {
          toast("合わせるタイミングを入力してください");
          return false;
        }
        try {
          await api(`/api/admin/timings/${t.id}/edit`, {
            method: "POST",
            body: JSON.stringify({ attackType: p.attackType, cueType: p.cueType, timingText: p.timingText.trim(), note: p.note.trim() || null }),
          });
          if (nick.trim() !== (t.nickname ?? "")) await api(`/api/admin/timings/${t.id}/poster`, { method: "POST", body: JSON.stringify({ nickname: nick }) });
          toast("保存しました");
          await onSaved();
          return true;
        } catch (e) {
          toast(
            e instanceof ApiError && e.message === "attack_not_allowed"
              ? "この組み合わせでは選べない攻撃方法です"
              : e instanceof ApiError && e.status === 400
                ? "入力を確認してください（X の ID は英数字と _ の 15 文字まで）"
                : "保存できませんでした",
          );
          return false;
        }
      }}
    >
      <p style={{ fontSize: 12.5, color: "var(--sub)", margin: "0 0 10px" }}>
        {t.attacker.name} → {t.target.name}・{t.code}
        {t.hidden ? "・非公開中" : ""}。保存するとすぐ一般向けの画面に反映されます。動画は変わりません。
      </p>
      <PointsEditor points={points} update={setPoints} opts={{ upload: false, single: true, blocked: blockedAttacks(t.attacker, t.target) }} />
      <label className="h">投稿者の X の ID</label>
      <input type="text" value={nick} placeholder="空にすると投稿者なし" autoCapitalize="none" autoComplete="off" spellCheck={false} onChange={(e) => setNick(e.target.value)} />
      <div className="hint">打ち間違い・なりすましの対応用です。</div>
      <label className="h">公開・削除</label>
      <div className="acts" style={{ justifyContent: "flex-start", marginTop: 0 }}>
        {t.hidden ? (
          <button className="sbtn" disabled={busy} onClick={() => act("POST", `/api/admin/timings/${t.id}/unhide`, "公開に戻しました")}>
            公開に戻す
          </button>
        ) : (
          <button className="sbtn" disabled={busy} onClick={() => act("POST", `/api/admin/timings/${t.id}/hide`, "非公開にしました")}>
            非公開にする
          </button>
        )}
        <ArmedButton className="sbtn danger" label="削除" armedLabel="もう一度で削除" onConfirm={() => act("DELETE", `/api/admin/timings/${t.id}`, "削除しました")} />
      </div>
      <div className="hint">非公開：一般向けの画面と動画から外します（「公開に戻す」で戻せます）。削除：タイミングと動画を消します（元に戻せません）。</div>
    </Sheet>
  );
}
