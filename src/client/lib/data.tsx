import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Bootstrap } from "../../shared/types";
import { api } from "./api";
import { HeroWall, rememberedWall, useRememberWall } from "../components/HeroWall";

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
  if (!data) return <Loading />;
  return (
    <DataContext.Provider value={{ ...data, reload }}>
      <RememberWall urls={data.heroes.map((h) => h.imageUrl ?? "")} />
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
  return <div className="stagingbar">確認用サイト（本番ではありません・データは本番のコピー）</div>;
}

function RememberWall({ urls }: { urls: string[] }) {
  useRememberWall(urls);
  return null;
}

/** 読み込み中の画面：前に開いたときのキャラのアイコンを、後ろに薄く流す（docs/DECISIONS.md AX） */
function Loading() {
  return (
    <>
      <HeroWall urls={rememberedWall()} />
      <div className="booting">
        <img src="/icon-192.png" alt="" width={72} height={72} />
        <span>読み込み中…</span>
      </div>
    </>
  );
}
