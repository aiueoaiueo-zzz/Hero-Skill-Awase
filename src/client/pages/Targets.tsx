import { useState } from "react";
import { Navigate, useParams } from "react-router";
import { heroMatches } from "../../shared/text";
import { Header } from "../components/Header";
import { HeroGrid } from "../components/HeroGrid";
import { useData } from "../lib/data";
import { PROG, useBootFx } from "../lib/fx";

/** 2. HSを使う相手の選択 */
export function Targets() {
  const { a = "" } = useParams();
  const { heroes, registered: reg, bonus } = useData();
  const attacker = heroes.find((h) => h.slug === a);
  const [q, setQ] = useState("");
  useBootFx(true); // 登録済みの組み合わせは最初の読み込みで受け取っているので、待たずに表示できる
  if (!attacker) return <Navigate to="/" replace />;

  const registered = new Set(reg[attacker.id] ?? []);
  // 今週のボーナス組み合わせ（この攻撃する側のキャラとの組み合わせ）
  const marks = new Set(bonus[attacker.id] ?? []);
  const list = heroes.filter((h) => heroMatches(h, q));
  const w = list.filter((h) => registered.has(h.id));
  const wo = list.filter((h) => !registered.has(h.id));
  const to = (h: { slug: string }) => `/h/${attacker.slug}/${h.slug}`;
  const preload = (h: { slug: string }) => `/api/pairs/${encodeURIComponent(attacker.slug)}/${encodeURIComponent(h.slug)}`;
  return (
    <>
      <Header title={`${attacker.name} で攻撃`} sub="② HSを使う側（相手）を選択" back="/" prog={PROG.step2} />
      <input className="search" placeholder="相手キャラを検索" value={q} onChange={(e) => setQ(e.target.value)} />
      {w.length > 0 && (
        <>
          <div className="sec">登録済み</div>
          <HeroGrid heroes={w} to={to} preload={preload} marks={marks} />
        </>
      )}
      {wo.length > 0 && (
        <>
          <div className="sec">未登録</div>
          <HeroGrid heroes={wo} to={to} preload={preload} marks={marks} />
        </>
      )}
      {!list.length && <div className="empty">該当するキャラがいません</div>}
    </>
  );
}
