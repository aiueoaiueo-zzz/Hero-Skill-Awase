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
