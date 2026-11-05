// ランキング・バッジ・X の ID の共通ルール（画面とサーバーの両方で使う）

/** X の ID として使える形（@ なし。英数字と _、15 文字まで） */
export const X_ID_RE = /^[A-Za-z0-9_]{1,15}$/;

/** 入力された X の ID を保存用の形に（前後の空白と、先頭の @ / ＠ を外す） */
export const normalizeXId = (s: string | null | undefined) => (s ?? "").trim().replace(/^[@＠]+/, "").trim();

/** 投稿者の欄が X の ID の形か（古い投稿の自由入力の名前は、ランキングでは数えない） */
export const isXId = (s: string | null | undefined): s is string => !!s && X_ID_RE.test(s);

/** ランキングを出し始める人数 */
export const RANKING_MIN_USERS = 5;
/** ランキングに出す人数 */
export const RANKING_TOP = 10;
/** 今週のボーナス組み合わせの数 */
export const BONUS_PAIRS_PER_WEEK = 7;

/** ポイント */
export const POINTS = { post: 1, postFixed: 0.5, fix: 0.5, bonus: 1 } as const;

/** バッジ（累計ポイントで決まる。下から順に） */
export const BADGES = [
  { min: 1, name: "ルーキー" },
  { min: 5, name: "合わせ見習い" },
  { min: 10, name: "合わせ職人" },
  { min: 30, name: "HSマスター" },
  { min: 50, name: "レジェンド" },
] as const;
export const badgeFor = (points: number): string | null => {
  let b: string | null = null;
  for (const x of BADGES) if (points >= x.min) b = x.name;
  return b;
};

/** ポイントの表示（0.5 刻み） */
export const fmtPoints = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

const JST = 9 * 60 * 60 * 1000;
/** その時刻を含む週の月曜 0 時（日本時間）。返り値は日本時間の日付 "YYYY-MM-DD"（週の名前）と、UTC の開始・終了時刻 */
export function jstWeek(ms: number) {
  const d = new Date(ms + JST);
  const dow = (d.getUTCDay() + 6) % 7; // 月曜 = 0
  const start = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dow) - JST;
  return { key: new Date(start + JST).toISOString().slice(0, 10), start, end: start + 7 * 24 * 60 * 60 * 1000 };
}
/** その時刻を含む月の 1 日 0 時（日本時間）の UTC 時刻 */
export function jstMonthStart(ms: number) {
  const d = new Date(ms + JST);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) - JST;
}
