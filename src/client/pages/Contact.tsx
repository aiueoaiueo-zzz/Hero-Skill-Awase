import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { CONTACT_KINDS, CONTACT_LIMITS, type ContactKind } from "../../shared/constants";
import { Header } from "../components/Header";
import { Turnstile, type TurnstileHandle } from "../components/Turnstile";
import { api, ApiError } from "../lib/api";
import { useData } from "../lib/data";
import { PROG, useBootFx } from "../lib/fx";
import { toast } from "../lib/ui";

const chars = (s: string) => Array.from(s).length;

const ERRORS: Record<string, string> = {
  turnstile_failed: "ロボットではないことの確認に失敗しました。もう一度お試しください",
  invalid_request: "入力内容を確認してください（文字数など）",
  contact_busy: "現在、お問い合わせを受け付けられません。しばらくしてからお試しください",
};

/** お問い合わせ（ログイン不要。送った内容は管理者だけが見られる） */
export function Contact() {
  const nav = useNavigate();
  const { turnstileSiteKey } = useData();
  useBootFx(true);
  const ts = useRef<TurnstileHandle>(null);
  const [token, setToken] = useState<string | null>(null);
  const [kind, setKind] = useState<ContactKind | "">("");
  const [ref, setRef] = useState("");
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const send = async () => {
    if (!kind) return toast("お問い合わせの種類を選んでください");
    if (chars(body.trim()) < CONTACT_LIMITS.bodyMin) return toast(`内容は${CONTACT_LIMITS.bodyMin}文字以上で入力してください`);
    if (chars(body) > CONTACT_LIMITS.body) return toast(`内容は${CONTACT_LIMITS.body}文字以内です`);
    if (!token) return toast("ロボットではないことの確認をしてください");
    setBusy(true);
    setFailed(null);
    try {
      await api("/api/contact", { method: "POST", body: JSON.stringify({ kind, ref, body, replyTo, turnstileToken: token }) });
      setSent(true);
      window.scrollTo(0, 0);
    } catch (e) {
      const code = e instanceof ApiError ? e.message : "network";
      ts.current?.reset();
      setFailed(ERRORS[code] ?? "送信に失敗しました。通信状況を確認して、もう一度お試しください");
    } finally {
      setBusy(false);
    }
  };

  if (sent)
    return (
      <>
        <Header title="お問い合わせ" back="/" prog={PROG.step3} />
        <div className="box" style={{ textAlign: "center" }}>
          <p style={{ color: "var(--text)", fontWeight: 700 }}>送信しました</p>
          <p>
            内容を確認のうえ、対応します。
            <br />
            返信をお約束するものではありませんので、ご了承ください。
          </p>
        </div>
        <div className="links">
          <button onClick={() => nav("/")}>トップへ</button>
        </div>
      </>
    );

  return (
    <>
      <Header title="お問い合わせ" sub="ご要望もこちらから" back="/" prog={PROG.other} />
      <div className="f">
        <div className="box">
          <p>
            ご自身の投稿の取り下げは、<Link to="/status">審査状況</Link>のページから受付番号で行えます。
            <br />
            「こんな機能がほしい」などのご要望も、こちらからお送りください。
            <br />
            送った内容は管理者だけが見られます。本アプリは非公式のファンメイドツールです。ゲームについてのお問い合わせは、公式にお願いします。
          </p>
        </div>
        <label className="h" htmlFor="c-kind">
          お問い合わせの種類<em>必須</em>
        </label>
        <select id="c-kind" value={kind} onChange={(e) => setKind(e.target.value as ContactKind)}>
          <option value="">選んでください</option>
          {CONTACT_KINDS.map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
        <label className="h" htmlFor="c-ref">
          受付番号・ページの URL
        </label>
        <input
          type="text"
          id="c-ref"
          maxLength={CONTACT_LIMITS.ref}
          value={ref}
          placeholder="任意（対象の投稿がある場合。例：HS-ABC123）"
          onChange={(e) => setRef(e.target.value)}
        />
        <label className="h" htmlFor="c-body">
          内容<em>必須</em>
        </label>
        <div className="hint" style={{ marginTop: 0, marginBottom: 6 }}>
          {CONTACT_LIMITS.bodyMin}文字以上で入力してください。
        </div>
        <textarea id="c-body" style={{ minHeight: 160 }} value={body} onChange={(e) => setBody(e.target.value)} />
        <div className="hint">
          {chars(body.trim())} / {CONTACT_LIMITS.body}文字（{CONTACT_LIMITS.bodyMin}文字以上）
        </div>
        <label className="h" htmlFor="c-reply">
          返信先
        </label>
        <input
          type="text"
          id="c-reply"
          maxLength={CONTACT_LIMITS.replyTo}
          value={replyTo}
          placeholder="任意（X の ID やメールアドレスなど）"
          onChange={(e) => setReplyTo(e.target.value)}
        />
        <div className="hint">返信が必要な場合だけ入力してください。返信をお約束するものではありません。</div>
        <div style={{ height: 14 }} />
        <Turnstile ref={ts} siteKey={turnstileSiteKey} onToken={setToken} />
        {failed && <p style={{ color: "var(--danger)", fontSize: 13, margin: "12px 0 0" }}>{failed}</p>}
        <div className="btns">
          <button className="primary" disabled={busy || !token} onClick={send}>
            {busy ? "送信中…" : "送信する"}
          </button>
        </div>
        <div className="hint" style={{ marginTop: 10 }}>
          送信した内容の扱いは<Link to="/terms">注意事項・プライバシー</Link>をご覧ください。
        </div>
      </div>
    </>
  );
}
