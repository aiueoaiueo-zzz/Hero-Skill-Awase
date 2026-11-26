import { describe, expect, it } from "vitest";
import { computeScores, eventWindow } from "../src/worker/lib/ranking";

// computeScores が使う分だけのデータベースの代わり（SQL の中身で返す行を選ぶ）
const fakeEnv = (posts: unknown[], featured: unknown[]) =>
  ({
    DB: {
      prepare: (sql: string) => ({
        first: async () => null,
        all: async () => ({ results: sql.includes("featured_heroes") ? featured : sql.includes("f.status = 'merged' AND t.status") ? [] : posts }),
      }),
    },
  }) as never;

const post = (x: string, a: string, t: string, posted: string, at: string) => ({ id: x + a + t, x, at, posted, a, t, fixed: 0 });

describe("今週のキャラの加点（docs/DECISIONS.md BL）", () => {
  const win = eventWindow("2026-11-27", "2026-12-24");
  const featured = [{ h: "taco", s: "2026-11-27", e: "2026-12-03" }];
  it("今週のキャラが攻撃側か相手側にいて、その週に投稿したものはイベントに +0.5（累計には足さない）", async () => {
    const { users } = await computeScores(
      fakeEnv(
        [
          post("aaa", "taco", "x1", "2026-11-28T03:00:00Z", "2026-11-28T04:00:00Z"), // 攻撃側
          post("bbb", "x2", "taco", "2026-12-02T03:00:00Z", "2026-12-04T04:00:00Z"), // 相手側・承認は翌週でも投稿日で判定
          post("ccc", "x3", "taco", "2026-12-04T03:00:00Z", "2026-12-04T04:00:00Z"), // 週が過ぎてから投稿
          post("ddd", "x4", "x5", "2026-11-28T03:00:00Z", "2026-11-28T04:00:00Z"), // 関係ないキャラ
        ],
        featured,
      ),
      Date.parse("2026-12-05T00:00:00Z"),
      win,
    );
    // どれも組み合わせの初投稿なので 1.5 が基本
    expect(users.get("aaa")?.event).toBe(2);
    expect(users.get("aaa")?.total).toBe(1.5);
    expect(users.get("bbb")?.event).toBe(2);
    expect(users.get("ccc")?.event).toBe(1.5);
    expect(users.get("ddd")?.event).toBe(1.5);
  });
  it("イベント期間の外で承認されたものには付かない", async () => {
    const { users } = await computeScores(
      fakeEnv([post("aaa", "taco", "x1", "2026-11-27T03:00:00Z", "2026-12-25T04:00:00Z")], featured),
      Date.parse("2026-12-26T00:00:00Z"),
      win,
    );
    expect(users.get("aaa")?.event).toBe(0);
  });
});
