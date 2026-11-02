import { useState } from "react";
import { Navigate, useParams } from "react-router";
import { normalizeForSearch } from "../../shared/text";
import type { TargetsResponse } from "../../shared/types";
import { Header } from "../components/Header";
import { HeroGrid } from "../components/HeroGrid";
import { useApi } from "../lib/api";
import { useData } from "../lib/data";
import { PROG, useBootFx } from "../lib/fx";

/** 2. HSを使う相手の選択 */
export function Targets() {
  const { a = "" } = useParams();
  const { heroes } = useData();
  const attacker = heroes.find((h) => h.slug === a);
  const { data, error } = useApi<TargetsResponse>(attacker ? `/api/heroes/${encodeURIComponent(a)}/targets` : null);
  const [q, setQ] = useState("");
  useBootFx(!!data);
  if (!attacker || error?.status === 404) return <Navigate to="/" replace />;

  const registered = new Set(data?.registeredTargetIds ?? []);
  const list = heroes.filter((h) => normalizeForSearch(h.name).includes(normalizeForSearch(q)));
  const w = list.filter((h) => registered.has(h.id));
  const wo = list.filter((h) => !registered.has(h.id));
  const to = (h: { slug: string }) => `/h/${attacker.slug}/${h.slug}`;
  return (
    <>
      <Header title={`${attacker.name} で攻撃`} sub="② HSを使う相手（HS明けを狙う）を選択" back="/" prog={PROG.step2} />
      <input className="search" placeholder="相手キャラを検索" value={q} onChange={(e) => setQ(e.target.value)} />
      {error && <div className="empty">読み込みに失敗しました</div>}
      {data && (
        <>
          {w.length > 0 && (
            <>
              <div className="sec">登録済み</div>
              <HeroGrid heroes={w} to={to} />
            </>
          )}
          {wo.length > 0 && (
            <>
              <div className="sec">未登録</div>
              <HeroGrid heroes={wo} to={to} />
            </>
          )}
          {!list.length && <div className="empty">該当するキャラがいません</div>}
        </>
      )}
    </>
  );
}
