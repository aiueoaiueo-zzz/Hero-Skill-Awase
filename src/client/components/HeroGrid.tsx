import { useNavigate } from "react-router";
import type { Hero } from "../../shared/types";
import { prefetch } from "../lib/api";
import { Avatar } from "./Avatar";

/** キャラの一覧。preload：タップした瞬間に次の画面のデータを読み始める（画面の切り替えを速くする） */
export function HeroGrid({ heroes, to, preload }: { heroes: Hero[]; to: (h: Hero) => string; preload?: (h: Hero) => string }) {
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
          <div className="nm">{h.name}</div>
        </button>
      ))}
    </div>
  );
}
