import type { AttackType, ContactKind, CueType, DisplayStatus, HeroRole, NgAttackType, SettingKey, TimingStatus } from "./constants";

/** HS の無敵時間 1 つ分（label：場面。例「1,2回目」「最短距離時」。場面で変わらなければ空） */
export type HsInvincible = { label: string; sec: number };

export type Hero = {
  id: string;
  name: string;
  /** 正式名称（任意）。カードの下・キャラ選択・検索に使う。未設定なら null */
  fullName: string | null;
  slug: string;
  imageUrl: string | null;
  /** 合わせ不可の攻撃方法（ヒーロースキル・通常攻撃・ヒーローアクション・スキルカードのうち）。空なら全部可 */
  ngAttacks: NgAttackType[];
  /** HS のダメージ発生（秒） */
  hsAttackTime: number | null;
  /** ダメージ発生がどの場面の値か（例「2回目以降」）。なければ空 */
  hsAttackLabel: string;
  /** HS の無敵時間（秒）。場面で変わるときは場面ごと（label 付き）。場面で変わらなければ label は空。未入力は [] */
  hsInvincible: HsInvincible[];
  /** ロール。未入力は null */
  role: HeroRole | null;
  /** HS合わせ適性（旧：HS合わせ重要度。HS に合わせる側として。1〜3 で星が多いほど重要、0 は「−」）。未入力は null */
  hsAttackImportance: 0 | 1 | 2 | 3 | null;
  /** HS警戒度（旧：HS被合わせ重要度。HS に合わせられる側として。1〜3 で星が多いほど重要）。未入力は null */
  hsTargetImportance: 1 | 2 | 3 | null;
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
  /** "staging"：確認用サイト。本番は空 */
  stage: string;
  /** 開催中のイベント（なければ null） */
  event: PublicEvent | null;
  /** 今日の「今週のキャラ」（キャラの ID。いなければ空） */
  featured: { heroId: string; startsOn: string; endsOn: string }[];
};

/** イベント（キャンペーン）。日付は日本時間の YYYY-MM-DD（両端を含む） */
export type EventInfo = { id: string; name: string; startsOn: string; endsOn: string; goal: number | null };
/** 一般向け：開催中のイベントと進み具合（filled：投稿がある組み合わせの数） */
export type PublicEvent = EventInfo & { filled: number };
/** 今週のキャラのスケジュール 1 行 */
export type FeaturedHero = { id: string; heroId: string; startsOn: string; endsOn: string };

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
  /** 応援コード（公開中の投稿で使われた応援コードが 1 種類だけのとき。複数あれば null） */
  supportCode: string | null;
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
