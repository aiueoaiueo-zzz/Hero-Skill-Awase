// 画面の自動ロックを防ぐ（動画の変換・アップロード中だけ）。
// iPhone では画面が消える／ほかのアプリに切り替えるとページの処理が止まるため。
// 対応していないブラウザでは何もしない。

type Sentinel = { release: () => Promise<void>; released?: boolean };
type WakeLockNav = Navigator & { wakeLock?: { request: (type: "screen") => Promise<Sentinel> } };

let holders = 0;
let sentinel: Sentinel | null = null;

async function acquire() {
  const nav = navigator as WakeLockNav;
  if (!nav.wakeLock || sentinel || document.visibilityState !== "visible") return;
  try {
    sentinel = await nav.wakeLock.request("screen");
  } catch {
    sentinel = null; // 省電力モードなどで拒否されることがある
  }
}

// 画面に戻ったら取り直す（裏に回ると自動で解除されるため）
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && holders > 0) {
      sentinel = null;
      acquire();
    }
  });
}

/** 画面の自動ロックを防ぐ。戻り値の関数で解除する（複数の処理で重ねて使える） */
export function keepScreenOn(): () => void {
  holders++;
  acquire();
  let done = false;
  return () => {
    if (done) return;
    done = true;
    holders = Math.max(0, holders - 1);
    if (holders === 0 && sentinel) {
      const s = sentinel;
      sentinel = null;
      s.release().catch(() => {});
    }
  };
}

/** ページが表示されるまで待つ */
export const waitUntilVisible = () =>
  document.visibilityState === "visible"
    ? Promise.resolve()
    : new Promise<void>((resolve) => {
        const on = () => {
          if (document.visibilityState === "visible") {
            document.removeEventListener("visibilitychange", on);
            resolve();
          }
        };
        document.addEventListener("visibilitychange", on);
      });

/** 処理の途中でページが裏に回ったかを見張る */
export function watchHidden() {
  let hidden = document.visibilityState !== "visible";
  const on = () => {
    if (document.visibilityState !== "visible") hidden = true;
  };
  document.addEventListener("visibilitychange", on);
  return { wasHidden: () => hidden, stop: () => document.removeEventListener("visibilitychange", on) };
}
