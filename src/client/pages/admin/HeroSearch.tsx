import { useState } from "react";
import { ATTACK_LABEL, HERO_ROLES, NG_ATTACK_TYPES, type NgAttackType } from "../../../shared/constants";
import { normalizeForSearch } from "../../../shared/text";
import type { AdminHero } from "../../../shared/types";

/** キャラ管理の検索条件（"" はすべて） */
export type HeroQuery = {
  q: string;
  role: string; // attacker など／none（未入力）
  atk: Record<NgAttackType, "" | "ok" | "ng">;
  atkImp: string; // 3〜0／none
  atkTime: "" | "set" | "none";
  tgtImp: string; // 3〜1／none
  inv: "" | "set" | "none" | "multi";
};

export const emptyQuery = (): HeroQuery => ({
  q: "",
  role: "",
  atk: { hs: "", normal: "", action: "", card: "" },
  atkImp: "",
  atkTime: "",
  tgtImp: "",
  inv: "",
});

// 管理画面の中でタブを行き来しても条件を残す
let memory = emptyQuery();

const impMatch = (v: number | null, want: string) => !want || (want === "none" ? v == null : v === Number(want));

/** 条件に合うか */
export function matchHero(h: AdminHero, c: HeroQuery) {
  const nq = normalizeForSearch(c.q);
  if (nq && ![h.name, h.fullName, h.slug].some((s) => normalizeForSearch(s).includes(nq))) return false;
  if (c.role && (c.role === "none" ? h.role != null : h.role !== c.role)) return false;
  for (const k of NG_ATTACK_TYPES) {
    const want = c.atk[k];
    if (want && (want === "ng") !== h.ngAttacks.includes(k)) return false;
  }
  // ヒーロースキルが不可なら HS合わせ適性は「−」（0）扱い
  if (!impMatch(h.ngAttacks.includes("hs") ? 0 : h.hsAttackImportance, c.atkImp)) return false;
  if (c.atkTime && (c.atkTime === "set") !== (h.hsAttackTime != null)) return false;
  if (!impMatch(h.hsTargetImportance, c.tgtImp)) return false;
  if (c.inv === "set" && !h.hsInvincible.length) return false;
  if (c.inv === "none" && h.hsInvincible.length) return false;
  if (c.inv === "multi" && !(h.hsInvincible.length > 1 || h.hsInvincible.some((v) => v.label))) return false;
  return true;
}

export function useHeroQuery() {
  const [c, setC] = useState<HeroQuery>(memory);
  const set = (n: HeroQuery) => {
    memory = n;
    setC(n);
  };
  return [c, set] as const;
}

const active = (c: HeroQuery) => JSON.stringify(c) !== JSON.stringify(emptyQuery());

/** 検索欄と条件（条件は「詳しい条件」で開く） */
export function HeroSearch({ c, set, shown, total }: { c: HeroQuery; set: (c: HeroQuery) => void; shown: number; total: number }) {
  const [open, setOpen] = useState(false);
  const p = (patch: Partial<HeroQuery>) => set({ ...c, ...patch });
  const nConds = Object.entries(c).filter(([k, v]) => k !== "q" && (typeof v === "string" ? v : Object.values(v).some(Boolean))).length;
  return (
    <div className="hsearch">
      <input className="search" placeholder="キャラ名・正式名称・slug で検索" value={c.q} onChange={(e) => p({ q: e.target.value })} />
      <div className="hsbar">
        <button className={`sbtn ${open ? "on" : ""}`} onClick={() => setOpen(!open)}>
          {open ? "▼" : "▶"} 詳しい条件{nConds ? `（${nConds}）` : ""}
        </button>
        <span className="cnt">
          {shown} / {total} 体
        </span>
        {active(c) && (
          <button className="sbtn" onClick={() => set(emptyQuery())}>
            条件をクリア
          </button>
        )}
      </div>
      {open && (
        <div className="hsconds">
          <Cond label="ロール" value={c.role} onChange={(v) => p({ role: v })}>
            {HERO_ROLES.map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
            <option value="none">未入力</option>
          </Cond>
          <div className="hsgroup">HS合わせ（攻撃）</div>
          <Cond label="HS合わせ適性" value={c.atkImp} onChange={(v) => p({ atkImp: v })}>
            <ImpOptions dash />
          </Cond>
          {NG_ATTACK_TYPES.map((k) => (
            <Cond key={k} label={ATTACK_LABEL[k]} value={c.atk[k]} onChange={(v) => p({ atk: { ...c.atk, [k]: v as "" | "ok" | "ng" } })}>
              <option value="ok">可</option>
              <option value="ng">不可</option>
            </Cond>
          ))}
          <Cond label="ダメージ発生" value={c.atkTime} onChange={(v) => p({ atkTime: v as HeroQuery["atkTime"] })}>
            <option value="set">入力済み</option>
            <option value="none">未入力</option>
          </Cond>
          <div className="hsgroup">被HS合わせ（受）</div>
          <Cond label="HS警戒度" value={c.tgtImp} onChange={(v) => p({ tgtImp: v })}>
            <ImpOptions />
          </Cond>
          <Cond label="無敵" value={c.inv} onChange={(v) => p({ inv: v as HeroQuery["inv"] })}>
            <option value="set">入力済み</option>
            <option value="none">未入力</option>
            <option value="multi">場面ごと・補足あり</option>
          </Cond>
        </div>
      )}
    </div>
  );
}

function Cond({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label className={`hline ${value ? "set" : ""}`}>
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">すべて</option>
        {children}
      </select>
    </label>
  );
}

function ImpOptions({ dash }: { dash?: boolean }) {
  return (
    <>
      <option value="3">★★★</option>
      <option value="2">★★☆</option>
      <option value="1">★☆☆</option>
      {dash && <option value="0">−</option>}
      <option value="none">未入力</option>
    </>
  );
}
