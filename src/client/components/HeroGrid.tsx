import { starsOf, type PickKind } from "./HeroFilter";
import { useNavigate } from "react-router";
import { displayName } from "../../shared/text";
import type { Hero } from "../../shared/types";
import { prefetch } from "../lib/api";
import { Avatar } from "./Avatar";

/** キャラの一覧。preload：タップした瞬間に次の画面のデータを読み始める（画面の切り替えを速くする） */
/** ng：合わせ不可能な相手（カードに「HS合わせ不可」を付ける）。partial：一部の場面だけ合わせ不可（「HS一部不可」）。stars：重要度の ★ を出す（attack：HS合わせ／target：HS被合わせ） */
export function HeroGrid({ heroes, to, preload, ng, partial, stars }: { heroes: Hero[]; to: (h: Hero) => string; preload?: (h: Hero) => string; ng?: Set<string>; partial?: Set<string>; stars?: PickKind }) {
  const nav = useNavigate();
  return (
    <div className="grid">
      {heroes.map((h) => (
        <button
          key={h.id}
          className={`card ${ng?.has(h.id) ? "ng" : ""}`}
          onPointerDown={() => preload && prefetch(preload(h)).catch(() => {})}
          onClick={() => {
            if (preload) prefetch(preload(h)).catch(() => {});
            nav(to(h));
          }}
        >
          <Avatar hero={h} />
          <div className="nm">{displayName(h)}</div>
          {stars && <div className="stars">{starsOf(h, stars)}</div>}
          {ng?.has(h.id) && <span className="ngmark">HS合わせ不可</span>}
          {!ng?.has(h.id) && partial?.has(h.id) && <span className="ngmark part">HS一部不可</span>}
        </button>
      ))}
    </div>
  );
}
