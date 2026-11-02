import { useSyncExternalStore } from "react";

// 共有メニュー（X に投稿／X の DM／LINE／リンクをコピー／その他のアプリ）
// どの画面からでも openShare() で開けるように、画面の外に状態を持つ。

export type ShareRequest = { title: string; text: string; url: string };

let current: ShareRequest | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function openShare(req: ShareRequest) {
  current = req;
  emit();
}
export function closeShare() {
  current = null;
  emit();
}
export const useShareRequest = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );

/** 外部のアプリ・サイトを開く（アプリが入っていればアプリで開く） */
export const openExternal = (url: string): void => {
  window.open(url, "_blank", "noopener,noreferrer");
};
