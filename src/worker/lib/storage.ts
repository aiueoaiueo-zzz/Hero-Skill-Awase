import type { Env } from "../env";

/** 新しい動画を受け付けられるか（課金防止の安全装置。ステップ 6 で容量の集計を実装する） */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function videoAccepting(_env: Env): Promise<boolean> {
  return true;
}
