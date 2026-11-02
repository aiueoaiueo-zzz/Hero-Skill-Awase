// 変換後の動画をブラウザ内（IndexedDB）に一時保存する。使えない環境では何もしない。
const DB = "hsawase";
const STORE = "videos";

let dbp: Promise<IDBDatabase | null> | null = null;
const open = () =>
  (dbp ??= new Promise((resolve) => {
    try {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  }));

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await open();
  if (!db) return undefined;
  return new Promise((resolve) => {
    try {
      const t = db.transaction(STORE, mode);
      const req = fn(t.objectStore(STORE));
      t.oncomplete = () => resolve(req ? req.result : undefined);
      t.onerror = () => resolve(undefined);
      t.onabort = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
}

export const idbPut = (key: string, blob: Blob) => tx("readwrite", (s) => s.put(blob, key));
export const idbGet = (key: string) => tx<Blob>("readonly", (s) => s.get(key) as IDBRequest<Blob>);
export const idbDelete = (key: string) => tx("readwrite", (s) => s.delete(key));
export const idbKeys = async () => ((await tx<IDBValidKey[]>("readonly", (s) => s.getAllKeys())) ?? []).map(String);
export const idbClear = () => tx("readwrite", (s) => s.clear());
