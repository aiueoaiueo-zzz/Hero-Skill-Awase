import { z } from "zod";
import { ATTACK_TYPES, CONTACT_KINDS, CONTACT_LIMITS, CUE_TYPES, LIMITS } from "./constants";
import { X_ID_RE, normalizeXId } from "./ranking";

// 文字数は「文字」単位で数える（絵文字なども 1 文字。D1 の length() と同じ数え方）
const chars = (s: string) => Array.from(s).length;
const text = (max: number) => z.string().trim().refine((s) => chars(s) <= max, { message: `${max}文字以内で入力してください` });
const optText = (max: number) =>
  z
    .string()
    .nullish()
    .transform((s) => (s ?? "").trim())
    .refine((s) => chars(s) <= max, { message: `${max}文字以内で入力してください` })
    .transform((s) => s || null);

export const attackTypeSchema = z.enum(ATTACK_TYPES.map(([k]) => k) as [string, ...string[]]);
export const cueTypeSchema = z.enum(CUE_TYPES.map(([k]) => k) as [string, ...string[]]);

export const timingInputSchema = z.object({
  attackType: attackTypeSchema,
  cueType: cueTypeSchema,
  timingText: text(LIMITS.timingText).refine((s) => s.length > 0, { message: "合わせるタイミングを入力してください" }),
  note: optText(LIMITS.note),
  videoKey: z.string().min(1).max(200),
});

/** 投稿者の X の ID（任意）。先頭の @ は外して保存する */
export const xIdSchema = z
  .string()
  .nullish()
  .transform((s) => normalizeXId(s))
  .refine((s) => !s || X_ID_RE.test(s), { message: "X の ID は英数字と _ の 15 文字までで入力してください" })
  .transform((s) => s || null);

export const entryInputSchema = z.object({
  attackerId: z.string().min(1).max(40),
  targetId: z.string().min(1).max(40),
  /** 投稿者の X の ID（任意） */
  nickname: xIdSchema,
  supportCode: optText(LIMITS.supportCode),
  replacesTimingId: z.string().max(40).nullish(),
  timings: z.array(timingInputSchema).min(1).max(LIMITS.timingsPerSubmission),
  turnstileToken: z.string().max(4096).optional(),
  uploadTicket: z.string().max(64).optional(),
});
export type EntryInput = z.input<typeof entryInputSchema>;

export const uploadRequestSchema = z.object({
  turnstileToken: z.string().max(4096).optional(),
  files: z
    .array(
      z.object({
        size: z.number().int().positive().max(LIMITS.videoBytes),
        contentType: z.literal("video/mp4"),
      }),
    )
    .min(1)
    .max(LIMITS.timingsPerSubmission),
});
export type UploadRequest = z.infer<typeof uploadRequestSchema>;

export const withdrawSchema = z.object({ deleteKey: z.string().min(1).max(128) });
export const codeSchema = z.string().regex(/^HS-[A-Z0-9]{6}$/);

export const approveSchema = z.object({
  edits: z
    .object({
      attackType: attackTypeSchema,
      cueType: cueTypeSchema,
      timingText: text(LIMITS.timingText).refine((s) => s.length > 0, { message: "合わせるタイミングを入力してください" }),
      note: optText(LIMITS.note),
    })
    .optional(),
});

export const rejectSchema = z.object({ reason: optText(LIMITS.rejectReason) });

export const settingsSchema = z.object({
  owner_support_code: optText(LIMITS.supportCode).transform((s) => s ?? "").optional(),
  notices: z.string().max(5000).optional(),
  about: z.string().max(20000).optional(),
  terms: z.string().max(20000).optional(),
  ranking_excluded: z.string().max(3000).optional(),
});

// キャラ管理
export const heroNameSchema = z
  .string()
  .trim()
  .min(1, "名前を入力してください")
  .refine((s) => chars(s) <= 40, { message: "名前は40文字以内です" });
export const slugSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9][a-z0-9-]{0,39}$/, "slug は英小文字・数字・ハイフン（先頭は英数字、40文字以内）です");
export const heroAddSchema = z.object({
  items: z.array(z.object({ name: heroNameSchema, slug: slugSchema.optional() })).min(1).max(200),
});
/** HS の時間（秒）。0〜60、小数第 2 位まで。null で未入力 */
const hsSeconds = z
  .number()
  .min(0, "0 以上で入力してください")
  .max(60, "60 秒以下で入力してください")
  .transform((n) => Math.round(n * 100) / 100)
  .nullable()
  .optional();

export const heroPatchSchema = z.object({
  name: heroNameSchema.optional(),
  slug: slugSchema.optional(),
  // 正式名称：空文字で未設定に戻す
  fullName: z
    .string()
    .trim()
    .refine((s) => chars(s) <= 60, { message: "正式名称は60文字以内です" })
    .transform((s) => s || null)
    .nullable()
    .optional(),
  // HS の情報（null で未入力に戻す）
  hsType: z.enum(["attack", "defense"]).nullable().optional(),
  hsAttackTime: hsSeconds,
  hsInvincibleTime: hsSeconds,
});
export const heroMoveSchema = z.object({ dir: z.union([z.literal(-1), z.literal(1)]) });

// お問い合わせ
export const contactSchema = z.object({
  kind: z.enum(CONTACT_KINDS.map(([k]) => k) as [string, ...string[]]),
  ref: optText(CONTACT_LIMITS.ref),
  body: text(CONTACT_LIMITS.body).refine((s) => chars(s) >= CONTACT_LIMITS.bodyMin, { message: `内容は${CONTACT_LIMITS.bodyMin}文字以上で入力してください` }),
  replyTo: optText(CONTACT_LIMITS.replyTo),
  turnstileToken: z.string().max(4096).optional(),
});
export const contactStatusSchema = z.object({ status: z.enum(["open", "done"]) });

/** 管理：投稿者の X の ID を直す（空で消す） */
export const posterSchema = z.object({ nickname: xIdSchema });
