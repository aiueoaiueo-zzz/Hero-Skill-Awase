import type { ReactNode } from "react";
import { ATTACK_LABEL, CUE_LABEL, STATUS_LABEL, type AttackType, type CueType, type DisplayStatus } from "../../shared/constants";
import { formatCue } from "../../shared/text";
import type { Hero } from "../../shared/types";
import { Avatar } from "./Avatar";
import { Who } from "./TimingCard";

export type EntryPoint = {
  attackType: AttackType;
  cueType: CueType;
  timingText: string;
  note: string | null;
  videoUrl: string | null;
};

type Props = {
  points: EntryPoint[];
  attacker?: Hero | null;
  target?: Hero | null;
  nickname?: string | null;
  supportCode?: string | null;
  status?: DisplayStatus;
  label?: ReactNode;
  old?: boolean;
  /** 「タイミング 1」のように番号を振る（複数あるとき） */
  numbered?: boolean;
  /** 投稿で並べるとき、ブロック番号をずらす */
  startNumber?: number;
  dateText?: string;
  actions?: ReactNode;
  actionsRow?: boolean;
};

const smallAv = { width: 28, height: 28, fontSize: 12, borderRadius: 7 } as const;

/** 投稿内容のカード（試作版 entryCard を移植）。プレビュー・審査状況・管理画面で使う */
export function EntryCard(p: Props) {
  return (
    <div className={`entry ${p.old ? "old" : ""}`}>
      {p.label && (
        <div className="lbl" style={{ margin: "0 0 6px", fontWeight: 700, color: p.old ? "var(--sub)" : "var(--accent)" }}>
          {p.label}
        </div>
      )}
      {p.attacker !== undefined && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 13 }}>
          <Avatar hero={p.attacker} style={smallAv} />
          <b>{p.attacker?.name}</b> → <Avatar hero={p.target} style={smallAv} />
          <b>{p.target?.name}</b>
        </div>
      )}
      {p.status && (
        <div style={{ marginBottom: 8 }}>
          <span className={`chip st-${p.status}`}>{STATUS_LABEL[p.status]}</span>
        </div>
      )}
      {p.points.map((pt, i) => (
        <div className="pt" key={i}>
          {(p.numbered ?? p.points.length > 1) && <span className="no">{(p.startNumber ?? 1) + i}</span>}
          <span className="chip atk">⚔ {ATTACK_LABEL[pt.attackType] || "その他"}</span>
          <span className="chip">目印：{CUE_LABEL[pt.cueType] || "その他"}</span>
          <div className="tim">{formatCue(pt.cueType, pt.timingText)}</div>
          {pt.note && <div className="note">{pt.note}</div>}
          {pt.videoUrl && <video src={pt.videoUrl} controls playsInline preload="metadata" />}
        </div>
      ))}
      <Who nickname={p.nickname ?? null} supportCode={p.supportCode ?? null} />
      <div className="foot">
        <span>{p.dateText}</span>
        <span className="sp"></span>
        {!p.actionsRow && p.actions}
      </div>
      {p.actionsRow && p.actions && (
        <div className="acts" style={{ marginTop: 6 }}>
          {p.actions}
        </div>
      )}
    </div>
  );
}
