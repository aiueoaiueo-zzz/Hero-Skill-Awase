import { useState } from "react";
import { ATTACK_TYPES, type AttackType } from "../../../shared/constants";
import type { AdminStatsResponse, Hero } from "../../../shared/types";
import { Avatar } from "../../components/Avatar";
import { useApi } from "../../lib/api";
import { useBootFx } from "../../lib/fx";
import { AdminLayout, adminErrorMessage, pendingTotal } from "./AdminLayout";

type Side = "attacker" | "target";
type Sort = "most" | "least" | "order";
type Row = {
  hero: Hero;
  /** 相手キャラごとの件数（攻撃方法ごと） */
  partners: Map<string, Partial<Record<AttackType, number>>>;
  total: number;
  byType: Partial<Record<AttackType, number>>;
};

const SHORT: Record<AttackType, string> = { hs: "HS", normal: "通常", action: "アクション", card: "カード", other: "その他" };
const sum = (o: Partial<Record<AttackType, number>>) => Object.values(o).reduce((s, n) => s + (n ?? 0), 0);
const breakdown = (o: Partial<Record<AttackType, number>>) =>
  ATTACK_TYPES.filter(([k]) => o[k])
    .map(([k]) => `${SHORT[k]} ${o[k]}`)
    .join("・");

/** 管理：集計（キャラごとに、攻撃側・HS を受ける側として何組・何件たまっているか） */
export function AdminStats() {
  const pending = useApi<{ groups: { timings: unknown[] }[]; posterChanges?: unknown[] }>("/api/admin/pending");
  const { data, error } = useApi<AdminStatsResponse>("/api/admin/stats");
  const [side, setSide] = useState<Side>("attacker");
  const [sort, setSort] = useState<Sort>("most");
  const [opened, setOpened] = useState<Set<string>>(new Set());
  useBootFx(!!data || !!error);

  const heroes = data?.heroes ?? [];
  const byId = new Map(heroes.map((h) => [h.id, h]));
  const rows = new Map<string, Row>(heroes.map((h) => [h.id, { hero: h, partners: new Map(), total: 0, byType: {} }]));
  const combos = new Set<string>();
  let timings = 0;
  for (const p of data?.pairs ?? []) {
    const r = rows.get(side === "attacker" ? p.a : p.t);
    const other = side === "attacker" ? p.t : p.a;
    if (!r || !byId.has(other)) continue;
    const m = r.partners.get(other) ?? {};
    m[p.k] = (m[p.k] ?? 0) + p.n;
    r.partners.set(other, m);
    r.total += p.n;
    r.byType[p.k] = (r.byType[p.k] ?? 0) + p.n;
    combos.add(`${p.a}:${p.t}`);
    timings += p.n;
  }
  const order = new Map(heroes.map((h, i) => [h.id, i]));
  const list = [...rows.values()].sort((x, y) => {
    if (sort !== "order") {
      const d = (x.partners.size - y.partners.size || x.total - y.total) * (sort === "most" ? -1 : 1);
      if (d) return d;
    }
    return order.get(x.hero.id)! - order.get(y.hero.id)!;
  });
  const toggle = (id: string) =>
    setOpened((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const sideLabel = side === "attacker" ? "合わせる相手" : "合わせてくる相手";

  return (
    <AdminLayout tab="stats" pendingCount={pendingTotal(pending.data)}>
      {error && <div className="empty">{adminErrorMessage(error.status)}</div>}
      {data && (
        <>
          <div className="box">
            <p>
              公開中のタイミング {timings} 件・{combos.size} 組（非公開・承認待ちは数えません）。
              <br />
              組数：{sideLabel}のキャラが何人分たまっているか（全 {heroes.length} 人中）。▶ で開くと相手ごとの件数と、まだない相手が見られます。
            </p>
          </div>
          <div className="tabs" role="tablist">
            <button className={side === "attacker" ? "on" : ""} onClick={() => setSide("attacker")}>
              攻撃側として
            </button>
            <button className={side === "target" ? "on" : ""} onClick={() => setSide("target")}>
              HS合わせを受ける側として
            </button>
          </div>
          <div className="tabs">
            {(
              [
                ["most", "組数が多い順"],
                ["least", "少ない順"],
                ["order", "キャラ順"],
              ] as [Sort, string][]
            ).map(([k, label]) => (
              <button key={k} className={sort === k ? "on" : ""} onClick={() => setSort(k)}>
                {label}
              </button>
            ))}
          </div>
          {list.map((r) => {
            const open = opened.has(r.hero.id);
            const partners = [...r.partners.entries()].sort((x, y) => sum(y[1]) - sum(x[1]) || order.get(x[0])! - order.get(y[0])!);
            const missing = heroes.filter((h) => !r.partners.has(h.id));
            return (
              <div className="hrow stat" key={r.hero.id}>
                <button className={`hhead ${open ? "on" : ""}`} aria-expanded={open} onClick={() => toggle(r.hero.id)}>
                  <span className="tri">{open ? "▼" : "▶"}</span>
                  <Avatar hero={r.hero} style={{ width: 36, height: 36, fontSize: 12 }} />
                  <span className="hn">{r.hero.name}</span>
                  <span className="stn">
                    <b>{r.partners.size}</b>組<small>/{heroes.length}</small>
                    <span className="stk">
                      {r.total}件{r.total ? `（${breakdown(r.byType)}）` : ""}
                    </span>
                  </span>
                </button>
                {open && (
                  <div className="stbody">
                    {partners.length ? (
                      <ul className="stp">
                        {partners.map(([id, m]) => (
                          <li key={id}>
                            <span>{side === "attacker" ? `→ ${byId.get(id)!.name}` : `${byId.get(id)!.name} →`}</span>
                            <span>
                              {sum(m)}件<small>（{breakdown(m)}）</small>
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="stnone">まだありません</p>
                    )}
                    {!!missing.length && (
                      <p className="stmiss">
                        まだない相手（{missing.length}人）：{missing.map((h) => h.name).join("、")}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </AdminLayout>
  );
}
