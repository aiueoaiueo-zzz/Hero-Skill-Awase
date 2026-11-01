import { useRef } from "react";
import { ATTACK_TYPES, CUE_TYPES, LIMITS, PLACEHOLDER, type AttackType, type CueType } from "../../shared/constants";
import { inspectVideo } from "../lib/video";
import { fmtSize, toast } from "../lib/ui";

export type PointDraft = {
  attackType: AttackType;
  cueType: CueType;
  timingText: string;
  note: string;
  /** 新しく選んだ動画 */
  file?: File | null;
  fileUrl?: string | null;
  duration?: number;
  /** 公開中・登録済みの動画をそのまま使う場合 */
  existing?: { key: string; url: string } | null;
};

export const newPoint = (prev?: PointDraft): PointDraft => ({
  attackType: prev?.attackType ?? "hs",
  cueType: prev?.cueType ?? "voice",
  timingText: "",
  note: "",
  file: null,
  fileUrl: null,
  existing: null,
});

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
export function PointsEditor({ points, onChange, opts }: { points: PointDraft[]; onChange: (p: PointDraft[]) => void; opts: Opts }) {
  const boxes = useRef<HTMLDivElement>(null);
  const accepting = opts.accepting ?? true;
  const update = (i: number, patch: Partial<PointDraft>) => onChange(points.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const clearFile = (p: PointDraft) => {
    if (p.fileUrl) URL.revokeObjectURL(p.fileUrl);
  };

  const pick = async (i: number, file: File | undefined) => {
    if (!file) return;
    const r = await inspectVideo(file);
    if (typeof r === "string") return toast(r);
    // ステップ 5 でブラウザ内の自動変換（MP4 / 15MB 以下）を入れる。それまでは MP4・15MB 以下だけ受け付ける
    if (r.file.type !== "video/mp4" || r.file.size > LIMITS.videoBytes) {
      URL.revokeObjectURL(r.url);
      return toast("現在は MP4・15MB 以下のみ対応しています（自動変換は準備中）");
    }
    clearFile(points[i]);
    update(i, { file: r.file, fileUrl: r.url, duration: r.duration, existing: null });
  };

  const add = () => {
    if (points.length >= LIMITS.timingsPerSubmission) return toast(`タイミングは${LIMITS.timingsPerSubmission}個までです`);
    onChange([...points, newPoint(points[points.length - 1])]);
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
        const inputId = `pe-${i}`;
        return (
          <div className="ptbox" key={i}>
            <div className="pthead">
              <b>タイミング {i + 1}</b>
              {canDelete && (
                <button
                  type="button"
                  className="sbtn danger"
                  onClick={() => {
                    clearFile(p);
                    onChange(points.filter((_, j) => j !== i));
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
                <button key={k} type="button" className={k === p.attackType ? "on" : ""} disabled={opts.locked} onClick={() => update(i, { attackType: k })}>
                  {l}
                </button>
              ))}
            </div>
            <label className="h">
              合わせる目印<em>必須</em>
            </label>
            <div className="types">
              {CUE_TYPES.map(([k, l]) => (
                <button key={k} type="button" className={k === p.cueType ? "on" : ""} disabled={opts.locked} onClick={() => update(i, { cueType: k })}>
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
              onChange={(e) => update(i, { timingText: e.target.value })}
            />
            <label className="h">備考</label>
            <textarea
              maxLength={LIMITS.note}
              style={{ minHeight: 64 }}
              placeholder="ラグ・カード構成・注意点など（任意）"
              value={p.note}
              onChange={(e) => update(i, { note: e.target.value })}
            />
            <label className="h">
              動画{opts.upload && <em>必須</em>}
            </label>
            {p.fileUrl ? (
              <video className="vprev" src={p.fileUrl} controls playsInline preload="metadata" />
            ) : p.existing ? (
              <video className="vprev" src={p.existing.url} controls playsInline preload="metadata" />
            ) : null}
            {opts.upload ? (
              accepting || has ? (
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
                    accept="video/mp4,video/quicktime,video/webm"
                    hidden
                    onChange={(e) => {
                      pick(i, e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                  <div className="hint">MP4・MOV・WebM／30秒以内（投稿時に自動で軽くします）</div>
                </>
              ) : (
                <div className="hint">現在、動画の受付を停止しているため投稿できません（保存容量の上限）。</div>
              )
            ) : (
              !has && <div className="hint">なし</div>
            )}
            {has && opts.upload && (
              <div className="acts">
                <button
                  type="button"
                  className="sbtn danger"
                  onClick={() => {
                    clearFile(p);
                    update(i, { file: null, fileUrl: null, existing: null });
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
