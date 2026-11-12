import { useState } from "react";
import { HERO_ROLES, HS_RATING, type HeroRole } from "../../shared/constants";
import type { Hero } from "../../shared/types";

export type HeroSort = "order" | "importance";
/** attack：攻撃する側の選択（HS合わせ適性）／target：相手の選択（HS警戒度） */
export type PickKind = "attack" | "target";

/** その画面で使う重要度（並べ替え用。★3〜1、「−」は 0、未入力は -1） */
export const importanceOf = (h: Hero, kind: PickKind) =>
  kind === "attack" ? (h.ngAttacks.includes("hs") ? 0 : (h.hsAttackImportance ?? -1)) : (h.hsTargetImportance ?? -1); // HS が不可なら「−」
/** カードに出す ★（「−」は対象外、未入力は空） */
export const starsOf = (h: Hero, kind: PickKind) => {
  const v = importanceOf(h, kind);
  return v < 0 ? "" : v === 0 ? "−" : "★".repeat(v) + "☆".repeat(3 - v);
};
type State = { role: HeroRole | null; sort: HeroSort };

// 画面を行き来しても選んだ絞り込み・並び順を保つ（ロールは 2 画面で共通、並び順は重要度の意味が違うので画面ごと）
let roleMemory: HeroRole | null = null;
const sortMemory: Record<PickKind, HeroSort> = { attack: "order", target: "order" };

/** キャラ選択の「ロールで絞り込み」と「並び順」（docs/DECISIONS.md Y・AA） */
export function useHeroFilter(kind: PickKind) {
  const [state, setState] = useState<State>({ role: roleMemory, sort: sortMemory[kind] });
  const set = (p: Partial<State>) => {
    const n = { ...state, ...p };
    roleMemory = n.role;
    sortMemory[kind] = n.sort;
    setState(n);
  };
  // 絞り込みは実装順のまま。重要度順は ★ が多い順（同じなら実装順。「−」、未入力の順に最後）
  const apply = (list: Hero[]) => {
    const r = state.role ? list.filter((h) => h.role === state.role) : list;
    return state.sort === "importance" ? [...r].sort((a, b) => importanceOf(b, kind) - importanceOf(a, kind)) : r;
  };
  return { ...state, kind, set, apply };
}

export function HeroFilter({ role, sort, kind, set }: { role: HeroRole | null; sort: HeroSort; kind: PickKind; set: (p: Partial<State>) => void }) {
  const [info, setInfo] = useState(false);
  const r = HS_RATING[kind];
  return (
    <div className="hfilter">
      <div className="hfrow">
        <span>並び順</span>
        <button className={sort === "order" ? "on" : ""} onClick={() => set({ sort: "order" })}>
          実装順
        </button>
        {/* 並び順のボタンと ⓘ を 1 つの枠に入れる（ボタンの中にボタンは置けないので、枠で囲む） */}
        <span className={`sortbox ${sort === "importance" ? "on" : ""}`}>
          <button onClick={() => set({ sort: "importance" })}>{r.name}順</button>
          <button className={`info ${info ? "open" : ""}`} aria-label={`${r.name}とは`} aria-expanded={info} onClick={() => setInfo(!info)}>
            ⓘ
          </button>
        </span>
      </div>
      {info && (
        <div className="hinfo">
          <b>{r.name}とは</b>
          {r.help.map((t, i) => (
            <p key={i}>{t}</p>
          ))}
        </div>
      )}
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
