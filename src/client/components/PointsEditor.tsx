import { useRef } from "react";
import { ATTACK_TYPES, CUE_TYPES, LIMITS, PLACEHOLDER, type AttackType, type CueType } from "../../shared/constants";
import { compressVideo, CompressError, enqueue } from "../lib/compress";
import { fmtSize, toast } from "../lib/ui";
import { inspectVideo } from "../lib/video";

export type PointDraft = {
  /** ブロックの識別子（変換が終わったとき、正しいブロックに結果を入れるため） */
  id: string;
  attackType: AttackType;
  cueType: CueType;
  timingText: string;
  note: string;
  /** ブラウザで軽くした後の動画（MP4） */
  file?: File | null;
  fileUrl?: string | null;
  duration?: number;
  /** 変換中の進捗（0〜1）。変換中でなければ null */
  converting?: number | null;
  /** 公開中・登録済みの動画をそのまま使う場合 */
  existing?: { key: string; url: string } | null;
};

let seq = 0;
export const pointId = () => `p${Date.now().toString(36)}${(seq++).toString(36)}`;

export const newPoint = (prev?: PointDraft): PointDraft => ({
  id: pointId(),
  attackType: prev?.attackType ?? "hs",
  cueType: prev?.cueType ?? "voice",
  timingText: "",
  note: "",
  file: null,
  fileUrl: null,
  converting: null,
  existing: null,
});

export type PointsUpdater = (fn: (prev: PointDraft[]) => PointDraft[]) => void;

type Opts = {
  /** 動画の選択欄を出す（投稿フォーム） */
  upload: boolean;
  /** 修正提案：攻撃方法と目印を変更できない／追加・削除なし */
  locked?: boolean;
  /** 1 つだけ編集（編集して承認）：追加・削除なし */
  single?: boolean;
  /** 動画の受付中か（容量上限） */
  accepting?: boolean;
};

/** 合わせるタイミングの入力ブロック（試作版 pointsEditor を移植） */
export function PointsEditor({ points, update, opts }: { points: PointDraft[]; update: PointsUpdater; opts: Opts }) {
  const boxes = useRef<HTMLDivElement>(null);
  const accepting = opts.accepting ?? true;
  const patch = (id: string, p: Partial<PointDraft> | ((cur: PointDraft) => Partial<PointDraft>)) =>
    update((prev) => prev.map((x) => (x.id === id ? { ...x, ...(typeof p === "function" ? p(x) : p) } : x)));
  const revoke = (p: PointDraft) => p.fileUrl && URL.revokeObjectURL(p.fileUrl);

  /** 動画を選んだ直後に確認し、ブラウザ内で軽くする */
  const pick = async (id: string, file: File | undefined) => {
    if (!file) return;
    const r = await inspectVideo(file);
    if (typeof r === "string") return toast(r);
    patch(id, { converting: 0 });
    try {
      const out = await enqueue(() => compressVideo(file, r.duration, (ratio) => patch(id, (cur) => (cur.converting == null ? {} : { converting: ratio }))));
      const url = URL.createObjectURL(out.file);
      patch(id, (cur) => {
        revoke(cur);
        return { file: out.file, fileUrl: url, duration: r.duration, converting: null, existing: null };
      });
    } catch (e) {
      patch(id, { converting: null });
      toast(e instanceof CompressError ? e.message : "変換できませんでした。別の動画を選んでください");
    }
  };

  const add = () => {
    if (points.length >= LIMITS.timingsPerSubmission) return toast(`タイミングは${LIMITS.timingsPerSubmission}個までです`);
    update((prev) => [...prev, newPoint(prev[prev.length - 1])]);
    requestAnimationFrame(() => {
      const all = boxes.current?.querySelectorAll<HTMLElement>(".ptbox");
      const nb = all?.[all.length - 1];
      nb?.scrollIntoView({ behavior: "smooth", block: "center" });
      nb?.querySelector<HTMLInputElement>("[data-k=timing]")?.focus({ preventScroll: true });
    });
  };

  const canDelete = points.length > 1 && !opts.locked && !opts.single;
  return (
    <div ref={boxes}>
      {points.map((p, i) => {
        const has = !!(p.file || p.existing);
        const busy = p.converting != null;
        const inputId = `pe-${p.id}`;
        return (
          <div className="ptbox" key={p.id}>
            <div className="pthead">
              <b>タイミング {i + 1}</b>
              {canDelete && (
                <button
                  type="button"
                  className="sbtn danger"
                  onClick={() => {
                    revoke(p);
                    update((prev) => prev.filter((x) => x.id !== p.id));
                  }}
                >
                  削除
                </button>
              )}
            </div>
            <label className="h" style={{ marginTop: 0 }}>
              攻撃方法<em>必須</em>
            </label>
            <div className="types atk">
              {ATTACK_TYPES.map(([k, l]) => (
                <button key={k} type="button" className={k === p.attackType ? "on" : ""} disabled={opts.locked} onClick={() => patch(p.id, { attackType: k })}>
                  {l}
                </button>
              ))}
            </div>
            <label className="h">
              合わせる目印<em>必須</em>
            </label>
            <div className="types">
              {CUE_TYPES.map(([k, l]) => (
                <button key={k} type="button" className={k === p.cueType ? "on" : ""} disabled={opts.locked} onClick={() => patch(p.id, { cueType: k })}>
                  {l}
                </button>
              ))}
            </div>
            <label className="h">
              合わせるタイミング<em>必須</em>
            </label>
            <input
              type="text"
              data-k="timing"
              maxLength={LIMITS.timingText}
              value={p.timingText}
              placeholder={PLACEHOLDER[p.cueType]}
              onChange={(e) => patch(p.id, { timingText: e.target.value })}
            />
            <label className="h">備考</label>
            <textarea
              maxLength={LIMITS.note}
              style={{ minHeight: 64 }}
              placeholder="ラグ・カード構成・注意点など（任意）"
              value={p.note}
              onChange={(e) => patch(p.id, { note: e.target.value })}
            />
            <label className="h">
              動画{opts.upload && <em>必須</em>}
            </label>
            {/* 変換後のファイルでプレビュー（投稿される見た目のまま） */}
            {p.fileUrl ? (
              <video className="vprev" src={p.fileUrl} controls playsInline preload="metadata" />
            ) : p.existing ? (
              <video className="vprev" src={p.existing.url} controls playsInline preload="metadata" />
            ) : null}
            {busy && (
              <div style={{ marginTop: has ? 8 : 0 }}>
                <div className="lbl" style={{ marginTop: 0 }}>
                  動画を軽くしています… {Math.round((p.converting ?? 0) * 100)}%
                </div>
                <div className="prog">
                  <i style={{ width: `${Math.round((p.converting ?? 0) * 100)}%` }} />
                </div>
              </div>
            )}
            {opts.upload ? (
              accepting || has ? (
                !busy && (
                  <>
                    <label className="drop" htmlFor={inputId} style={has ? { marginTop: 8 } : undefined}>
                      {p.file ? (
                        <>
                          {p.file.name}（{fmtSize(p.file.size)}・{(p.duration ?? 0).toFixed(1)}秒）
                          <br />
                          <u>タップして変更</u>
                        </>
                      ) : has ? (
                        <u>タップして動画を変更</u>
                      ) : (
                        "タップして動画を選択"
                      )}
                    </label>
                    <input
                      type="file"
                      id={inputId}
                      accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
                      hidden
                      onChange={(e) => {
                        pick(p.id, e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                    <div className="hint">MP4・MOV・WebM／30秒以内（投稿時に自動で軽くします）</div>
                  </>
                )
              ) : (
                <div className="hint">現在、動画の受付を停止しているため投稿できません（保存容量の上限）。</div>
              )
            ) : (
              !has && <div className="hint">なし</div>
            )}
            {has && opts.upload && !busy && (
              <div className="acts">
                <button
                  type="button"
                  className="sbtn danger"
                  onClick={() => {
                    revoke(p);
                    patch(p.id, { file: null, fileUrl: null, existing: null });
                  }}
                >
                  動画を外す
                </button>
              </div>
            )}
          </div>
        );
      })}
      {!opts.locked && !opts.single && (
        <button type="button" className="addpt" onClick={add}>
          ＋ タイミングを追加
        </button>
      )}
    </div>
  );
}
