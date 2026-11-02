import { LIMITS } from "../../shared/constants";
import { fmtSize } from "./ui";

/**
 * 選んだ動画を確認する（形式・元のサイズ・長さ 30 秒以内）。
 * 長さは <video> で読み取り、読めない形式（ブラウザが再生できない MOV など）は mediabunny で読む。
 * 問題があればエラーメッセージを返す。
 */
export async function inspectVideo(file: File): Promise<{ duration: number } | string> {
  if (!/^video\/(mp4|quicktime|webm)$/.test(file.type) && !/\.(mp4|mov|webm)$/i.test(file.name)) return "MP4・MOV・WebMのみ対応しています";
  if (file.size > LIMITS.sourceVideoBytes) return `ファイルが大きすぎます（${fmtSize(file.size)}）`;
  let d = await durationByElement(file);
  if (d === null) d = await durationByMediabunny(file);
  if (d === null) return "この動画は読み込めませんでした";
  if (d > LIMITS.videoSeconds + 0.5) return `30秒を超えています（${d.toFixed(1)}秒）`;
  return { duration: d };
}

function durationByElement(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    const done = (d: number | null) => {
      URL.revokeObjectURL(url);
      resolve(d);
    };
    v.onloadedmetadata = () => done(isFinite(v.duration) && v.duration > 0 ? v.duration : null);
    v.onerror = () => done(null);
    v.src = url;
  });
}

async function durationByMediabunny(file: File): Promise<number | null> {
  try {
    const mb = await import("mediabunny");
    const input = new mb.Input({ source: new mb.BlobSource(file), formats: mb.ALL_FORMATS });
    try {
      const d = await input.computeDuration();
      return isFinite(d) && d > 0 ? d : null;
    } finally {
      input.dispose?.();
    }
  } catch {
    return null;
  }
}

/** XHR で PUT して進捗を返す */
export function putWithProgress(url: string, body: Blob, headers: Record<string, string>, onProgress: (loaded: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => onProgress(e.loaded);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`upload_failed_${xhr.status}`)));
    xhr.onerror = () => reject(new Error("upload_network_error"));
    xhr.send(body);
  });
}
