import { useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router";

// 画面に入ったときの起動演出（試作版 bootFx を移植）。
// 同じ画面内の再描画（検索入力など）では再生しない：location.key ごとに 1 回だけ。
const BOOT_SELECTOR =
  "header,.vs,.atabs button,.tabs button,.search,.grid .card,.sec,.entry,.ptbox,.f>.pick,.box,.links button,.empty";

export function useBootFx(ready: boolean) {
  const loc = useLocation();
  const st = useRef<{ key: string | null; full: boolean }>({ key: null, full: false });
  useLayoutEffect(() => {
    const s = st.current;
    const first = s.key !== loc.key;
    // 画面に入ったとき：その時点で出ているもの（ヘッダーなど）を再生する。
    // データが届いたとき：まだ再生していない部分だけを再生する（ヘッダーをもう一度再生してちらつかせない）
    if (!first && (s.full || !ready)) return;
    s.key = loc.key;
    s.full = ready;
    const root = document.getElementById("root");
    if (!root) return;
    let i = 0;
    root.querySelectorAll<HTMLElement>(BOOT_SELECTOR).forEach((el) => {
      if (!first && el.dataset.boot === loc.key) return;
      el.dataset.boot = loc.key;
      el.classList.remove("boot");
      void el.offsetWidth;
      el.style.animationDelay = Math.min(i++ * 28, 560) + "ms";
      el.classList.add("boot");
    });
  }, [ready, loc.key]);
}

// ヘッダー下の進み具合の線（前の長さから伸び縮みさせる）
let lastProg = 15;
export const PROG = { step1: 33.4, step2: 66.7, step3: 100, other: 15 } as const;

export function useProgress(ref: React.RefObject<HTMLElement | null>, prog: number) {
  useLayoutEffect(() => {
    const hd = ref.current;
    if (!hd) return;
    hd.style.setProperty("--prog", lastProg + "%");
    void hd.offsetWidth;
    const id = requestAnimationFrame(() => hd.style.setProperty("--prog", prog + "%"));
    lastProg = prog;
    return () => cancelAnimationFrame(id);
  }, [ref, prog]);
}
