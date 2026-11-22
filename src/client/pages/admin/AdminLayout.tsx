import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { Header } from "../../components/Header";
import { useApi } from "../../lib/api";
import { PROG } from "../../lib/fx";

export type AdminTab = "pending" | "published" | "stats" | "contacts" | "heroes" | "events" | "settings";

/** 管理画面の共通部分（タブ）。一般向けのヘッダーボタンとフッターは出さない */
export function AdminLayout({
  tab,
  pendingCount,
  contactCount,
  header,
  children,
}: {
  tab: AdminTab;
  pendingCount?: number;
  contactCount?: number;
  /** 見出しを変える（公開中タブで、一般向けの画面と同じ見出しを出す） */
  header?: { title: ReactNode; sub?: ReactNode; back?: string; prog?: number };
  children: ReactNode;
}) {
  const nav = useNavigate();
  // 未対応のお問い合わせの件数（「問い合わせ」タブでは、そのページが持っている最新の件数を使う）
  const contacts = useApi<{ open: number }>(contactCount === undefined ? "/api/admin/contacts/count" : null);
  const openContacts = contactCount ?? contacts.data?.open;
  const tabs: [AdminTab, string, string][] = [
    ["pending", `承認待ち${pendingCount !== undefined ? ` (${pendingCount})` : ""}`, "/admin"],
    ["published", "公開中", "/admin/published"],
    ["stats", "集計", "/admin/stats"],
    ["contacts", `問い合わせ${openContacts !== undefined ? ` (${openContacts})` : ""}`, "/admin/contacts"],
    ["heroes", "キャラ管理", "/admin/heroes"],
    ["events", "イベント", "/admin/events"],
    ["settings", "設定", "/admin/settings"],
  ];
  return (
    <>
      <Header title={header?.title ?? "管理画面"} sub={header?.sub} back={header?.back} prog={header?.prog ?? PROG.other} />
      <div className="tabs">
        {tabs.map(([k, label, to]) => (
          <button key={k} className={tab === k ? "on" : ""} onClick={() => tab !== k && nav(to)}>
            {label}
          </button>
        ))}
      </div>
      {children}
    </>
  );
}

/** タブに出す承認待ちの件数（タイミング＋投稿者情報の変更申請） */
export const pendingTotal = (d?: { groups: { timings: unknown[] }[]; posterChanges?: unknown[] } | null) =>
  d ? d.groups.reduce((s, g) => s + g.timings.length, 0) + (d.posterChanges?.length ?? 0) : undefined;

export const adminErrorMessage = (status?: number) =>
  status === 401 || status === 403 || status === 503
    ? "管理者としてログインしていません。Cloudflare Access でログインしてから開き直してください。"
    : "読み込みに失敗しました。再読み込みしてください。";
