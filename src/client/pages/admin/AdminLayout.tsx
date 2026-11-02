import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { Header } from "../../components/Header";
import { PROG } from "../../lib/fx";

export type AdminTab = "pending" | "published" | "heroes" | "settings";

/** 管理画面の共通部分（タブ）。一般向けのヘッダーボタンとフッターは出さない */
export function AdminLayout({ tab, pendingCount, children }: { tab: AdminTab; pendingCount?: number; children: ReactNode }) {
  const nav = useNavigate();
  const tabs: [AdminTab, string, string][] = [
    ["pending", `承認待ち${pendingCount !== undefined ? ` (${pendingCount})` : ""}`, "/admin"],
    ["published", "公開中", "/admin/published"],
    ["heroes", "キャラ管理", "/admin/heroes"],
    ["settings", "設定", "/admin/settings"],
  ];
  return (
    <>
      <Header title="管理画面" prog={PROG.other} />
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

export const adminErrorMessage = (status?: number) =>
  status === 401 || status === 403 || status === 503
    ? "管理者としてログインしていません。Cloudflare Access でログインしてから開き直してください。"
    : "読み込みに失敗しました。再読み込みしてください。";
