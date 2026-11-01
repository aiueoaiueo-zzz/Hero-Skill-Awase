import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { LIMITS } from "../../shared/constants";
import type { EntryResponse, FixSource, Hero, UploadResponse } from "../../shared/types";
import { EntryCard } from "../components/EntryCard";
import { Header } from "../components/Header";
import { HeroPickButton, HeroPicker } from "../components/HeroPicker";
import { newPoint, PointsEditor, type PointDraft } from "../components/PointsEditor";
import { Turnstile, type TurnstileHandle } from "../components/Turnstile";
import { api, ApiError, useApi } from "../lib/api";
import { useData } from "../lib/data";
import { PROG, useBootFx } from "../lib/fx";
import { addMy, loadNick, loadSup, saveNickSup } from "../lib/storage";
import { toast } from "../lib/ui";
import { putWithProgress } from "../lib/video";

type Draft = {
  step: "edit" | "preview";
  attackerId: string;
  targetId: string;
  points: PointDraft[];
  nick: string;
  sup: string;
  fix: FixSource | null;
  /** 送信の途中経過（再試行で使う） */
  upload: { ticket: string; items: { videoKey: string; url: string; headers: Record<string, string>; done: boolean }[] } | null;
};

// 入力中の内容は、ほかの画面へ移動しても残す（同じ URL に戻ったら続きから）
let saved: { key: string; draft: Draft } | null = null;

const chars = (s: string) => Array.from(s.trim()).length;
const charLimit = (len: number, max: number) => len > max;

const ERRORS: Record<string, string> = {
  turnstile_failed: "ロボットではないことの確認に失敗しました。もう一度お試しください",
  video_not_accepting: "現在、動画の受付を停止しています",
  fix_target_not_found: "修正の対象が見つかりません（すでに変更された可能性があります）",
  upload_expired: "アップロードの有効期限が切れました。もう一度お試しください",
};

/** 4. 投稿フォーム */
export function Submit() {
  const [sp] = useSearchParams();
  const fixId = sp.get("fix");
  const key = sp.toString();
  const { heroes } = useData();
  const fixRes = useApi<FixSource>(fixId ? `/api/timings/${encodeURIComponent(fixId)}` : null);

  const [draft, setDraftState] = useState<Draft | null>(() => (saved?.key === key ? saved.draft : null));
  const setDraft = (d: Draft) => {
    saved = { key, draft: d };
    setDraftState(d);
  };

  // 初期値（URL の ?a= &t= ／ ?fix=）
  useEffect(() => {
    if (draft) return;
    const base = { step: "edit" as const, nick: loadNick(), sup: loadSup(), upload: null };
    if (fixId) {
      const f = fixRes.data;
      if (!f) return;
      setDraft({
        ...base,
        attackerId: f.attacker.id,
        targetId: f.target.id,
        fix: f,
        points: [{ attackType: f.attackType, cueType: f.cueType, timingText: f.timingText, note: f.note ?? "", existing: { key: f.videoKey, url: f.videoUrl } }],
      });
    } else {
      const a = heroes.find((h) => h.slug === sp.get("a"));
      const t = heroes.find((h) => h.slug === sp.get("t"));
      setDraft({ ...base, attackerId: a?.id ?? "", targetId: t?.id ?? "", fix: null, points: [newPoint()] });
    }
  }, [draft, fixId, fixRes.data, heroes, sp]);

  useBootFx(!!draft || !!fixRes.error);
  if (fixRes.error)
    return (
      <>
        <Header title="修正を提案" back="/" prog={PROG.step1} />
        <div className="empty">修正の対象が見つかりません（すでに変更された可能性があります）</div>
      </>
    );
  if (!draft) return <Header title={fixId ? "修正を提案" : "タイミングを投稿"} sub="ログイン不要・承認後に公開されます" prog={PROG.step1} />;
  return draft.step === "preview" ? (
    <Preview draft={draft} setDraft={setDraft} heroes={heroes} onDone={() => (saved = null)} />
  ) : (
    <Edit draft={draft} setDraft={setDraft} heroes={heroes} />
  );
}

function Edit({ draft, setDraft, heroes }: { draft: Draft; setDraft: (d: Draft) => void; heroes: Hero[] }) {
  const [picker, setPicker] = useState<"a" | "t" | null>(null);
  const status = useApi<{ accepting: boolean }>("/api/uploads/status");
  const accepting = status.data?.accepting ?? true;
  const A = heroes.find((h) => h.id === draft.attackerId);
  const T = heroes.find((h) => h.id === draft.targetId);
  const fix = draft.fix;
  const back = A && T ? `/h/${A.slug}/${T.slug}` : "/";

  const next = () => {
    if (!draft.attackerId || !draft.targetId) return toast("キャラを選んでください");
    const bad = draft.points.findIndex((p) => !p.timingText.trim());
    if (bad >= 0) return toast(`タイミング${bad + 1}を入力してください`);
    const long = draft.points.findIndex((p) => charLimit(chars(p.timingText), LIMITS.timingText) || charLimit(chars(p.note), LIMITS.note));
    if (long >= 0) return toast(`タイミング${long + 1}の文字数が多すぎます`);
    const nov = draft.points.findIndex((p) => !p.file && !p.existing);
    if (nov >= 0) return toast(accepting ? `タイミング${nov + 1}の動画を選択してください` : "現在、動画の受付を停止しています");
    if (chars(draft.nick) > LIMITS.nickname || chars(draft.sup) > LIMITS.supportCode) return toast("ニックネーム・応援コードは20文字以内です");
    setDraft({ ...draft, step: "preview" });
    window.scrollTo(0, 0);
  };

  return (
    <>
      <Header title={fix ? "修正を提案" : "タイミングを投稿"} sub="ログイン不要・承認後に公開されます" back={back} prog={PROG.step1} />
      <div className="f">
        {fix && (
          <div className="demo">
            公開中のタイミングの修正案として申請します。攻撃方法と合わせる目印は変更できません。合わせるタイミング・備考・動画を修正してください。
          </div>
        )}
        {!accepting && <div className="demo">現在、動画の受付を停止しています（保存容量の上限）。しばらくしてからお試しください。</div>}
        <label className="h">
          ① 攻撃する側（自分）のキャラ<em>必須</em>
        </label>
        <HeroPickButton hero={A} onClick={fix ? undefined : () => setPicker("a")} />
        <label className="h">
          ② HSを使う相手のキャラ（HS明けを狙う）<em>必須</em>
        </label>
        <HeroPickButton hero={T} onClick={fix ? undefined : () => setPicker("t")} />
        {!fix && (
          <div className="hint" style={{ margin: "14px 0 8px" }}>
            合わせどころが複数ある場合は「＋ タイミングを追加」で増やせます。動画（必須）と備考はタイミングごとに付けます。
          </div>
        )}
        {fix && <div style={{ height: 14 }} />}
        <PointsEditor
          points={draft.points}
          onChange={(points) => setDraft({ ...draft, points, upload: null })}
          opts={{ upload: true, locked: !!fix, accepting }}
        />
        <label className="h" htmlFor="f-nick">
          ニックネーム
        </label>
        <input
          type="text"
          id="f-nick"
          maxLength={LIMITS.nickname}
          value={draft.nick}
          placeholder="任意（未入力なら表示されません）"
          onChange={(e) => setDraft({ ...draft, nick: e.target.value })}
        />
        <label className="h" htmlFor="f-sup">
          応援コード
        </label>
        <input
          type="text"
          id="f-sup"
          maxLength={LIMITS.supportCode}
          value={draft.sup}
          placeholder="任意（例：A1B2C3D4）未入力なら表示されません"
          autoCapitalize="characters"
          autoComplete="off"
          onChange={(e) => setDraft({ ...draft, sup: e.target.value })}
        />
        <div className="btns">
          <button className="primary" onClick={next}>
            確認画面へ
          </button>
        </div>
      </div>
      {picker && (
        <HeroPicker
          heroes={heroes}
          title={picker === "a" ? "① 攻撃する側（自分）のキャラ" : "② HSを使う相手のキャラ"}
          onClose={() => setPicker(null)}
          onPick={(h) => {
            setDraft(picker === "a" ? { ...draft, attackerId: h.id } : { ...draft, targetId: h.id });
            setPicker(null);
          }}
        />
      )}
    </>
  );
}

function Preview({ draft, setDraft, heroes, onDone }: { draft: Draft; setDraft: (d: Draft) => void; heroes: Hero[]; onDone: () => void }) {
  const nav = useNavigate();
  const { turnstileSiteKey } = useData();
  const ts = useRef<TurnstileHandle>(null);
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ label: string; pct: number } | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const A = heroes.find((h) => h.id === draft.attackerId);
  const T = heroes.find((h) => h.id === draft.targetId);
  const points = draft.points.map((p) => ({
    attackType: p.attackType,
    cueType: p.cueType,
    timingText: p.timingText.trim(),
    note: p.note.trim() || null,
    videoUrl: p.fileUrl ?? p.existing?.url ?? null,
  }));

  const send = async () => {
    if (!token) return toast("ロボットではないことの確認をしてください");
    setBusy(true);
    setFailed(null);
    let upload = draft.upload;
    try {
      const files = draft.points.filter((p) => p.file);
      // 1. 動画のアップロード先を受け取る（Turnstile を検証）
      if (files.length && !upload) {
        setProgress({ label: "アップロードの準備中…", pct: 0 });
        const r = await api<UploadResponse>("/api/uploads", {
          method: "POST",
          body: JSON.stringify({ turnstileToken: token, files: files.map((p) => ({ size: p.file!.size, contentType: "video/mp4" })) }),
        });
        upload = { ticket: r.ticket, items: r.uploads.map((u) => ({ ...u, done: false })) };
        setDraft({ ...draft, upload });
      }
      // 2. 動画をアップロード（進捗を表示）
      if (upload) {
        const total = files.reduce((s, p) => s + p.file!.size, 0);
        let base = upload.items.reduce((s, u, i) => s + (u.done ? files[i].file!.size : 0), 0);
        for (let i = 0; i < upload.items.length; i++) {
          const u = upload.items[i];
          if (u.done) continue;
          const f = files[i].file!;
          await putWithProgress(u.url, f, u.headers, (loaded) =>
            setProgress({ label: "アップロード中…", pct: Math.round(((base + loaded) / total) * 100) }),
          );
          u.done = true;
          base += f.size;
          setDraft({ ...draft, upload: { ...upload } });
        }
      }
      // 3. エントリを登録
      setProgress((p) => p && { ...p, label: "登録中…", pct: 100 });
      let fi = 0;
      const res = await api<EntryResponse>("/api/entries", {
        method: "POST",
        body: JSON.stringify({
          attackerId: draft.attackerId,
          targetId: draft.targetId,
          nickname: draft.nick,
          supportCode: draft.sup,
          replacesTimingId: draft.fix?.id ?? null,
          timings: draft.points.map((p, i) => ({
            attackType: p.attackType,
            cueType: p.cueType,
            timingText: points[i].timingText,
            note: points[i].note,
            videoKey: p.file ? upload!.items[fi++].videoKey : p.existing!.key,
          })),
          ...(upload ? { uploadTicket: upload.ticket } : { turnstileToken: token }),
        }),
      });
      addMy({ code: res.code, deleteKey: res.deleteKey });
      saveNickSup(draft.nick.trim(), draft.sup.trim());
      draft.points.forEach((p) => p.fileUrl && URL.revokeObjectURL(p.fileUrl));
      onDone();
      nav(`/submit/done/${res.code}`, { replace: true });
    } catch (e) {
      const code = e instanceof ApiError ? e.message : "network";
      // Turnstile のトークンは 1 回しか使えないので取り直す。期限切れのアップロードはやり直す
      if (code === "turnstile_failed" || !upload) ts.current?.reset();
      if (["upload_expired", "invalid_video", "video_not_uploaded"].includes(code)) {
        setDraft({ ...draft, upload: null });
        ts.current?.reset();
      }
      setFailed(ERRORS[code] ?? "送信に失敗しました。通信状況を確認して、もう一度お試しください");
      setBusy(false);
    }
  };

  return (
    <>
      <Header title="内容の確認" sub="この内容で申請します" prog={PROG.step2} />
      {draft.fix && <div className="demo">公開中のタイミングの修正案として申請します。</div>}
      <EntryCard points={points} attacker={A} target={T} nickname={draft.nick.trim() || null} supportCode={draft.sup.trim() || null} />
      <div className="box">
        <p>申請後、管理者が確認して承認されると公開されます。不適切な投稿は削除されることがあります。</p>
      </div>
      <Turnstile ref={ts} siteKey={turnstileSiteKey} onToken={setToken} />
      {progress && (
        <div>
          <div className="lbl">
            {progress.label} {progress.pct}%
          </div>
          <div className="prog">
            <i style={{ width: progress.pct + "%" }} />
          </div>
        </div>
      )}
      {failed && <p style={{ color: "var(--danger)", fontSize: 13, margin: "12px 0 0" }}>{failed}</p>}
      <div className="btns">
        <button
          disabled={busy}
          onClick={() => {
            setDraft({ ...draft, step: "edit" });
            window.scrollTo(0, 0);
          }}
        >
          戻って修正
        </button>
        <button className="primary" disabled={busy || !token} onClick={send}>
          {failed ? "再試行" : "この内容で申請"}
        </button>
      </div>
    </>
  );
}
