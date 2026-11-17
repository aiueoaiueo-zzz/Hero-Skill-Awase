import { useEffect } from "react";

/**
 * キャラのアイコンの壁（画面の後ろで、斜めにゆっくり流れる）。読み込み中の画面と、投稿の申請が終わった画面で使う（docs/DECISIONS.md AX）。
 * 薄く出すだけで、タップできない。動きを減らす設定の端末では止める
 */
export function HeroWall({ urls }: { urls: string[] }) {
  const list = urls.filter(Boolean);
  if (list.length < 6) return null;
  // 22 列 × 16 段を 2 回並べて、つなぎ目なく流す
  const tiles = Array.from({ length: 352 }, (_, i) => list[(i * 37) % list.length]);
  return (
    <div className="herowall" aria-hidden="true">
      <div className="hw-in">
        {[0, 1].map((k) => (
          <div className="hw-grid" key={k}>
            {tiles.map((u, i) => (
              <img key={i} src={u} alt="" loading="eager" decoding="async" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

const KEY = "hw-urls";
/** 次に開いたときの読み込み中の画面のために、アイコンの URL を覚えておく */
export function useRememberWall(urls: string[]) {
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(urls.filter(Boolean).slice(0, 104)));
    } catch {
      // 保存できなくても困らない
    }
  }, [urls.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps
}
/** 覚えておいたアイコンの URL（初めて開いたときは空） */
export function rememberedWall(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}
