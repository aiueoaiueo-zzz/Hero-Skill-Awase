import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id?: string) => void;
    };
  }
}

let scriptPromise: Promise<void> | null = null;
const loadScript = () =>
  (scriptPromise ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error("turnstile_load_failed"));
    };
    document.head.appendChild(s);
  }));

export type TurnstileHandle = { reset: () => void };

/**
 * Cloudflare Turnstile。サイトキーが未設定（ローカル開発）のときは、試作版と同じ見た目の案内だけを出し、
 * ダミーのトークンを渡す（サーバー側も localhost に限って検証を省略する）。
 */
export const Turnstile = forwardRef<TurnstileHandle, { siteKey: string; onToken: (t: string | null) => void }>(function Turnstile(
  { siteKey, onToken },
  ref,
) {
  const el = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const cb = useRef(onToken);
  cb.current = onToken;

  useImperativeHandle(ref, () => ({
    reset: () => {
      cb.current(siteKey ? null : "dev");
      if (widget.current) window.turnstile?.reset(widget.current);
    },
  }));

  useEffect(() => {
    if (!siteKey) {
      cb.current("dev");
      return;
    }
    let alive = true;
    loadScript()
      .then(() => {
        if (!alive || !el.current || !window.turnstile) return;
        widget.current = window.turnstile.render(el.current, {
          sitekey: siteKey,
          language: "ja",
          callback: (t: string) => cb.current(t),
          "expired-callback": () => cb.current(null),
          "error-callback": () => cb.current(null),
        });
      })
      .catch(() => cb.current(null));
    return () => {
      alive = false;
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = null;
    };
  }, [siteKey]);

  if (!siteKey)
    return (
      <label className="ts">
        <input type="checkbox" checked readOnly />
        <span>
          ロボットではないことの確認
          <small>開発環境のため省略しています（本番では Cloudflare Turnstile が表示されます）</small>
        </span>
      </label>
    );
  return <div ref={el} style={{ marginTop: 18, minHeight: 65 }} />;
});
