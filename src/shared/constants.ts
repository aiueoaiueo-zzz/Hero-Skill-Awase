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
  voice: "例：いく「よ」ー！",
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

/** お問い合わせの種類 */
export const CONTACT_KINDS = [
  ["removal", "投稿の削除・非公開の依頼"],
  ["mistake", "掲載内容の誤り"],
  ["bug", "不具合の報告"],
  ["request", "ご要望（こんな機能がほしい など）"],
  ["rights", "権利者の方からのご連絡"],
  ["other", "その他"],
] as const;
export type ContactKind = (typeof CONTACT_KINDS)[number][0];
export const CONTACT_KIND_LABEL = Object.fromEntries(CONTACT_KINDS) as Record<ContactKind, string>;
export const CONTACT_LIMITS = { ref: 300, bodyMin: 5, body: 2000, replyTo: 200 } as const;

export const SETTING_KEYS = ["owner_support_code", "notices", "about", "terms", "ranking_excluded"] as const;
/** 一般向けには返さない設定 */
export const PRIVATE_SETTING_KEYS: readonly SettingKey[] = ["ranking_excluded"];
export type SettingKey = (typeof SETTING_KEYS)[number];

/** フッターに出す短い注意書き（詳しい内容は「注意事項・プライバシー」のページ） */
export const DEFAULT_NOTICES = [
  "本アプリは「#コンパス 戦闘摂理解析システム」の**非公式のファンメイドツール**です。公式とは一切関係ありません。公式へのお問い合わせはご遠慮ください。",
  "ゲーム内の名称・画像・映像などの権利は、各権利者に帰属します。",
].join("\n");

/** 「注意事項・プライバシー」のページ（/terms） */
export const DEFAULT_TERMS = `HS合わせ投稿Webアプリ（ヒロアプ）（以下「本アプリ」）をご利用いただく前に、以下をお読みください。

## 本アプリについて
- 本アプリは「#コンパス 戦闘摂理解析システム」の**非公式のファンメイドツール**です。公式とは一切関係ありません。公式へのお問い合わせはご遠慮ください。
- ゲーム内の名称・画像・映像などの権利は、各権利者に帰属します。
- 本アプリは収益を目的としていません。広告の掲載や有料の機能はなく、本アプリで収益は一切得ていません。

## 免責事項
- 掲載している情報は利用者からの投稿をもとにしており、正確性を保証するものではありません。
- 本アプリの利用により生じたいかなる損害についても、制作者は責任を負いかねます。

## 投稿について
- 投稿は管理者が確認し、承認したものだけを公開します。不適切な内容は、承認しない、内容を修正して公開する、公開後に予告なく非公開・削除する、といった対応をとることがあります。
- 動画は、自分で撮影したもの、または撮影者の許可を得たもののみ投稿してください。
- X の ID は、ご自身のもののみ入力してください。
- 公開された内容（X の ID・応援コードを含む）は、誰でも見られる状態になります。

## プライバシー
- アカウント登録や、名前・メールアドレスの入力は必要ありません。
- 保存するのは、投稿の内容・X の ID・応援コード（入力した場合のみ）と、お問い合わせの内容だけです。投稿の審査・公開、お問い合わせへの対応のためだけに使い、第三者に提供することはありません（法令に基づく場合を除く）。
- 本アプリは Cloudflare（配信・ロボット対策）などの外部サービスを利用しており、IP アドレスなどの接続情報が各サービスに送られることがあります。広告やアクセス解析のツールは使っていません。

## お問い合わせ
投稿の削除の依頼や、権利者の方からのご連絡、ご要望は、「お問い合わせ」からお送りください。

最終更新：2026年11月6日`;

export const DEFAULT_ABOUT = `「HS合わせ投稿Webアプリ（ヒロアプ）」は、**相手のヒーロースキル（HS）が明けた瞬間に攻撃を合わせるタイミング**を、キャラの組み合わせごとにすぐ確認できるファンメイドのアプリです。

## HS明けとは
HSを使っている間、キャラは無敵になります。その無敵が切れた瞬間（HS明け）に攻撃を当てる技術を「HS合わせ」と呼んでいます。このアプリでは、HS明けを狙うための目印とタイミングを、動画付きでまとめています。

## 使い方
1. **① 攻撃する側（自分）のキャラ**を選びます。攻撃方法はHSに限らず、通常攻撃・ヒーローアクション・スキルカードなど何でもOKです。
2. **② HSを使う側（相手）のキャラ**を選びます。情報が登録されている相手は上にまとまっています。
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
- X の ID と応援コードは任意です。入力すると、公開されるタイミングに表示されます。X の ID はご自身のもののみ入力してください。
- 動画は、自分で撮影したもの、または撮影者の許可を得たもののみ投稿してください。

## ランキング
- 承認された合わせをもとに、「今月」と「累計」のランキングを出しています。累計に応じてバッジが付きます。投稿時に X の ID を入力した投稿が対象です。
- 投稿者の名前を押すと、その人の投稿の一覧とバッジが見られます。

## 内容が間違っているときは
各タイミングの「修正を提案」から、正しい内容を送ってください。攻撃方法と合わせる目印はそのままで、タイミング・備考・動画を修正できます。管理者が確認し、承認されると公開中の内容が置き換わります。

## ホーム画面に追加する（アプリのように使う）
ホーム画面に追加すると、アイコンからすぐ開けて、アドレスバーのない全画面で使えます。ストアからのインストールは不要です。

**iPhone（Safari）**
1. Safari でこのサイトを開きます。
2. 画面下の共有ボタン（□に↑のマーク）を押します。
3. 「ホーム画面に追加」を選び、右上の「追加」を押します。

**Android（Chrome）**
1. Chrome でこのサイトを開きます。
2. 右上の「︙」（メニュー）を押します。
3. 「ホーム画面に追加」（または「アプリをインストール」）を選び、「追加」を押します。`;

export const DEFAULT_SETTINGS: Record<SettingKey, string> = {
  owner_support_code: "",
  notices: DEFAULT_NOTICES,
  about: DEFAULT_ABOUT,
  terms: DEFAULT_TERMS,
  ranking_excluded: "",
};

/** キャラのロール（キャラ選択の絞り込みに使う） */
export const HERO_ROLES = [
  ["attacker", "アタッカー"],
  ["gunner", "ガンナー"],
  ["sprinter", "スプリンター"],
  ["tank", "タンク"],
] as const;
export type HeroRole = (typeof HERO_ROLES)[number][0];
export const ROLE_LABEL: Record<HeroRole, string> = Object.fromEntries(HERO_ROLES) as Record<HeroRole, string>;
