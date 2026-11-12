import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Bootstrap } from "../../shared/types";
import { api } from "./api";

type Ctx = Bootstrap & { reload: () => Promise<void> };
const DataContext = createContext<Ctx | null>(null);

/** 全画面で使うデータ（キャラ一覧・設定）を最初に 1 回読み込む */
export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Bootstrap | null>(null);
  const [error, setError] = useState(false);
  const reload = async () => {
    try {
      setData(await api<Bootstrap>("/api/bootstrap"));
      setError(false);
    } catch {
      setError(true);
    }
  };
  useEffect(() => {
    reload();
  }, []);
  if (error) return <div className="empty" style={{ marginTop: 40 }}>読み込みに失敗しました。時間をおいて再読み込みしてください。</div>;
  if (!data) return null;
  return (
    <DataContext.Provider value={{ ...data, reload }}>
      {data.stage === "staging" && <StagingBar />}
      {children}
    </DataContext.Provider>
  );
}

export function useData(): Ctx {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("DataProvider がありません");
  return ctx;
}

/** 確認用サイトの帯（本番と間違えないように）。検索エンジンにも載せない */
function StagingBar() {
  useEffect(() => {
    const m = document.createElement("meta");
    m.name = "robots";
    m.content = "noindex, nofollow";
    document.head.appendChild(m);
    document.title = `【確認用】${document.title}`;
  }, []);
  return <div className="stagingbar">確認用サイト（本番ではありません・データは本番と別）</div>;
}
