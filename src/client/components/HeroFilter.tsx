import { useState } from "react";
import { HERO_ROLES, HS_RATING, type HeroRole } from "../../shared/constants";
import { fmtSec } from "../../shared/hs";
import type { Hero } from "../../shared/types";

export type HeroSort = "order" | "importance" | "time";
export type SortDir = "asc" | "desc";
/** attack：攻撃する側の選択（HS合わせ適性）／target：相手の選択（HS警戒度） */
export type PickKind = "attack" | "target";

/** その画面で使う重要度（並べ替え用。★3〜1、「−」は 0、未入力は -1） */
export const importanceOf = (h: Hero, kind: PickKind) =>
  kind === "attack" ? (h.ngAttacks.includes("hs") ? 0 : (h.hsAttackImportance ?? -1)) : (h.hsTargetImportance ?? -1); // HS が不可なら「−」
/** 重要タグ（attack は HS が可のキャラだけ） */
export const keyOf = (h: Hero, kind: PickKind) => (kind === "attack" ? h.hsAttackKey && !h.ngAttacks.includes("hs") : h.hsTargetKey);
/** カードに出す ★（「−」は対象外、未入力は空） */
export const starsOf = (h: Hero, kind: PickKind) => {
  const v = importanceOf(h, kind);
  return v < 0 ? "" : v === 0 ? "−" : "★".repeat(v) + "☆".repeat(3 - v);
};
/**
 * その画面で使う秒数（docs/DECISIONS.md AQ）。
 * attack：HS のダメージ発生（パターンが複数あるときは最初の値。HS が不可なら無し）／target：HS の無敵時間（場面ごとにあるときは最初の値）。無ければ null
 */
export const secOf = (h: Hero, kind: PickKind): number | null =>
  kind === "attack"
    ? h.ngAttacks.includes("hs")
      ? null
      : h.hsAttackTime
    : (h.hsInvincible[0]?.sec ?? null);
/** カードに出す秒数（ダメージ発生・無敵時間が複数あるときは「1.3秒/5.5秒」） */
export const secLabel = (h: Hero, kind: PickKind) => {
  if (kind === "target") return h.hsInvincible.map((v) => fmtSec(v.sec)).join("/");
  if (!h.ngAttacks.includes("hs") && h.hsAttack.length > 1) return h.hsAttack.map((v) => fmtSec(v.sec)).join("/");
  const v = secOf(h, kind);
  return v == null ? "" : fmtSec(v);
};

/** 並び順ごとの名前・最初の向き・向きの言い方 */
const SORTS = (kind: PickKind): Record<HeroSort, { name: string; first: SortDir; asc: string; desc: string }> => ({
  order: { name: "実装順", first: "asc", asc: "古い順", desc: "新しい順" },
  importance: { name: `${HS_RATING[kind].name}順`, first: "desc", asc: "低い順", desc: "高い順" },
  time:
    kind === "attack"
      ? { name: "HSダメージ発生順", first: "asc", asc: "早い順", desc: "遅い順" }
      : { name: "無敵時間順", first: "asc", asc: "短い順", desc: "長い順" },
});

type State = { role: HeroRole | null; sort: HeroSort; dir: SortDir };

// 画面を行き来しても選んだ絞り込み・並び順を保つ（ロールは 2 画面で共通、並び順は意味が違うので画面ごと）
let roleMemory: HeroRole | null = null;
const sortMemory: Record<PickKind, { sort: HeroSort; dir: SortDir }> = { attack: { sort: "order", dir: "asc" }, target: { sort: "order", dir: "asc" } };

/** キャラ選択の「ロールで絞り込み」と「並び順」（docs/DECISIONS.md Y・AA・AQ） */
export function useHeroFilter(kind: PickKind) {
  const [state, setState] = useState<State>({ role: roleMemory, ...sortMemory[kind] });
  const set = (p: Partial<State>) => {
    const n = { ...state, ...p };
    roleMemory = n.role;
    sortMemory[kind] = { sort: n.sort, dir: n.dir };
    setState(n);
  };
  // 並び順のボタン：選んでいないものを押すとその並び順（最初の向き）、選んでいるものをもう一度押すと向きを逆にする
  const pick = (sort: HeroSort) => set(sort === state.sort ? { dir: state.dir === "asc" ? "desc" : "asc" } : { sort, dir: SORTS(kind)[sort].first });
  // 同じ値なら実装順。値が無いもの（未入力など）は、向きに関係なくいつも最後
  const apply = (list: Hero[]) => {
    const r = state.role ? list.filter((h) => h.role === state.role) : list;
    const sign = state.dir === "asc" ? 1 : -1;
    if (state.sort === "order") return sign === 1 ? r : [...r].reverse();
    // ★ の並びでは、同じ ★ の中で重要タグの付いたキャラを上にする（docs/DECISIONS.md AT）
    const val = (h: Hero) => (state.sort === "importance" ? (importanceOf(h, kind) < 0 ? null : importanceOf(h, kind) + (keyOf(h, kind) ? 0.5 : 0)) : secOf(h, kind));
    return [...r].sort((a, b) => {
      const x = val(a), y = val(b);
      if (x == null || y == null) return x == null ? (y == null ? 0 : 1) : -1;
      return (x - y) * sign;
    });
  };
  return { ...state, kind, set, pick, apply };
}

export function HeroFilter({ sort, dir, kind, role, set, pick }: { role: HeroRole | null; sort: HeroSort; dir: SortDir; kind: PickKind; set: (p: Partial<State>) => void; pick: (s: HeroSort) => void }) {
  const [info, setInfo] = useState(false);
  const r = HS_RATING[kind];
  const S = SORTS(kind);
  // 選んでいる並び順には向き（▲／▼）だけを出す（読み上げ用に「古い順」などを付ける）。もう一度押すと逆になる
  const label = (k: HeroSort) => (
    <>
      {S[k].name}
      {sort === k && (
        <em className="dir" aria-label={S[k][dir]}>
          {dir === "asc" ? "▲" : "▼"}
        </em>
      )}
    </>
  );
  return (
    <div className="hfilter">
      <div className="hfrow sorts">
        <span>並び順</span>
        <button className={sort === "order" ? "on" : ""} onClick={() => pick("order")}>
          {label("order")}
        </button>
        <button className={sort === "time" ? "on" : ""} onClick={() => pick("time")}>
          {label("time")}
        </button>
        {/* 並び順のボタンと ⓘ を 1 つの枠に入れて、並び順の最後に置く（ボタンの中にボタンは置けないので、枠で囲む） */}
        <span className={`sortbox ${sort === "importance" ? "on" : ""}`}>
          <button onClick={() => pick("importance")}>{label("importance")}</button>
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
