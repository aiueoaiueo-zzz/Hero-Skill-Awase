import { describe, expect, it } from "vitest";
import { LIMITS } from "../src/shared/constants";
import { retryBitrate, targetSize, TARGET } from "../src/client/lib/compress";

describe("targetSize（縦型のまま短辺 720px、拡大しない、偶数）", () => {
  it("縦型 1080x1920 → 720x1280", () => expect(targetSize(1080, 1920)).toEqual({ width: 720, height: 1280 }));
  it("iPhone の画面収録 1179x2556 → 720x1561 前後（偶数）", () => {
    const s = targetSize(1179, 2556);
    expect(s.width).toBe(720);
    expect(s.height % 2).toBe(0);
    expect(Math.abs(s.height - 1561)).toBeLessThanOrEqual(1);
  });
  it("横型 1920x1080 → 1280x720", () => expect(targetSize(1920, 1080)).toEqual({ width: 1280, height: 720 }));
  it("小さい動画は拡大しない", () => expect(targetSize(360, 640)).toEqual({ width: 360, height: 640 }));
});

describe("retryBitrate（15MB を超えたときの再変換）", () => {
  it("30 秒でも 15MB に収まるビットレート", () => {
    const br = retryBitrate(30);
    const bytes = ((br + TARGET.audioBitrate) * 30) / 8;
    expect(bytes).toBeLessThan(LIMITS.videoBytes);
    expect(br).toBeLessThan(TARGET.videoBitrate);
  });
  it("下限は 400kbps", () => expect(retryBitrate(10_000)).toBe(400_000));
});
