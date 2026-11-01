import type { AttackType, CueType, SettingKey, TimingStatus } from "./constants";

export type Hero = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
};

/** 一般公開用のタイミング（承認済みのみ） */
export type PublicTiming = {
  id: string;
  attackType: AttackType;
  cueType: CueType;
  timingText: string;
  note: string | null;
  videoUrl: string;
  nickname: string | null;
  supportCode: string | null;
  reviewedAt: string;
};

export type Bootstrap = {
  heroes: Hero[];
  settings: Record<SettingKey, string>;
  turnstileSiteKey: string;
};

export type PairResponse = {
  attacker: Hero;
  target: Hero;
  timings: PublicTiming[];
};

export type TargetsResponse = {
  attacker: Hero;
  /** 承認済みデータがある相手の id */
  registeredTargetIds: string[];
};

export type { TimingStatus };

export type UploadResponse = {
  ticket: string;
  uploads: { videoKey: string; url: string; method: "PUT"; headers: Record<string, string> }[];
};

export type EntryResponse = { code: string; deleteKey: string };

/** 修正提案の元になる公開中のタイミング */
export type FixSource = {
  id: string;
  attacker: Hero;
  target: Hero;
  attackType: import("./constants").AttackType;
  cueType: import("./constants").CueType;
  timingText: string;
  note: string | null;
  videoKey: string;
  videoUrl: string;
};

export type StatusTiming = {
  id: string;
  position: number;
  attackType: import("./constants").AttackType;
  cueType: import("./constants").CueType;
  timingText: string;
  note: string | null;
  status: TimingStatus;
  rejectReason: string | null;
  reviewedAt: string | null;
  /** 公開済み（承認済み）のときだけ */
  videoUrl: string | null;
};

export type StatusResponse = {
  code: string;
  createdAt: string;
  attacker: Hero;
  target: Hero;
  nickname: string | null;
  supportCode: string | null;
  isFix: boolean;
  timings: StatusTiming[];
};

export type AdminTiming = {
  id: string;
  position: number;
  attackType: import("./constants").AttackType;
  cueType: import("./constants").CueType;
  timingText: string;
  note: string | null;
  videoUrl: string | null;
  videoKey: string;
};

export type AdminGroup = {
  code: string;
  createdAt: string;
  attacker: Hero;
  target: Hero;
  nickname: string | null;
  supportCode: string | null;
  /** 投稿全体のタイミング数（「タイミング 1 / 2」の分母） */
  total: number;
  isFix: boolean;
  /** 修正提案のとき：現在公開中の元のタイミング */
  original: (AdminTiming & { nickname: string | null; supportCode: string | null; reviewedAt: string | null; status: TimingStatus }) | null;
  timings: AdminTiming[];
};

export type StorageUsage = { totalBytes: number; pendingBytes: number; limitBytes: number; pendingLimitBytes: number };

export type AdminPendingResponse = { groups: AdminGroup[]; usage: StorageUsage };
