import { describe, expect, it } from "vitest";
import type { Env } from "../src/worker/env";
import { capacityPayload, newSubmissionPayload } from "../src/worker/lib/notify";

const env = { ADMIN_APP_URL: "https://hs-awase-admin.cmps.workers.dev/" } as Env;

describe("Discord 通知の内容", () => {
  it("新しい投稿：受付番号・組み合わせ・攻撃方法・投稿者・承認待ちの件数・管理画面のリンク", () => {
    const p = newSubmissionPayload(env, {
      code: "HS-ABC123",
      attacker: "十文字アタリ",
      target: "ジャンヌダルク",
      attackTypes: ["hs", "normal", "hs"],
      timingCount: 3,
      nickname: "テスト",
      isFix: false,
      pendingTotal: 5,
    });
    const e = p.embeds[0];
    expect(e.title).toBe("📮 新しい投稿が届きました（HS-ABC123）");
    expect(e.description).toBe("十文字アタリ → ジャンヌダルク");
    expect(e.url).toBe("https://hs-awase-admin.cmps.workers.dev/admin");
    expect(e.fields?.map((f) => `${f.name}=${f.value}`)).toEqual([
      "タイミング=3 件（ヒーロースキル・通常攻撃）",
      "投稿者=テスト",
      "承認待ち=合計 5 件",
      "管理画面=https://hs-awase-admin.cmps.workers.dev/admin",
    ]);
  });
  it("修正提案は別の見出し、投稿者なしは（なし）", () => {
    const e = newSubmissionPayload(env, { code: "HS-X", attacker: "A", target: "B", attackTypes: ["card"], timingCount: 1, nickname: null, isFix: true, pendingTotal: 1 }).embeds[0];
    expect(e.title).toContain("修正提案");
    expect(e.fields?.[1].value).toBe("（なし）");
  });
  it("メンション（@everyone など）は飛ばさない", () => {
    const p = newSubmissionPayload(env, { code: "HS-X", attacker: "A", target: "B", attackTypes: ["hs"], timingCount: 1, nickname: "@everyone", isFix: false, pendingTotal: 1 });
    expect(p.allowed_mentions).toEqual({ parse: [] });
    expect(capacityPayload(env, { totalBytes: 1, limitBytes: 2, pendingBytes: 1, pendingLimitBytes: 2 }).allowed_mentions).toEqual({ parse: [] });
  });
  it("管理画面の URL が未設定ならリンクを付けない", () => {
    const e = newSubmissionPayload({} as Env, { code: "HS-X", attacker: "A", target: "B", attackTypes: ["hs"], timingCount: 1, nickname: null, isFix: false, pendingTotal: 1 }).embeds[0];
    expect(e.url).toBeUndefined();
    expect(e.fields?.some((f) => f.name === "管理画面")).toBe(false);
  });
});
