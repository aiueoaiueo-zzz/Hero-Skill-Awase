import { useNavigate } from "react-router";
import type { Hero } from "../../shared/types";
import { Avatar } from "./Avatar";

export function HeroGrid({ heroes, to }: { heroes: Hero[]; to: (h: Hero) => string }) {
  const nav = useNavigate();
  return (
    <div className="grid">
      {heroes.map((h) => (
        <button key={h.id} className="card" onClick={() => nav(to(h))}>
          <Avatar hero={h} />
          <div className="nm">{h.name}</div>
        </button>
      ))}
    </div>
  );
}
