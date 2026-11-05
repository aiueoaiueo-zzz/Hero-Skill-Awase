import { useNavigate } from "react-router";
import { displayName } from "../../shared/text";
import type { Hero } from "../../shared/types";
import { prefetch } from "../lib/api";
import { Avatar } from "./Avatar";

/** キャラの一覧。preload：タップした瞬間に次の画面のデータを読み始める（画面の切り替えを速くする） */
export function HeroGrid({ heroes, to, preload, marks }: { heroes: Hero[]; to: (h: Hero) => string; preload?: (h: Hero) => string; marks?: Set<string> }) {
  const nav = useNavigate();
  return (
    <div className="grid">
      {heroes.map((h) => (
        <button
          key={h.id}
          className="card"
          onPointerDown={() => preload && prefetch(preload(h)).catch(() => {})}
          onClick={() => {
            if (preload) prefetch(preload(h)).catch(() => {});
            nav(to(h));
          }}
        >
          <Avatar hero={h} />
          <div className="nm">{displayName(h)}</div>
          {marks?.has(h.id) && <span className="bonusmark">★ボーナス</span>}
        </button>
      ))}
    </div>
  );
}
