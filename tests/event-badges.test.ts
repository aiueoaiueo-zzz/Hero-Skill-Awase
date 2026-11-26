import { describe, expect, it } from "vitest";
import { eventBadgeKind, eventBadgeLabel } from "../src/shared/ranking";
import { eventSchema } from "../src/shared/schema";

describe("イベントのバッジ（docs/DECISIONS.md BM）", () => {
  const tiers = { low: 1, mid: 5, high: 10 };
  it("1〜3 位は順位のバッジ、それ以外はポイントでナイス・グッド・ベスト合わせ賞", () => {
    expect(eventBadgeKind(1, 3, tiers)).toBe("rank1");
    expect(eventBadgeKind(3, 30, tiers)).toBe("rank3");
    expect(eventBadgeKind(4, 10, tiers)).toBe("high");
    expect(eventBadgeKind(5, 9.5, tiers)).toBe("mid");
    expect(eventBadgeKind(null, 1, tiers)).toBe("low");
    expect(eventBadgeKind(9, 0.5, tiers)).toBeNull();
    expect(eventBadgeKind(1, 0, tiers)).toBeNull();
  });
  it("段階を空にしたものは使わない", () => {
    expect(eventBadgeKind(4, 3, { low: null, mid: 3, high: null })).toBe("mid");
    expect(eventBadgeKind(4, 2, { low: null, mid: 3, high: null })).toBeNull();
  });
  it("バッジの名前", () => {
    expect(eventBadgeLabel("リリース記念イベント", "rank1")).toBe("リリース記念イベント1位");
    expect(eventBadgeLabel("リリース記念イベント", "mid")).toBe("リリース記念イベント グッド合わせ賞");
  });
  it("しきい値は 下 ＜ 中 ＜ 上", () => {
    const base = { name: "x", startsOn: "2026-11-27", endsOn: "2026-12-24" };
    expect(eventSchema.safeParse({ ...base, tierLow: 1, tierMid: 5, tierHigh: 10 }).success).toBe(true);
    expect(eventSchema.safeParse({ ...base, tierLow: 5, tierMid: 5 }).success).toBe(false);
    expect(eventSchema.safeParse({ ...base, tierLow: 1.3 }).success).toBe(false);
  });
});
