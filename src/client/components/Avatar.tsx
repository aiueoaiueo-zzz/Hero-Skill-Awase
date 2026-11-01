import type { CSSProperties } from "react";
import type { Hero } from "../../shared/types";

const COLORS = ["#1d1d1d", "#242424", "#2b2b2b", "#1a1a1a", "#303030"];
const colorFor = (id: string) => {
  let n = 0;
  for (const c of id) n = (n * 31 + c.charCodeAt(0)) >>> 0;
  return COLORS[n % COLORS.length];
};
const initial = (name: string) => Array.from(name.replace(/^[0-9†]+/, ""))[0] || "?";

/** キャラ画像。画像がなければ頭文字で代替表示（背景色は ID から決める） */
export function Avatar({ hero, style }: { hero?: Hero | null; style?: CSSProperties }) {
  if (!hero) return <div className="av" style={style}>?</div>;
  if (hero.imageUrl) return <img className="av" src={hero.imageUrl} alt="" loading="lazy" style={style} />;
  return (
    <div className="av" style={{ background: colorFor(hero.id), ...style }}>
      {initial(hero.name)}
    </div>
  );
}
