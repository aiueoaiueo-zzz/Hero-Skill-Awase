import { useApi } from "../../lib/api";
import { useBootFx } from "../../lib/fx";
import { AdminLayout } from "./AdminLayout";

/** 8. 管理：キャラ管理（実装ステップ 7 で作る） */
export function AdminHeroes() {
  const pending = useApi<{ groups: { timings: unknown[] }[] }>("/api/admin/pending");
  useBootFx(true);
  return (
    <AdminLayout tab="heroes" pendingCount={pending.data?.groups.reduce((s, g) => s + g.timings.length, 0)}>
      <div className="empty">キャラ管理は実装ステップ 7 で作ります</div>
    </AdminLayout>
  );
}
