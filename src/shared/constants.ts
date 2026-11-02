// 試作版 hs-awase.html の定数を移植

export const CUE_TYPES = [
  ["voice", "ボイス"],
  ["motion", "動き"],
  ["time", "時間"],
  ["other", "その他"],
] as const;
export type CueType = (typeof CUE_TYPES)[number][0];
export const CUE_LABEL: Record<CueType, string> = Object.fromEntries(CUE_TYPES) as Record<CueType, string>;

export const ATTACK_TYPES = [
  ["hs", "ヒーロースキル"],
  ["normal", "通常攻撃"],
  ["action", "ヒーローアクション"],
  ["card", "スキルカード"],
  ["other", "その他"],
] as const;
export type AttackType = (typeof ATTACK_TYPES)[number][0];
export const ATTACK_LABEL: Record<AttackType, string> = Object.fromEntries(ATTACK_TYPES) as Record<AttackType, string>;
/** 詳細画面のタブ用（2 行に折り返す） */
export const ATTACK_TAB: Record<AttackType, [string, string?]> = {
  hs: ["ヒーロー", "スキル"],
  normal: ["通常", "攻撃"],
  action: ["ヒーロー", "アクション"],
  card: ["スキル", "カード"],
  other: ["その他"],
};

export const PLACEHOLDER: Record<CueType, string> = {
  voice: "例：「いくよー！」の「よ」に合わせる　※セリフは「」で囲んでください",
  motion: "例：相手が武器を振り下ろし、地面に着いた瞬間",
  time: "例：相手のHS発動から約2秒後",
  other: "合わせるタイミングを自由に入力",
};

export const TIMING_STATUSES = ["pending", "approved", "rejected", "withdrawn", "merged"] as const;
export type TimingStatus = (typeof TIMING_STATUSES)[number];
/** 表示用のステータス（DB の status に加え、管理者が非公開にした "hidden"） */
export type DisplayStatus = TimingStatus | "hidden";
export const STATUS_LABEL: Record<DisplayStatus, string> = {
  hidden: "非公開",
  pending: "承認待ち",
  approved: "承認済み",
  merged: "承認済み（反映）",
  rejected: "却下",
  withdrawn: "取り下げ",
};

export const LIMITS = {
  nickname: 20,
  supportCode: 20,
  timingText: 200,
  note: 1000,
  rejectReason: 500,
  timingsPerSubmission: 20,
  videoSeconds: 30,
  sourceVideoBytes: 500 * 1024 * 1024,
  videoBytes: 15 * 1024 * 1024,
} as const;

export const SETTING_KEYS = ["owner_support_code", "notices", "about"] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];

export const DEFAULT_NOTICES = [
  "本アプリは「#コンパス 戦闘摂理解析システム」の**非公式のファンメイドツール**です。NHN PlayArt株式会社・株式会社ドワンゴをはじめ、公式とは一切関係ありません。",
  "本アプリについて、公式へのお問い合わせはご遠慮ください。",
  "ゲーム内の名称・画像・映像などの権利は、各権利者に帰属します。",
  "掲載している情報は利用者からの投稿をもとにしており、正確性を保証するものではありません。ゲームのアップデートなどにより、内容が変わる場合があります。",
  "投稿された内容は、管理者が確認したうえで公開しています。不適切と判断した投稿は、予告なく非公開・削除することがあります。",
  "本アプリの利用により生じたいかなる損害についても、制作者は責任を負いかねます。",
].join("\n");

export const DEFAULT_ABOUT = `「HS明け早見アプリ」は、**相手のヒーロースキル（HS）が明けた瞬間に攻撃を合わせるタイミング**を、キャラの組み合わせごとにすぐ確認できるファンメイドのアプリです。

## HS明けとは
HSを使っている間、キャラは無敵になります。その無敵が切れた瞬間（HS明け）に攻撃を当てる技術を「HS合わせ」と呼んでいます。このアプリでは、HS明けを狙うための目印とタイミングを、動画付きでまとめています。

## 使い方
1. **① 攻撃する側（自分）のキャラ**を選びます。攻撃方法はHSに限らず、通常攻撃・ヒーローアクション・スキルカードなど何でもOKです。
2. **② HSを使う相手のキャラ**を選びます。情報が登録されている相手は上にまとまっています。
3. 攻撃方法のタブを切り替えて、合わせるタイミングと動画を確認します。

## 画面の見方
- **攻撃方法**：ヒーロースキル／通常攻撃／ヒーローアクション／スキルカード／その他。詳細画面ではタブで切り替えます。
- **合わせる目印**：ボイス（セリフ）／動き／時間／その他。何を目印にタイミングを取るかを表しています。ボイスの場合、セリフは「」で囲んで書かれています。
- **動画**：すべてのタイミングに、実際の合わせ方の動画（30秒以内）が付いています。再生ボタンを押すと、その場で再生されます。

## 投稿について
- ログインは不要です。画面下の「投稿する」や、詳細画面の「この組み合わせを投稿」から投稿できます。
- 1回の投稿で、タイミングをいくつでも追加できます。各タイミングには動画（必須）と備考を付けてください。
- 投稿は管理者が確認し、承認されたものから公開されます。審査はタイミング1つごとに行います。
- 投稿後に表示される受付番号で、審査状況を確認できます。
- ニックネームと応援コードは任意です。入力すると、公開されるタイミングに表示されます。

## 内容が間違っているときは
各タイミングの「修正を提案」から、正しい内容を送ってください。攻撃方法と合わせる目印はそのままで、タイミング・備考・動画を修正できます。管理者が確認し、承認されると公開中の内容が置き換わります。`;

export const DEFAULT_SETTINGS: Record<SettingKey, string> = {
  owner_support_code: "",
  notices: DEFAULT_NOTICES,
  about: DEFAULT_ABOUT,
};
