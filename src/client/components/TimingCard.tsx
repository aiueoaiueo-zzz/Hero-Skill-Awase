import type { ReactNode } from "react";
import { CUE_LABEL, type CueType } from "../../shared/constants";
import { formatCue } from "../../shared/text";
import { fmtDate } from "../lib/ui";
import { SupportCodeButton } from "./SupportCode";

export type TimingCardData = {
  cueType: CueType;
  timingText: string;
  note: string | null;
  videoUrl: string | null;
  nickname: string | null;
  supportCode: string | null;
  reviewedAt: string | null;
};

export function Who({ nickname, supportCode }: { nickname: string | null; supportCode: string | null }) {
  if (!nickname && !supportCode) return null;
  return (
    <div className="foot who">
      {nickname && (
        <span>
          投稿者：<span className="nick">{nickname}</span>
        </span>
      )}
      {supportCode && <SupportCodeButton code={supportCode} />}
    </div>
  );
}

/** 詳細画面のタイミングカード（試作版 pointCard を移植） */
export function TimingCard({ t, num, actions, id, flash }: { t: TimingCardData; num: number; actions?: ReactNode; id?: string; flash?: boolean }) {
  return (
    <div className={`entry ${flash ? "flash" : ""}`} id={id}>
      <span className="pnum">{num}</span>
      <span className="chip">目印：{CUE_LABEL[t.cueType] || "その他"}</span>
      <div className="tim" style={{ marginTop: 6 }}>
        {formatCue(t.cueType, t.timingText)}
      </div>
      {t.note && <div className="note">{t.note}</div>}
      {t.videoUrl && <video src={t.videoUrl} controls playsInline preload="metadata" />}
      <Who nickname={t.nickname} supportCode={t.supportCode} />
      <div className="foot">
        <span>{t.reviewedAt ? `${fmtDate(t.reviewedAt)} 承認` : ""}</span>
        <span className="sp"></span>
        {actions}
      </div>
    </div>
  );
}
