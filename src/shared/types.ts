import type { AttackType, ContactKind, CueType, DisplayStatus, SettingKey, TimingStatus } from "./constants";

export type Hero = {
  id: string;
  name: string;
  /** 正式名称（任意）。カードの下・キャラ選択・検索に使う。未設定なら null */
  fullName: string | null;
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
  /** 投稿者（X の ID。古い投稿は自由入力の名前のことがある） */
  nickname: string | null;
  /** 投稿者のバッジ（ランキングの対象の X の ID のときだけ） */
  badge: string | null;
  supportCode: string | null;
  reviewedAt: string;
  /** 共有用の短いコード（/s/<コード>） */
  shareCode: string | null;
};

export type Bootstrap = {
  heroes: Hero[];
  settings: Record<SettingKey, string>;
  turnstileSiteKey: string;
  /** 一般向けアプリの URL（X 共有のリンク先） */
  publicAppUrl: string;
  /** 公開中のタイミングがある組み合わせ（攻撃する側のキャラ ID → 相手のキャラ ID の一覧）。相手の選択画面をすぐ出すため */
  registered: Record<string, string[]>;
};

export type RankRow = { rank: number; xId: string; points: number; badge: string | null };
export type RankingResponse = {
  minUsers: number;
  totalUsers: number;
  monthUsers: number;
  /** 人数が足りないうちは null */
  total: RankRow[] | null;
  month: RankRow[] | null;
};
export type UserTiming = {
  id: string;
  kind: "post" | "fix";
  attacker: Hero;
  target: Hero;
  attackType: AttackType;
  cueType: CueType;
  timingText: string;
  at: string;
};
export type UserResponse = {
  xId: string;
  total: number;
  month: number;
  badge: string | null;
  rankTotal: number | null;
  rankMonth: number | null;
  /** ランキングがまだ始まっていない（人数が足りない） */
  rankingActive: boolean;
  excluded: boolean;
  timings: UserTiming[];
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
  status: DisplayStatus;
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

export type AdminHero = Hero & { sortOrder: number; timingCount: number };

/** 管理：公開中（と非公開）のタイミング */
export type AdminPublished = {
  id: string;
  attacker: Hero;
  target: Hero;
  attackType: AttackType;
  cueType: CueType;
  timingText: string;
  note: string | null;
  videoUrl: string | null;
  nickname: string | null;
  supportCode: string | null;
  reviewedAt: string | null;
  hidden: boolean;
  shareCode: string | null;
  code: string;
};

/** 管理：お問い合わせ */
export type AdminContact = {
  id: string;
  kind: ContactKind;
  ref: string | null;
  body: string;
  replyTo: string | null;
  status: "open" | "done";
  createdAt: string;
  doneAt: string | null;
};
