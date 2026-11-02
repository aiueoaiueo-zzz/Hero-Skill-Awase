import type { CueType } from "./constants";

/** 検索用の正規化：ひらがな→カタカナ、記号（・ = ' † 空白）を無視、英字は小文字 */
export const normalizeForSearch = (s: string | null | undefined): string =>
  (s || "")
    .toLowerCase()
    .replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60))
    .replace(/[\s・=＝'’†]/g, "");

/**
 * 合わせるタイミングの表示用。現時点ではカッコの付与・除去はせず、そのまま返す（仕様 4-4）。
 * 将来カッコを自動付与する場合はここだけを変える。
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const formatCue = (_type: CueType, text: string): string => text;
