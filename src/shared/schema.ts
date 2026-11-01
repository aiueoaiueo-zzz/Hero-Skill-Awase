import { z } from "zod";
import { ATTACK_TYPES, CUE_TYPES, LIMITS } from "./constants";

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

export const entryInputSchema = z.object({
  attackerId: z.string().min(1).max(40),
  targetId: z.string().min(1).max(40),
  nickname: optText(LIMITS.nickname),
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
