import { useNavigate } from "react-router";
import { useData } from "../lib/data";
import { displayName } from "../../shared/text";
import type { Hero } from "../../shared/types";
import { prefetch } from "../lib/api";
import { Avatar } from "./Avatar";

/** キャラの一覧。preload：タップした瞬間に次の画面のデータを読み始める（画面の切り替えを速くする） */
/** ng：合わせ不可能な相手（カードに「HS合わせ不可」を付ける）。partial：一部の場面だけ合わせ不可（「HS一部不可」）。badge：並び順の値（★ や秒数）をカードに出す */
export function HeroGrid({ heroes, to, preload, ng, partial, badge }: { heroes: Hero[]; to: (h: Hero) => string; preload?: (h: Hero) => string; ng?: Set<string>; partial?: Set<string>; badge?: (h: Hero) => string }) {
  const nav = useNavigate();
  // 今週のキャラ（docs/DECISIONS.md AL）
  const { featured } = useData();
  const feat = new Set(featured.map((f) => f.heroId));
  return (
    <div className="grid">
      {heroes.map((h) => (
        <button
          key={h.id}
          className={`card ${ng?.has(h.id) ? "ng" : ""} ${feat.has(h.id) ? "feat" : ""}`}
          onPointerDown={() => preload && prefetch(preload(h)).catch(() => {})}
          onClick={() => {
            if (preload) prefetch(preload(h)).catch(() => {});
            nav(to(h));
          }}
        >
          <Avatar hero={h} />
          <div className="nm">{displayName(h)}</div>
          {badge && <Badge text={badge(h)} />}
          {ng?.has(h.id) && <span className="ngmark">HS合わせ不可</span>}
          {feat.has(h.id) && <span className="featmark">今週</span>}
          {!ng?.has(h.id) && partial?.has(h.id) && <span className="ngmark part">HS一部不可</span>}
        </button>
      ))}
    </div>
  );
}

/** 並び順の値。秒数は数字を大きく、「秒」を小さく出す（docs/DECISIONS.md AQ） */
function Badge({ text }: { text: string }) {
  return (
    <div className={`stars ${text.length > 6 ? "long" : ""}`}>
      {text.split(/(秒)/).map((t, i) => (t === "秒" ? <small key={i}>秒</small> : t))}
    </div>
  );
}
