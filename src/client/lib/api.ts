import { useEffect, useState } from "react";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error || res.statusText);
  return data as T;
}

// 一般向けの画面データ（相手キャラ一覧・詳細）の短期キャッシュ。
// キャラをタップした瞬間に読み込みを始め（prefetch）、次の画面を待ち時間なしで表示するため。
const CACHE_MS = 60 * 1000;
const cache = new Map<string, { at: number; data?: unknown; p: Promise<unknown> }>();

/** 先読み（同じ URL を 60 秒以内に読んでいれば何もしない） */
export function prefetch(url: string) {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.p;
  const entry: { at: number; data?: unknown; p: Promise<unknown> } = { at: Date.now(), p: Promise.resolve() };
  entry.p = api(url).then(
    (d) => {
      entry.data = d;
      return d;
    },
    (e) => {
      cache.delete(url); // 失敗はキャッシュしない
      throw e;
    },
  );
  cache.set(url, entry);
  return entry.p;
}
const cachedData = <T,>(url: string | null): T | undefined => {
  const hit = url ? cache.get(url) : undefined;
  return hit && Date.now() - hit.at < CACHE_MS ? (hit.data as T | undefined) : undefined;
};

/**
 * GET してデータを返す。url が変わると取り直す。
 * cached：先読み・短期キャッシュを使う（一般向けの閲覧画面だけ。管理画面は常に最新を読む）
 */
export function useApi<T>(url: string | null, opts?: { cached?: boolean }) {
  const cached = !!opts?.cached;
  const [state, setState] = useState<{ url: string | null; data?: T; error?: ApiError }>(() => ({ url, data: cached ? cachedData<T>(url) : undefined }));
  useEffect(() => {
    if (!url) return;
    let alive = true;
    const hit = cached ? cachedData<T>(url) : undefined;
    if (hit !== undefined) {
      setState((s) => (s.url === url && s.data === hit ? s : { url, data: hit }));
      return;
    }
    (cached ? (prefetch(url) as Promise<T>) : api<T>(url)).then(
      (data) => alive && setState({ url, data }),
      (error) => alive && setState({ url, error: error instanceof ApiError ? error : new ApiError(0, String(error)) }),
    );
    return () => {
      alive = false;
    };
  }, [url, cached]);
  // 前の url の結果は返さない（キャッシュにあれば、それをすぐ返す）
  if (state.url === url) return { data: state.data, error: state.error };
  return { data: cached ? cachedData<T>(url) : undefined, error: undefined };
}
