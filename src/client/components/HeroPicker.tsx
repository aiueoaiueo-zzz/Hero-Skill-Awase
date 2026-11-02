import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { normalizeForSearch } from "../../shared/text";
import type { Hero } from "../../shared/types";
import { Avatar } from "./Avatar";

/** 画像付きのキャラ選択（下から出るシート） */
export function HeroPicker({ heroes, title, onPick, onClose }: { heroes: Hero[]; title: string; onPick: (h: Hero) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const list = heroes.filter((h) => normalizeForSearch(h.name).includes(normalizeForSearch(q)));
  return createPortal(
    <div className="modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-label={title}>
        <h2>{title}</h2>
        <input className="search" placeholder="キャラ名で検索" value={q} onChange={(e) => setQ(e.target.value)} />
        <div>
          {list.length ? (
            list.map((h) => (
              <button key={h.id} className="row" onClick={() => onPick(h)}>
                <Avatar hero={h} />
                <div className="t">
                  <b>{h.name}</b>
                </div>
              </button>
            ))
          ) : (
            <div className="empty">該当なし</div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** フォームのキャラ選択ボタン */
export function HeroPickButton({ hero, onClick }: { hero: Hero | null | undefined; onClick?: () => void }) {
  return (
    <button type="button" className="pick" onClick={onClick} disabled={!onClick}>
      {hero ? <Avatar hero={hero} /> : <div className="av">?</div>}
      <span>{hero ? hero.name : "タップして選択"}</span>
      {onClick ? "▾" : ""}
    </button>
  );
}
