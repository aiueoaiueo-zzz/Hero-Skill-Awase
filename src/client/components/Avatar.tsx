import type { CSSProperties } from "react";
import type { Hero } from "../../shared/types";

/** 文字の幅の目安（英数字は全角の約 0.6 文字分） */
const textWidth = (s: string) => Array.from(s).reduce((w, c) => w + (/[\x20-\x7e]/.test(c) ? 0.6 : 1), 0);

/**
 * キャラの表示。画像は使わず、グレーの背景に白い文字でキャラ名を全部出す（権利への配慮）。
 * 名前が長いときは 2 行に折り返し、枠に収まる大きさに文字を縮める。
 * showImage：管理画面のキャラ管理だけ、登録済みの画像を確認・削除できるように画像を出す。
 */
export function Avatar({ hero, style, showImage }: { hero?: Hero | null; style?: CSSProperties; showImage?: boolean }) {
  if (!hero) return <div className="av" style={style}>?</div>;
  if (showImage && hero.imageUrl) return <img className="av" src={hero.imageUrl} alt="" loading="lazy" style={style} />;
  const w = textWidth(hero.name);
  const perLine = w <= 4.2 ? Math.max(w, 2) : Math.ceil(w / 2);
  return (
    <div className="av namecard" style={{ ...style, ["--n" as string]: perLine }} aria-hidden="true">
      <span>{hero.name}</span>
    </div>
  );
}
