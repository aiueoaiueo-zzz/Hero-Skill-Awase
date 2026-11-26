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
  /** HS のダメージ発生の全パターン（例：1回目 1.2秒／2回目以降 3.1秒）。hsAttackTime・hsAttackLabel は最初のパターン。未入力は [] */
  hsAttack: HsInvincible[];
  /** HS のダメージ継続時間（秒。極大ダメージまたは転倒が入る攻撃のみ）。-1 は「−」、未入力は null */
  hsDamageDuration: number | null;
  /** 無発動カードの発生（秒）。HS合わせの判定で、このキャラが HS を使う側（相手）のとき無敵時間に足す。未入力は null（docs/DECISIONS.md BE） */
  cardMuTime: number | null;
  /** HS の無敵時間（秒）。場面で変わるときは場面ごと（label 付き）。場面で変わらなければ label は空。未入力は [] */
  hsInvincible: HsInvincible[];
  /** HS合わせ適性の重要タグ（同じ ★ の中で上に並べる。HS が不可なら false。docs/DECISIONS.md AT） */
  hsAttackKey: boolean;
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
export type EventInfo = {
  id: string;
  name: string;
  startsOn: string;
  endsOn: string;
  goal: number | null;
  /** イベントのバッジ（docs/DECISIONS.md BM）。badgeName：バッジの名前の頭。tiers：ナイス（low）・グッド（mid）・ベスト（high）合わせ賞になるイベントの合わせポイント（以上） */
  badgeName: string | null;
  tiers: { low: number | null; mid: number | null; high: number | null };
  /** バッジを確定した時刻（未確定は null）と、確定したバッジの数 */
  finalizedAt: string | null;
  badgeCount: number;
};
/** 確定したイベントのバッジ（投稿者ページ） */
export type EventBadge = { label: string; kind: EventBadgeKind; eventName: string; endsOn: string };
export type EventBadgeKind = "rank1" | "rank2" | "rank3" | "high" | "mid" | "low";
/** 一般向け：開催中のイベントと進み具合（filled：イベント期間中に承認されたタイミングの数。docs/DECISIONS.md AZ） */
export type PublicEvent = EventInfo & { filled: number };
/** 今週のキャラのスケジュール 1 行 */
export type FeaturedHero = { id: string; heroId: string; startsOn: string; endsOn: string };

/** hero：その期間の集計対象の投稿で、攻撃側にいちばん多く選んだキャラの ID（同じ数ならあとで承認されたほう。docs/DECISIONS.md AY） */
export type RankRow = { rank: number; xId: string; points: number; badge: string | null; hero: string | null };
export type RankingResponse = {
  minUsers: number;
  /** "event"：イベント期間中（イベントランキングだけ）／"normal"：それ以外（公開にしたものだけ） */
  mode: "event" | "normal";
  /** 公開にしているか（非公開なら下の一覧は出さない） */
  show: { total: boolean; month: boolean };
  /** 人数が足りない・非公開・イベント期間中は null */
  total: RankRow[] | null;
  month: RankRow[] | null;
  /** イベント期間中だけ（rows は人数が足りないうちは null） */
  event: { name: string; startsOn: string; endsOn: string; rows: RankRow[] | null } | null;
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
  /** イベント期間中のポイントと順位（イベント期間外は null） */
  event: { name: string; points: number; rank: number | null; /** 今の段階で付くバッジ（バッジの設定があるときだけ） */ badge: { label: string; kind: EventBadgeKind } | null } | null;
  /** 確定したイベントのバッジ（新しい順） */
  eventBadges: EventBadge[];
  /** 今月のランキングを公開しているか */
  showMonth: boolean;
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
  /** 投稿者情報の変更申請（審査待ち、または最後の申請が却下のとき）。なければ null */
  posterChange: StatusPosterChange | null;
};

/** 審査状況：投稿者情報（X の ID・応援コード）の変更申請 */
export type StatusPosterChange = {
  id: string;
  status: "pending" | "rejected";
  nickname: string | null;
  supportCode: string | null;
  /** 申請した時点の値 */
  oldNickname: string | null;
  oldSupportCode: string | null;
  rejectReason: string | null;
  createdAt: string;
  /** この申請に入っている投稿の数（まとめて申請したとき 2 以上） */
  count: number;
};

/** 投稿者情報の変更申請の結果：applied＝まだ公開前ですぐ書き換えた数、requested＝審査待ちにした数 */
export type PosterChangeResponse = { applied: number; requested: number };

export type AdminTiming = {
  id: string;
  position: number;
  attackType: import("./constants").AttackType;
  cueType: import("./constants").CueType;
  timingText: string;
  note: string | null;
  videoUrl: string | null;
  videoKey: string;
  /**
   * 承認待ちタブ：同じ組み合わせ・同じ攻撃方法で、すでにあるタイミング（重複に気づくため。docs/DECISIONS.md BI）。
   * published：公開中（非公開を含む）のもの、pending：ほかの承認待ちの数
   */
  same?: { published: { cueType: import("./constants").CueType; timingText: string; hidden: boolean }[]; pending: number };
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

export type AdminPendingResponse = { groups: AdminGroup[]; posterChanges: AdminPosterChange[]; usage: StorageUsage };

/** 管理：投稿者情報の変更申請（審査待ち） */
export type AdminPosterChange = {
  id: string;
  nickname: string | null;
  supportCode: string | null;
  createdAt: string;
  items: {
    code: string;
    attacker: Hero;
    target: Hero;
    /** 申請した時点の値 */
    oldNickname: string | null;
    oldSupportCode: string | null;
    /** その投稿の公開中（非公開を含む）のタイミング数 */
    published: number;
    isFix: boolean;
  }[];
};

export type AdminHero = Hero & { sortOrder: number; timingCount: number };

/** 管理：集計（公開中のタイミングを、攻撃側 a × 受ける側 t × 攻撃方法 k ごとに数えた件数 n） */
export type AdminStatsResponse = {
  heroes: Hero[];
  pairs: { a: string; t: string; k: AttackType; n: number }[];
};

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
  /** 修正提案が反映されたタイミングは、その修正提案の受付番号（公開中タブの受付番号の検索用） */
  fixCode: string | null;
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
