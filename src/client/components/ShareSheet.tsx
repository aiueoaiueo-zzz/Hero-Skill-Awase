import { useEffect } from "react";
import { createPortal } from "react-dom";
import { lineShareUrl, xDmUrl, xShareUrl } from "../../shared/share";
import { closeShare, openExternal, useShareRequest } from "../lib/share";
import { copyText, toast } from "../lib/ui";

/** 共有メニュー（下から出るシート）。Layout に 1 つだけ置く */
export function ShareSheet() {
  const req = useShareRequest();
  useEffect(() => {
    if (!req) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeShare();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [req]);
  if (!req) return null;

  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const go = (fn: () => void) => () => {
    fn();
    closeShare();
  };
  type Item = { key: string; label: string; sub: string; run: () => void | Promise<void> };
  const items: Item[] = [
    { key: "x", label: "X に投稿", sub: "X の投稿画面を開きます", run: () => openExternal(xShareUrl(req.text, req.url)) },
    { key: "xdm", label: "X の DM で送る", sub: "送り先は X の画面で選びます", run: () => openExternal(xDmUrl(req.text, req.url)) },
    { key: "line", label: "LINE で送る", sub: "送り先は LINE の画面で選びます", run: () => openExternal(lineShareUrl(req.text, req.url)) },
    { key: "copy", label: "リンクをコピー", sub: req.url, run: () => copyText(req.url, "リンクをコピーしました", "コピーできませんでした") },
    ...(canNativeShare
      ? ([
          {
            key: "more",
            label: "その他のアプリ",
            sub: "メッセージ・メールなど",
            run: async () => {
              try {
                await navigator.share({ title: req.title, text: req.text, url: req.url });
              } catch (e) {
                if ((e as Error)?.name !== "AbortError") toast("共有できませんでした");
              }
            },
          },
        ] as Item[])
      : []),
  ];

  return createPortal(
    <div className="modal" onClick={(e) => e.target === e.currentTarget && closeShare()}>
      <div className="sheet" role="dialog" aria-label="共有">
        <h2>共有</h2>
        <div className="note" style={{ fontSize: 12, color: "var(--sub)", whiteSpace: "pre-wrap", marginBottom: 12, lineHeight: 1.5 }}>
          {req.text}
        </div>
        {items.map((it) => (
          <button key={it.key} className="row" onClick={go(it.run)}>
            <div className="t">
              <b>{it.label}</b>
              <span>{it.sub}</span>
            </div>
            ›
          </button>
        ))}
        <div className="btns">
          <button onClick={closeShare}>閉じる</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
