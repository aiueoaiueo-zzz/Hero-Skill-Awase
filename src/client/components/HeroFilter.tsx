import { useState } from "react";
import { HERO_ROLES, type HeroRole } from "../../shared/constants";
import type { Hero } from "../../shared/types";

export type HeroSort = "order" | "importance";
type State = { role: HeroRole | null; sort: HeroSort };

// 画面を行き来しても選んだ絞り込み・並び順を保つ（キャラ選択の 2 画面で共通）
let memory: State = { role: null, sort: "order" };

/** キャラ選択の「ロールで絞り込み」と「並び順」（docs/DECISIONS.md Y） */
export function useHeroFilter() {
  const [state, setState] = useState<State>(memory);
  const set = (p: Partial<State>) => {
    memory = { ...state, ...p };
    setState(memory);
  };
  // 絞り込みは実装順のまま。重要度順は ★ が多い順（同じなら実装順、未入力は最後）
  const apply = (list: Hero[]) => {
    const r = state.role ? list.filter((h) => h.role === state.role) : list;
    return state.sort === "importance" ? [...r].sort((a, b) => (b.hsImportance ?? 0) - (a.hsImportance ?? 0)) : r;
  };
  return { ...state, set, apply };
}

export function HeroFilter({ role, sort, set }: { role: HeroRole | null; sort: HeroSort; set: (p: Partial<State>) => void }) {
  return (
    <div className="hfilter">
      <div className="hfrow">
        <span>並び順</span>
        <button className={sort === "order" ? "on" : ""} onClick={() => set({ sort: "order" })}>
          実装順
        </button>
        <button className={sort === "importance" ? "on" : ""} onClick={() => set({ sort: "importance" })}>
          HS合わせ重要度順
        </button>
      </div>
      <div className="hfrow roles">
        <button className={!role ? "on" : ""} onClick={() => set({ role: null })}>
          全ロール
        </button>
        {HERO_ROLES.map(([k, l]) => (
          <button key={k} className={role === k ? "on" : ""} onClick={() => set({ role: k })}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}
