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

/** GET してデータを返す。url が変わると取り直す */
export function useApi<T>(url: string | null) {
  const [state, setState] = useState<{ url: string | null; data?: T; error?: ApiError }>({ url: null });
  useEffect(() => {
    if (!url) return;
    let alive = true;
    api<T>(url).then(
      (data) => alive && setState({ url, data }),
      (error) => alive && setState({ url, error: error instanceof ApiError ? error : new ApiError(0, String(error)) }),
    );
    return () => {
      alive = false;
    };
  }, [url]);
  // 前の url の結果は返さない
  return state.url === url ? { data: state.data, error: state.error } : { data: undefined, error: undefined };
}
